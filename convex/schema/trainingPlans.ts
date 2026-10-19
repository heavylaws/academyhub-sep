import { defineTable } from "convex/server";
import { v } from "convex/values";

export const planStatusValidator = v.union(
  v.literal("active"),
  v.literal("completed"),
  v.literal("archived"),
);

export const periodizationPhaseValidator = v.union(
  v.literal("pre_season"),
  v.literal("in_season_early"),
  v.literal("in_season_peak"),
  v.literal("transition_off_season"),
  v.literal("rehab_return_to_play"),
);

export const trainingPlans = defineTable({
  academyId: v.id("academies"),
  athleteId: v.optional(v.id("athletes")),
  title: v.string(),
  description: v.optional(v.string()),
  status: planStatusValidator,
  startDate: v.optional(v.string()), // YYYY-MM-DD
  endDate: v.optional(v.string()), // YYYY-MM-DD
  isTemplate: v.optional(v.boolean()),
  phase: v.optional(periodizationPhaseValidator),
  microcycleTag: v.optional(v.string()),
  targetAgeGroup: v.optional(v.string()),
  sourceTemplateId: v.optional(v.id("trainingPlans")),
  createdBy: v.id("users"),
  createdAt: v.string(),
})
  .index("by_academy", ["academyId"])
  .index("by_athlete", ["athleteId"])
  .index("by_athlete_and_status", ["athleteId", "status"]);

export const planItems = defineTable({
  planId: v.id("trainingPlans"),
  academyId: v.id("academies"),
  /** Ordering within the plan (0-based). */
  order: v.number(),
  /** Exercise or drill name. */
  name: v.string(),
  /** Optional detail: sets × reps, duration, distance, etc. */
  sets: v.optional(v.number()),
  reps: v.optional(v.number()),
  durationSeconds: v.optional(v.number()),
  notes: v.optional(v.string()),
  /** Trainer-entered result / completion notes. */
  result: v.optional(v.string()),
  completedAt: v.optional(v.string()),
  completedBy: v.optional(v.id("users")),
})
  .index("by_plan", ["planId"])
  .index("by_plan_and_order", ["planId", "order"]);
