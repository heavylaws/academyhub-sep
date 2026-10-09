import { defineTable } from "convex/server";
import { v } from "convex/values";

export const teams = defineTable({
  academyId: v.id("academies"),
  name: v.string(),
  sport: v.optional(v.string()),
  preferredFormation: v.optional(v.string()),
  activeTacticalPlanId: v.optional(v.id("tacticalPlans")),
  createdBy: v.id("users"),
  createdAt: v.string(),
  deletedAt: v.optional(v.string()),
  deletedBy: v.optional(v.id("users")),
}).index("by_academy", ["academyId"]);

export const teamMembers = defineTable({
  teamId: v.id("teams"),
  athleteId: v.id("athletes"),
  academyId: v.id("academies"),
  jerseyNumber: v.optional(v.number()),
  tacticalPosition: v.optional(v.string()),
  tacticalRole: v.optional(v.string()),
  createdAt: v.string(),
})
  .index("by_team", ["teamId"])
  .index("by_athlete", ["athleteId"])
  .index("by_team_and_athlete", ["teamId", "athleteId"]);
