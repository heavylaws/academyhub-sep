import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAthleteAccess, requireUser } from "./lib/permissions.ts";
import { sanitizeOptionalText, sanitizeString } from "./lib/sanitize.ts";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

export type ACWRRiskZone =
  | "insufficient_data"
  | "undertraining"
  | "optimal"
  | "caution"
  | "danger_high_spike";

/**
 * Log the completion of a training plan workout with sRPE and duration.
 */
export const logWorkoutExecution = mutation({
  args: {
    athleteId: v.id("athletes"),
    trainingPlanId: v.id("trainingPlans"),
    durationMinutes: v.number(),
    rpe: v.number(),
    completedExercises: v.array(
      v.object({
        exerciseName: v.string(),
        setsCompleted: v.number(),
        repsCompleted: v.string(),
        weightKg: v.optional(v.number()),
      }),
    ),
    athleteNotes: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user, athlete } = await requireAthleteAccess(ctx, args.athleteId);

    if (args.rpe < 1 || args.rpe > 10) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "RPE must be between 1 and 10",
      });
    }
    if (args.durationMinutes <= 0 || args.durationMinutes > 600) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Duration must be greater than 0 and up to 600 minutes",
      });
    }

    const plan = await ctx.db.get("trainingPlans", args.trainingPlanId);
    if (!plan || plan.athleteId !== athlete._id) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Training plan does not belong to this athlete",
      });
    }

    const calculatedLoad = Math.round(args.durationMinutes * args.rpe);
    const completedAt = args.completedAt ?? Date.now();

    const sanitizedExercises = args.completedExercises.map((e) => ({
      exerciseName: sanitizeString(e.exerciseName, 120, "Exercise name"),
      setsCompleted: Math.max(0, Math.floor(e.setsCompleted)),
      repsCompleted: sanitizeString(e.repsCompleted, 60, "Reps completed"),
      weightKg: e.weightKg !== undefined && e.weightKg >= 0 ? e.weightKg : undefined,
    }));

    const workoutLogId = await ctx.db.insert("workoutLogs", {
      academyId: athlete.academyId,
      athleteId: athlete._id,
      trainingPlanId: plan._id,
      completedAt,
      durationMinutes: args.durationMinutes,
      rpe: args.rpe,
      calculatedLoad,
      completedExercises: sanitizedExercises,
      athleteNotes: sanitizeOptionalText(args.athleteNotes, 2000, "Notes"),
      loggedByUserId: user._id,
    });

    return workoutLogId;
  },
});

/**
 * Calculates an athlete's acute workload (7-day), chronic workload (28-day weekly average),
 * Acute:Chronic Workload Ratio (ACWR), risk zone classification, and medical availability status.
 */
export const getAthleteWorkloadAndACWR = query({
  args: {
    athleteId: v.id("athletes"),
  },
  handler: async (ctx, args) => {
    await requireAthleteAccess(ctx, args.athleteId);

    const now = Date.now();
    const msInDay = 86_400_000;
    const sevenDaysAgo = now - 7 * msInDay;
    const twentyEightDaysAgo = now - 28 * msInDay;

    // 1. Fetch attendance records for this athlete
    const attendanceList = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .collect();

    // 2. Fetch workout logs for this athlete
    const workoutLogList = await ctx.db
      .query("workoutLogs")
      .withIndex("by_athlete_and_date", (q) =>
        q.eq("athleteId", args.athleteId).gte("completedAt", twentyEightDaysAgo),
      )
      .collect();

    // Map daily loads for the last 28 days
    const dailyLoadsMap = new Map<string, number>();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(now - i * msInDay);
      const key = d.toISOString().split("T")[0];
      dailyLoadsMap.set(key, 0);
    }

    let acuteLoad7d = 0;
    let total28dLoad = 0;
    let totalSessions28d = 0;

    // Aggregate attendance loads
    for (const record of attendanceList) {
      if (record.status !== "present" && record.status !== "late") continue;
      const load = record.sessionLoad ?? 0;
      if (load <= 0) continue;

      let time = record.loggedAt;
      if (!time && record.recordedAt) {
        time = new Date(record.recordedAt).getTime();
      }
      if (!time || time < twentyEightDaysAgo || time > now + msInDay) continue;

      totalSessions28d++;
      total28dLoad += load;
      if (time >= sevenDaysAgo) {
        acuteLoad7d += load;
      }

      const dateKey = new Date(time).toISOString().split("T")[0];
      if (dailyLoadsMap.has(dateKey)) {
        dailyLoadsMap.set(dateKey, (dailyLoadsMap.get(dateKey) ?? 0) + load);
      }
    }

    // Aggregate workout logs
    for (const log of workoutLogList) {
      const load = log.calculatedLoad ?? 0;
      if (load <= 0) continue;
      const time = log.completedAt;
      if (time < twentyEightDaysAgo || time > now + msInDay) continue;

      totalSessions28d++;
      total28dLoad += load;
      if (time >= sevenDaysAgo) {
        acuteLoad7d += load;
      }

      const dateKey = new Date(time).toISOString().split("T")[0];
      if (dailyLoadsMap.has(dateKey)) {
        dailyLoadsMap.set(dateKey, (dailyLoadsMap.get(dateKey) ?? 0) + load);
      }
    }

    // Chronic load is defined as weekly average over 28 days: total28dLoad / 4
    const chronicLoadWeeklyAvg28d = Number((total28dLoad / 4).toFixed(1));

    let acwr: number | null = null;
    let riskZone: ACWRRiskZone = "insufficient_data";

    if (chronicLoadWeeklyAvg28d > 0) {
      acwr = Number((acuteLoad7d / chronicLoadWeeklyAvg28d).toFixed(2));
      if (acwr < 0.8) {
        riskZone = "undertraining";
      } else if (acwr <= 1.3) {
        riskZone = "optimal";
      } else if (acwr <= 1.5) {
        riskZone = "caution";
      } else {
        riskZone = "danger_high_spike";
      }
    }

    // 3. Fetch latest active unresolved injury record for medical availability
    const activeInjuries = await ctx.db
      .query("injuries")
      .withIndex("by_athlete_and_resolved", (q) =>
        q.eq("athleteId", args.athleteId).eq("isResolved", false),
      )
      .collect();

    let availabilityStatus: "fit" | "modified_training" | "injured_out" | "illness" = "fit";
    let coachingRestrictions: string | undefined = undefined;
    let activeInjuryId: Id<"injuries"> | undefined = undefined;

    if (activeInjuries.length > 0) {
      // Pick the most recent active injury
      activeInjuries.sort((a, b) => b.injuryDate - a.injuryDate);
      const primary = activeInjuries[0];
      availabilityStatus = primary.availabilityStatus;
      coachingRestrictions = primary.coachingRestrictions;
      activeInjuryId = primary._id;
    }

    const dailyLoads = Array.from(dailyLoadsMap.entries()).map(([date, load]) => {
      const d = new Date(date + "T00:00:00");
      const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
      return { date, dayOfWeek, load };
    });

    return {
      athleteId: args.athleteId,
      availabilityStatus,
      coachingRestrictions,
      activeInjuryId,
      acuteLoad7d,
      chronicLoadWeeklyAvg28d,
      total28dLoad,
      totalSessions28d,
      acwr,
      riskZone,
      dailyLoads,
    };
  },
});
