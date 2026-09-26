import { defineTable } from "convex/server";
import { v } from "convex/values";

export const trainingSessions = defineTable({
  academyId: v.id("academies"),
  teamId: v.id("teams"),
  title: v.string(),
  // ISO 8601 UTC instant for the session start time.
  startsAt: v.string(),
  durationMinutes: v.number(),
  location: v.optional(v.string()),
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.string(),
})
  .index("by_academy", ["academyId"])
  .index("by_team", ["teamId"])
  .index("by_team_and_startsAt", ["teamId", "startsAt"]);

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
})
  .index("by_session", ["sessionId"])
  .index("by_session_and_athlete", ["sessionId", "athleteId"])
  .index("by_athlete", ["athleteId"]);
