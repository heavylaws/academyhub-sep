import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireAthleteAccess, requireRole } from "./lib/auth.ts";
import { internal } from "./_generated/api.js";
import type { Doc } from "./_generated/dataModel.d.ts";

/** Step 1: generate a short-lived upload URL for the client to POST the video file to. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
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
    /** Base64-encoded JPEG frames (4 frames) extracted client-side */
    frames: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
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
    await requireRole(ctx, ["academy_admin", "coach"]);
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

/** Internal: patch analysis status/feedback — called from the Node.js action. */
export const patchAnalysis = internalMutation({
  args: {
    analysisId: v.id("videoAnalyses"),
    patch: v.object({
      status: v.union(v.literal("complete"), v.literal("failed")),
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
      completedAt: v.optional(v.string()),
      errorMessage: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.db.patch("videoAnalyses", args.analysisId, args.patch);
  },
});
