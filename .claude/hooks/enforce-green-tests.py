#!/usr/bin/env python3
"""Stop hook: run the fast test suite when tracked code changed; exit 2 blocks the stop if red.

Fast suite = `vitest run --changed HEAD` (only tests related to files changed vs HEAD).
The fingerprint of the last green diff is cached in .git/claude-last-green so an unchanged
working tree is not re-tested on every stop.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
from pathlib import Path

CODE_EXTS = (".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts", ".json")
TIMEOUT_S = 280  # keep under the 300s hook timeout in settings.json
TAIL_LINES = 80


def git(*args: str, cwd: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True)


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        payload = {}

    # Already continuing because of a previous block: don't loop forever.
    if payload.get("stop_hook_active"):
        return 0

    root = Path(os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or os.getcwd())
    if git("rev-parse", "--is-inside-work-tree", cwd=root).returncode != 0:
        return 0

    changed = git("diff", "--name-only", "HEAD", cwd=root).stdout.split()
    code_changed = sorted(f for f in changed if f.endswith(CODE_EXTS))
    if not code_changed:
        return 0

    diff = git("diff", "HEAD", "--", *code_changed, cwd=root).stdout
    fingerprint = hashlib.sha256(diff.encode()).hexdigest()
    git_dir = Path(git("rev-parse", "--absolute-git-dir", cwd=root).stdout.strip())
    stamp = git_dir / "claude-last-green"
    if stamp.exists() and stamp.read_text().strip() == fingerprint:
        return 0

    vitest = root / "node_modules" / ".bin" / "vitest"
    if not vitest.exists():
        print("enforce-green-tests: node_modules missing; run `pnpm install`. Tests not run.", file=sys.stderr)
        return 0

    cmd = [str(vitest), "run", "--changed", "HEAD", "--passWithNoTests", "--reporter=dot"]
    try:
        env = {**os.environ, "NO_COLOR": "1", "FORCE_COLOR": "0", "CI": "1"}
        proc = subprocess.run(cmd, cwd=root, capture_output=True, text=True, timeout=TIMEOUT_S, env=env)
    except subprocess.TimeoutExpired:
        print(
            f"enforce-green-tests: `pnpm exec vitest run --changed HEAD` exceeded {TIMEOUT_S}s. "
            "Narrow the change or run the affected files directly before finishing.",
            file=sys.stderr,
        )
        return 2

    if proc.returncode == 0:
        stamp.write_text(fingerprint)
        return 0

    output = (proc.stdout + "\n" + proc.stderr).strip().splitlines()
    print(
        "Tests are RED for your changes. Fix them before finishing "
        "(do not weaken or delete assertions to make them pass).\n"
        "Re-run: pnpm exec vitest run --changed HEAD\n"
        "Changed code files: " + ", ".join(code_changed[:20]) + "\n"
        "--- last output ---\n" + "\n".join(output[-TAIL_LINES:]),
        file=sys.stderr,
    )
    return 2


if __name__ == "__main__":
    sys.exit(main())
