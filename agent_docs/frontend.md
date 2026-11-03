# Frontend — deep reference

## Mock mode
- Switch: `src/lib/env.ts:7` → `isLocalDev` is true only when not PROD, `VITE_CONVEX_URL` empty, and `VITE_LOCAL_DEV=true`.
- `src/components/providers/convex.tsx` (`getLiveConvexClient`) monkey-patches a real `ConvexReactClient`
  (`watchQuery/query/mutation/action`): in dev mock mode it falls back to `localMockStore`
  (`src/lib/local-mock-store.ts`, ~5.3k lines; seed data in `local-mock-data.ts`), keyed by
  `resolveFunctionName` from `src/lib/local-mock-convex-client.ts`. It also post-filters results with
  `src/lib/tenant-isolation.ts` — a client-side safety net, not a substitute for server guards.
- If `VITE_CONVEX_URL` is unset the client silently falls back to a hard-coded Convex Cloud URL
  in that file. Don't rely on "no URL = offline".
- When you add or rename a Convex function the UI calls, add the matching handler to the mock store
  or the page will break in mock mode and in `src/test/*`.
- Persona switching UI: `src/components/ui/dev-persona-switcher.tsx`.

## Routing & auth gating
- Routes in `src/App.tsx`; role gating via `<ProtectedRoute allow={[...roles]}>`
  (`src/components/auth/protected-route.tsx`). Client gating is UX only — the server guard is authoritative.
- Pages live in `src/pages/<area>/page.tsx`; page-private components go in `src/pages/<area>/_components/`.

## UI conventions
- shadcn/ui primitives in `src/components/ui/` (they co-export cva helpers; the react-refresh lint rule is off there).
- `@usehercules/eslint-plugin` enforces e.g. no colour overrides on `variant="outline"` buttons.
- Tailwind v4 via `@tailwindcss/vite`; no `tailwind.config.js`.
- Toasts: `sonner`. Error display pattern: `src/components/layout/academy-switcher.tsx:40`.

## Tactical board domain
Pure logic in `src/domain/tactics/*` (formats, interpolator, playbook); server-side re-validation in
`convex/lib/tacticalValidation.ts:136`. Keep coordinate/format changes in sync on both sides.
