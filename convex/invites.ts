import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { requireRole, requireUser } from "./lib/auth.ts";
import { userRoleValidator } from "./schema.ts";

/**
 * Invite a new staff member.
 * - platform_admin can invite an academy_admin to any academy
 * - academy_admin can invite coach/athlete to their own academy
 */
export const createInvite = mutation({
  args: {
    academyId: v.id("academies"),
    email: v.string(),
    role: userRoleValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["platform_admin", "academy_admin"]);

    if (user.role === "academy_admin") {
      if (user.academyId !== args.academyId) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "You can only invite to your own academy",
        });
      }
      if (
        args.role !== "coach" &&
        args.role !== "athlete" &&
        args.role !== "accounting"
      ) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message:
            "Academy admins can only invite coaches, accounting staff, or athletes",
        });
      }
    } else if (
      args.role !== "academy_admin" &&
      args.role !== "coach" &&
      args.role !== "athlete" &&
      args.role !== "accounting"
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message:
          "Invites can be for academy managers, coaches, accounting staff, or athletes",
      });
    }

    const email = args.email.trim().toLowerCase();
    if (!email.includes("@")) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invalid email address",
      });
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (existingUser?.role) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "A user with this email already belongs to an academy",
      });
    }

    // Only a verified email may receive the role right away; an unverified
    // account with this email could belong to someone else. Otherwise the
    // invite stays pending and is applied when the email is verified.
    if (existingUser && existingUser.emailVerificationTime !== undefined) {
      // User signed up previously and is waiting on the Pending Access screen.
      await ctx.db.patch("users", existingUser._id, {
        role: args.role,
        academyId: args.academyId,
      });

      // If an athlete record matches this email, link them
      const athlete = await ctx.db
        .query("athletes")
        .withIndex("by_academy_and_email", (q) =>
          q.eq("academyId", args.academyId).eq("email", email),
        )
        .first();
      if (athlete && !athlete.userId) {
        await ctx.db.patch("athletes", athlete._id, {
          userId: existingUser._id,
        });
      }

      // Record an accepted invite for audit trail
      const inviteId = await ctx.db.insert("invites", {
        academyId: args.academyId,
        email,
        role: args.role,
        invitedBy: user._id,
        status: "accepted",
        createdAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
      });

      const academy = await ctx.db.get("academies", args.academyId);
      await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmail, {
        to: email,
        inviterName: user.name ?? "A team admin",
        academyName: academy?.name ?? "the academy",
        role: args.role,
      });

      return inviteId;
    }

    const existingInvite = await ctx.db
      .query("invites")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", email).eq("status", "pending"),
      )
      .first();
    if (existingInvite) {
      // Resend: update createdAt and fire a new email instead of blocking
      await ctx.db.patch("invites", existingInvite._id, {
        academyId: args.academyId,
        role: args.role,
        invitedBy: user._id,
        createdAt: new Date().toISOString(),
      });

      // Look up academy name and inviter name for the email
      const academy = await ctx.db.get("academies", args.academyId);
      await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmail, {
        to: email,
        inviterName: user.name ?? "A team admin",
        academyName: academy?.name ?? "the academy",
        role: args.role,
      });

      return existingInvite._id;
    }

    const inviteId = await ctx.db.insert("invites", {
      academyId: args.academyId,
      email,
      role: args.role,
      invitedBy: user._id,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // Send invite email
    const academy = await ctx.db.get("academies", args.academyId);
    await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmail, {
      to: email,
      inviterName: user.name ?? "A team admin",
      academyName: academy?.name ?? "the academy",
      role: args.role,
    });

    return inviteId;
  },
});

/** Lists pending invites for the current user's academy (or all, for platform admin). */
export const listInvites = query({
  args: { academyId: v.optional(v.id("academies")) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["platform_admin", "academy_admin"]);
    // Platform admins see the given academy, or the one they are working in.
    const academyId =
      user.role === "academy_admin"
        ? user.academyId
        : (args.academyId ?? user.academyId);
    if (!academyId) {
      return [];
    }
    return await ctx.db
      .query("invites")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .order("desc")
      .collect();
  },
});

export const cancelInvite = mutation({
  args: { inviteId: v.id("invites") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["platform_admin", "academy_admin"]);
    const invite = await ctx.db.get("invites", args.inviteId);
    if (!invite) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Invite not found" });
    }
    if (user.role === "academy_admin" && invite.academyId !== user.academyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your academy" });
    }
    await ctx.db.delete("invites", args.inviteId);
    return null;
  },
});
