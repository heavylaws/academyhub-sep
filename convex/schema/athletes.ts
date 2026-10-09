import { defineTable } from "convex/server";
import { v } from "convex/values";

export const athleteGenderValidator = v.union(
  v.literal("male"),
  v.literal("female"),
  v.literal("other"),
);

export const athletes = defineTable({
  academyId: v.id("academies"),
  // Linked login account, if this athlete has also been invited to sign in.
  userId: v.optional(v.id("users")),
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.optional(v.string()),
  gender: v.optional(athleteGenderValidator),
  sport: v.optional(v.string()),
  heightCm: v.optional(v.number()),
  weightKg: v.optional(v.number()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  guardianName: v.optional(v.string()),
  guardianPhone: v.optional(v.string()),
  guardianEmail: v.optional(v.string()),
  guardianUserId: v.optional(v.id("users")),
  notes: v.optional(v.string()),
  status: v.union(v.literal("active"), v.literal("inactive")),
  checkInPin: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.string(),
  deletedAt: v.optional(v.string()),
  deletedBy: v.optional(v.id("users")),
})
  .index("by_academy", ["academyId"])
  .index("by_academy_and_status", ["academyId", "status"])
  .index("by_academy_and_email", ["academyId", "email"])
  .index("by_academy_and_pin", ["academyId", "checkInPin"])
  .index("by_email", ["email"])
  .index("by_user", ["userId"])
  .index("by_guardian_user", ["guardianUserId"])
  .index("by_guardian_email", ["guardianEmail"]);
