import { defineTable } from "convex/server";
import { v } from "convex/values";

export const guardianRelationshipValidator = v.union(
  v.literal("mother"),
  v.literal("father"),
  v.literal("legal_guardian"),
  v.literal("other_relative"),
);

export const guardianLinks = defineTable({
  academyId: v.id("academies"),
  guardianUserId: v.optional(v.id("users")),
  invitedEmail: v.string(),
  invitedPhone: v.optional(v.string()),
  athleteId: v.id("athletes"),
  relationship: guardianRelationshipValidator,
  isPrimaryContact: v.boolean(),
  canManageBilling: v.boolean(),
  hasSignedMedicalConsent: v.boolean(),
  medicalConsentSignedAt: v.optional(v.number()),
  hasSignedMediaRelease: v.boolean(),
  createdAt: v.number(),
  createdBy: v.id("users"),
})
  .index("by_athlete", ["athleteId"])
  .index("by_guardian_user", ["guardianUserId"])
  .index("by_invited_email", ["invitedEmail"])
  .index("by_academy_and_guardian", ["academyId", "guardianUserId"]);
