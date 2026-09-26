import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireRole, requireUser } from "./lib/auth.ts";
import { onboardUser } from "./lib/onboarding.ts";
import { userRoleValidator } from "./schema.ts";

/**
 * Re-runs onboarding for the signed-in user (idempotent). Onboarding normally
 * happens in the Convex Auth callback when the email is verified; calling this
 * on app load also picks up invites/guardian links created afterwards.
 */
export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }
    await onboardUser(ctx, userId);
    return userId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get("users", userId);
  },
});

/** Lists staff members (coach/athlete/academy_admin) for the current user's academy. */
export const listAcademyMembers = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user.academyId) {
      return [];
    }
    return await ctx.db
      .query("users")
      .withIndex("by_academy", (q) => q.eq("academyId", user.academyId))
      .collect();
  },
});

/** Platform admin: every user on the platform with their academy's name. */
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["platform_admin"]);
    const [users, academies] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("academies").collect(),
    ]);
    const academyName = new Map(academies.map((a) => [a._id, a.name]));
    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      emailVerified: u.emailVerificationTime !== undefined,
      academyId: u.academyId,
      // A platform admin's academyId is only the academy it is working in.
      academyName:
        u.role === "platform_admin" || !u.academyId
          ? undefined
          : academyName.get(u.academyId),
      createdAt: u._creationTime,
    }));
  },
});

/**
 * Academy admin: update a staff member's role within their academy.
 */
export const updateMemberRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: userRoleValidator,
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, ["academy_admin"]);
    if (!caller.academyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "No academy" });
    }

    const targetUser = await ctx.db.get("users", args.targetUserId);
    if (!targetUser || targetUser.academyId !== caller.academyId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found in your academy",
      });
    }

    if (args.newRole === "platform_admin") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot assign platform admin role",
      });
    }

    await ctx.db.patch("users", args.targetUserId, {
      role: args.newRole,
    });

    return null;
  },
});

/**
 * Academy admin: remove a member from their academy.
 */
export const removeAcademyMember = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, ["academy_admin"]);
    if (!caller.academyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "No academy" });
    }

    if (args.targetUserId === caller._id) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "You cannot remove yourself from the academy",
      });
    }

    const targetUser = await ctx.db.get("users", args.targetUserId);
    if (!targetUser || targetUser.academyId !== caller.academyId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found in your academy",
      });
    }

    // Unlink any athletes linked to this user
    const linkedAthletes = await ctx.db
      .query("athletes")
      .withIndex("by_user", (q) => q.eq("userId", args.targetUserId))
      .collect();
    for (const athlete of linkedAthletes) {
      await ctx.db.patch("athletes", athlete._id, { userId: undefined });
    }

    await ctx.db.patch("users", args.targetUserId, {
      role: undefined,
      academyId: undefined,
    });

    return null;
  },
});
