import { defineTable } from "convex/server";
import { v } from "convex/values";

export const availabilityStatusValidator = v.union(
  v.literal("fit"),
  v.literal("modified_training"),
  v.literal("injured_out"),
  v.literal("illness"),
);

export const lateralityValidator = v.union(
  v.literal("left"),
  v.literal("right"),
  v.literal("bilateral"),
  v.literal("midline"),
  v.literal("not_applicable"),
);

export const injuryMechanismValidator = v.union(
  v.literal("contact"),
  v.literal("non_contact_overload"),
  v.literal("non_contact_acute"),
  v.literal("illness"),
  v.literal("other"),
);

export const injurySeverityValidator = v.union(
  v.literal("minor_1_7_days"),
  v.literal("moderate_8_28_days"),
  v.literal("severe_28_plus_days"),
);

export const injuries = defineTable({
  academyId: v.id("academies"),
  athleteId: v.id("athletes"),
  availabilityStatus: availabilityStatusValidator,
  bodyPart: v.string(),
  laterality: v.optional(lateralityValidator),
  mechanism: injuryMechanismValidator,
  severity: injurySeverityValidator,
  injuryDate: v.number(), // Unix ms
  expectedReturnDate: v.optional(v.number()), // Unix ms
  actualReturnDate: v.optional(v.number()), // Unix ms
  isResolved: v.boolean(),
  coachingRestrictions: v.optional(v.string()),
  clinicalNotes: v.optional(v.string()),
  recordedByUserId: v.id("users"),
  updatedAt: v.number(),
})
  .index("by_athlete", ["athleteId"])
  .index("by_academy_and_status", ["academyId", "isResolved"])
  .index("by_athlete_and_resolved", ["athleteId", "isResolved"]);
