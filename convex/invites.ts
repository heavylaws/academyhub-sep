import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { requireRole, requireUser } from "./lib/auth.ts";
import { userRoleValidator } from "./schema.ts";
import { assertInviteRateLimit, recordInviteAttempt } from "./lib/rateLimit.ts";

function generateSecureToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

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
        args.role !== "accounting" &&
        args.role !== "sporting_director" &&
        args.role !== "medical_staff" &&
        args.role !== "guardian"
      ) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message:
            "Academy admins can only invite coaches, sporting directors, medical staff, accounting staff, athletes, or guardians",
        });
      }
    } else if (
      args.role !== "academy_admin" &&
      args.role !== "coach" &&
      args.role !== "athlete" &&
      args.role !== "accounting" &&
      args.role !== "sporting_director" &&
      args.role !== "medical_staff" &&
      args.role !== "guardian"
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message:
          "Invites can be for academy managers, sporting directors, medical staff, coaches, accounting staff, athletes, or guardians",
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

    const token = generateSecureToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

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
        token,
        expiresAt,
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
      // Resend: refresh token, expiration, and fire a new email
      await ctx.db.patch("invites", existingInvite._id, {
        academyId: args.academyId,
        role: args.role,
        invitedBy: user._id,
        token,
        expiresAt,
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
      token,
      expiresAt,
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

/**
 * Validates an invite token without redeeming it.
 * Rate-limited against enumeration attacks.
 */
export const validateInviteToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token || token.length < 32 || token.length > 128) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invalid invite token format",
      });
    }

    // Rate-limit token lookups against enumeration attacks
    await assertInviteRateLimit(ctx, token.slice(0, 16));

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!invite) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Invite not found or invalid",
      });
    }

    if (invite.status !== "pending") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This invite has already been accepted or cancelled",
      });
    }

    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This invite has expired. Please request a new invite.",
      });
    }

    const academy = await ctx.db.get("academies", invite.academyId);
    return {
      valid: true,
      email: invite.email,
      role: invite.role,
      academyName: academy?.name ?? "the academy",
    };
  },
});

/**
 * Accepts an invite by token, single-use, binding the authenticated user
 * strictly to the invite's academyId and role.
 */
export const acceptInviteByToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const token = args.token.trim();
    if (!token || token.length < 32 || token.length > 128) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invalid invite token format",
      });
    }

    // Rate-limit redemption against enumeration
    await assertInviteRateLimit(ctx, token.slice(0, 16));

    const invite = await ctx.db
      .query("invites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .first();

    if (!invite) {
      await recordInviteAttempt(ctx, token.slice(0, 16), false);
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Invite not found or invalid",
      });
    }

    // Single-use check
    if (invite.status !== "pending") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This invite has already been accepted or cancelled",
      });
    }

    // Expiration check
    if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
      await ctx.db.patch("invites", invite._id, { status: "expired" });
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "This invite has expired. Please request a new invite.",
      });
    }

    // User email verification and binding check
    const userEmail = (user.email ?? "").trim().toLowerCase();
    const inviteEmail = invite.email.trim().toLowerCase();
    if (userEmail !== inviteEmail) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: `This invite was issued for ${invite.email}. Please sign in with that email.`,
      });
    }

    // Single-use: Mark invite as accepted atomically
    await ctx.db.patch("invites", invite._id, {
      status: "accepted",
      acceptedAt: new Date().toISOString(),
    });

    // Strictly bind the user to the invite's academyId and role
    await ctx.db.patch("users", user._id, {
      role: invite.role,
      academyId: invite.academyId,
    });

    // If an athlete record matches this email in this academy, link them
    if (invite.role === "athlete") {
      const athlete = await ctx.db
        .query("athletes")
        .withIndex("by_academy_and_email", (q) =>
          q.eq("academyId", invite.academyId).eq("email", inviteEmail),
        )
        .first();
      if (athlete && !athlete.userId) {
        await ctx.db.patch("athletes", athlete._id, {
          userId: user._id,
        });
      }
    }

    await recordInviteAttempt(ctx, token.slice(0, 16), true);

    return {
      success: true,
      role: invite.role,
      academyId: invite.academyId,
    };
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

