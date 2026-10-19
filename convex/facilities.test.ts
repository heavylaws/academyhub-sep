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
      slug: "elite-academy",
      status: "active",
      createdAt: now,
    });

    const rivalAcademyId = await ctx.db.insert("academies", {
      name: "Rival Performance Academy",
      slug: "rival-academy",
      status: "active",
      createdAt: now,
    });

    const adminId = await ctx.db.insert("users", {
      email: "admin@elite.test",
      name: "Academy Admin",
      emailVerificationTime: Date.now(),
      role: "academy_admin",
      academyId,
    });

    const sportingDirectorId = await ctx.db.insert("users", {
      email: "director@elite.test",
      name: "Director Dan",
      emailVerificationTime: Date.now(),
      role: "sporting_director",
      academyId,
    });

    const coachId = await ctx.db.insert("users", {
      email: "coach@elite.test",
      name: "Coach Carlo",
      emailVerificationTime: Date.now(),
      role: "coach",
      academyId,
    });

    const athleteUserId1 = await ctx.db.insert("users", {
      email: "athlete1@elite.test",
      name: "Striker Sam",
      emailVerificationTime: Date.now(),
      role: "athlete",
      academyId,
    });

    const athleteUserId2 = await ctx.db.insert("users", {
      email: "athlete2@elite.test",
      name: "Midfielder Max",
      emailVerificationTime: Date.now(),
      role: "athlete",
      academyId,
    });

    const teamId = await ctx.db.insert("teams", {
      academyId,
      name: "U-19 First Squad",
      createdBy: sportingDirectorId,
      createdAt: now,
    });

    const athlete1Id = await ctx.db.insert("athletes", {
      academyId,
      firstName: "Sam",
      lastName: "Striker",
      status: "active",
      userId: athleteUserId1,
      createdBy: sportingDirectorId,
      createdAt: now,
    });

    const athlete2Id = await ctx.db.insert("athletes", {
      academyId,
      firstName: "Max",
      lastName: "Midfielder",
      status: "active",
      userId: athleteUserId2,
      createdBy: sportingDirectorId,
      createdAt: now,
    });

    await ctx.db.insert("teamMembers", {
      teamId,
      athleteId: athlete1Id,
      academyId,
      createdAt: now,
    });

    await ctx.db.insert("teamMembers", {
      teamId,
      athleteId: athlete2Id,
      academyId,
      createdAt: now,
    });

    return {
      academyId,
      rivalAcademyId,
      adminId,
      sportingDirectorId,
      coachId,
      athleteUserId1,
      athleteUserId2,
      athlete1Id,
      athlete2Id,
      teamId,
    };
  });
}

describe("Facility Management & Conflict Engine (convex/facilities.ts & trainingSessions.ts)", () => {
  it("enforces RBAC on facility creation (directors/admins can create, coaches cannot)", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // Coach should fail
    await expect(
      as(t, env.coachId).mutation(api.facilities.createFacility, {
        name: "Main Stadium Pitch",
        type: "pitch",
        surfaceType: "natural_grass",
        status: "available",
        capacity: 22,
      }),
    ).rejects.toThrow();

    // Sporting director succeeds
    const facilityId = await as(t, env.sportingDirectorId).mutation(
      api.facilities.createFacility,
      {
        name: "Main Stadium Pitch",
        type: "pitch",
        surfaceType: "natural_grass",
        status: "available",
        capacity: 22,
      },
    );

    expect(facilityId).toBeDefined();

    // Verify facility listing
    const facilities = await as(t, env.coachId).query(
      api.facilities.listFacilities,
      {},
    );
    expect(facilities).toHaveLength(1);
    expect(facilities[0].name).toBe("Main Stadium Pitch");
    expect(facilities[0].status).toBe("available");
  });

  it("detects time overlaps and blocks conflicting facility bookings", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    const facilityId = await as(t, env.adminId).mutation(
      api.facilities.createFacility,
      {
        name: "Pitch 1",
        type: "pitch",
        surfaceType: "natural_grass",
        status: "available",
        capacity: 22,
      },
    );

    // Session 1: 16:00 - 18:00 (120 min) on Pitch 1
    const session1Id = await as(t, env.coachId).mutation(
      api.trainingSessions.createSession,
      {
        teamId: env.teamId,
        facilityId,
        sessionType: "training",
        microcycleDay: "MD-2",
        startsAt: "2026-10-20T16:00:00.000Z",
        durationMinutes: 120,
        title: "Tactical Shape 11v11",
      },
    );
    expect(session1Id).toBeDefined();

    // Overlapping booking: 17:00 - 18:30 (90 min) -> MUST FAIL
    await expect(
      as(t, env.coachId).mutation(api.trainingSessions.createSession, {
        teamId: env.teamId,
        facilityId,
        sessionType: "training",
        microcycleDay: "MD-2",
        startsAt: "2026-10-20T17:00:00.000Z", // 1 hr into session 1
        durationMinutes: 90,
        title: "Conflicting Session",
      }),
    ).rejects.toThrow(/conflict/i);

    // Non-overlapping booking: 18:00 - 19:30 (starts exactly when session 1 ends) -> MUST SUCCEED
    const session2Id = await as(t, env.coachId).mutation(
      api.trainingSessions.createSession,
      {
        teamId: env.teamId,
        facilityId,
        sessionType: "recovery",
        microcycleDay: "MD-1",
        startsAt: "2026-10-20T18:00:00.000Z", // exactly 120 min later
        durationMinutes: 90,
        title: "Evening Recovery",
      },
    );
    expect(session2Id).toBeDefined();
  });

  it("rejects booking facilities that are under maintenance or closed", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    const facilityId = await as(t, env.adminId).mutation(
      api.facilities.createFacility,
      {
        name: "Gym A",
        type: "gym",
        surfaceType: "wood",
        status: "available",
        capacity: 30,
      },
    );

    // Update to maintenance
    await as(t, env.adminId).mutation(api.facilities.updateFacility, {
      facilityId,
      status: "maintenance",
    });

    // Try booking Gym A
    await expect(
      as(t, env.coachId).mutation(api.trainingSessions.createSession, {
        teamId: env.teamId,
        facilityId,
        sessionType: "training",
        startsAt: "2026-10-20T18:00:00.000Z",
        durationMinutes: 60,
        title: "Squat Heavy Day",
      }),
    ).rejects.toThrow(/unavailable|maintenance|conflict/i);
  });
});

describe("Match Fixtures & Match Stats (convex/trainingSessions.ts)", () => {
  it("records match scoreline and per-player match stats", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    const sessionId = await as(t, env.coachId).mutation(
      api.trainingSessions.createSession,
      {
        teamId: env.teamId,
        sessionType: "match_competitive",
        microcycleDay: "MD",
        startsAt: "2026-10-20T15:00:00.000Z",
        durationMinutes: 90,
        title: "League Match vs Real Madrid",
        matchDetails: {
          opponentName: "Real Madrid Academy",
          homeAway: "home",
          competitionName: "Regional Cup",
        },
      },
    );

    // Record match result and stats
    await as(t, env.coachId).mutation(
      api.trainingSessions.recordMatchResultAndStats,
      {
        sessionId,
        matchDetails: {
          opponentName: "Real Madrid Academy",
          homeAway: "home",
          competitionName: "Regional Cup",
          goalsFor: 3,
          goalsAgainst: 1,
          formation: "4-3-3",
          matchSummary: "Dominant pressing and controlled transitions throughout.",
        },
        playerStats: [
          {
            athleteId: env.athlete1Id,
            started: true,
            minutesPlayed: 90,
            goalsOrPoints: 2,
            assists: 1,
            coachRating: 9,
          },
          {
            athleteId: env.athlete2Id,
            started: true,
            minutesPlayed: 75,
            goalsOrPoints: 0,
            assists: 1,
            coachRating: 8,
          },
        ],
      },
    );

    // Verify session data and attendance records
    const sessionDetail = await as(t, env.coachId).query(
      api.trainingSessions.getSessionWithAttendance,
      { sessionId },
    );

    expect(sessionDetail).toBeDefined();
    expect(sessionDetail?.session.matchDetails?.goalsFor).toBe(3);
    expect(sessionDetail?.session.matchDetails?.goalsAgainst).toBe(1);
    expect(sessionDetail?.session.matchDetails?.formation).toBe("4-3-3");

    // Check attendance records for athlete 1
    const att1 = sessionDetail?.attendance.find(
      (a) => a.athleteId === env.athlete1Id,
    );
    expect(att1).toBeDefined();
    expect(att1?.matchStats?.started).toBe(true);
    expect(att1?.matchStats?.minutesPlayed).toBe(90);
    expect(att1?.matchStats?.goalsOrPoints).toBe(2);
    expect(att1?.matchStats?.assists).toBe(1);
    expect(att1?.matchStats?.coachRating).toBe(9);
  });
});

describe("Squad Periodization & Team Plan Assignment (convex/trainingPlans.ts)", () => {
  it("clones squad template plan to team members, safely skipping injured_out athletes", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // Place Athlete 2 on active injured_out status
    await t.run(async (ctx) => {
      await ctx.db.insert("injuries", {
        academyId: env.academyId,
        athleteId: env.athlete2Id,
        availabilityStatus: "injured_out",
        bodyPart: "Hamstring",
        mechanism: "non_contact_acute",
        severity: "moderate_8_28_days",
        injuryDate: Date.now() - 24 * 60 * 60 * 1000,
        isResolved: false,
        recordedByUserId: env.sportingDirectorId,
        updatedAt: Date.now(),
      });
    });

    // Create a squad template plan
    const templatePlanId = await as(t, env.coachId).mutation(
      api.trainingPlans.createPlan,
      {
        title: "Speed Endurance & Pressing Template",
        phase: "in_season_early",
        microcycleTag: "MD-3",
        targetAgeGroup: "U-19",
        isTemplate: true,
      },
    );

    // Add items to template plan
    await as(t, env.coachId).mutation(api.trainingPlans.addPlanItem, {
      planId: templatePlanId,
      name: "High Intensity Shuttles",
      sets: 4,
      reps: 6,
    });

    // Assign template to the team with skipInjuredOutAthletes = true
    const result = await as(t, env.coachId).mutation(
      api.trainingPlans.assignPlanToTeam,
      {
        teamId: env.teamId,
        sourcePlanId: templatePlanId,
        skipInjuredOutAthletes: true,
      },
    );

    expect(result.assignedCount).toBe(1); // Only healthy Athlete 1
    expect(result.skippedInjuredCount).toBe(1); // Athlete 2 was skipped

    // Verify Athlete 1 has the plan and items cloned
    const athlete1Plans = await as(t, env.coachId).query(
      api.trainingPlans.listPlansForAthlete,
      { athleteId: env.athlete1Id },
    );
    expect(athlete1Plans).toHaveLength(1);
    expect(athlete1Plans[0].title).toBe("Speed Endurance & Pressing Template");
    expect(athlete1Plans[0].phase).toBe("in_season_early");
    expect(athlete1Plans[0].microcycleTag).toBe("MD-3");
    expect(athlete1Plans[0].sourceTemplateId).toBe(templatePlanId);

    // Verify Athlete 2 has NO plans
    const athlete2Plans = await as(t, env.coachId).query(
      api.trainingPlans.listPlansForAthlete,
      { athleteId: env.athlete2Id },
    );
    expect(athlete2Plans).toHaveLength(0);
  });
});
