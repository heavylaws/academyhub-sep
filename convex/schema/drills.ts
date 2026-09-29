import { defineTable } from "convex/server";
import { v } from "convex/values";

export const drills = defineTable({
  academyId: v.id("academies"),
  title: v.string(),
  ageGroup: v.string(),
  birthYears: v.string(),
  category: v.string(),
  categoryLabel: v.string(),
  difficulty: v.string(),
  durationMinutes: v.number(),
  durationSeconds: v.optional(v.number()),
  recommendedSets: v.number(),
  recommendedReps: v.number(),
  gridDimensions: v.string(),
  equipment: v.array(v.string()),
  summary: v.string(),
  setup: v.string(),
  instructions: v.array(v.string()),
  coachingPoints: v.array(v.string()),
  variations: v.optional(v.array(v.string())),
  metricPresetId: v.optional(v.string()),

  // Performance Analysis and Statistics Benchmark
  metricName: v.string(),
  metricUnit: v.string(),
  benchmark: v.number(),
  isLowerBetter: v.boolean(),
  targetAttribute: v.string(),

  createdBy: v.id("users"),
  createdByName: v.optional(v.string()),
  createdByRole: v.optional(v.string()),
  createdAt: v.string(),
})
  .index("by_academy", ["academyId"])
  .index("by_academy_and_ageGroup", ["academyId", "ageGroup"])
  .index("by_academy_and_category", ["academyId", "category"]);
