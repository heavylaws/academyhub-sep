import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireUser } from "./lib/auth.ts";
import { conversationContextValidator } from "./schema/messages.ts";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

/** List all conversations for the authenticated user, sorted by last message time */
export const listConversations = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user.academyId) return [];

    const all = await ctx.db
      .query("conversations")
      .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
      .collect();

    // Filter conversations where current user is a participant
    const userConversations = all.filter((c) =>
      c.participantIds.includes(user._id),
    );

    // Collect all participant user IDs to batch fetch user names
    const allUserIds = Array.from(
      new Set(userConversations.flatMap((c) => c.participantIds)),
    );
    const userDocs = await Promise.all(
      allUserIds.map((id) => ctx.db.get("users", id)),
    );
    const userMap = new Map(
      userDocs.filter(Boolean).map((u) => [u!._id, u!]),
    );

    // Format conversations with other participant details and unread count
    const results = await Promise.all(
      userConversations.map(async (c) => {
        // Find the other participant(s)
        const otherParticipantIds = c.participantIds.filter(
          (id) => id !== user._id,
        );
        const otherUser =
          otherParticipantIds.length > 0
            ? userMap.get(otherParticipantIds[0])
            : user;

        // Count unread messages in this conversation for current user
        const unreadMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
          .collect();
        const unreadCount = unreadMessages.filter(
          (m) => !m.readBy.includes(user._id),
        ).length;

        return {
          ...c,
          otherParticipant: {
            _id: otherUser?._id ?? "",
            name: otherUser?.name ?? otherUser?.email ?? "User",
            email: otherUser?.email,
            role: otherUser?.role,
          },
          unreadCount,
        };
      }),
    );

    // Sort: newest message first
    results.sort((a, b) => {
      const timeA = a.lastMessageAt ?? a.createdAt;
      const timeB = b.lastMessageAt ?? b.createdAt;
      return timeB.localeCompare(timeA);
    });

    return results;
  },
});

/** Get single conversation details, checking participant authorization */
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get("conversations", args.conversationId);
    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (
      !conversation.participantIds.includes(user._id) &&
      user.role !== "academy_admin" &&
      user.role !== "platform_admin"
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not a participant in this conversation",
      });
    }

    // Resolve participants
    const participants = await Promise.all(
      conversation.participantIds.map((id) => ctx.db.get("users", id)),
    );

    return {
      ...conversation,
      participants: participants.filter(Boolean),
    };
  },
});

/** List all messages in a conversation in chronological order */
export const listMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const conversation = await ctx.db.get("conversations", args.conversationId);
    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (
      !conversation.participantIds.includes(user._id) &&
      user.role !== "academy_admin" &&
      user.role !== "platform_admin"
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not a participant in this conversation",
      });
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_and_created", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .order("asc")
      .collect();

    // Fetch senders
    const senderIds = Array.from(new Set(messages.map((m) => m.senderId)));
    const senders = await Promise.all(
      senderIds.map((id) => ctx.db.get("users", id)),
    );
    const senderMap = new Map(
      senders.filter(Boolean).map((s) => [s!._id, s!]),
    );

    return messages.map((m) => ({
      ...m,
      senderName: senderMap.get(m.senderId)?.name ?? "User",
      senderRole: senderMap.get(m.senderId)?.role,
      isOutgoing: m.senderId === user._id,
    }));
  },
});

/** Send a message into a conversation */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const text = args.content.trim();
    if (!text) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Message content cannot be empty",
      });
    }

    const conversation = await ctx.db.get("conversations", args.conversationId);
    if (!conversation) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Conversation not found",
      });
    }

    if (
      !conversation.participantIds.includes(user._id) &&
      user.role !== "academy_admin" &&
      user.role !== "platform_admin"
    ) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You cannot send messages to this conversation",
      });
    }

    const nowIso = new Date().toISOString();

    // Insert new message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      academyId: conversation.academyId,
      senderId: user._id,
      content: text,
      readBy: [user._id],
      createdAt: nowIso,
    });

    // Update conversation last message metadata
    await ctx.db.patch("conversations", args.conversationId, {
      lastMessageText: text,
      lastMessageAt: nowIso,
      lastSenderId: user._id,
    });

    return messageId;
  },
});

/** Find or create a 1-on-1 direct conversation between current user and target user */
export const getOrCreateConversation = mutation({
  args: {
    targetUserId: v.id("users"),
    athleteId: v.optional(v.id("athletes")),
    title: v.optional(v.string()),
    contextType: v.optional(conversationContextValidator),
    contextId: v.optional(v.string()),
    contextTitle: v.optional(v.string()),
    initialMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.academyId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "User does not belong to an academy",
      });
    }

    const targetUser = await ctx.db.get("users", args.targetUserId);
    if (!targetUser) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Target user not found",
      });
    }

    // Look for existing conversation between these 2 users
    const allAcademyConversations = await ctx.db
      .query("conversations")
      .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
      .collect();

    const existing = allAcademyConversations.find(
      (c) =>
        c.participantIds.length === 2 &&
        c.participantIds.includes(user._id) &&
        c.participantIds.includes(args.targetUserId) &&
        (!args.contextId || c.contextId === args.contextId),
    );

    if (existing) {
      const patchData: Record<string, unknown> = {};
      if (args.contextType && args.contextType !== "general") {
        patchData.contextType = args.contextType;
      }
      if (args.contextTitle) {
        patchData.contextTitle = args.contextTitle;
      }
      if (args.contextId) {
        patchData.contextId = args.contextId;
      }
      if (args.initialMessage && args.initialMessage.trim()) {
        const nowIso = new Date().toISOString();
        await ctx.db.insert("messages", {
          conversationId: existing._id,
          academyId: user.academyId,
          senderId: user._id,
          content: args.initialMessage.trim(),
          readBy: [user._id],
          createdAt: nowIso,
        });
        patchData.lastMessageText = args.initialMessage.trim();
        patchData.lastMessageAt = nowIso;
        patchData.lastSenderId = user._id;
      }
      if (Object.keys(patchData).length > 0) {
        await ctx.db.patch("conversations", existing._id, patchData);
      }
      return existing._id;
    }

    // Create new conversation
    const nowIso = new Date().toISOString();
    const conversationId = await ctx.db.insert("conversations", {
      academyId: user.academyId,
      participantIds: [user._id, args.targetUserId],
      athleteId: args.athleteId,
      title: args.title,
      contextType: args.contextType ?? "general",
      contextId: args.contextId,
      contextTitle: args.contextTitle,
      lastMessageText: args.initialMessage?.trim(),
      lastMessageAt: args.initialMessage?.trim() ? nowIso : undefined,
      lastSenderId: args.initialMessage?.trim() ? user._id : undefined,
      createdAt: nowIso,
    });

    if (args.initialMessage && args.initialMessage.trim()) {
      await ctx.db.insert("messages", {
        conversationId,
        academyId: user.academyId,
        senderId: user._id,
        content: args.initialMessage.trim(),
        readBy: [user._id],
        createdAt: nowIso,
      });
    }

    return conversationId;
  },
});

/** Mark all messages in a conversation as read by the current user */
export const markConversationRead = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const unread = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) =>
        q.eq("conversationId", args.conversationId),
      )
      .collect();

    for (const msg of unread) {
      if (!msg.readBy.includes(user._id)) {
        await ctx.db.patch("messages", msg._id, {
          readBy: [...msg.readBy, user._id],
        });
      }
    }
    return null;
  },
});

/** Total unread messages count for active user */
export const getUnreadMessagesCount = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await requireUser(ctx);
      if (!user.academyId) return 0;

      const conversations = await ctx.db
        .query("conversations")
        .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
        .collect();

      const userConvs = conversations.filter((c) =>
        c.participantIds.includes(user._id),
      );

      let totalUnread = 0;
      for (const c of userConvs) {
        const msgs = await ctx.db
          .query("messages")
          .withIndex("by_conversation", (q) => q.eq("conversationId", c._id))
          .collect();
        const unread = msgs.filter((m) => !m.readBy.includes(user._id)).length;
        totalUnread += unread;
      }

      return totalUnread;
    } catch {
      return 0;
    }
  },
});
