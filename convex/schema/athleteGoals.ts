import { defineTable } from "convex/server";
import { v } from "convex/values";

export const goalCornerValidator = v.union(
  v.literal("physical"),
  v.literal("technical"),
  v.literal("tactical"),
  v.literal("psychological"),
);

export const goalOptimizationDirectionValidator = v.union(
  v.literal("higher_is_better"),
  v.literal("lower_is_better"),
);

export const goalStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("achieved"),
  v.literal("at_risk"),
  v.literal("archived"),
);

export const athleteGoals = defineTable({
  academyId: v.id("academies"),
  athleteId: v.id("athletes"),
  createdByUserId: v.id("users"),
  title: v.string(),
  corner: goalCornerValidator,
  linkedMetricName: v.optional(v.string()),
  baselineValue: v.optional(v.number()),
  targetValue: v.optional(v.number()),
  currentValue: v.optional(v.number()),
  unit: v.optional(v.string()),
  optimizationDirection: v.optional(goalOptimizationDirectionValidator),
  targetDate: v.string(),
  status: goalStatusValidator,
  actionPlanNotes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_athlete", ["athleteId"])
  .index("by_academy_and_status", ["academyId", "status"]);
