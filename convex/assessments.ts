import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireAthleteAccess, requireRole, requireUser } from "./lib/auth.ts";
import { logAction } from "./lib/logger.ts";
import {
  sanitizeOptionalString,
  sanitizeOptionalText,
  sanitizeString,
} from "./lib/sanitize.ts";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

function inferAssessmentOptimizationDirection(
  explicitDirection?: "higher_is_better" | "lower_is_better",
  unit?: string,
): "higher_is_better" | "lower_is_better" {
  if (explicitDirection) return explicitDirection;
  if (!unit) return "higher_is_better";
  const clean = unit.trim().toLowerCase();
  if (clean === "s" || clean === "sec" || clean === "seconds" || clean === "ms") {
    return "lower_is_better";
  }
  return "higher_is_better";
}

function normalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const prob =
    d *
    t *
    (0.31938153 +
      t *
        (-0.356563782 +
          t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return z > 0 ? 1 - prob : prob;
}

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
    corner: v.optional(
      v.union(
        v.literal("physical"),
        v.literal("technical"),
        v.literal("tactical"),
        v.literal("psychological"),
      ),
    ),
    optimizationDirection: v.optional(
      v.union(v.literal("higher_is_better"), v.literal("lower_is_better")),
    ),
    ageGroupSnapshot: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "sporting_director", "medical_staff", "coach"]);
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
    const cleanUnit = sanitizeOptionalString(args.unit, 30, "Unit");
    const direction = inferAssessmentOptimizationDirection(
      args.optimizationDirection,
      cleanUnit,
    );
    const corner = args.corner ?? "physical";

    const id = await ctx.db.insert("assessments", {
      academyId: athlete.academyId,
      athleteId: args.athleteId,
      sessionId: args.sessionId,
      metric: cleanMetric,
      value: args.value,
      unit: cleanUnit,
      assessedOn: args.assessedOn,
      notes: sanitizeOptionalText(args.notes, 2000, "Notes"),
      corner,
      optimizationDirection: direction,
      ageGroupSnapshot: sanitizeOptionalString(args.ageGroupSnapshot, 30, "Age group"),
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
    const user = await requireRole(ctx, ["academy_admin", "sporting_director", "medical_staff", "coach"]);
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
    corner: v.optional(
      v.union(
        v.literal("physical"),
        v.literal("technical"),
        v.literal("tactical"),
        v.literal("psychological"),
      ),
    ),
    optimizationDirection: v.optional(
      v.union(v.literal("higher_is_better"), v.literal("lower_is_better")),
    ),
    ageGroupSnapshot: v.optional(v.string()),
    entries: v.array(
      v.object({
        athleteId: v.id("athletes"),
        value: v.number(),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "sporting_director", "medical_staff", "coach"]);
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

    const cleanUnit = args.unit?.trim() || undefined;
    const direction = inferAssessmentOptimizationDirection(
      args.optimizationDirection,
      cleanUnit,
    );
    const corner = args.corner ?? "physical";
    const cleanAgeGroup = args.ageGroupSnapshot?.trim() || undefined;

    const insertedIds: string[] = [];
    const now = new Date().toISOString();

    for (const entry of args.entries) {
      if (entry.value !== undefined && !isNaN(entry.value)) {
        const athlete = await ctx.db.get("athletes", entry.athleteId);
        if (!athlete || athlete.academyId !== session.academyId) {
          continue;
        }
        const id = await ctx.db.insert("assessments", {
          academyId: session.academyId,
          athleteId: entry.athleteId,
          sessionId: session._id,
          metric: args.metric.trim(),
          value: entry.value,
          unit: cleanUnit,
          assessedOn: args.assessedOn,
          notes: entry.notes?.trim() || undefined,
          corner,
          optimizationDirection: direction,
          ageGroupSnapshot: cleanAgeGroup,
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
    const user = await requireRole(ctx, ["academy_admin", "sporting_director", "medical_staff", "coach", "platform_admin"]);
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
    const user = await requireRole(ctx, ["academy_admin", "sporting_director", "medical_staff", "coach", "platform_admin"]);
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
    const targetAcademyId =
      user.role === "platform_admin" && args.academyId
        ? args.academyId
        : user.academyId;

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
    await requireAcademyMember(ctx, targetAcademyId);

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

/**
 * 4-Corner Assessments & Cohort Z-Score Benchmarking Engine.
 * Evaluates an athlete against their squad or academy cohort with directional normalization.
 */
export const getAthleteBenchmarkReport = query({
  args: {
    athleteId: v.id("athletes"),
    teamId: v.optional(v.id("teams")),
  },
  handler: async (ctx, args) => {
    const { athlete } = await requireAthleteAccess(ctx, args.athleteId);

    let targetTeamId = args.teamId;
    let targetTeamName: string | undefined;

    if (targetTeamId) {
      const team = await ctx.db.get("teams", targetTeamId);
      if (!team || team.academyId !== athlete.academyId || team.deletedAt) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Team not found in this academy",
        });
      }
      targetTeamName = team.name;
    }

    // Determine comparison cohort
    let cohortAthleteIds: Set<Id<"athletes">>;

    if (targetTeamId) {
      const members = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", targetTeamId!))
        .collect();
      cohortAthleteIds = new Set(members.map((m) => m.athleteId));
    } else {
      // Find athlete's teams
      const memberships = await ctx.db
        .query("teamMembers")
        .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
        .collect();

      if (memberships.length > 0) {
        targetTeamId = memberships[0].teamId;
        const team = await ctx.db.get("teams", targetTeamId);
        targetTeamName = team?.name;
        const members = await ctx.db
          .query("teamMembers")
          .withIndex("by_team", (q) => q.eq("teamId", targetTeamId!))
          .collect();
        cohortAthleteIds = new Set(members.map((m) => m.athleteId));
      } else {
        // Unassigned athlete: compare against active athletes in academy
        const academyAthletes = await ctx.db
          .query("athletes")
          .withIndex("by_academy_and_status", (q) =>
            q.eq("academyId", athlete.academyId).eq("status", "active"),
          )
          .collect();
        cohortAthleteIds = new Set(academyAthletes.map((a) => a._id));
      }
    }

    cohortAthleteIds.add(athlete._id);
    const cohortSize = cohortAthleteIds.size;

    // Fetch target athlete's assessments
    const athleteAssessments = await ctx.db
      .query("assessments")
      .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
      .collect();

    const activeAthleteAssessments = athleteAssessments.filter(
      (a) => !a.deletedAt,
    );

    // Group to find latest assessment per metric for target athlete
    const latestByMetric = new Map<string, Doc<"assessments">>();
    for (const ass of activeAthleteAssessments) {
      const existing = latestByMetric.get(ass.metric);
      if (!existing) {
        latestByMetric.set(ass.metric, ass);
      } else {
        if (
          ass.assessedOn > existing.assessedOn ||
          (ass.assessedOn === existing.assessedOn &&
            ass.createdAt > existing.createdAt)
        ) {
          latestByMetric.set(ass.metric, ass);
        }
      }
    }

    const defaultComposites = {
      physical: 50,
      technical: 50,
      tactical: 50,
      psychological: 50,
    };

    if (latestByMetric.size === 0) {
      return {
        athleteId: athlete._id,
        athleteName: `${athlete.firstName} ${athlete.lastName}`,
        cohortSize,
        teamId: targetTeamId,
        teamName: targetTeamName,
        metrics: [],
        cornerComposites: defaultComposites,
      };
    }

    const metricResults: Array<{
      metric: string;
      corner: "physical" | "technical" | "tactical" | "psychological";
      optimizationDirection: "higher_is_better" | "lower_is_better";
      athleteValue: number;
      unit: string | undefined;
      assessedOn: string;
      cohortMean: number;
      cohortStdDev: number;
      zScore: number;
      percentile: number;
      cohortSampleCount: number;
    }> = [];

    const cornerPercentiles: Record<
      "physical" | "technical" | "tactical" | "psychological",
      number[]
    > = {
      physical: [],
      technical: [],
      tactical: [],
      psychological: [],
    };

    // For each metric recorded for this athlete, compute cohort stats
    for (const [metricName, targetAss] of latestByMetric.entries()) {
      const cohortValues: number[] = [];

      for (const cohortAthleteId of cohortAthleteIds) {
        const memberAssessments = await ctx.db
          .query("assessments")
          .withIndex("by_athlete_and_metric", (q) =>
            q.eq("athleteId", cohortAthleteId).eq("metric", metricName),
          )
          .collect();

        const valid = memberAssessments.filter((a) => !a.deletedAt);
        if (valid.length > 0) {
          valid.sort((a, b) => {
            const dateCmp = b.assessedOn.localeCompare(a.assessedOn);
            if (dateCmp !== 0) return dateCmp;
            return b.createdAt.localeCompare(a.createdAt);
          });
          cohortValues.push(valid[0].value);
        }
      }

      if (cohortValues.length === 0) {
        cohortValues.push(targetAss.value);
      }

      const sampleCount = cohortValues.length;
      const sum = cohortValues.reduce((acc, v) => acc + v, 0);
      const mean = sum / sampleCount;

      const varianceSum = cohortValues.reduce(
        (acc, v) => acc + Math.pow(v - mean, 2),
        0,
      );
      const stdDev = Math.sqrt(varianceSum / sampleCount);

      // Raw Z-Score
      let zRaw = 0;
      if (stdDev > 0.000001) {
        zRaw = (targetAss.value - mean) / stdDev;
      }

      const optDirection =
        targetAss.optimizationDirection ??
        inferAssessmentOptimizationDirection(undefined, targetAss.unit);

      // Directional normalization: if lower_is_better, invert sign
      const zNormalized = optDirection === "lower_is_better" ? -zRaw : zRaw;
      const roundedZ = Math.round(zNormalized * 100) / 100;

      // Percentile (1–99)
      const percentile = Math.min(
        99,
        Math.max(1, Math.round(normalCdf(roundedZ) * 100)),
      );

      const corner = targetAss.corner ?? "physical";
      cornerPercentiles[corner].push(percentile);

      metricResults.push({
        metric: metricName,
        corner,
        optimizationDirection: optDirection,
        athleteValue: targetAss.value,
        unit: targetAss.unit,
        assessedOn: targetAss.assessedOn,
        cohortMean: Math.round(mean * 100) / 100,
        cohortStdDev: Math.round(stdDev * 100) / 100,
        zScore: roundedZ,
        percentile,
        cohortSampleCount: sampleCount,
      });
    }

    // Sort metrics by corner then by metric name
    metricResults.sort((a, b) => {
      if (a.corner !== b.corner) return a.corner.localeCompare(b.corner);
      return a.metric.localeCompare(b.metric);
    });

    const computeCornerComposite = (
      corner: "physical" | "technical" | "tactical" | "psychological",
    ) => {
      const pcts = cornerPercentiles[corner];
      if (pcts.length === 0) return 50;
      return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
    };

    return {
      athleteId: athlete._id,
      athleteName: `${athlete.firstName} ${athlete.lastName}`,
      cohortSize,
      teamId: targetTeamId,
      teamName: targetTeamName,
      metrics: metricResults,
      cornerComposites: {
        physical: computeCornerComposite("physical"),
        technical: computeCornerComposite("technical"),
        tactical: computeCornerComposite("tactical"),
        psychological: computeCornerComposite("psychological"),
      },
    };
  },
});


