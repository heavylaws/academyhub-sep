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
});
