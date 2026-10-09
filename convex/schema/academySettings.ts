import { defineTable } from "convex/server";
import { v } from "convex/values";

export const benchmarkTargetValidator = v.object({
  benchmark: v.number(),
  unit: v.string(),
  lowerBetter: v.boolean(),
  attribute: v.optional(v.string()),
});

export const academySettings = defineTable({
  academyId: v.id("academies"),
  benchmarks: v.optional(v.record(v.string(), benchmarkTargetValidator)),
  defaultCurrency: v.optional(v.string()),
  timezone: v.optional(v.string()),
  feeDueDayOfMonth: v.optional(v.number()),
  attendancePinLength: v.optional(v.number()),
  enableTacticalAI: v.optional(v.boolean()),
  enableVideoAnalysis: v.optional(v.boolean()),
  branding: v.optional(
    v.object({
      primaryColor: v.optional(v.string()),
      logoUrl: v.optional(v.string()),
    }),
  ),
  updatedAt: v.optional(v.string()),
  updatedBy: v.optional(v.id("users")),
}).index("by_academy", ["academyId"]);
