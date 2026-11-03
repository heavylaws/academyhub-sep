#!/usr/bin/env bash
# SessionStart hook (matcher: compact). stdout is injected into context after /compact or auto-compact.
cat <<'EOF'
Post-compact reminders (academyhub-sep):
- pnpm only. Single test: pnpm exec vitest run <file> -t "<name>". Changed-only: pnpm exec vitest run --changed HEAD.
- `pnpm typecheck` is a no-op; use `pnpm exec tsc -b` and `pnpm exec tsc -p convex --noEmit`.
- Every academy-scoped Convex function must call a guard from convex/lib/permissions.ts and resolve academyId server-side.
- Errors: ConvexError({ code: NOT_FOUND|BAD_REQUEST|FORBIDDEN|UNAUTHENTICATED|CONFLICT, message }).
- New Convex API used by the UI needs a matching handler in src/lib/local-mock-store.ts (mock mode + src/test).
- Protected files (.env*, lockfiles, secrets, migrations, convex/_generated) need .claude/allow-sensitive.flag.
- Re-read CLAUDE.md and the relevant agent_docs/*.md before continuing non-trivial work.
EOF
exit 0
