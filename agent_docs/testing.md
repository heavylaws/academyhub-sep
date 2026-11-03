# Testing — deep reference

Vitest 4, one config (`vitest.config.ts`) with two projects:
| project | env | globs | setup |
|---|---|---|---|
| `convex` | edge-runtime | `convex/**/*.test.ts` | `convex/test.setup.ts` (exports `modules`) |
| `frontend` | jsdom | `src/**/*.test.{ts,tsx}` | `src/vitest.setup.ts` (jest-dom, matchMedia stub, cleanup) |

Globals are off — import `describe/it/expect` from `vitest` explicitly. `restoreMocks: true` is on.

## Timings (baseline, 44 files / 305 tests)
Full `pnpm test` ≈ 50s (most of it jsdom environment start-up). Convex project ≈ 8s.
Single file ≈ 2s. Prefer `--project` or a file path while iterating.

## Backend tests (convex-test)
```ts
import { convexTest } from "convex-test";
import schema from "./schema.ts";
import { modules } from "./test.setup.ts";
import { api } from "./_generated/api.js";

const t = convexTest(schema, modules);
const userId = await t.run((ctx) => ctx.db.insert("users", { email: "a@x.test", role: "coach" }));
const asUser = t.withIdentity({ subject: `${userId}|session` }); // Convex Auth subject format
await expect(asUser.mutation(api.teams.create, {...})).rejects.toThrow(/FORBIDDEN|permission/);
```
Template: `convex/access.test.ts` (seed helper + `as()` helper at line 15).

Every new endpoint needs at least: happy path, wrong role → FORBIDDEN, other academy → NOT_FOUND/FORBIDDEN, unauthenticated → UNAUTHENTICATED.

## Frontend tests
- Most suites in `src/test/` exercise `localMockStore` (`src/lib/local-mock-store.ts`), not Convex.
  Call `localMockStore.resetToDefault()` in `beforeEach`; switch roles with `setPersona("usr_coach")`.
- Component tests use Testing Library, wrapped in `BrowserRouter` where links are involved (`src/test/components.test.tsx`).

## Anti-patterns the reviewer will reject
- Asserting on values the test itself just wrote with no logic in between (tautological).
- Snapshotting whole mock-store objects.
- Real network, real Convex deployments, `Date.now()`-dependent assertions without `vi.useFakeTimers()`.
