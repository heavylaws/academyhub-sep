import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema.ts";
import { modules } from "../../convex/test.setup.ts";
import { api } from "../../convex/_generated/api.js";

describe("Phase 5: Training Sessions & Tactical Plan Integration Suite", () => {
  it("creates a training session with an associated tactical plan and drill references", async () => {
    const t = convexTest(schema, modules);

    // 1. Setup Academy & Coach
    const academyId = await t.run(async (ctx) => {
      return await ctx.db.insert("academies", {
        name: "Hercules Tactical Academy",
        slug: "hercules-tactical-academy",
        status: "active",
        createdAt: new Date().toISOString(),
      });
    });

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach Pep",
        email: "pep@hercules.com",
        role: "coach",
        academyId,
      });
    });

    const teamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        academyId,
        name: "U14 First Squad",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    // 2. Setup Tactical Plan
    const tacticalPlanId = await t.run(async (ctx) => {
      return await ctx.db.insert("tacticalPlans", {
        academyId,
        title: "4-3-3 Overlap Transition Routine",
        category: "Tactical",
        pitchType: "full",
        coachingPoints: ["Body shape open", "Immediate counter-press"],
        planData: JSON.stringify({ title: "4-3-3 Overlap Transition Routine", phases: [] }),
        createdBy: coachId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // 3. Create Session as Coach with tacticalPlanId
    const asCoach = t.withIdentity({ subject: coachId });
    const sessionId = await asCoach.mutation(api.trainingSessions.createSession, {
      teamId,
      title: "Tuesday Evening Tactical Prep",
      startsAt: new Date(Date.now() + 86400000).toISOString(),
      durationMinutes: 90,
      location: "Pitch 1",
      tacticalPlanId,
      drillIds: ["drill_433_buildup", "drill_counter_press"],
    });

    expect(sessionId).toBeDefined();

    // 4. Fetch Session with Attendance and verify linked tactical plan
    const sessionData = await asCoach.query(
      api.trainingSessions.getSessionWithAttendance,
      { sessionId },
    );

    expect(sessionData.session.title).toBe("Tuesday Evening Tactical Prep");
    expect(sessionData.session.tacticalPlanId).toBe(tacticalPlanId);
    expect(sessionData.session.drillIds?.length).toBe(2);
    expect(sessionData.tacticalPlan).toBeDefined();
    expect(sessionData.tacticalPlan?._id).toBe(tacticalPlanId);
    expect(sessionData.tacticalPlan?.title).toBe("4-3-3 Overlap Transition Routine");
  });

  it("links and unlinks a tactical plan on an existing training session", async () => {
    const t = convexTest(schema, modules);

    const academyId = await t.run(async (ctx) => {
      return await ctx.db.insert("academies", {
        name: "Ajax Development Academy",
        slug: "ajax-development-academy",
        status: "active",
        createdAt: new Date().toISOString(),
      });
    });

    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Admin Cruyff",
        email: "cruyff@ajax.com",
        role: "academy_admin",
        academyId,
      });
    });

    const teamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        academyId,
        name: "U16 Prospects",
        createdBy: adminId,
        createdAt: new Date().toISOString(),
      });
    });

    const asAdmin = t.withIdentity({ subject: adminId });
    const sessionId = await asAdmin.mutation(api.trainingSessions.createSession, {
      teamId,
      title: "Positional Play Workshop",
      startsAt: new Date(Date.now() + 172800000).toISOString(),
      durationMinutes: 75,
    });

    // Verify initially no linked tactical plan
    const initial = await asAdmin.query(
      api.trainingSessions.getSessionWithAttendance,
      { sessionId },
    );
    expect(initial.tacticalPlan).toBeNull();

    // Create a new tactical plan in academy
    const planId = await t.run(async (ctx) => {
      return await ctx.db.insert("tacticalPlans", {
        academyId,
        title: "Total Football 3-4-3 Build-Up",
        pitchType: "full",
        coachingPoints: ["Create third-man triangles"],
        planData: JSON.stringify({ title: "Total Football", phases: [] }),
        createdBy: adminId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // Link plan to session
    await asAdmin.mutation(api.trainingSessions.linkTacticalPlanToSession, {
      sessionId,
      tacticalPlanId: planId,
    });

    const linked = await asAdmin.query(
      api.trainingSessions.getSessionWithAttendance,
      { sessionId },
    );
    expect(linked.tacticalPlan?._id).toBe(planId);
    expect(linked.tacticalPlan?.title).toBe("Total Football 3-4-3 Build-Up");

    // Unlink plan
    await asAdmin.mutation(api.trainingSessions.linkTacticalPlanToSession, {
      sessionId,
      tacticalPlanId: undefined,
    });

    const unlinked = await asAdmin.query(
      api.trainingSessions.getSessionWithAttendance,
      { sessionId },
    );
    expect(unlinked.tacticalPlan).toBeNull();
  });

  it("links, resolves, and unlinks drills in session itineraries with duplicate protection", async () => {
    const t = convexTest(schema, modules);

    const academyId = await t.run(async (ctx) => {
      return await ctx.db.insert("academies", {
        name: "La Masia Academy",
        slug: "la-masia",
        status: "active",
        createdAt: new Date().toISOString(),
      });
    });

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach Xavi",
        email: "xavi@lamasia.cat",
        role: "coach",
        academyId,
      });
    });

    const teamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        academyId,
        name: "Juvenil A",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    // Create a custom drill in academy
    const customDrillId = await t.run(async (ctx) => {
      return await ctx.db.insert("drills", {
        academyId,
        title: "Tiki-Taka 4v4+3 Possession Rondo",
        ageGroup: "U15-U16",
        birthYears: "2011-2012",
        category: "passing_rondos",
        categoryLabel: "Passing & Rondos",
        difficulty: "Advanced",
        durationMinutes: 20,
        durationSeconds: 1200,
        recommendedSets: 4,
        recommendedReps: 5,
        gridDimensions: "20x25m",
        equipment: ["10 bibs", "12 cones", "6 balls"],
        summary: "High-tempo positional rondo with 3 neutral playmakers",
        setup: "Mark a 20x25m grid with 4 perimeter players and 3 central pivots",
        instructions: ["Keep 1-2 touch circulation", "Neutrals maintain triangle shape"],
        coachingPoints: ["Open body orientation before receiving", "Pass with proper disguise"],
        variations: ["Limit all players to 1 touch after 5 completed passes"],
        metricName: "Completed Passes in 90s",
        metricUnit: "passes",
        benchmark: 45,
        isLowerBetter: false,
        targetAttribute: "Passing & Vision",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    const asCoach = t.withIdentity({ subject: coachId });

    // Create session initially without drills
    const sessionId = await asCoach.mutation(api.trainingSessions.createSession, {
      teamId,
      title: "Tactical Possession Morning Session",
      startsAt: new Date(Date.now() + 3600000).toISOString(),
      durationMinutes: 90,
    });

    // 1. Link custom drill to session
    await asCoach.mutation(api.trainingSessions.linkDrillToSession, {
      sessionId,
      drillId: customDrillId,
    });

    // 2. Link a preset drill ID as well
    await asCoach.mutation(api.trainingSessions.linkDrillToSession, {
      sessionId,
      drillId: "drill_pressing_trigger_5v5",
    });

    // 3. Duplicate linking should be idempotent
    await asCoach.mutation(api.trainingSessions.linkDrillToSession, {
      sessionId,
      drillId: customDrillId,
    });

    // 4. Query session with attendance and verify drills resolution
    const sessionData = await asCoach.query(
      api.trainingSessions.getSessionWithAttendance,
      { sessionId },
    );

    expect(sessionData.session.drillIds).toBeDefined();
    expect(sessionData.session.drillIds?.length).toBe(2);
    expect(sessionData.session.drillIds).toContain(customDrillId);
    expect(sessionData.session.drillIds).toContain("drill_pressing_trigger_5v5");

    // Verify resolved custom drills
    expect(sessionData.resolvedDrills).toBeDefined();
    expect(sessionData.resolvedDrills.length).toBe(1);
    expect(sessionData.resolvedDrills[0]._id).toBe(customDrillId);
    expect(sessionData.resolvedDrills[0].title).toBe("Tiki-Taka 4v4+3 Possession Rondo");
    expect(sessionData.resolvedDrills[0].gridDimensions).toBe("20x25m");

    // 5. Remove preset drill
    await asCoach.mutation(api.trainingSessions.removeDrillFromSession, {
      sessionId,
      drillId: "drill_pressing_trigger_5v5",
    });

    const afterRemove = await asCoach.query(
      api.trainingSessions.getSessionWithAttendance,
      { sessionId },
    );
    expect(afterRemove.session.drillIds?.length).toBe(1);
    expect(afterRemove.session.drillIds).not.toContain("drill_pressing_trigger_5v5");
    expect(afterRemove.session.drillIds).toContain(customDrillId);
  });

  it("enforces role permissions when modifying session drills", async () => {
    const t = convexTest(schema, modules);

    const academyId = await t.run(async (ctx) => {
      return await ctx.db.insert("academies", {
        name: "Chelsea Academy",
        slug: "chelsea-academy",
        status: "active",
        createdAt: new Date().toISOString(),
      });
    });

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach Emma",
        email: "emma@chelsea.com",
        role: "coach",
        academyId,
      });
    });

    const athleteUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Player Lauren",
        email: "lauren@chelsea.com",
        role: "athlete",
        academyId,
      });
    });

    const teamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        academyId,
        name: "Chelsea U18",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    const asCoach = t.withIdentity({ subject: coachId });
    const sessionId = await asCoach.mutation(api.trainingSessions.createSession, {
      teamId,
      title: "Speed Agility Session",
      startsAt: new Date().toISOString(),
      durationMinutes: 60,
    });

    const asAthlete = t.withIdentity({ subject: athleteUserId });

    // Athlete attempting to link a drill should fail
    await expect(
      asAthlete.mutation(api.trainingSessions.linkDrillToSession, {
        sessionId,
        drillId: "any_drill_id",
      }),
    ).rejects.toThrow();

    // Athlete attempting to remove a drill should fail
    await expect(
      asAthlete.mutation(api.trainingSessions.removeDrillFromSession, {
        sessionId,
        drillId: "any_drill_id",
      }),
    ).rejects.toThrow();
  });
});
