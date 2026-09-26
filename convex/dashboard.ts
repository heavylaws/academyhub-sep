import { query } from "./_generated/server.js";
import { requireUser } from "./lib/auth.ts";
import type { Id } from "./_generated/dataModel.d.ts";

/**
 * Returns a role-tailored summary for the dashboard.
 * A single reactive query keeps the dashboard coherent and minimises roundtrips.
 */
export const getDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const now = new Date().toISOString();

    // ── Platform Admin ────────────────────────────────────────────────────────
    if (user.role === "platform_admin") {
      const academies = await ctx.db.query("academies").collect();
      const users = await ctx.db.query("users").collect();
      return {
        role: "platform_admin" as const,
        academyCount: academies.length,
        userCount: users.filter((u) => u.role !== undefined).length,
        academies: academies.slice(0, 8).map((a) => ({
          _id: a._id,
          name: a.name,
          slug: a.slug,
          status: a.status,
          createdAt: a.createdAt,
        })),
      };
    }

    if (!user.academyId) {
      return {
        role: (user.role ?? "athlete") as string,
        noAcademy: true as const,
      };
    }

    const academyId = user.academyId;

    // ── Academy Admin / Coach / Accounting ────────────────────────────────────
    if (
      user.role === "academy_admin" ||
      user.role === "coach" ||
      user.role === "accounting"
    ) {
      const [athletes, teams, allSessions, allPlans] = await Promise.all([
        ctx.db
          .query("athletes")
          .withIndex("by_academy_and_status", (q) =>
            q.eq("academyId", academyId).eq("status", "active"),
          )
          .collect(),
        ctx.db
          .query("teams")
          .withIndex("by_academy", (q) => q.eq("academyId", academyId))
          .collect(),
        ctx.db
          .query("trainingSessions")
          .withIndex("by_academy", (q) => q.eq("academyId", academyId))
          .order("asc")
          .collect(),
        ctx.db
          .query("trainingPlans")
          .withIndex("by_academy", (q) => q.eq("academyId", academyId))
          .collect(),
      ]);

      const upcomingSessions = allSessions
        .filter((s) => s.startsAt >= now)
        .slice(0, 8);

      const activePlanCount = allPlans.filter(
        (p) => p.status === "active",
      ).length;

      // Team member counts — iterate team by team (bounded by team count)
      const teamMemberCounts = new Map<string, number>();
      for (const team of teams) {
        const rows = await ctx.db
          .query("teamMembers")
          .withIndex("by_team", (q) => q.eq("teamId", team._id))
          .collect();
        teamMemberCounts.set(team._id, rows.length);
      }

      // Recent assessments: single query using by_academy_and_assessedOn index
      const athleteMap = new Map(athletes.map((a) => [a._id, a]));
      const recentAssessmentDocs = await ctx.db
        .query("assessments")
        .withIndex("by_academy_and_assessedOn", (q) =>
          q.eq("academyId", user.academyId!),
        )
        .order("desc")
        .take(6);

      const recentAssessments = recentAssessmentDocs.map((r) => {
        const a = athleteMap.get(r.athleteId);
        return {
          _id: r._id,
          metric: r.metric,
          value: r.value,
          unit: r.unit,
          assessedOn: r.assessedOn,
          athleteName: a ? `${a.firstName} ${a.lastName}` : "Unknown",
          athleteId: r.athleteId,
        };
      });

      return {
        role: user.role,
        athleteCount: athletes.length,
        teamCount: teams.length,
        upcomingSessionCount: upcomingSessions.length,
        activePlanCount,
        upcomingSessions: upcomingSessions.map((s) => ({
          _id: s._id,
          title: s.title,
          startsAt: s.startsAt,
          durationMinutes: s.durationMinutes,
          location: s.location,
          teamName:
            teams.find((t) => t._id === s.teamId)?.name ?? "Unknown team",
        })),
        recentAssessments,
        teams: teams.slice(0, 5).map((t) => ({
          _id: t._id,
          name: t.name,
          sport: t.sport,
          memberCount: teamMemberCounts.get(t._id) ?? 0,
        })),
      };
    }

    // ── Guardian ──────────────────────────────────────────────────────────────
    if (user.role === "guardian") {
      const athlete = await ctx.db
        .query("athletes")
        .withIndex("by_guardian_user", (q) =>
          q.eq("guardianUserId", user._id as Id<"users">),
        )
        .first();

      if (!athlete) {
        return { role: "guardian" as const, noAthleteRecord: true as const };
      }

      const memberships = await ctx.db
        .query("teamMembers")
        .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
        .collect();
      const teamIds = memberships.map((m) => m.teamId);
      const myTeams = (
        await Promise.all(
          teamIds.map((tid) => ctx.db.get("teams", tid)),
        )
      ).filter((t) => t !== null);

      const allMySessions = (
        await Promise.all(
          teamIds.map((tid) =>
            ctx.db
              .query("trainingSessions")
              .withIndex("by_team", (q) => q.eq("teamId", tid))
              .collect(),
          ),
        )
      ).flat();

      const upcomingSessions = allMySessions
        .filter((s) => s.startsAt >= now)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .slice(0, 8);

      const myPlans = await ctx.db
        .query("trainingPlans")
        .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
        .collect();
      const activePlans = myPlans.filter((p) => p.status === "active");

      const recentAssessments = await ctx.db
        .query("assessments")
        .withIndex("by_athlete_and_assessedOn", (q) =>
          q.eq("athleteId", athlete._id),
        )
        .order("desc")
        .take(6);

      return {
        role: "guardian" as const,
        athleteId: athlete._id,
        athleteName: `${athlete.firstName} ${athlete.lastName}`,
        sport: athlete.sport,
        teamCount: myTeams.length,
        upcomingSessionCount: upcomingSessions.length,
        activePlanCount: activePlans.length,
        upcomingSessions: upcomingSessions.map((s) => ({
          _id: s._id,
          title: s.title,
          startsAt: s.startsAt,
          durationMinutes: s.durationMinutes,
          location: s.location,
          teamName: myTeams.find((t) => t?._id === s.teamId)?.name ?? "Team",
        })),
        activePlans: activePlans.slice(0, 4).map((p) => ({
          _id: p._id,
          title: p.title,
          startDate: p.startDate,
          endDate: p.endDate,
        })),
        recentAssessments: recentAssessments.map((a) => ({
          _id: a._id,
          metric: a.metric,
          value: a.value,
          unit: a.unit,
          assessedOn: a.assessedOn,
        })),
      };
    }

    // ── Athlete ───────────────────────────────────────────────────────────────
    const athlete = await ctx.db
      .query("athletes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!athlete) {
      return { role: "athlete" as const, noAthleteRecord: true as const };
    }

    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
      .collect();
    const teamIds = memberships.map((m) => m.teamId);
    const myTeams = (
      await Promise.all(teamIds.map((tid) => ctx.db.get("teams", tid)))
    ).filter((t) => t !== null);

    const allMySessions = (
      await Promise.all(
        teamIds.map((tid) =>
          ctx.db
            .query("trainingSessions")
            .withIndex("by_team", (q) => q.eq("teamId", tid))
            .collect(),
        ),
      )
    ).flat();

    const upcomingSessions = allMySessions
      .filter((s) => s.startsAt >= now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .slice(0, 8);

    const myPlans = await ctx.db
      .query("trainingPlans")
      .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
      .collect();
    const activePlans = myPlans.filter((p) => p.status === "active");

    const recentAssessments = await ctx.db
      .query("assessments")
      .withIndex("by_athlete_and_assessedOn", (q) =>
        q.eq("athleteId", athlete._id),
      )
      .order("desc")
      .take(6);

    return {
      role: "athlete" as const,
      athleteId: athlete._id,
      athleteName: `${athlete.firstName} ${athlete.lastName}`,
      sport: athlete.sport,
      teamCount: myTeams.length,
      upcomingSessionCount: upcomingSessions.length,
      activePlanCount: activePlans.length,
      upcomingSessions: upcomingSessions.map((s) => ({
        _id: s._id,
        title: s.title,
        startsAt: s.startsAt,
        durationMinutes: s.durationMinutes,
        location: s.location,
        teamName: myTeams.find((t) => t?._id === s.teamId)?.name ?? "Team",
      })),
      activePlans: activePlans.slice(0, 4).map((p) => ({
        _id: p._id,
        title: p.title,
        startDate: p.startDate,
        endDate: p.endDate,
      })),
      recentAssessments: recentAssessments.map((a) => ({
        _id: a._id,
        metric: a.metric,
        value: a.value,
        unit: a.unit,
        assessedOn: a.assessedOn,
      })),
    };
  },
});
