import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.ts";
import { modules } from "./test.setup.ts";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";

type T = ReturnType<typeof convexTest>;
const now = new Date().toISOString();

function as(t: T, userId: Id<"users">) {
  return t.withIdentity({ subject: `${userId}|session` });
}

async function seedTestEnvironment(t: T) {
  return await t.run(async (ctx) => {
    const academyId = await ctx.db.insert("academies", {
      name: "Elite Performance Academy",
      slug: "elite-performance",
      status: "active",
      createdAt: now,
    });

    const rivalAcademyId = await ctx.db.insert("academies", {
      name: "Rival Performance Club",
      slug: "rival-club",
      status: "active",
      createdAt: now,
    });

    const coachId = await ctx.db.insert("users", {
      email: "coach@elite.test",
      name: "Head Coach",
      emailVerificationTime: Date.now(),
      role: "coach",
      academyId,
    });

    const athleteUserId = await ctx.db.insert("users", {
      email: "pro@elite.test",
      name: "Kylian Mbappe",
      emailVerificationTime: Date.now(),
      role: "athlete",
      academyId,
    });

    const foreignCoachId = await ctx.db.insert("users", {
      email: "spy@rival.test",
      name: "Rival Coach",
      emailVerificationTime: Date.now(),
      role: "coach",
      academyId: rivalAcademyId,
    });

    const athleteId = await ctx.db.insert("athletes", {
      academyId,
      firstName: "Kylian",
      lastName: "Mbappe",
      status: "active",
      userId: athleteUserId,
      createdBy: coachId,
      createdAt: now,
    });

    const teamId = await ctx.db.insert("teams", {
      academyId,
      name: "U19 Academy Squad",
      createdBy: coachId,
      createdAt: now,
    });

    const trainingPlanId = await ctx.db.insert("trainingPlans", {
      academyId,
      athleteId,
      title: "Explosive Acceleration Phase 1",
      description: "Sprint mechanics and plyometrics",
      status: "active",
      createdBy: coachId,
      createdAt: now,
    });

    return {
      academyId,
      rivalAcademyId,
      coachId,
      athleteUserId,
      foreignCoachId,
      athleteId,
      teamId,
      trainingPlanId,
    };
  });
}

describe("Workload Engine — sRPE & ACWR (convex/workload.ts & trainingSessions.ts)", () => {
  it("allows athlete and coach to log workout execution with load calculation", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    const completedAt = Date.now();

    // 1. Athlete logs their own workout
    const logId = await as(t, env.athleteUserId).mutation(api.workload.logWorkoutExecution, {
      athleteId: env.athleteId,
      trainingPlanId: env.trainingPlanId,
      completedAt,
      durationMinutes: 60,
      rpe: 8,
      completedExercises: [
        {
          exerciseName: "Trap Bar Deadlift",
          setsCompleted: 4,
          repsCompleted: "5",
          weightKg: 140,
        },
      ],
      athleteNotes: "Felt explosive, grip was solid.",
    });

    expect(logId).toBeDefined();

    const savedLog = await t.run((ctx) => ctx.db.get("workoutLogs", logId));
    expect(savedLog).not.toBeNull();
    expect(savedLog?.durationMinutes).toBe(60);
    expect(savedLog?.rpe).toBe(8);
    expect(savedLog?.calculatedLoad).toBe(480); // 60 * 8
    expect(savedLog?.loggedByUserId).toBe(env.athleteUserId);

    // 2. Coach logs workout for athlete
    const coachLogId = await as(t, env.coachId).mutation(api.workload.logWorkoutExecution, {
      athleteId: env.athleteId,
      trainingPlanId: env.trainingPlanId,
      completedAt: completedAt - 86400000,
      durationMinutes: 45,
      rpe: 6,
      completedExercises: [],
    });

    const savedCoachLog = await t.run((ctx) => ctx.db.get("workoutLogs", coachLogId));
    expect(savedCoachLog?.calculatedLoad).toBe(270); // 45 * 6
  });

  it("submits session RPE on attendance records via submitSessionRpe", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // Create session and attendance record
    const { sessionId, attendanceId } = await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert("trainingSessions", {
        academyId: env.academyId,
        teamId: env.teamId,
        title: "Tactical Positioning & Small-Sided Games",
        startsAt: new Date(Date.now() - 3600000).toISOString(),
        durationMinutes: 90,
        createdBy: env.coachId,
        createdAt: now,
      });

      const attendanceId = await ctx.db.insert("attendanceRecords", {
        academyId: env.academyId,
        sessionId,
        athleteId: env.athleteId,
        status: "present",
        recordedBy: env.coachId,
        recordedAt: now,
      });

      return { sessionId, attendanceId };
    });

    // Athlete submits RPE for their attendance
    await as(t, env.athleteUserId).mutation(api.trainingSessions.submitSessionRpe, {
      sessionId,
      attendanceRecordId: attendanceId,
      durationMinutes: 90,
      rpe: 7,
      wellnessFatigue: 3,
      wellnessSoreness: 2,
    });

    const updated = await t.run((ctx) => ctx.db.get("attendanceRecords", attendanceId));
    expect(updated?.durationMinutes).toBe(90);
    expect(updated?.rpe).toBe(7);
    expect(updated?.sessionLoad).toBe(630); // 90 * 7
    expect(updated?.wellnessFatigue).toBe(3);
    expect(updated?.wellnessSoreness).toBe(2);
  });

  it("calculates ACWR risk zones accurately (insufficient_data, optimal, danger_high_spike)", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // Case 1: Fresh athlete with 0 training history -> insufficient_data
    const freshWorkload = await as(t, env.coachId).query(
      api.workload.getAthleteWorkloadAndACWR,
      { athleteId: env.athleteId },
    );
    expect(freshWorkload.acwr).toBeNull();
    expect(freshWorkload.riskZone).toBe("insufficient_data");
    expect(freshWorkload.acuteLoad7d).toBe(0);
    expect(freshWorkload.chronicLoadWeeklyAvg28d).toBe(0);

    // Case 2: Optimal ACWR (e.g., chronic weekly avg ~1000, acute load ~1000 -> ACWR ~1.0)
    // Seed 4 weeks of consistent training (250 AU per session, 4 sessions per week = 1000 AU/week)
    const dayMs = 24 * 60 * 60 * 1000;
    const nowMs = Date.now();

    await t.run(async (ctx) => {
      // Create workout logs over 28 days
      // Week 4 (days 22-28 ago): 2 sessions of 500 AU = 1000 AU
      // Week 3 (days 15-21 ago): 2 sessions of 500 AU = 1000 AU
      // Week 2 (days 8-14 ago): 2 sessions of 500 AU = 1000 AU
      // Week 1 (days 1-7 ago): 2 sessions of 500 AU = 1000 AU
      const daysAgo = [26, 23, 19, 16, 12, 9, 5, 2];
      for (const d of daysAgo) {
        await ctx.db.insert("workoutLogs", {
          academyId: env.academyId,
          athleteId: env.athleteId,
          trainingPlanId: env.trainingPlanId,
          completedAt: nowMs - d * dayMs,
          durationMinutes: 50,
          rpe: 10,
          calculatedLoad: 500, // 50 * 10
          completedExercises: [],
          loggedByUserId: env.coachId,
        });
      }
    });

    const optimalWorkload = await as(t, env.coachId).query(
      api.workload.getAthleteWorkloadAndACWR,
      { athleteId: env.athleteId },
    );

    // Total 28d = 8 * 500 = 4000 AU. Chronic Weekly Avg = 4000 / 4 = 1000 AU.
    // Acute 7d (days 5, 2 ago) = 2 * 500 = 1000 AU.
    // ACWR = 1000 / 1000 = 1.0 -> optimal!
    expect(optimalWorkload.acuteLoad7d).toBe(1000);
    expect(optimalWorkload.chronicLoadWeeklyAvg28d).toBe(1000);
    expect(optimalWorkload.acwr).toBe(1);
    expect(optimalWorkload.riskZone).toBe("optimal");

    // Case 3: Danger High Spike (> 1.5 ACWR)
    // Add massive acute load in the last 2 days: +1000 AU acute
    await t.run(async (ctx) => {
      await ctx.db.insert("workoutLogs", {
        academyId: env.academyId,
        athleteId: env.athleteId,
        trainingPlanId: env.trainingPlanId,
        completedAt: nowMs - 1 * dayMs,
        durationMinutes: 100,
        rpe: 10,
        calculatedLoad: 1000,
        completedExercises: [],
        loggedByUserId: env.coachId,
      });
    });

    const spikeWorkload = await as(t, env.coachId).query(
      api.workload.getAthleteWorkloadAndACWR,
      { athleteId: env.athleteId },
    );

    // Acute 7d is now 2000 AU. Total 28d is now 5000 AU. Chronic Weekly Avg = 5000 / 4 = 1250 AU.
    // ACWR = 2000 / 1250 = 1.6 -> danger_high_spike!
    expect(spikeWorkload.acuteLoad7d).toBe(2000);
    expect(spikeWorkload.chronicLoadWeeklyAvg28d).toBe(1250);
    expect(spikeWorkload.acwr).toBe(1.6);
    expect(spikeWorkload.riskZone).toBe("danger_high_spike");
  });

  it("reflects active medical availability and coaching restrictions in workload response", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // Log an active injury
    await t.run(async (ctx) => {
      await ctx.db.insert("injuries", {
        academyId: env.academyId,
        athleteId: env.athleteId,
        availabilityStatus: "modified_training",
        bodyPart: "Hamstring",
        mechanism: "non_contact_acute",
        severity: "moderate_8_28_days",
        injuryDate: Date.now() - 86400000,
        isResolved: false,
        coachingRestrictions: "Max 30 mins non-contact",
        recordedByUserId: env.coachId,
        updatedAt: Date.now(),
      });
    });

    const workload = await as(t, env.coachId).query(api.workload.getAthleteWorkloadAndACWR, {
      athleteId: env.athleteId,
    });

    expect(workload.availabilityStatus).toBe("modified_training");
    expect(workload.coachingRestrictions).toBe("Max 30 mins non-contact");
  });
});
