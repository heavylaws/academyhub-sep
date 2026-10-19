import { defineTable } from "convex/server";
import { v } from "convex/values";

export const sessionTypeValidator = v.union(
  v.literal("training"),
  v.literal("match_competitive"),
  v.literal("match_friendly"),
  v.literal("recovery"),
  v.literal("testing"),
);

export const microcycleDayValidator = v.union(
  v.literal("MD-4"),
  v.literal("MD-3"),
  v.literal("MD-2"),
  v.literal("MD-1"),
  v.literal("MD"),
  v.literal("MD+1"),
  v.literal("MD+2"),
  v.literal("general"),
);

export const matchDetailsValidator = v.object({
  opponentName: v.string(),
  homeAway: v.union(v.literal("home"), v.literal("away"), v.literal("neutral")),
  competitionName: v.optional(v.string()),
  goalsFor: v.optional(v.number()),
  goalsAgainst: v.optional(v.number()),
  formation: v.optional(v.string()),
  matchSummary: v.optional(v.string()),
});

export const matchStatsValidator = v.object({
  started: v.boolean(),
  minutesPlayed: v.number(),
  goalsOrPoints: v.optional(v.number()),
  assists: v.optional(v.number()),
  yellowCards: v.optional(v.number()),
  redCards: v.optional(v.number()),
  coachRating: v.optional(v.number()), // 1-10 scale
});

export const trainingSessions = defineTable({
  academyId: v.id("academies"),
  teamId: v.id("teams"),
  title: v.string(),
  // ISO 8601 UTC instant for the session start time.
  startsAt: v.string(),
  durationMinutes: v.number(),
  location: v.optional(v.string()),
  notes: v.optional(v.string()),
  tacticalPlanId: v.optional(v.id("tacticalPlans")),
  drillIds: v.optional(v.array(v.string())),
  facilityId: v.optional(v.id("facilities")),
  sessionType: v.optional(sessionTypeValidator),
  microcycleDay: v.optional(microcycleDayValidator),
  matchDetails: v.optional(matchDetailsValidator),
  createdBy: v.id("users"),
  createdAt: v.string(),
  deletedAt: v.optional(v.string()),
  deletedBy: v.optional(v.id("users")),
})
  .index("by_academy", ["academyId"])
  .index("by_team", ["teamId"])
  .index("by_team_and_startsAt", ["teamId", "startsAt"])
  .index("by_facility", ["facilityId"]);

export const attendanceStatusValidator = v.union(
  v.literal("present"),
  v.literal("absent"),
  v.literal("excused"),
  v.literal("late"),
);

export const attendanceRecords = defineTable({
  sessionId: v.id("trainingSessions"),
  athleteId: v.id("athletes"),
  academyId: v.id("academies"),
  status: attendanceStatusValidator,
  recordedBy: v.id("users"),
  recordedAt: v.string(),
  durationMinutes: v.optional(v.number()),
  rpe: v.optional(v.number()),
  sessionLoad: v.optional(v.number()),
  wellnessFatigue: v.optional(v.number()),
  wellnessSoreness: v.optional(v.number()),
  loggedAt: v.optional(v.number()),
  matchStats: v.optional(matchStatsValidator),
})
  .index("by_academy", ["academyId"])
  .index("by_session", ["sessionId"])
  .index("by_session_and_athlete", ["sessionId", "athleteId"])
  .index("by_athlete", ["athleteId"]);
