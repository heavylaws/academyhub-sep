import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireAthleteAccess, requireRole } from "./lib/auth.ts";
import { internal } from "./_generated/api.js";
import {
  videoAnalysisStatusValidator,
  structuredTelemetryValidator,
} from "./schema/videoAnalyses.ts";
import type { Doc } from "./_generated/dataModel.d.ts";

/** Step 1: generate a short-lived upload URL for the client to POST the video file to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [
      "platform_admin",
      "academy_admin",
      "sporting_director",
      "medical_staff",
      "coach",
    ]);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Step 2: save the storage ID and kick off AI analysis. */
export const saveVideoAndAnalyze = mutation({
  args: {
    athleteId: v.id("athletes"),
    storageId: v.id("_storage"),
    filename: v.string(),
    context: v.optional(v.string()),
    /** Base64-encoded JPEG frames extracted client-side */
    frames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "platform_admin",
      "academy_admin",
      "sporting_director",
      "medical_staff",
      "coach",
    ]);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete)
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    await requireAcademyMember(ctx, athlete.academyId);

    const athleteName = `${athlete.firstName} ${athlete.lastName}`;

    const analysisId = await ctx.db.insert("videoAnalyses", {
      academyId: athlete.academyId,
      athleteId: args.athleteId,
      storageId: args.storageId,
      filename: args.filename,
      context: args.context,
      status: "analyzing",
      requestedAt: new Date().toISOString(),
      createdBy: user._id,
      retryCount: 0,
    });

    // Kick off Node.js AI action asynchronously
    await ctx.scheduler.runAfter(0, internal.videoAnalysis.runAiAnalysis, {
      analysisId,
      athleteName,
      context: args.context,
      frames: args.frames,
    });

    return analysisId;
  },
});

/** Delete a video analysis record and its storage file. */
export const deleteAnalysis = mutation({
  args: { analysisId: v.id("videoAnalyses") },
  handler: async (ctx, args) => {
    await requireRole(ctx, [
      "platform_admin",
      "academy_admin",
      "sporting_director",
      "medical_staff",
      "coach",
    ]);
    const record = await ctx.db.get("videoAnalyses", args.analysisId);
    if (!record)
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Analysis not found",
      });
    await requireAcademyMember(ctx, record.academyId);
    await ctx.storage.delete(record.storageId);
    await ctx.db.delete("videoAnalyses", args.analysisId);
    return null;
  },
});

/** List all video analyses for an athlete, newest first. */
export const listAnalysesForAthlete = query({
  args: { athleteId: v.id("athletes") },
  handler: async (
    ctx,
    args,
  ): Promise<(Doc<"videoAnalyses"> & { videoUrl: string | null })[]> => {
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete)
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    await requireAthleteAccess(ctx, args.athleteId);

    const records = await ctx.db
      .query("videoAnalyses")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .order("desc")
      .collect();

    return await Promise.all(
      records.map(async (r) => ({
        ...r,
        videoUrl: await ctx.storage.getUrl(r.storageId),
      })),
    );
  },
});

/** Query a single analysis by ID */
export const getAnalysis = query({
  args: { analysisId: v.id("videoAnalyses") },
  handler: async (
    ctx,
    args,
  ): Promise<(Doc<"videoAnalyses"> & { videoUrl: string | null }) | null> => {
    const record = await ctx.db.get("videoAnalyses", args.analysisId);
    if (!record) return null;
    await requireAthleteAccess(ctx, record.athleteId);
    return {
      ...record,
      videoUrl: await ctx.storage.getUrl(record.storageId),
    };
  },
});

/**
 * Retry an analysis that is in 'failed' (or stuck 'processing'/'analyzing') status.
 * Increments retryCount, clears lastError, sets status to 'processing', and schedules re-execution.
 */
export const retryVideoAnalysis = mutation({
  args: {
    analysisId: v.id("videoAnalyses"),
    simulateFailure: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [
      "platform_admin",
      "academy_admin",
      "sporting_director",
      "medical_staff",
      "coach",
    ]);

    const record = await ctx.db.get("videoAnalyses", args.analysisId);
    if (!record) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Analysis not found",
      });
    }
    await requireAcademyMember(ctx, record.academyId);

    const nextRetryCount = (record.retryCount ?? 0) + 1;
    await ctx.db.patch("videoAnalyses", args.analysisId, {
      status: "processing",
      retryCount: nextRetryCount,
      errorMessage: undefined,
      lastError: undefined,
    });

    const athlete = await ctx.db.get("athletes", record.athleteId);
    const athleteName = athlete
      ? `${athlete.firstName} ${athlete.lastName}`
      : "Athlete";

    await ctx.scheduler.runAfter(0, internal.videoAnalysis.runAiAnalysis, {
      analysisId: record._id,
      athleteName,
      context: record.context,
      frames: [],
      simulateFailure: args.simulateFailure,
    });

    return { success: true, retryCount: nextRetryCount };
  },
});

/**
 * 1-Click Corrective Action Linking:
 * Appends recommended corrective drills from video biomechanics analysis to an athlete's
 * training plan (either an existing active plan, or creates a new corrective training plan).
 */
export const applyCorrectiveDrillsToPlan = mutation({
  args: {
    analysisId: v.id("videoAnalyses"),
    targetPlanId: v.optional(v.id("trainingPlans")),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "platform_admin",
      "academy_admin",
      "sporting_director",
      "coach",
      "medical_staff",
    ]);

    const record = await ctx.db.get("videoAnalyses", args.analysisId);
    if (!record) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Analysis not found",
      });
    }
    await requireAcademyMember(ctx, record.academyId);

    // Extract drills from structuredTelemetry or fallback recommendations
    const telemetryDrills =
      record.structuredTelemetry?.recommendedCorrectiveDrills ?? [];

    const drillsToApply =
      telemetryDrills.length > 0
        ? telemetryDrills
        : (record.feedback?.recommendations ?? []).map((rec, i) => ({
            name: `Corrective Movement Drill #${i + 1}`,
            sets: 3,
            reps: "10 reps",
            focusArea: "Technique & Biomechanical Alignment",
            coachingCue: rec,
          }));

    if (drillsToApply.length === 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "No recommended corrective drills available on this analysis",
      });
    }

    let finalPlanId = args.targetPlanId;
    let addedDrillsCount = 0;

    if (finalPlanId) {
      const targetPlan = await ctx.db.get("trainingPlans", finalPlanId);
      if (!targetPlan) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Target training plan not found",
        });
      }
      if (targetPlan.academyId !== record.academyId) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Target plan belongs to a different academy",
        });
      }

      const existingItems = await ctx.db
        .query("planItems")
        .withIndex("by_plan", (q) => q.eq("planId", targetPlan._id))
        .collect();

      const existingNames = new Set(
        existingItems.map((item) => item.name.trim().toLowerCase()),
      );
      let nextOrder =
        existingItems.length > 0
          ? Math.max(...existingItems.map((item) => item.order)) + 1
          : 0;

      for (const drill of drillsToApply) {
        const normalized = drill.name.trim().toLowerCase();
        if (existingNames.has(normalized)) continue;

        const numericReps = parseInt(drill.reps, 10);
        await ctx.db.insert("planItems", {
          planId: targetPlan._id,
          academyId: record.academyId,
          order: nextOrder++,
          name: drill.name,
          sets: drill.sets,
          reps: !Number.isNaN(numericReps) ? numericReps : undefined,
          notes:
            [drill.focusArea, drill.coachingCue].filter(Boolean).join(" — ") ||
            undefined,
        });

        existingNames.add(normalized);
        addedDrillsCount++;
      }
    } else {
      const movementLabel =
        record.context?.trim() ||
        record.filename.replace(/\.[^/.]+$/, "") ||
        "Technique";

      finalPlanId = await ctx.db.insert("trainingPlans", {
        academyId: record.academyId,
        athleteId: record.athleteId,
        title: `AI Biomechanics Corrective Plan — ${movementLabel}`,
        description:
          "AI-generated corrective exercise progression targeting biomechanical deviations detected in video analysis.",
        status: "active",
        phase: "rehab_return_to_play",
        createdBy: user._id,
        createdAt: new Date().toISOString(),
      });

      for (let i = 0; i < drillsToApply.length; i++) {
        const drill = drillsToApply[i];
        const numericReps = parseInt(drill.reps, 10);
        await ctx.db.insert("planItems", {
          planId: finalPlanId,
          academyId: record.academyId,
          order: i,
          name: drill.name,
          sets: drill.sets,
          reps: !Number.isNaN(numericReps) ? numericReps : undefined,
          notes:
            [drill.focusArea, drill.coachingCue].filter(Boolean).join(" — ") ||
            undefined,
        });
        addedDrillsCount++;
      }
    }

    await ctx.db.patch("videoAnalyses", record._id, {
      appliedToPlanId: finalPlanId,
      appliedAt: Date.now(),
    });

    return {
      planId: finalPlanId,
      addedDrillsCount,
    };
  },
});

/** Internal: patch analysis status/feedback/telemetry — called from the Node.js action. */
export const patchAnalysis = internalMutation({
  args: {
    analysisId: v.id("videoAnalyses"),
    patch: v.object({
      status: videoAnalysisStatusValidator,
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
      structuredTelemetry: v.optional(structuredTelemetryValidator),
      completedAt: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
      lastError: v.optional(v.string()),
      retryCount: v.optional(v.number()),
      appliedToPlanId: v.optional(v.id("trainingPlans")),
      appliedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args): Promise<void> => {
    const existing = await ctx.db.get("videoAnalyses", args.analysisId);
    if (!existing) return;
    await ctx.db.patch("videoAnalyses", args.analysisId, args.patch);
  },
});
