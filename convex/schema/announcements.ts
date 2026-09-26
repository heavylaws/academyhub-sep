import { defineTable } from "convex/server";
import { v } from "convex/values";
import { userRoleValidator } from "./invites.ts";

export const announcementCategoryValidator = v.union(
  v.literal("weather"),
  v.literal("meet_schedule"),
  v.literal("facility"),
  v.literal("fees"),
  v.literal("general"),
);

export const announcementPriorityValidator = v.union(
  v.literal("urgent"),
  v.literal("important"),
  v.literal("normal"),
);

export const announcements = defineTable({
  academyId: v.id("academies"),
  title: v.string(),
  content: v.string(),
  category: announcementCategoryValidator,
  priority: announcementPriorityValidator,
  /** Optional targeting: only members of this team will receive the notice */
  targetTeamId: v.optional(v.id("teams")),
  /** Optional targeting: only users with this role */
  targetRole: v.optional(userRoleValidator),
  isPinned: v.boolean(),
  expiresAt: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.string(),
})
  .index("by_academy", ["academyId"])
  .index("by_academy_and_priority", ["academyId", "priority"])
  .index("by_team", ["targetTeamId"]);

export const announcementReads = defineTable({
  announcementId: v.id("announcements"),
  userId: v.id("users"),
  readAt: v.string(),
})
  .index("by_user", ["userId"])
  .index("by_announcement_and_user", ["announcementId", "userId"]);
