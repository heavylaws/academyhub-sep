import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tacticalPlans = defineTable({
  academyId: v.id("academies"),
  title: v.string(),
  drillId: v.optional(v.string()),
  category: v.optional(v.string()),
  pitchType: v.string(),
  gridDimensions: v.optional(v.string()),
  coachingPoints: v.array(v.string()),
  planData: v.string(), // Serialized JSON of TacticalPlan

  createdBy: v.id("users"),
  createdByName: v.optional(v.string()),
  createdByRole: v.optional(v.string()),
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_academy", ["academyId"])
  .index("by_drill", ["drillId"]);
