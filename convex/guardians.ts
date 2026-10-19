import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import {
  listOwnAthletes,
  requireAthleteAccess,
  requireRole,
  requireUser,
} from "./lib/auth.ts";
import { guardianRelationshipValidator } from "./schema/guardianLinks.ts";
import { sanitizeOptionalString } from "./lib/sanitize.ts";

/**
 * Link a guardian/parent to an athlete with relationship and consent permissions.
 * Allowed for academy staff (platform_admin, academy_admin, sporting_director, coach).
 */
export const linkGuardianToAthlete = mutation({
  args: {
    athleteId: v.id("athletes"),
    invitedEmail: v.string(),
    invitedPhone: v.optional(v.string()),
    relationship: guardianRelationshipValidator,
    isPrimaryContact: v.optional(v.boolean()),
    canManageBilling: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const caller = await requireRole(ctx, [
      "platform_admin",
      "academy_admin",
      "sporting_director",
      "coach",
    ]);

    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete || athlete.deletedAt) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }

    if (caller.role !== "platform_admin" && caller.academyId !== athlete.academyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You can only manage athletes in your own academy",
      });
    }

    const cleanEmail = args.invitedEmail.trim().toLowerCase();
    if (!cleanEmail.includes("@")) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Valid guardian email is required",
      });
    }

    // Check for duplicate guardian link on this athlete
    const existingLinks = await ctx.db
      .query("guardianLinks")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .collect();

    if (existingLinks.some((l) => l.invitedEmail.toLowerCase() === cleanEmail)) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "A guardian link with this email already exists for this athlete",
      });
    }

    // Check if an existing verified user matches this email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", cleanEmail))
      .first();

    const guardianUserId =
      existingUser && existingUser.emailVerificationTime !== undefined
        ? existingUser._id
        : undefined;

    // If an existing verified user has no role, assign guardian role
    if (existingUser && !existingUser.role && existingUser.emailVerificationTime !== undefined) {
      await ctx.db.patch("users", existingUser._id, {
        role: "guardian",
        academyId: athlete.academyId,
      });
    }

    const cleanPhone = sanitizeOptionalString(args.invitedPhone, 30, "Guardian phone");

    const linkId = await ctx.db.insert("guardianLinks", {
      academyId: athlete.academyId,
      guardianUserId,
      invitedEmail: cleanEmail,
      invitedPhone: cleanPhone,
      athleteId: args.athleteId,
      relationship: args.relationship,
      isPrimaryContact: args.isPrimaryContact ?? false,
      canManageBilling: args.canManageBilling ?? false,
      hasSignedMedicalConsent: false,
      hasSignedMediaRelease: false,
      createdAt: Date.now(),
      createdBy: caller._id,
    });

    return linkId;
  },
});

/**
 * Submit legal / medical / media release consents for an athlete.
 * Executed by the authenticated guardian linked to this record (or platform_admin).
 */
export const submitGuardianConsent = mutation({
  args: {
    linkId: v.id("guardianLinks"),
    hasSignedMedicalConsent: v.boolean(),
    hasSignedMediaRelease: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const link = await ctx.db.get("guardianLinks", args.linkId);
    if (!link) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Guardian link record not found",
      });
    }

    const isAuthorizedGuardian =
      user.role === "platform_admin" ||
      link.guardianUserId === user._id ||
      (user.email && link.invitedEmail.toLowerCase() === user.email.toLowerCase());

    if (!isAuthorizedGuardian) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not authorized to sign consent for this record",
      });
    }

    const signedMedicalNow =
      args.hasSignedMedicalConsent && !link.hasSignedMedicalConsent;
    const medicalConsentSignedAt = args.hasSignedMedicalConsent
      ? link.medicalConsentSignedAt ?? Date.now()
      : undefined;

    await ctx.db.patch("guardianLinks", args.linkId, {
      guardianUserId: link.guardianUserId ?? user._id,
      hasSignedMedicalConsent: args.hasSignedMedicalConsent,
      medicalConsentSignedAt,
      hasSignedMediaRelease: args.hasSignedMediaRelease,
    });

    return {
      success: true,
      signedMedicalNow,
      medicalConsentSignedAt,
    };
  },
});

/**
 * Get all guardian links and consent status for an athlete.
 * Requires athlete read permission.
 */
export const getGuardiansForAthlete = query({
  args: {
    athleteId: v.id("athletes"),
  },
  handler: async (ctx, args) => {
    await requireAthleteAccess(ctx, args.athleteId);
    const links = await ctx.db
      .query("guardianLinks")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .collect();

    return await Promise.all(
      links.map(async (link) => {
        const guardianUser = link.guardianUserId
          ? await ctx.db.get("users", link.guardianUserId)
          : null;
        return {
          ...link,
          guardianName: guardianUser?.name,
          guardianImage: guardianUser?.image,
        };
      }),
    );
  },
});

/**
 * Returns all athletes linked to the current logged-in guardian user,
 * combining direct legacy athlete references and guardianLinks.
 */
export const getMyChildren = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await listOwnAthletes(ctx, user);
  },
});
