import { defineTable } from "convex/server";
import { v } from "convex/values";

export const conversationContextValidator = v.union(
  v.literal("session"),
  v.literal("video"),
  v.literal("general"),
);

export const conversations = defineTable({
  academyId: v.id("academies"),
  /** User IDs participating in this conversation */
  participantIds: v.array(v.id("users")),
  /** Optional athlete record ID if one participant is an athlete */
  athleteId: v.optional(v.id("athletes")),
  /** Optional custom title / topic */
  title: v.optional(v.string()),
  /** Optional contextual binding (session, video analysis, or general) */
  contextType: v.optional(conversationContextValidator),
  contextId: v.optional(v.string()),
  contextTitle: v.optional(v.string()),
  /** Preview snippet and timestamp of last message */
  lastMessageText: v.optional(v.string()),
  lastMessageAt: v.optional(v.string()),
  lastSenderId: v.optional(v.id("users")),
  createdAt: v.string(),
})
  .index("by_academy", ["academyId"])
  .index("by_last_message", ["academyId", "lastMessageAt"]);

export const messages = defineTable({
  conversationId: v.id("conversations"),
  academyId: v.id("academies"),
  senderId: v.id("users"),
  content: v.string(),
  /** User IDs who have read this message */
  readBy: v.array(v.id("users")),
  createdAt: v.string(),
})
  .index("by_conversation", ["conversationId"])
  .index("by_conversation_and_created", ["conversationId", "createdAt"]);
