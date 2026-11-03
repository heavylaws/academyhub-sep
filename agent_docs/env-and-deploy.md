# Environment & deploy — deep reference

`.env*` files are read-blocked for the agent. Variable **names** only:

| Name | Where set | Notes |
|---|---|---|
| `VITE_CONVEX_URL` | build env | Presence disables mock mode |
| `VITE_LOCAL_DEV` | build env | `"true"` enables mock mode (dev only) |
| `VITE_DEMO_ADMIN_PASSWORD` | build env | Demo only — ends up in the client bundle |
| `CONVEX_SITE_URL`, `SITE_URL` | Convex env | Auth callback / email links |
| `PLATFORM_ADMIN_EMAILS` | Convex env | Comma list promoted to `platform_admin` |
| `EMAIL_DEV_LOG` | Convex env | Log emails instead of sending |
| `RESEND_API_KEY`, `EMAIL_FROM` | Convex env | Transactional email |
| `GEMINI_API_KEY` | Convex env | Server-only AI (`convex/videoAnalysis.ts`, `convex/tacticalAi.ts`) |

Set Convex env with `npx convex env set NAME value` (asks for approval in this harness).

## Deploy targets
- Backend: Convex Cloud — `npx convex deploy` (needs approval; never run unprompted).
- Frontend: static `dist/` from `pnpm run build`, served by nginx (`nginx.conf`, `Dockerfile`)
  or Cloud Run (`scripts/deploy-cloudrun.sh`). Vercel config exists in `vercel.json`.
- CI (`.github/workflows/ci.yml`): `pnpm install --frozen-lockfile` → `pnpm lint` → `tsc --noEmit` → `pnpm test` → build.
  Note CI's `tsc --noEmit` is the same no-op as `pnpm typecheck`.

Human-facing guide: `docs/DEPLOYMENT.md`.
