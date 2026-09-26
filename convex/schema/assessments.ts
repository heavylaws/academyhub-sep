import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Pre-defined metric categories to group the charts.
 * Trainers can also type a custom metric name.
 */
export const assessments = defineTable({
  academyId: v.id("academies"),
  athleteId: v.id("athletes"),
  /** Human-readable metric name, e.g. "Sprint 40m (s)", "Vertical Jump (cm)" */
  metric: v.string(),
  /** Numeric value recorded */
  value: v.number(),
  /** Optional unit label shown on the chart axis, e.g. "s", "cm", "kg" */
  unit: v.optional(v.string()),
  /** YYYY-MM-DD – the day the assessment was performed */
  assessedOn: v.string(),
  sessionId: v.optional(v.id("trainingSessions")),
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.string(),
})
  .index("by_athlete", ["athleteId"])
  .index("by_athlete_and_metric", ["athleteId", "metric"])
  .index("by_athlete_and_assessedOn", ["athleteId", "assessedOn"])
  .index("by_academy", ["academyId"])
  .index("by_academy_and_assessedOn", ["academyId", "assessedOn"])
  .index("by_session", ["sessionId"])
  .index("by_session_and_metric", ["sessionId", "metric"]);
