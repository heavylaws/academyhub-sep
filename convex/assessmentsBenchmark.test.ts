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
      name: "Ajax Development Academy",
      slug: "ajax-dev",
      status: "active",
      createdAt: now,
    });

    const rivalAcademyId = await ctx.db.insert("academies", {
      name: "Feyenoord Academy",
      slug: "feyenoord-academy",
      status: "active",
      createdAt: now,
    });

    const sportingDirectorId = await ctx.db.insert("users", {
      email: "director@ajax.test",
      name: "Edwin van der Sar",
      emailVerificationTime: Date.now(),
      role: "sporting_director",
      academyId,
    });

    const coachId = await ctx.db.insert("users", {
      email: "coach@ajax.test",
      name: "Erik ten Hag",
      emailVerificationTime: Date.now(),
      role: "coach",
      academyId,
    });

    const foreignCoachId = await ctx.db.insert("users", {
      email: "coach@feyenoord.test",
      name: "Arne Slot",
      emailVerificationTime: Date.now(),
      role: "coach",
      academyId: rivalAcademyId,
    });

    const athleteAUserId = await ctx.db.insert("users", {
      email: "athleteA@ajax.test",
      name: "Leo Messi",
      emailVerificationTime: Date.now(),
      role: "athlete",
      academyId,
    });

    const athleteBUserId = await ctx.db.insert("users", {
      email: "athleteB@ajax.test",
      name: "Cristiano Ronaldo",
      emailVerificationTime: Date.now(),
      role: "athlete",
      academyId,
    });

    const athleteCUserId = await ctx.db.insert("users", {
      email: "athleteC@ajax.test",
      name: "Neymar Jr",
      emailVerificationTime: Date.now(),
      role: "athlete",
      academyId,
    });

    const athleteAId = await ctx.db.insert("athletes", {
      academyId,
      firstName: "Leo",
      lastName: "Messi",
      status: "active",
      userId: athleteAUserId,
      createdBy: sportingDirectorId,
      createdAt: now,
    });

    const athleteBId = await ctx.db.insert("athletes", {
      academyId,
      firstName: "Cristiano",
      lastName: "Ronaldo",
      status: "active",
      userId: athleteBUserId,
      createdBy: sportingDirectorId,
      createdAt: now,
    });

    const athleteCId = await ctx.db.insert("athletes", {
      academyId,
      firstName: "Neymar",
      lastName: "Jr",
      status: "active",
      userId: athleteCUserId,
      createdBy: sportingDirectorId,
      createdAt: now,
    });

    const teamId = await ctx.db.insert("teams", {
      academyId,
      name: "U18 Elite Squad",
      createdBy: coachId,
      createdAt: now,
    });

    await ctx.db.insert("teamMembers", {
      academyId,
      teamId,
      athleteId: athleteAId,
      createdAt: now,
    });
    await ctx.db.insert("teamMembers", {
      academyId,
      teamId,
      athleteId: athleteBId,
      createdAt: now,
    });
    await ctx.db.insert("teamMembers", {
      academyId,
      teamId,
      athleteId: athleteCId,
      createdAt: now,
    });

    return {
      academyId,
      rivalAcademyId,
      sportingDirectorId,
      coachId,
      foreignCoachId,
      athleteAUserId,
      athleteBUserId,
      athleteCUserId,
      athleteAId,
      athleteBId,
      athleteCId,
      teamId,
    };
  });
}

describe("Phase 4: 4-Corner Assessments & Cohort Z-Score Benchmarking", () => {
  it("computes accurate cohort mean, standard deviation, and inverted Z-scores for lower_is_better metrics", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // Coach logs 20m sprint assessments for the cohort:
    // Athlete A: 2.80s (fastest)
    // Athlete B: 2.90s (average)
    // Athlete C: 3.00s (slowest)
    await as(t, env.coachId).mutation(api.assessments.recordAssessment, {
      athleteId: env.athleteAId,
      metric: "20m Sprint",
      value: 2.8,
      unit: "s",
      corner: "physical",
      optimizationDirection: "lower_is_better",
      assessedOn: "2026-10-15",
    });

    await as(t, env.coachId).mutation(api.assessments.recordAssessment, {
      athleteId: env.athleteBId,
      metric: "20m Sprint",
      value: 2.9,
      unit: "s",
      corner: "physical",
      optimizationDirection: "lower_is_better",
      assessedOn: "2026-10-15",
    });

    await as(t, env.coachId).mutation(api.assessments.recordAssessment, {
      athleteId: env.athleteCId,
      metric: "20m Sprint",
      value: 3.0,
      unit: "s",
      corner: "physical",
      optimizationDirection: "lower_is_better",
      assessedOn: "2026-10-15",
    });

    // Also log a higher_is_better metric (Vertical Jump):
    // Athlete A: 60cm (average)
    // Athlete B: 70cm (highest)
    // Athlete C: 50cm (lowest)
    await as(t, env.coachId).mutation(api.assessments.recordAssessment, {
      athleteId: env.athleteAId,
      metric: "Vertical Jump",
      value: 60,
      unit: "cm",
      corner: "physical",
      optimizationDirection: "higher_is_better",
      assessedOn: "2026-10-15",
    });

    await as(t, env.coachId).mutation(api.assessments.recordAssessment, {
      athleteId: env.athleteBId,
      metric: "Vertical Jump",
      value: 70,
      unit: "cm",
      corner: "physical",
      optimizationDirection: "higher_is_better",
      assessedOn: "2026-10-15",
    });

    await as(t, env.coachId).mutation(api.assessments.recordAssessment, {
      athleteId: env.athleteCId,
      metric: "Vertical Jump",
      value: 50,
      unit: "cm",
      corner: "physical",
      optimizationDirection: "higher_is_better",
      assessedOn: "2026-10-15",
    });

    // Also log a technical corner metric (Passing Accuracy):
    await as(t, env.coachId).mutation(api.assessments.recordAssessment, {
      athleteId: env.athleteAId,
      metric: "Passing Accuracy",
      value: 92,
      unit: "%",
      corner: "technical",
      assessedOn: "2026-10-15",
    });

    // Athlete A benchmark report
    const reportA = await as(t, env.coachId).query(
      api.assessments.getAthleteBenchmarkReport,
      {
        athleteId: env.athleteAId,
        teamId: env.teamId,
      },
    );

    expect(reportA).toBeDefined();
    expect(reportA.cohortSize).toBe(3);
    expect(reportA.teamName).toBe("U18 Elite Squad");

    const sprintA = reportA.metrics.find((m) => m.metric === "20m Sprint");
    expect(sprintA).toBeDefined();
    expect(sprintA?.cohortMean).toBe(2.9);
    // Athlete A is faster (2.80s < 2.90s), with lower_is_better so Z-score MUST BE POSITIVE!
    expect(sprintA?.zScore).toBeGreaterThan(0);
    expect(sprintA?.percentile).toBeGreaterThan(50);

    const jumpA = reportA.metrics.find((m) => m.metric === "Vertical Jump");
    expect(jumpA).toBeDefined();
    expect(jumpA?.cohortMean).toBe(60);
    expect(jumpA?.zScore).toBe(0);
    expect(jumpA?.percentile).toBe(50);

    // Athlete C benchmark report (slower sprint time)
    const reportC = await as(t, env.coachId).query(
      api.assessments.getAthleteBenchmarkReport,
      {
        athleteId: env.athleteCId,
        teamId: env.teamId,
      },
    );

    const sprintC = reportC.metrics.find((m) => m.metric === "20m Sprint");
    expect(sprintC).toBeDefined();
    // Athlete C is slower (3.00s > 2.90s), with lower_is_better so Z-score MUST BE NEGATIVE!
    expect(sprintC?.zScore).toBeLessThan(0);
    expect(sprintC?.percentile).toBeLessThan(50);

    // Verify 4-Corner Composite scores exist
    expect(reportA.cornerComposites).toBeDefined();
    expect(reportA.cornerComposites.physical).toBeGreaterThan(0);
    expect(reportA.cornerComposites.technical).toBeGreaterThan(0);
    expect(reportA.cornerComposites.tactical).toBe(50); // neutral baseline when unassessed
    expect(reportA.cornerComposites.psychological).toBe(50);
  });

  it("handles automatic 'achieved' status transitions in Individual Development Plans (IDP)", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // 1. Create a lower_is_better sprint acceleration goal
    const sprintGoalId = await as(t, env.sportingDirectorId).mutation(
      api.athleteGoals.createAthleteGoal,
      {
        athleteId: env.athleteAId,
        title: "Sub-2.75s 20m Acceleration Milestone",
        corner: "physical",
        linkedMetricName: "20m Sprint",
        baselineValue: 2.85,
        targetValue: 2.75,
        currentValue: 2.82,
        unit: "s",
        optimizationDirection: "lower_is_better",
        targetDate: "2026-11-30",
        actionPlanNotes: "Resistance sleds and plyometric bounds twice weekly.",
      },
    );

    // Query active goals
    const initialGoals = await as(t, env.coachId).query(
      api.athleteGoals.listAthleteGoals,
      { athleteId: env.athleteAId },
    );
    expect(initialGoals.length).toBe(1);
    expect(initialGoals[0].status).toBe("in_progress");

    // Partial improvement (2.78s - not yet achieved)
    await as(t, env.coachId).mutation(api.athleteGoals.updateAthleteGoal, {
      goalId: sprintGoalId,
      currentValue: 2.78,
    });

    const midGoals = await as(t, env.coachId).query(
      api.athleteGoals.listAthleteGoals,
      { athleteId: env.athleteAId },
    );
    expect(midGoals[0].status).toBe("in_progress");

    // Athlete hits target (2.74s <= 2.75s) -> automatically transitions to 'achieved'
    await as(t, env.athleteAUserId).mutation(
      api.athleteGoals.updateAthleteGoal,
      {
        goalId: sprintGoalId,
        currentValue: 2.74,
      },
    );

    const finalGoals = await as(t, env.coachId).query(
      api.athleteGoals.listAthleteGoals,
      { athleteId: env.athleteAId },
    );
    expect(finalGoals[0].status).toBe("achieved");
    expect(finalGoals[0].currentValue).toBe(2.74);

    // 2. Create a higher_is_better tactical rating goal
    const tacticalGoalId = await as(t, env.coachId).mutation(
      api.athleteGoals.createAthleteGoal,
      {
        athleteId: env.athleteAId,
        title: "Defensive Transition Positioning",
        corner: "tactical",
        baselineValue: 6,
        targetValue: 8.5,
        currentValue: 6.5,
        unit: "rating",
        optimizationDirection: "higher_is_better",
        targetDate: "2026-12-15",
      },
    );

    // Update with meeting the target (8.5 >= 8.5)
    await as(t, env.coachId).mutation(api.athleteGoals.updateAthleteGoal, {
      goalId: tacticalGoalId,
      currentValue: 9.0,
    });

    const tacticalGoals = await as(t, env.coachId).query(
      api.athleteGoals.listAthleteGoals,
      { athleteId: env.athleteAId, status: "achieved" },
    );
    expect(tacticalGoals.some((g) => g._id === tacticalGoalId)).toBe(true);
  });

  it("enforces strict cross-tenant isolation on benchmarks and IDP goals", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // Foreign coach cannot view Ajax athlete's benchmark report
    await expect(
      as(t, env.foreignCoachId).query(
        api.assessments.getAthleteBenchmarkReport,
        {
          athleteId: env.athleteAId,
        },
      ),
    ).rejects.toThrow();

    // Foreign coach cannot list Ajax athlete's IDP goals
    await expect(
      as(t, env.foreignCoachId).query(api.athleteGoals.listAthleteGoals, {
        athleteId: env.athleteAId,
      }),
    ).rejects.toThrow();

    // Foreign coach cannot create an IDP goal for Ajax athlete
    await expect(
      as(t, env.foreignCoachId).mutation(api.athleteGoals.createAthleteGoal, {
        athleteId: env.athleteAId,
        title: "Malicious Goal",
        corner: "physical",
        targetDate: "2026-12-31",
      }),
    ).rejects.toThrow();
  });
});
