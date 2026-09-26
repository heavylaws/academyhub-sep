import { defineTable } from "convex/server";
import { v } from "convex/values";

export const userRoleValidator = v.union(
  v.literal("platform_admin"),
  v.literal("academy_admin"),
  v.literal("coach"),
  v.literal("athlete"),
  v.literal("accounting"),
  v.literal("guardian"),
);

export const invites = defineTable({
  academyId: v.id("academies"),
  email: v.string(),
  role: userRoleValidator,
  invitedBy: v.id("users"),
  status: v.union(v.literal("pending"), v.literal("accepted")),
  createdAt: v.string(),
  acceptedAt: v.optional(v.string()),
})
  .index("by_email_and_status", ["email", "status"])
  .index("by_academy", ["academyId"]);
