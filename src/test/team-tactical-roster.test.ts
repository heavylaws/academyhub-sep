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

  it("prevents assigning duplicate jersey numbers on the same team", async () => {
    const t = convexTest(schema, modules);

    const academyId = await t.run(async (ctx) => {
      return await ctx.db.insert("academies", {
        name: "FC Porto Academy",
        slug: "fc-porto",
        status: "active",
        createdAt: new Date().toISOString(),
      });
    });

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach Sergio",
        email: "sergio@porto.com",
        role: "coach",
        academyId,
      });
    });

    const teamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        academyId,
        name: "Porto B Squad",
        sport: "Soccer",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    const ath1 = await t.run(async (ctx) => {
      return await ctx.db.insert("athletes", {
        academyId,
        firstName: "Vitinha",
        lastName: "Mid",
        status: "active",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    const ath2 = await t.run(async (ctx) => {
      return await ctx.db.insert("athletes", {
        academyId,
        firstName: "Fabio",
        lastName: "Vieira",
        status: "active",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    const asCoach = t.withIdentity({ subject: coachId });

    await asCoach.mutation(api.teams.setTeamRoster, {
      teamId,
      athleteIds: [ath1, ath2],
    });

    // Assign #10 to Vitinha
    await asCoach.mutation(api.teams.assignAthleteTacticalRole, {
      teamId,
      athleteId: ath1,
      jerseyNumber: 10,
      tacticalPosition: "CM",
    });

    // Attempting to assign #10 to Fabio Vieira must fail with duplicate error
    await expect(
      asCoach.mutation(api.teams.assignAthleteTacticalRole, {
        teamId,
        athleteId: ath2,
        jerseyNumber: 10,
        tacticalPosition: "AM",
      }),
    ).rejects.toThrow(/Jersey #10 is already assigned/);
  });

  it("removes an individual athlete with removeTeamMember without deleting others", async () => {
    const t = convexTest(schema, modules);

    const academyId = await t.run(async (ctx) => {
      return await ctx.db.insert("academies", {
        name: "Ajax Youth",
        slug: "ajax-youth",
        status: "active",
        createdAt: new Date().toISOString(),
      });
    });

    const coachId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Coach Ten Hag",
        email: "erik@ajax.nl",
        role: "coach",
        academyId,
      });
    });

    const teamId = await t.run(async (ctx) => {
      return await ctx.db.insert("teams", {
        academyId,
        name: "Ajax U19",
        sport: "Soccer",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    const ath1 = await t.run(async (ctx) => {
      return await ctx.db.insert("athletes", {
        academyId,
        firstName: "Ryan",
        lastName: "Gravenberch",
        status: "active",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    const ath2 = await t.run(async (ctx) => {
      return await ctx.db.insert("athletes", {
        academyId,
        firstName: "Jurrien",
        lastName: "Timber",
        status: "active",
        createdBy: coachId,
        createdAt: new Date().toISOString(),
      });
    });

    const asCoach = t.withIdentity({ subject: coachId });

    await asCoach.mutation(api.teams.setTeamRoster, {
      teamId,
      athleteIds: [ath1, ath2],
    });

    let teamData = await asCoach.query(api.teams.getTeam, { teamId });
    expect(teamData.roster.length).toBe(2);

    // Remove Gravenberch
    await asCoach.mutation(api.teams.removeTeamMember, {
      teamId,
      athleteId: ath1,
    });

    teamData = await asCoach.query(api.teams.getTeam, { teamId });
    expect(teamData.roster.length).toBe(1);
    expect(teamData.roster[0].firstName).toBe("Jurrien");
  });

  it("allows platform_admin to create, update, and manage teams across academies", async () => {
    const t = convexTest(schema, modules);

    const academyId = await t.run(async (ctx) => {
      return await ctx.db.insert("academies", {
        name: "Global Academy",
        slug: "global-academy",
        status: "active",
        createdAt: new Date().toISOString(),
      });
    });

    const superAdminId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        name: "Super Admin",
        email: "super@coachtactics.com",
        role: "platform_admin",
        academyId,
      });
    });

    const asAdmin = t.withIdentity({ subject: superAdminId });

    const newTeamId = await asAdmin.mutation(api.teams.createTeam, {
      name: "Global Select XI",
      sport: "Soccer",
      academyId,
    });

    expect(newTeamId).toBeDefined();

    await asAdmin.mutation(api.teams.updateTeam, {
      teamId: newTeamId,
      name: "Global Select XI (Updated)",
    });

    const teamData = await asAdmin.query(api.teams.getTeam, { teamId: newTeamId });
    expect(teamData.team.name).toBe("Global Select XI (Updated)");
  });
});
