import { defineTable } from "convex/server";
import { v } from "convex/values";

export const videoAnalysisStatusValidator = v.union(
  v.literal("pending"),
  v.literal("analyzing"),
  v.literal("complete"),
  v.literal("failed"),
);

export const videoAnalyses = defineTable({
  academyId: v.id("academies"),
  athleteId: v.id("athletes"),
  /** Convex storage ID for the uploaded video file */
  storageId: v.id("_storage"),
  /** Original filename, stored separately since Convex doesn't keep it */
  filename: v.string(),
  /** Coach's context note, e.g. "sprint start, focus on drive phase" */
  context: v.optional(v.string()),
  status: videoAnalysisStatusValidator,
  /** ISO string when analysis was requested */
  requestedAt: v.string(),
  /** ISO string when analysis completed */
  completedAt: v.optional(v.string()),
  /** Structured AI feedback returned after analysis */
  feedback: v.optional(
    v.object({
      summary: v.string(),
      strengths: v.array(v.string()),
      improvements: v.array(v.string()),
      metrics: v.array(
        v.object({
          label: v.string(),
          value: v.string(),
          note: v.optional(v.string()),
        }),
      ),
      recommendations: v.array(v.string()),
    }),
  ),
  errorMessage: v.optional(v.string()),
  createdBy: v.id("users"),
})
  .index("by_athlete", ["athleteId"])
  .index("by_athlete_and_status", ["athleteId", "status"])
  .index("by_academy", ["academyId"]);
