import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireAthleteAccess, requireRole, requireUser } from "./lib/auth.ts";
import { logAction } from "./lib/logger.ts";
import {
  sanitizeOptionalString,
  sanitizeOptionalText,
  sanitizeString,
} from "./lib/sanitize.ts";
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
    const cleanMetric = sanitizeString(args.metric, 80, "Metric name");
    if (!cleanMetric) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Metric name is required",
      });
    }
    const id = await ctx.db.insert("assessments", {
      academyId: athlete.academyId,
      athleteId: args.athleteId,
      sessionId: args.sessionId,
      metric: cleanMetric,
      value: args.value,
      unit: sanitizeOptionalString(args.unit, 30, "Unit"),
      assessedOn: args.assessedOn,
      notes: sanitizeOptionalText(args.notes, 2000, "Notes"),
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });
    logAction("assessment:record", {
      userId: user._id,
      academyId: athlete.academyId,
      athleteId: args.athleteId,
      metric: cleanMetric,
      value: args.value,
      assessmentId: id,
    });
    return id;
  },
});

/** Delete a single assessment record. */
export const deleteAssessment = mutation({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    const record = await ctx.db.get("assessments", args.assessmentId);
    if (!record || record.deletedAt) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Assessment not found",
      });
    }
    await requireAcademyMember(ctx, record.academyId);
    await ctx.db.patch("assessments", args.assessmentId, {
      deletedAt: new Date().toISOString(),
      deletedBy: user._id,
    });
    logAction("assessment:delete", {
      userId: user._id,
      academyId: record.academyId,
      assessmentId: args.assessmentId,
    });
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
      if (r.deletedAt) continue;
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

import { paginationOptsValidator } from "convex/server";

/** Query assessments for academy analytics and drill performance tracking with configurable limit. */
export const listAssessmentsForAnalytics = query({
  args: {
    metric: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const fetchLimit = Math.min(Math.max(args.limit ?? 500, 1), 2000);

    let records: Doc<"assessments">[];
    if (user.role === "platform_admin" && !user.academyId) {
      records = await ctx.db.query("assessments").order("desc").take(fetchLimit);
    } else {
      const academyId = user.academyId!;
      records = await ctx.db
        .query("assessments")
        .withIndex("by_academy", (q) => q.eq("academyId", academyId))
        .order("desc")
        .take(fetchLimit);
    }

    records = records.filter((r) => !r.deletedAt);

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

/** Paginated query for large assessment analytics datasets. */
export const listAssessmentsForAnalyticsPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    metric: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const queryBase =
      user.role === "platform_admin" && !user.academyId
        ? ctx.db.query("assessments")
        : ctx.db
            .query("assessments")
            .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!));

    const page = await queryBase.order("desc").paginate(args.paginationOpts);

    let pageResults = page.page.filter((r) => !r.deletedAt);
    if (args.metric) {
      const term = args.metric.toLowerCase();
      pageResults = pageResults.filter((r) => r.metric.toLowerCase().includes(term));
    }

    return {
      ...page,
      page: pageResults.map((r) => ({
        _id: r._id,
        athleteId: r.athleteId,
        sessionId: r.sessionId,
        metric: r.metric,
        value: r.value,
        unit: r.unit,
        assessedOn: r.assessedOn,
        notes: r.notes,
      })),
    };
  },
});

/** Compute actual aggregated academy averages across the 6 athletic competencies */
export const getAcademyAverages = query({
  args: {
    academyId: v.optional(v.id("academies")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const targetAcademyId = args.academyId || user.academyId;

    const defaultAverages = {
      Speed: 72,
      Power: 68,
      Agility: 70,
      Strength: 65,
      Endurance: 75,
      Mobility: 78,
    };

    if (!targetAcademyId) {
      return defaultAverages;
    }

    const records = await ctx.db
      .query("assessments")
      .withIndex("by_academy", (q) => q.eq("academyId", targetAcademyId))
      .take(1000);

    if (records.length === 0) {
      return defaultAverages;
    }

    const pillarScores: Record<string, number[]> = {
      Speed: [],
      Power: [],
      Agility: [],
      Strength: [],
      Endurance: [],
      Mobility: [],
    };

    for (const r of records) {
      if (r.deletedAt) continue;
      const name = r.metric.toLowerCase();
      const val = typeof r.value === "number" ? r.value : 50;
      const normalizedScore = Math.min(100, Math.max(40, Math.round(val <= 15 ? val * 6 : val)));

      if (name.includes("sprint") || name.includes("dash") || name.includes("100m") || name.includes("speed")) {
        pillarScores.Speed.push(normalizedScore);
      } else if (name.includes("jump") || name.includes("power") || name.includes("watt")) {
        pillarScores.Power.push(normalizedScore);
      } else if (name.includes("agility") || name.includes("shuttle") || name.includes("t-test") || name.includes("dribbl")) {
        pillarScores.Agility.push(normalizedScore);
      } else if (name.includes("squat") || name.includes("bench") || name.includes("1rm") || name.includes("strength") || name.includes("press")) {
        pillarScores.Strength.push(normalizedScore);
      } else if (name.includes("yo-yo") || name.includes("mile") || name.includes("endurance") || name.includes("run")) {
        pillarScores.Endurance.push(normalizedScore);
      } else {
        pillarScores.Mobility.push(normalizedScore);
      }
    }

    const mean = (scores: number[], defaultVal: number) =>
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : defaultVal;

    return {
      Speed: mean(pillarScores.Speed, defaultAverages.Speed),
      Power: mean(pillarScores.Power, defaultAverages.Power),
      Agility: mean(pillarScores.Agility, defaultAverages.Agility),
      Strength: mean(pillarScores.Strength, defaultAverages.Strength),
      Endurance: mean(pillarScores.Endurance, defaultAverages.Endurance),
      Mobility: mean(pillarScores.Mobility, defaultAverages.Mobility),
    };
  },
});

