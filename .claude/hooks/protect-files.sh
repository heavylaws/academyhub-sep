#!/usr/bin/env bash
# PreToolUse hook (Edit|MultiEdit|Write|NotebookEdit).
# Blocks edits to env files, lockfiles, secrets/credentials, migrations and generated Convex code.
# Override for one deliberate change: touch .claude/allow-sensitive.flag (git-ignored), then delete it.
# Exit 2 = block (stderr is shown to Claude). Exit 0 = allow.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

if ! command -v jq >/dev/null 2>&1; then
  echo "protect-files: jq is required but not installed; refusing edit (fail closed)." >&2
  exit 2
fi

input="$(cat)"
file_path="$(printf '%s' "$input" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')"

[ -z "$file_path" ] && exit 0

if [ -f "$PROJECT_DIR/.claude/allow-sensitive.flag" ]; then
  exit 0
fi

# Normalise to a repo-relative path for matching.
rel="${file_path#"$PROJECT_DIR"/}"
base="$(basename -- "$rel")"
base_lc="$(printf '%s' "$base" | tr '[:upper:]' '[:lower:]')"
rel_lc="$(printf '%s' "$rel" | tr '[:upper:]' '[:lower:]')"

is_source=0
case "$base_lc" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.mts|*.cts|*.css|*.py|*.sh) is_source=1 ;;
esac

reason=""
case "$base_lc" in
  .env|.env.*|*.env)                                   reason="environment file" ;;
  pnpm-lock.yaml|package-lock.json|yarn.lock|bun.lock|bun.lockb|npm-shrinkwrap.json) reason="lockfile (change deps with pnpm add/remove instead)" ;;
  *.pem|*.key|*.p12|*.pfx|id_rsa*|id_ed25519*)         reason="private key material" ;;
  academy_admins.*)                                    reason="credentials export" ;;
  *credential*|*secret*|*password*)
    # Name-based match applies to data files (md/json/csv/txt/...), not source like password-auth-form.tsx.
    [ "$is_source" -eq 0 ] && reason="credentials/secrets file" ;;
esac

if [ -z "$reason" ]; then
  case "$rel_lc" in
    */migrations/*|migrations/*|*/migration/*|migration/*) reason="migration file (append a new migration instead of editing)" ;;
    convex/_generated/*)                                    reason="generated Convex code (regenerate with npx convex dev)" ;;
    */secrets/*|secrets/*)                                  reason="secrets directory" ;;
  esac
fi

if [ -n "$reason" ]; then
  {
    echo "BLOCKED by .claude/hooks/protect-files.sh: '$rel' is a protected $reason."
    echo "If this edit is intentional and the user approved it, ask them to run:"
    echo "  touch .claude/allow-sensitive.flag"
    echo "then retry, and remove the flag afterwards."
  } >&2
  exit 2
fi

exit 0
