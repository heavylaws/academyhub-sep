import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema.ts";
import { modules } from "../../convex/test.setup.ts";
import { api } from "../../convex/_generated/api.js";

describe("Phase 6: Team & Player Tactical Roster Integration Suite", () => {
  it("configures team tactical formation and active tactical playbook plan", async () => {
    const t = convexTest(schema, modules);

    const academyId = await t.run(async (ctx) => {
      return await ctx.db.insert("academies", {
        name: "Sporting CP Academy",
        slug: "sporting-cp-academy",
        status: "active",
        createdAt: new Date().toISOString(),
      });
    });

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach Ruben",
        email: "ruben@sporting.com",
        role: "coach",
        academyId,
      });
    });

    const teamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        academyId,
        name: "U17 Elite",
        sport: "Soccer",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    const tacticalPlanId = await t.run(async (ctx) => {
      return await ctx.db.insert("tacticalPlans", {
        academyId,
        title: "3-4-3 Diamond High-Pressing Routine",
        pitchType: "full",
        coachingPoints: ["High vertical pressing", "Wingbacks provide width"],
        planData: JSON.stringify({ title: "3-4-3 Diamond", phases: [] }),
        createdBy: coachId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    const asCoach = t.withIdentity({ subject: coachId });

    // Update team tactical formation and playbook plan
    await asCoach.mutation(api.teams.updateTeamTacticalSetup, {
      teamId,
      preferredFormation: "3-4-3",
      activeTacticalPlanId: tacticalPlanId,
    });

    const teamData = await asCoach.query(api.teams.getTeam, { teamId });
    expect(teamData.team.preferredFormation).toBe("3-4-3");
    expect(teamData.team.activeTacticalPlanId).toBe(tacticalPlanId);
    expect(teamData.activeTacticalPlan).toBeDefined();
    expect(teamData.activeTacticalPlan?._id).toBe(tacticalPlanId);
    expect(teamData.activeTacticalPlan?.title).toBe("3-4-3 Diamond High-Pressing Routine");
  });

  it("assigns jersey numbers, tactical positions, and player duties to roster athletes", async () => {
    const t = convexTest(schema, modules);

    const academyId = await t.run(async (ctx) => {
      return await ctx.db.insert("academies", {
        name: "Benfica Youth Academy",
        slug: "benfica-youth-academy",
        status: "active",
        createdAt: new Date().toISOString(),
      });
    });

    const adminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Director Rui",
        email: "rui@benfica.com",
        role: "academy_admin",
        academyId,
      });
    });

    const teamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        academyId,
        name: "U15 Seixal Stars",
        sport: "Soccer",
        createdBy: adminId,
        createdAt: new Date().toISOString(),
      });
    });

    const athleteId = await t.run(async (ctx) => {
      return await ctx.db.insert("athletes", {
        academyId,
        firstName: "Bernardo",
        lastName: "Silva",
        dateOfBirth: "2010-08-10",
        gender: "male",
        status: "active",
        createdBy: adminId,
        createdAt: new Date().toISOString(),
      });
    });

    const asAdmin = t.withIdentity({ subject: adminId });

    // Add athlete to team roster
    await asAdmin.mutation(api.teams.setTeamRoster, {
      teamId,
      athleteIds: [athleteId],
    });

    // Assign tactical role
    await asAdmin.mutation(api.teams.assignAthleteTacticalRole, {
      teamId,
      athleteId,
      jerseyNumber: 10,
      tacticalPosition: "AM",
      tacticalRole: "Advanced Playmaker (Trequartista)",
    });

    const teamData = await asAdmin.query(api.teams.getTeam, { teamId });
    expect(teamData.roster.length).toBe(1);
    const athlete = teamData.roster[0];
    expect(athlete.firstName).toBe("Bernardo");
    expect(athlete.jerseyNumber).toBe(10);
    expect(athlete.tacticalPosition).toBe("AM");
    expect(athlete.tacticalRole).toBe("Advanced Playmaker (Trequartista)");
  });
});
