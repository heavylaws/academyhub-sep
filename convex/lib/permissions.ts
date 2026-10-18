import { ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server.js";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

export type Role = NonNullable<Doc<"users">["role"]>;

export const ALL_ROLES: Role[] = [
  "platform_admin",
  "academy_admin",
  "coach",
  "accounting",
  "athlete",
  "guardian",
];

/** Roles that may read any athlete record inside their own academy. */
export const ACADEMY_STAFF_ROLES: Role[] = [
  "academy_admin",
  "coach",
  "accounting",
];

export const FINANCE_ROLES: Role[] = [
  "academy_admin",
  "accounting",
];

export const COACHING_ROLES: Role[] = [
  "academy_admin",
  "coach",
];

/**
 * Validates caller identity using ctx.auth.getUserIdentity().
 * Throws UNAUTHENTICATED if the caller is not signed in.
 */
export async function validateIdentity(ctx: QueryCtx | MutationCtx | ActionCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "You must be signed in",
    });
  }
  return identity;
}

/**
 * Fetches the current authenticated user's row, throwing UNAUTHENTICATED if not signed in or not found.
 * Strictly validates caller identity via ctx.auth.getUserIdentity().
 */
export async function requireUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users">> {
  // First ensure ctx.auth has a valid user identity
  await validateIdentity(ctx);

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
 * Validates caller identity in an Action context and returns the identity.
 */
export async function requireActionUserIdentity(ctx: ActionCtx) {
  return await validateIdentity(ctx);
}

/**
 * Fetches the current user and ensures they hold one of the allowed roles.
 * platform_admin is the SaaS super-admin and always passes.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
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

/**
 * Centralized RBAC and tenant validation helper.
 * Validates caller identity, checks user role against allowed access levels,
 * and ensures tenant isolation with targetAcademyId if provided.
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: Array<Doc<"users">["role"]>,
  targetAcademyId?: Id<"academies"> | null,
): Promise<Doc<"users">> {
  const user = await requireRole(ctx, allowedRoles);
  if (targetAcademyId && user.role !== "platform_admin") {
    if (!user.academyId || user.academyId !== targetAcademyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have access to this academy",
      });
    }
  }
  return user;
}

/** Fetches the current user and ensures they belong to the given academy (or are platform admin). */
export async function requireAcademyMember(
  ctx: QueryCtx | MutationCtx,
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
  ctx: QueryCtx | MutationCtx,
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
  ctx: QueryCtx | MutationCtx,
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

/** Ensures that a target academy ID matches the user's authorized academy (or user is platform_admin). */
export function resolveTargetAcademyId(
  user: Doc<"users">,
  requestedAcademyId?: Id<"academies">,
): Id<"academies"> {
  if (user.role === "platform_admin") {
    const target = requestedAcademyId ?? user.academyId;
    if (!target) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Academy ID is required for platform admin",
      });
    }
    return target;
  }

  if (requestedAcademyId && requestedAcademyId !== user.academyId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You cannot perform operations on another academy",
    });
  }

  if (!user.academyId) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You are not associated with any academy",
    });
  }

  return user.academyId;
}
