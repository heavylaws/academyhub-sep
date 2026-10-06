import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireRole, requireUser } from "./lib/auth.ts";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

/** Academy admin/coach/platform_admin: create a new team/group in their academy. */
export const createTeam = mutation({
  args: {
    name: v.string(),
    sport: v.optional(v.string()),
    academyId: v.optional(v.id("academies")),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const targetAcademyId = args.academyId ?? user.academyId;
    if (!targetAcademyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not part of an academy",
      });
    }
    if (!args.name.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Team name is required",
      });
    }
    return await ctx.db.insert("teams", {
      academyId: targetAcademyId,
      name: args.name.trim(),
      sport: args.sport,
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });
  },
});

/** Academy admin/coach/platform_admin: update a team's name/sport. */
export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    sport: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    await requireAcademyMember(ctx, team.academyId);
    if (!args.name.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Team name is required",
      });
    }
    await ctx.db.patch("teams", args.teamId, {
      name: args.name.trim(),
      sport: args.sport,
    });
    return null;
  },
});

/** Academy admin/coach/platform_admin: delete a team along with its memberships. */
export const deleteTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    await requireAcademyMember(ctx, team.academyId);

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const member of members) {
      await ctx.db.delete("teamMembers", member._id);
    }

    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const session of sessions) {
      const records = await ctx.db
        .query("attendanceRecords")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const record of records) {
        await ctx.db.delete("attendanceRecords", record._id);
      }
      await ctx.db.delete("trainingSessions", session._id);
    }

    await ctx.db.delete("teams", args.teamId);
    return null;
  },
});

/** Lists teams in the current user's academy. */
export const listTeams = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<Array<Doc<"teams"> & { memberCount: number }>> => {
    const user = await requireUser(ctx);
    if (!user.academyId) {
      return [];
    }
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
      .order("desc")
      .collect();

    return await Promise.all(
      teams.map(async (team) => {
        const members = await ctx.db
          .query("teamMembers")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();
        return { ...team, memberCount: members.length };
      }),
    );
  },
});

/** Fetches a single team with its roster of athletes, scoped to the caller's academy. */
export const getTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    team: Doc<"teams">;
    roster: Array<
      Doc<"athletes"> & {
        jerseyNumber?: number;
        tacticalPosition?: string;
        tacticalRole?: string;
      }
    >;
    activeTacticalPlan?: Doc<"tacticalPlans"> | null;
  }> => {
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    const user = await requireAcademyMember(ctx, team.academyId);

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    const membersByAthleteId = new Map(
      members.map((m) => [m.athleteId, m]),
    );

    const rawAthletes = (
      await Promise.all(members.map((m) => ctx.db.get("athletes", m.athleteId)))
    ).filter((a): a is Doc<"athletes"> => a !== null);

    let activeTacticalPlan: Doc<"tacticalPlans"> | null = null;
    if (team.activeTacticalPlanId) {
      activeTacticalPlan = await ctx.db.get("tacticalPlans", team.activeTacticalPlanId);
    }

    // Teammates (athletes, guardians) only see names; contact details, birth
    // dates, notes and check-in PINs are staff-only.
    const isStaff =
      user.role === "platform_admin" ||
      user.role === "academy_admin" ||
      user.role === "coach" ||
      user.role === "accounting";

    const roster = rawAthletes.map((a) => {
      const member = membersByAthleteId.get(a._id);
      if (!isStaff) {
        return {
          _id: a._id,
          _creationTime: a._creationTime,
          academyId: a.academyId,
          firstName: a.firstName,
          lastName: a.lastName,
          sport: a.sport,
          status: a.status,
          createdBy: a.createdBy,
          createdAt: a.createdAt,
          jerseyNumber: member?.jerseyNumber,
          tacticalPosition: member?.tacticalPosition,
          tacticalRole: member?.tacticalRole,
        } as unknown as Doc<"athletes"> & {
          jerseyNumber?: number;
          tacticalPosition?: string;
          tacticalRole?: string;
        };
      }
      return {
        ...a,
        jerseyNumber: member?.jerseyNumber,
        tacticalPosition: member?.tacticalPosition,
        tacticalRole: member?.tacticalRole,
      };
    });

    return { team, roster, activeTacticalPlan };
  },
});

/** Academy admin/coach: update team tactical formation and active playbook routine */
export const updateTeamTacticalSetup = mutation({
  args: {
    teamId: v.id("teams"),
    preferredFormation: v.optional(v.string()),
    activeTacticalPlanId: v.optional(v.id("tacticalPlans")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    await requireAcademyMember(ctx, team.academyId);

    if (args.activeTacticalPlanId) {
      const plan = await ctx.db.get("tacticalPlans", args.activeTacticalPlanId);
      if (!plan || plan.academyId !== team.academyId) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Invalid tactical plan for this academy",
        });
      }
    }

    await ctx.db.patch("teams", args.teamId, {
      preferredFormation: args.preferredFormation,
      activeTacticalPlanId: args.activeTacticalPlanId,
    });
    return args.teamId;
  },
});

/** Academy admin/coach: assign jersey number, tactical position, and role to a team athlete */
export const assignAthleteTacticalRole = mutation({
  args: {
    teamId: v.id("teams"),
    athleteId: v.id("athletes"),
    jerseyNumber: v.optional(v.number()),
    tacticalPosition: v.optional(v.string()),
    tacticalRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    await requireAcademyMember(ctx, team.academyId);

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_athlete", (q) =>
        q.eq("teamId", args.teamId).eq("athleteId", args.athleteId),
      )
      .first();

    if (!membership) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete is not a member of this team",
      });
    }

    // Enforce unique jersey numbers per team
    if (args.jerseyNumber !== undefined) {
      const allMembers = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
        .collect();

      const duplicate = allMembers.find(
        (m) => m.athleteId !== args.athleteId && m.jerseyNumber === args.jerseyNumber,
      );

      if (duplicate) {
        const dupAthlete = await ctx.db.get("athletes", duplicate.athleteId);
        const name = dupAthlete
          ? `${dupAthlete.firstName} ${dupAthlete.lastName}`
          : "another player";
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: `Jersey #${args.jerseyNumber} is already assigned to ${name} on this squad`,
        });
      }
    }

    await ctx.db.patch("teamMembers", membership._id, {
      jerseyNumber: args.jerseyNumber,
      tacticalPosition: args.tacticalPosition,
      tacticalRole: args.tacticalRole,
    });

    return membership._id;
  },
});

/** Academy admin/coach/platform_admin: remove an individual athlete from a squad */
export const removeTeamMember = mutation({
  args: {
    teamId: v.id("teams"),
    athleteId: v.id("athletes"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    await requireAcademyMember(ctx, team.academyId);

    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_athlete", (q) =>
        q.eq("teamId", args.teamId).eq("athleteId", args.athleteId),
      )
      .first();

    if (membership) {
      await ctx.db.delete("teamMembers", membership._id);
    }
    return null;
  },
});

/** Academy admin/coach/platform_admin: replace a team's roster with the given athlete IDs. */
export const setTeamRoster = mutation({
  args: { teamId: v.id("teams"), athleteIds: v.array(v.id("athletes")) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    await requireAcademyMember(ctx, team.academyId);

    const existing = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    const existingByAthlete = new Map(existing.map((m) => [m.athleteId, m]));
    const nextIds = new Set(args.athleteIds);

    for (const member of existing) {
      if (!nextIds.has(member.athleteId)) {
        await ctx.db.delete("teamMembers", member._id);
      }
    }

    for (const athleteId of args.athleteIds) {
      if (existingByAthlete.has(athleteId)) continue;
      const athlete = await ctx.db.get("athletes", athleteId);
      if (!athlete || athlete.academyId !== team.academyId) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Invalid athlete for this academy",
        });
      }
      await ctx.db.insert("teamMembers", {
        teamId: args.teamId,
        athleteId,
        academyId: team.academyId,
        createdAt: new Date().toISOString(),
      });
    }
    void user;
    return null;
  },
});

/** Lists the teams and tactical roles a given athlete belongs to. */
export const listTeamsForAthlete = query({
  args: { athleteId: v.id("athletes") },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<
      Doc<"teams"> & {
        jerseyNumber?: number;
        tacticalPosition?: string;
        tacticalRole?: string;
      }
    >
  > => {
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }
    await requireAcademyMember(ctx, athlete.academyId);
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .collect();
    const teams = (
      await Promise.all(
        memberships.map(async (m) => {
          const team = await ctx.db.get("teams", m.teamId);
          if (!team) return null;
          return {
            ...team,
            jerseyNumber: m.jerseyNumber,
            tacticalPosition: m.tacticalPosition,
            tacticalRole: m.tacticalRole,
          };
        }),
      )
    ).filter((t): t is NonNullable<typeof t> => t !== null);
    return teams;
  },
});
