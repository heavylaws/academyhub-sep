import { defineTable } from "convex/server";
import { v } from "convex/values";

export const teams = defineTable({
  academyId: v.id("academies"),
  name: v.string(),
  sport: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.string(),
}).index("by_academy", ["academyId"]);

export const teamMembers = defineTable({
  teamId: v.id("teams"),
  athleteId: v.id("athletes"),
  academyId: v.id("academies"),
  createdAt: v.string(),
})
  .index("by_team", ["teamId"])
  .index("by_athlete", ["athleteId"])
  .index("by_team_and_athlete", ["teamId", "athleteId"]);
