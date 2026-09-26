import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx } from "../_generated/server.js";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

type Role = NonNullable<Doc<"users">["role"]>;

/** Roles that may read any athlete record inside their own academy. */
const ACADEMY_STAFF_ROLES: Role[] = ["academy_admin", "coach", "accounting"];

/** Fetches the current authenticated user's row, throwing if not signed in. */
export async function requireUser(ctx: QueryCtx): Promise<Doc<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in",
    });
  }
  const user = await ctx.db.get("users", userId);
  if (!user) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "User record not found",
    });
  }
  return user;
}

/**
 * Fetches the current user and ensures they hold one of the allowed roles.
 * platform_admin is the SaaS super-admin and always passes.
 */
export async function requireRole(
  ctx: QueryCtx,
  allowed: Array<Doc<"users">["role"]>,
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role === "platform_admin") {
    return user;
  }
  if (!user.role || !allowed.includes(user.role)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action",
    });
  }
  return user;
}

/** Fetches the current user and ensures they belong to the given academy (or are platform admin). */
export async function requireAcademyMember(
  ctx: QueryCtx,
  academyId: Doc<"users">["academyId"],
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role === "platform_admin") {
    return user;
  }
  if (!user.academyId || user.academyId !== academyId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have access to this academy",
    });
  }
  return user;
}

/**
 * Whether `user` may read `athlete`'s personal data (profile, fees, attendance,
 * plans, assessments, video analyses):
 * - platform_admin: always
 * - academy staff: athletes in their own academy
 * - athlete: only their own linked record
 * - guardian: only athletes they are linked to as guardian
 */
export function canAccessAthlete(
  user: Doc<"users">,
  athlete: Doc<"athletes">,
): boolean {
  if (user.role === "platform_admin") return true;
  if (user.role && ACADEMY_STAFF_ROLES.includes(user.role)) {
    return user.academyId === athlete.academyId;
  }
  if (user.role === "athlete") return athlete.userId === user._id;
  if (user.role === "guardian") return athlete.guardianUserId === user._id;
  return false;
}

/** Loads an athlete and throws unless the current user may read their data. */
export async function requireAthleteAccess(
  ctx: QueryCtx,
  athleteId: Id<"athletes">,
): Promise<{ user: Doc<"users">; athlete: Doc<"athletes"> }> {
  const user = await requireUser(ctx);
  const athlete = await ctx.db.get("athletes", athleteId);
  if (!athlete) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Athlete not found" });
  }
  if (!canAccessAthlete(user, athlete)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You cannot view this athlete",
    });
  }
  return { user, athlete };
}

/** Athlete records the user sees as "mine": their own record, or their children for guardians. */
export async function listOwnAthletes(
  ctx: QueryCtx,
  user: Doc<"users">,
): Promise<Doc<"athletes">[]> {
  if (user.role === "guardian") {
    return await ctx.db
      .query("athletes")
      .withIndex("by_guardian_user", (q) => q.eq("guardianUserId", user._id))
      .collect();
  }
  return await ctx.db
    .query("athletes")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .collect();
}
