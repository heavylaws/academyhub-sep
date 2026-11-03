# PeakForm Athletics — academyhub-sep

## WHAT
Multi-tenant sports-academy SaaS. React 19 + Vite SPA in `src/`, Convex backend
(DB, functions, auth, crons) in `convex/`. Every academy-scoped row carries
`academyId`; tenant isolation is enforced server-side only.

## WHY — invariants you will otherwise break
- **Tenant isolation is the #1 invariant.** Every academy-scoped query/mutation
  goes through a guard in `convex/lib/permissions.ts` before touching `ctx.db`.
  Never trust a client `academyId`: resolve it with `resolveTargetAcademyId`.
- **`platform_admin` bypasses every role and academy check by design.** Not a bug.
- **Domain errors are structured:** `throw new ConvexError({ code, message })`,
  `code` ∈ `NOT_FOUND | BAD_REQUEST | FORBIDDEN | UNAUTHENTICATED | CONFLICT`.
  The client reads `error.data.message`. The string-only `ConvexError` calls in
  `convex/lib/rateLimit.ts` are legacy — don't copy them.
- **Mock mode exists.** With `VITE_CONVEX_URL` unset and `VITE_LOCAL_DEV=true`
  the SPA runs on a localStorage fake (`src/lib/local-mock-*.ts`). Frontend
  changes must keep both paths working; most `src/test/*` suites hit the mock.
- **Secrets never go in `VITE_*` vars** (bundled into client JS). Server keys
  live in Convex env: `npx convex env set NAME value`. Gemini (`@google/genai`)
  is server-only and marked external in `convex.json`.
- `convex/_generated/` is produced by `npx convex dev`; never hand-edit.

## HOW — commands (pnpm only; CI pins pnpm 9.15.9 + Node 22)
| Task | Command |
|---|---|
| All tests (~50s, two Vitest projects) | `pnpm test` |
| Backend tests only (~8s) | `pnpm exec vitest run --project convex` |
| Frontend tests only | `pnpm exec vitest run --project frontend` |
| Single file | `pnpm exec vitest run convex/access.test.ts` |
| Single test | `pnpm exec vitest run src/test/rbac-permissions.test.ts -t "<name>"` |
| Tests touched by your diff | `pnpm exec vitest run --changed HEAD` |
| Typecheck frontend | `pnpm exec tsc -b` |
| Typecheck backend | `pnpm exec tsc -p convex --noEmit` |
| Lint changed files | `pnpm exec eslint <files>` |
| Format | `pnpm exec prettier --write <files>` |

Gotchas:
- `pnpm typecheck` is a **no-op** (root `tsconfig.json` has `"files": []`). Use the two `tsc` commands above.
- Baseline at `87ffbf6`: `pnpm lint` = 13 pre-existing errors; `tsc -b` = 2 errors in
  `src/data/tactical-presets.ts`; ~227 files not Prettier-clean. Don't fix unrelated ones in feature work.
- Convex imports use explicit extensions: `./lib/email.ts`, `./_generated/server.js`.
- `ctx.db.get("users", id)` — this Convex version takes the table name first.
- Aliases: `@/` → `src/`, `@/convex/` → `convex/`.
- New Convex tests: `convexTest(schema, modules)` with `modules` from `convex/test.setup.ts`;
  auth via `t.withIdentity({ subject: \`${userId}|session\` })` (see `convex/access.test.ts:15`).

## Key pointers
| Concern | Location |
|---|---|
| Role → permission matrix | `convex/lib/permissions.ts:56` |
| `hasPermission` + platform-admin short-circuit | `convex/lib/permissions.ts:106` |
| Granular permission + academy guard | `convex/lib/permissions.ts:112` |
| `UNAUTHENTICATED` origin | `convex/lib/permissions.ts:140` |
| `requireUser` (base auth middleware) | `convex/lib/permissions.ts:155` |
| `requirePermission` (role + tenant) | `convex/lib/permissions.ts:209` |
| Athlete PII access (guardian/athlete scoping) | `convex/lib/permissions.ts:266` |
| Tenant ID resolution | `convex/lib/permissions.ts:333` |
| Login / invite rate limiting | `convex/lib/rateLimit.ts:12`, `:53` |
| Input sanitization | `convex/lib/sanitize.ts:7` |
| Tactical plan server validation | `convex/lib/tacticalValidation.ts:136` |
| Auth providers (Password + email OTP) | `convex/auth.ts:37` |
| Client `ConvexError` handling pattern | `src/components/layout/academy-switcher.tsx:40` |
| Mock-mode switch | `src/lib/env.ts:7` |
| Root schema (composes `convex/schema/*`) | `convex/schema.ts:1` |

## Harness behaviour
- Edits to `.env*`, lockfiles, credential/secret files, migrations and `convex/_generated/`
  are blocked by `.claude/hooks/protect-files.sh`. To override deliberately:
  `touch .claude/allow-sensitive.flag` (git-ignored) — delete it afterwards.
- Every edited file is auto-formatted with Prettier, so touching an unformatted file
  produces a formatting diff. Mention it in the PR rather than reverting.
- The Stop hook runs `vitest run --changed HEAD` when tracked code changed; a red run blocks finishing.
- Subagents: `staff-reviewer` (adversarial review), `code-simplifier`. Ship via `/commit-push-pr`.

## Progressive disclosure — read only when relevant
- `agent_docs/backend-convex.md` — writing queries/mutations/actions, RBAC recipe, error codes, crons.
- `agent_docs/testing.md` — convex-test patterns, mock-store tests, flaky/slow suites.
- `agent_docs/frontend.md` — mock mode internals, routing, shadcn/ui conventions.
- `agent_docs/env-and-deploy.md` — env var catalogue (names only), Convex + nginx/Cloud Run deploy.
- `docs/DEPLOYMENT.md`, `docs/WALKTHROUGH.md` — human-facing deployment and product docs.
