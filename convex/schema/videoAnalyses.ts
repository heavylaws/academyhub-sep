import { defineTable } from "convex/server";
import { v } from "convex/values";

export const videoAnalysisStatusValidator = v.union(
  v.literal("pending"),
  v.literal("analyzing"),
  v.literal("complete"),
  v.literal("completed"),
  v.literal("failed"),
  v.literal("uploading"),
  v.literal("queued"),
  v.literal("processing"),
);

export const keyframeObservationValidator = v.object({
  timestampSec: v.number(),
  phase: v.string(),
  observation: v.string(),
  riskLevel: v.union(v.literal("low"), v.literal("moderate"), v.literal("high")),
});

export const jointAngleValidator = v.object({
  jointName: v.string(),
  measuredAngleDeg: v.number(),
  idealRangeDeg: v.string(),
  deviationStatus: v.union(v.literal("optimal"), v.literal("suboptimal"), v.literal("critical")),
});

export const recommendedCorrectiveDrillValidator = v.object({
  name: v.string(),
  sets: v.number(),
  reps: v.string(),
  focusArea: v.string(),
  coachingCue: v.string(),
});

export const structuredTelemetryValidator = v.object({
  overallBiomechanicsScore: v.number(),
  keyframeObservations: v.array(keyframeObservationValidator),
  jointAngles: v.array(jointAngleValidator),
  detectedFlaws: v.array(v.string()),
  recommendedCorrectiveDrills: v.array(recommendedCorrectiveDrillValidator),
});

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
  /** Phase 5: Resilient retry tracking and structured biomechanical telemetry */
  retryCount: v.optional(v.number()),
  lastError: v.optional(v.string()),
  structuredTelemetry: v.optional(structuredTelemetryValidator),
  appliedToPlanId: v.optional(v.id("trainingPlans")),
  appliedAt: v.optional(v.number()),
  createdBy: v.id("users"),
})
  .index("by_athlete", ["athleteId"])
  .index("by_athlete_and_status", ["athleteId", "status"])
  .index("by_academy", ["academyId"]);

