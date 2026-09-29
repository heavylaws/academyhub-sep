import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireAthleteAccess, requireRole } from "./lib/auth.ts";
import type { Doc } from "./_generated/dataModel.d.ts";

/** Trainer records a new assessment data point for an athlete. */
export const recordAssessment = mutation({
  args: {
    athleteId: v.id("athletes"),
    metric: v.string(),
    value: v.number(),
    unit: v.optional(v.string()),
    assessedOn: v.string(),
    sessionId: v.optional(v.id("trainingSessions")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }
    await requireAcademyMember(ctx, athlete.academyId);
    if (!args.metric.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Metric name is required",
      });
    }
    return await ctx.db.insert("assessments", {
      academyId: athlete.academyId,
      athleteId: args.athleteId,
      sessionId: args.sessionId,
      metric: args.metric.trim(),
      value: args.value,
      unit: args.unit,
      assessedOn: args.assessedOn,
      notes: args.notes,
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });
  },
});

/** Delete a single assessment record. */
export const deleteAssessment = mutation({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const record = await ctx.db.get("assessments", args.assessmentId);
    if (!record) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Assessment not found",
      });
    }
    await requireAcademyMember(ctx, record.academyId);
    await ctx.db.delete("assessments", args.assessmentId);
    return null;
  },
});

/**
 * Returns all assessments for an athlete, grouped by metric.
 * Each metric entry contains the sorted data points for charting.
 */
export const listAssessmentsForAthlete = query({
  args: { athleteId: v.id("athletes") },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<{
      metric: string;
      unit: string | undefined;
      points: Array<{
        _id: string;
        assessedOn: string;
        value: number;
        notes: string | undefined;
      }>;
    }>
  > => {
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }
    await requireAthleteAccess(ctx, args.athleteId);

    const records = await ctx.db
      .query("assessments")
      .withIndex("by_athlete_and_assessedOn", (q) =>
        q.eq("athleteId", args.athleteId),
      )
      .order("asc")
      .collect();

    // Group by metric
    const byMetric = new Map<
      string,
      { unit: string | undefined; points: Doc<"assessments">[] }
    >();
    for (const r of records) {
      const entry = byMetric.get(r.metric);
      if (entry) {
        entry.points.push(r);
        // prefer the most recent unit if provided
        if (r.unit) entry.unit = r.unit;
      } else {
        byMetric.set(r.metric, { unit: r.unit, points: [r] });
      }
    }

    return Array.from(byMetric.entries()).map(([metric, { unit, points }]) => ({
      metric,
      unit,
      points: points.map((p) => ({
        _id: p._id,
        assessedOn: p.assessedOn,
        value: p.value,
        notes: p.notes,
      })),
    }));
  },
});

/** Coach/Admin: batch record assessment results for a team session. */
export const recordBatchSessionAssessments = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    metric: v.string(),
    unit: v.optional(v.string()),
    assessedOn: v.string(),
    entries: v.array(
      v.object({
        athleteId: v.id("athletes"),
        value: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Training session not found",
      });
    }
    await requireAcademyMember(ctx, session.academyId);
    if (!args.metric.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Metric name is required",
      });
    }

    const insertedIds: string[] = [];
    const now = new Date().toISOString();

    for (const entry of args.entries) {
      if (entry.value !== undefined && !isNaN(entry.value)) {
        const id = await ctx.db.insert("assessments", {
          academyId: session.academyId,
          athleteId: entry.athleteId,
          sessionId: session._id,
          metric: args.metric.trim(),
          value: entry.value,
          unit: args.unit?.trim() || undefined,
          assessedOn: args.assessedOn,
          notes: entry.notes?.trim() || undefined,
          createdBy: user._id,
          createdAt: now,
        });
        insertedIds.push(id);
      }
    }
    return { count: insertedIds.length, ids: insertedIds };
  },
});

/** Query all assessments recorded during a specific training session. */
export const listAssessmentsForSession = query({
  args: { sessionId: v.id("trainingSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      return [];
    }
    await requireAcademyMember(ctx, session.academyId);

    const records = await ctx.db
      .query("assessments")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();

    // Enrich with athlete details
    const enriched = await Promise.all(
      records.map(async (r) => {
        const athlete = await ctx.db.get("athletes", r.athleteId);
        return {
          ...r,
          athleteName: athlete
            ? `${athlete.firstName} ${athlete.lastName}`
            : "Unknown Athlete",
        };
      }),
    );

    return enriched;
  },
});

/** Query all assessments for academy analytics and drill performance tracking. */
export const listAssessmentsForAnalytics = query({
  args: {
    metric: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    let records: Doc<"assessments">[];
    if (user.role === "platform_admin" && !user.academyId) {
      records = await ctx.db.query("assessments").order("desc").take(500);
    } else {
      const academyId = user.academyId!;
      records = await ctx.db
        .query("assessments")
        .withIndex("by_academy", (q) => q.eq("academyId", academyId))
        .order("desc")
        .take(500);
    }

    if (args.metric) {
      const term = args.metric.toLowerCase();
      records = records.filter((r) => r.metric.toLowerCase().includes(term));
    }

    return records.map((r) => ({
      _id: r._id,
      athleteId: r.athleteId,
      sessionId: r.sessionId,
      metric: r.metric,
      value: r.value,
      unit: r.unit,
      assessedOn: r.assessedOn,
      notes: r.notes,
    }));
  },
});
