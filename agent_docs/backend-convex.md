# Backend (Convex) — deep reference

Read when adding or changing anything under `convex/`.

## Function recipe (academy-scoped mutation)
```ts
import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server.js";
import { requirePermission, resolveTargetAcademyId, ACADEMY_STAFF_ROLES } from "./lib/permissions.ts";
import { sanitizeString } from "./lib/sanitize.ts";
import { logAction } from "./lib/logger.ts";

export const rename = mutation({
  args: { id: v.id("teams"), name: v.string(), academyId: v.optional(v.id("academies")) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, ACADEMY_STAFF_ROLES);
    const academyId = resolveTargetAcademyId(user, args.academyId);
    const team = await ctx.db.get("teams", args.id);
    if (!team || team.academyId !== academyId) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    await ctx.db.patch("teams", args.id, { name: sanitizeString(args.name, 120, "Team name") });
    logAction("team.rename", { userId: user._id, academyId, teamId: args.id });
  },
});
```
`sanitizeString(input, maxLength = 255, fieldName = "Input")` throws `ConvexError` when over length.

Rules:
- Look up an entity, then compare its `academyId` to the resolved one. Return `NOT_FOUND`
  (not `FORBIDDEN`) for cross-tenant ids so ids from other tenants can't be probed.
- Athlete personal data (profile, fees, attendance, plans, assessments, video) must go
  through `requireAthleteAccess` / `canAccessAthlete` — guardians and athletes are scoped to their own links.
- Role groups: `ALL_ROLES`, `ACADEMY_STAFF_ROLES`, `FINANCE_ROLES`, `COACHING_ROLES`, `MEDICAL_ROLES`
  (`convex/lib/permissions.ts:8-44`). Prefer `requireGranularPermission(ctx, "<PermissionKey>")`
  for new endpoints; extend `ROLE_PERMISSIONS` rather than hard-coding role lists.
- Actions cannot use `ctx.db`. Public actions authenticate with `validateIdentity` /
  `requireActionUserIdentity` (see `convex/tacticalAi.ts:145`) and do DB work via
  `ctx.runQuery/ctx.runMutation` on `internal.*` functions. Long AI work runs as an `internalAction`
  (`convex/videoAnalysis.ts:64`) scheduled from a mutation.

## Error codes
| code | use for |
|---|---|
| `UNAUTHENTICATED` | no identity / user row missing (only from `permissions.ts`) |
| `FORBIDDEN` | wrong role, or caller has no academy |
| `NOT_FOUND` | missing or cross-tenant entity |
| `BAD_REQUEST` | invalid input that passed the validator |
| `CONFLICT` | uniqueness clashes (`guardians.ts:64`, `athletes.ts:410`, `invites.ts:80`, `facilities.ts:87`) |

## Schema
- One file per table group in `convex/schema/*.ts`, composed in `convex/schema.ts`.
- Exported validators (e.g. `userRoleValidator`, `athleteGenderValidator`) are re-used in function args — import them, don't redefine.
- No migration framework: adding an optional field is safe; making a field required or
  removing one needs a backfill mutation first, then a schema change in a later deploy.

## Crons (`convex/crons.ts`, UTC)
Monthly fee generation 04:17, fee reminders/overdue 05:17, login-attempt cleanup 06:12.
All target `internal.*` functions — keep cron targets internal.

## Auth
Convex Auth: Password provider + Resend email OTP (8 digits, 15 min), `convex/auth.ts:37`.
New users are onboarded through `convex/lib/onboarding.ts`. `PLATFORM_ADMIN_EMAILS` (Convex env) promotes platform admins.

## Seed files
`seed*.ts`, `devSeed.ts`, `resetAndSeedSuperuser.ts` are destructive dev tooling. Never call them from app code or run them against production.
