import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import {
  listOwnAthletes,
  requireAcademyMember,
  requireAthleteAccess,
  requireRole,
  requireUser,
} from "./lib/auth.ts";

/**
 * The kiosk runs on a staff-signed-in device (athletes check in there with
 * their PIN), so only staff may read the roster or record check-ins. This
 * keeps attendance trustworthy: nobody can mark themselves present remotely.
 */
const KIOSK_ROLES: Array<"academy_admin" | "coach"> = ["academy_admin", "coach"];
import { attendanceStatusValidator } from "./schema.ts";
import type { Doc } from "./_generated/dataModel.d.ts";

/** Academy admin/coach: schedule a new training session for a team. */
export const createSession = mutation({
  args: {
    teamId: v.id("teams"),
    title: v.string(),
    startsAt: v.string(),
    durationMinutes: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    tacticalPlanId: v.optional(v.id("tacticalPlans")),
    drillIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    await requireAcademyMember(ctx, team.academyId);
    if (!args.title.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Session title is required",
      });
    }
    if (args.durationMinutes <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Duration must be positive",
      });
    }
    return await ctx.db.insert("trainingSessions", {
      academyId: team.academyId,
      teamId: args.teamId,
      title: args.title.trim(),
      startsAt: args.startsAt,
      durationMinutes: args.durationMinutes,
      location: args.location,
      notes: args.notes,
      tacticalPlanId: args.tacticalPlanId,
      drillIds: args.drillIds,
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });
  },
});

/** Academy admin/coach: update an existing training session. */
export const updateSession = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    title: v.string(),
    startsAt: v.string(),
    durationMinutes: v.number(),
    location: v.optional(v.string()),
    notes: v.optional(v.string()),
    tacticalPlanId: v.optional(v.id("tacticalPlans")),
    drillIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const { sessionId, ...updates } = args;
    const session = await ctx.db.get("trainingSessions", sessionId);
    if (!session) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }
    await requireAcademyMember(ctx, session.academyId);
    if (!updates.title.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Session title is required",
      });
    }
    await ctx.db.patch("trainingSessions", sessionId, updates);
    return null;
  },
});

/** Link a tactical plan directly to a training session */
export const linkTacticalPlanToSession = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    tacticalPlanId: v.optional(v.id("tacticalPlans")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });
    }
    await requireAcademyMember(ctx, session.academyId);

    if (args.tacticalPlanId) {
      const plan = await ctx.db.get("tacticalPlans", args.tacticalPlanId);
      if (!plan || plan.academyId !== session.academyId) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Tactical plan not found in your academy",
        });
      }
    }

    await ctx.db.patch("trainingSessions", args.sessionId, {
      tacticalPlanId: args.tacticalPlanId,
    });
    return args.sessionId;
  },
});

/** Link a drill from the playbook directly into a training session itinerary */
export const linkDrillToSession = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    drillId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });
    }
    await requireAcademyMember(ctx, session.academyId);

    const existingDrillIds = session.drillIds ?? [];
    if (!existingDrillIds.includes(args.drillId)) {
      await ctx.db.patch("trainingSessions", args.sessionId, {
        drillIds: [...existingDrillIds, args.drillId],
      });
    }
    return args.sessionId;
  },
});

/** Remove a drill from a training session itinerary */
export const removeDrillFromSession = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    drillId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });
    }
    await requireAcademyMember(ctx, session.academyId);

    const existingDrillIds = session.drillIds ?? [];
    await ctx.db.patch("trainingSessions", args.sessionId, {
      drillIds: existingDrillIds.filter((id) => id !== args.drillId),
    });
    return args.sessionId;
  },
});

/** Academy admin/coach/platform_admin: delete a training session and its attendance records. */
export const deleteSession = mutation({
  args: { sessionId: v.id("trainingSessions") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }
    await requireAcademyMember(ctx, session.academyId);
    const records = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    for (const record of records) {
      await ctx.db.delete("attendanceRecords", record._id);
    }
    await ctx.db.delete("trainingSessions", args.sessionId);
    return null;
  },
});

/** Lists upcoming/past training sessions for a team, scoped to the caller's academy. */
export const listSessionsForTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args): Promise<Doc<"trainingSessions">[]> => {
    const team = await ctx.db.get("teams", args.teamId);
    if (!team) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Team not found" });
    }
    await requireAcademyMember(ctx, team.academyId);
    return await ctx.db
      .query("trainingSessions")
      .withIndex("by_team_and_startsAt", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();
  },
});

/** Lists all training sessions across the caller's academy (for a combined schedule view). */
export const listSessionsForAcademy = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<Array<Doc<"trainingSessions"> & { teamName: string }>> => {
    const user = await requireUser(ctx);
    if (!user.academyId) {
      return [];
    }
    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
      .order("desc")
      .collect();

    const teamCache = new Map<string, string>();
    const withTeamName = await Promise.all(
      sessions.map(async (session) => {
        let teamName = teamCache.get(session.teamId);
        if (teamName === undefined) {
          const team = await ctx.db.get("teams", session.teamId);
          teamName = team?.name ?? "Unknown team";
          teamCache.set(session.teamId, teamName);
        }
        return { ...session, teamName };
      }),
    );

    if (user.role !== "athlete" && user.role !== "guardian") {
      return withTeamName;
    }

    // Athletes see their own teams' sessions; guardians their children's.
    const ownAthletes = await listOwnAthletes(ctx, user);
    const memberships = (
      await Promise.all(
        ownAthletes.map((athlete) =>
          ctx.db
            .query("teamMembers")
            .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
            .collect(),
        ),
      )
    ).flat();
    const teamIds = new Set(memberships.map((m) => m.teamId));
    return withTeamName.filter((s) => teamIds.has(s.teamId));
  },
});

/** Fetches a session plus its roster and current attendance records. */
export const getSessionWithAttendance = query({
  args: { sessionId: v.id("trainingSessions") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    session: Doc<"trainingSessions">;
    roster: Doc<"athletes">[];
    attendance: Doc<"attendanceRecords">[];
    tacticalPlan: Doc<"tacticalPlans"> | null;
    resolvedDrills: Doc<"drills">[];
  }> => {
    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }
    await requireAcademyMember(ctx, session.academyId);

    const members = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", session.teamId))
      .collect();
    const roster = (
      await Promise.all(members.map((m) => ctx.db.get("athletes", m.athleteId)))
    ).filter((a): a is Doc<"athletes"> => a !== null);

    const attendance = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    let tacticalPlan: Doc<"tacticalPlans"> | null = null;
    if (session.tacticalPlanId) {
      tacticalPlan = await ctx.db.get("tacticalPlans", session.tacticalPlanId);
    }

    const resolvedDrills: Array<Doc<"drills">> = [];
    if (session.drillIds && session.drillIds.length > 0) {
      for (const drillId of session.drillIds) {
        const normalized = ctx.db.normalizeId("drills", drillId);
        if (normalized) {
          const doc = await ctx.db.get("drills", normalized);
          if (doc) {
            resolvedDrills.push(doc);
          }
        }
      }
    }

    return { session, roster, attendance, tacticalPlan, resolvedDrills };
  },
});

/** Per-athlete attendance stats: sessions in their teams, attended, rate. */
export const getAthleteAttendanceStats = query({
  args: { athleteId: v.id("athletes") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    totalSessions: number;
    present: number;
    late: number;
    excused: number;
    absent: number;
    unrecorded: number;
    attendanceRate: number; // 0–100
    recentSessions: Array<{
      sessionId: string;
      title: string;
      startsAt: string;
      status: "present" | "absent" | "excused" | "late" | "unrecorded";
    }>;
  }> => {
    const user = await requireUser(ctx);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete)
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    await requireAthleteAccess(ctx, args.athleteId);

    // Get all teams this athlete is on
    const memberships = await ctx.db
      .query("teamMembers")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .collect();

    if (memberships.length === 0) {
      return {
        totalSessions: 0,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        unrecorded: 0,
        attendanceRate: 0,
        recentSessions: [],
      };
    }

    // Get all past sessions for those teams
    const now = new Date().toISOString();
    const allSessions: Doc<"trainingSessions">[] = [];
    for (const m of memberships) {
      const teamSessions = await ctx.db
        .query("trainingSessions")
        .withIndex("by_team", (q) => q.eq("teamId", m.teamId))
        .collect();
      // Only count sessions that have already started
      allSessions.push(...teamSessions.filter((s) => s.startsAt <= now));
    }

    if (allSessions.length === 0) {
      return {
        totalSessions: 0,
        present: 0,
        late: 0,
        excused: 0,
        absent: 0,
        unrecorded: 0,
        attendanceRate: 0,
        recentSessions: [],
      };
    }

    // Get attendance records for this athlete
    const records = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .collect();
    const recordBySession = new Map(
      records.map((r) => [r.sessionId, r.status]),
    );

    let present = 0,
      late = 0,
      excused = 0,
      absent = 0,
      unrecorded = 0;
    for (const s of allSessions) {
      const status = recordBySession.get(s._id);
      if (!status) {
        unrecorded++;
      } else if (status === "present") {
        present++;
      } else if (status === "late") {
        late++;
      } else if (status === "excused") {
        excused++;
      } else if (status === "absent") {
        absent++;
      }
    }

    const attended = present + late; // present and late count as attended
    const counted = present + late + absent; // excused and unrecorded don't count against rate
    const attendanceRate =
      counted > 0 ? Math.round((attended / counted) * 100) : 0;

    // Recent 10 sessions sorted by date desc
    const sorted = [...allSessions]
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      .slice(0, 10);
    const recentSessions = sorted.map((s) => ({
      sessionId: s._id,
      title: s.title,
      startsAt: s.startsAt,
      status: (recordBySession.get(s._id) ?? "unrecorded") as
        "present" | "absent" | "excused" | "late" | "unrecorded",
    }));

    return {
      totalSessions: allSessions.length,
      present,
      late,
      excused,
      absent,
      unrecorded,
      attendanceRate,
      recentSessions,
    };
  },
});

/** Academy-wide attendance leaderboard for coaches/admins — top & bottom 5 athletes by rate. */
export const getAcademyAttendanceLeaderboard = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    top: Array<{
      athleteId: string;
      name: string;
      rate: number;
      total: number;
    }>;
    bottom: Array<{
      athleteId: string;
      name: string;
      rate: number;
      total: number;
    }>;
  }> => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    if (!user.academyId) return { top: [], bottom: [] };

    const now = new Date().toISOString();

    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_academy_and_status", (q) =>
        q.eq("academyId", user.academyId!).eq("status", "active"),
      )
      .collect();

    // Limit to first 50 athletes to stay within read budget
    const sample = athletes.slice(0, 50);

    type AthleteStat = {
      athleteId: string;
      name: string;
      rate: number;
      total: number;
    };
    const stats: AthleteStat[] = [];

    for (const athlete of sample) {
      const memberships = await ctx.db
        .query("teamMembers")
        .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
        .collect();

      if (memberships.length === 0) continue;

      let totalPast = 0;
      let present = 0,
        late = 0,
        absent = 0;

      for (const m of memberships) {
        const sessions = await ctx.db
          .query("trainingSessions")
          .withIndex("by_team", (q) => q.eq("teamId", m.teamId))
          .collect();
        const pastSessions = sessions.filter((s) => s.startsAt <= now);
        totalPast += pastSessions.length;

        for (const s of pastSessions) {
          const rec = await ctx.db
            .query("attendanceRecords")
            .withIndex("by_session_and_athlete", (q) =>
              q.eq("sessionId", s._id).eq("athleteId", athlete._id),
            )
            .unique();
          if (rec?.status === "present") present++;
          else if (rec?.status === "late") late++;
          else if (rec?.status === "absent") absent++;
        }
      }

      const counted = present + late + absent;
      if (counted < 2) continue; // need at least 2 recorded sessions for meaningful rate

      const rate = Math.round(((present + late) / counted) * 100);
      stats.push({
        athleteId: athlete._id,
        name: `${athlete.firstName} ${athlete.lastName}`,
        rate,
        total: totalPast,
      });
    }

    stats.sort((a, b) => b.rate - a.rate);
    const top = stats.slice(0, 5);
    const bottom = stats.length > 5 ? stats.slice(-5).reverse() : [];

    return { top, bottom };
  },
});

/** Academy admin/coach/platform_admin: record or update an athlete's attendance status for a session. */
export const setAttendance = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    athleteId: v.id("athletes"),
    status: attendanceStatusValidator,
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Session not found",
      });
    }
    await requireAcademyMember(ctx, session.academyId);

    const existing = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_session_and_athlete", (q) =>
        q.eq("sessionId", args.sessionId).eq("athleteId", args.athleteId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch("attendanceRecords", existing._id, {
        status: args.status,
        recordedBy: user._id,
        recordedAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("attendanceRecords", {
        sessionId: args.sessionId,
        athleteId: args.athleteId,
        academyId: session.academyId,
        status: args.status,
        recordedBy: user._id,
        recordedAt: new Date().toISOString(),
      });
    }
    return null;
  },
});

/** Query training sessions scheduled for today in caller's academy. */
export const listTodaySessions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user.academyId) return [];

    const now = new Date();
    const startOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
    ).toISOString();
    const endOfDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    ).toISOString();

    const sessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
      .collect();

    // Find sessions occurring within today window
    const todaySessions = sessions.filter(
      (s) => s.startsAt >= startOfDay && s.startsAt <= endOfDay,
    );

    const result = [];
    for (const session of todaySessions) {
      const team = await ctx.db.get("teams", session.teamId);
      const teamMembers = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", session.teamId))
        .collect();
      const attendance = await ctx.db
        .query("attendanceRecords")
        .withIndex("by_session", (q) => q.eq("sessionId", session._id))
        .collect();

      const checkedInCount = attendance.filter(
        (a) => a.status === "present" || a.status === "late",
      ).length;

      result.push({
        ...session,
        teamName: team?.name ?? "Team",
        teamSport: team?.sport,
        rosterCount: teamMembers.length,
        checkedInCount,
      });
    }

    result.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return result;
  },
});

/** Query kiosk view for a session: full roster with check-in status and live stats. */
export const getSessionKioskRoster = query({
  args: { sessionId: v.id("trainingSessions") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, KIOSK_ROLES);
    if (!user.academyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "No academy access" });
    }

    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });
    }
    await requireAcademyMember(ctx, session.academyId);

    const team = await ctx.db.get("teams", session.teamId);
    const teamMembers = await ctx.db
      .query("teamMembers")
      .withIndex("by_team", (q) => q.eq("teamId", session.teamId))
      .collect();

    const athleteDocs = await Promise.all(
      teamMembers.map((m) => ctx.db.get("athletes", m.athleteId)),
    );
    const athletes = athleteDocs.filter(Boolean) as Doc<"athletes">[];

    const records = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    const attendanceMap = new Map(records.map((r) => [r.athleteId, r]));

    const roster = athletes.map((a) => {
      const rec = attendanceMap.get(a._id);
      return {
        _id: a._id,
        firstName: a.firstName,
        lastName: a.lastName,
        sport: a.sport,
        hasPin: a.checkInPin !== undefined,
        status: (rec?.status ?? "unrecorded") as
          | "present"
          | "late"
          | "absent"
          | "excused"
          | "unrecorded",
        recordedAt: rec?.recordedAt,
      };
    });

    roster.sort((a, b) => {
      if (a.status === "unrecorded" && b.status !== "unrecorded") return -1;
      if (a.status !== "unrecorded" && b.status === "unrecorded") return 1;
      return a.lastName.localeCompare(b.lastName);
    });

    const total = roster.length;
    const present = records.filter((r) => r.status === "present").length;
    const late = records.filter((r) => r.status === "late").length;
    const excused = records.filter((r) => r.status === "excused").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const unrecorded = Math.max(0, total - (present + late + excused + absent));
    const percentCheckedIn =
      total > 0 ? Math.round(((present + late) / total) * 100) : 0;

    return {
      session: {
        ...session,
        teamName: team?.name ?? "Team",
        teamSport: team?.sport,
      },
      roster,
      stats: {
        total,
        present,
        late,
        excused,
        absent,
        unrecorded,
        percentCheckedIn,
      },
    };
  },
});

/** Kiosk Self-Check-in or Coach 1-tap check-in for an athlete. */
export const checkInAthlete = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    athleteId: v.optional(v.id("athletes")),
    pin: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, KIOSK_ROLES);
    if (!user.academyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "No academy access" });
    }

    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });
    }
    await requireAcademyMember(ctx, session.academyId);

    // Resolve target athlete
    let targetAthlete: Doc<"athletes"> | null = null;
    if (args.athleteId) {
      targetAthlete = await ctx.db.get("athletes", args.athleteId);
    } else if (args.pin && args.pin.trim()) {
      const pinTrimmed = args.pin.trim();
      targetAthlete = await ctx.db
        .query("athletes")
        .withIndex("by_academy_and_pin", (q) =>
          q.eq("academyId", session.academyId).eq("checkInPin", pinTrimmed),
        )
        .first();
    }

    if (!targetAthlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: args.pin ? "Invalid check-in PIN" : "Athlete not found",
      });
    }

    // Verify athlete is on the team for this session
    const membership = await ctx.db
      .query("teamMembers")
      .withIndex("by_team_and_athlete", (q) =>
        q.eq("teamId", session.teamId).eq("athleteId", targetAthlete!._id),
      )
      .unique();

    if (!membership) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: `${targetAthlete.firstName} ${targetAthlete.lastName} is not enrolled in this team`,
      });
    }

    // Auto-determine status: late if >15 minutes after session start
    const now = new Date();
    const sessionStart = new Date(session.startsAt);
    const fifteenMinsMs = 15 * 60 * 1000;
    const isLate = now.getTime() > sessionStart.getTime() + fifteenMinsMs;
    const status = isLate ? "late" : "present";
    const recordedAt = now.toISOString();

    const existing = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_session_and_athlete", (q) =>
        q.eq("sessionId", session._id).eq("athleteId", targetAthlete!._id),
      )
      .unique();

    if (existing) {
      await ctx.db.patch("attendanceRecords", existing._id, {
        status,
        recordedBy: user._id,
        recordedAt,
      });
    } else {
      await ctx.db.insert("attendanceRecords", {
        sessionId: session._id,
        athleteId: targetAthlete._id,
        academyId: session.academyId,
        status,
        recordedBy: user._id,
        recordedAt,
      });
    }

    return {
      success: true,
      athlete: {
        _id: targetAthlete._id,
        firstName: targetAthlete.firstName,
        lastName: targetAthlete.lastName,
      },
      status,
      recordedAt,
    };
  },
});

/** Undo a check-in record for an athlete in a session. */
export const undoCheckIn = mutation({
  args: {
    sessionId: v.id("trainingSessions"),
    athleteId: v.id("athletes"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, KIOSK_ROLES);
    if (!user.academyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "No academy access" });
    }

    const session = await ctx.db.get("trainingSessions", args.sessionId);
    if (!session) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Session not found" });
    }
    await requireAcademyMember(ctx, session.academyId);

    const existing = await ctx.db
      .query("attendanceRecords")
      .withIndex("by_session_and_athlete", (q) =>
        q.eq("sessionId", args.sessionId).eq("athleteId", args.athleteId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete("attendanceRecords", existing._id);
    }
    return null;
  },
});

