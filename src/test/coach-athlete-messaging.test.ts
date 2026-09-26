import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Direct Coach-Athlete 1-on-1 Messaging Channels Suite", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
  });

  describe("Privacy & Channel Isolation", () => {
    it("allows coaches to retrieve their active channels", () => {
      localMockStore.setPersona("usr_coach");
      const convs = localMockStore.executeQuery(
        "messages:listConversations",
        {},
      ) as Array<{ _id: string; otherParticipant: { name: string } }>;

      expect(convs.length).toBeGreaterThan(0);
      const marcusConv = convs.find((c) => c._id === "conv_marcus_coach");
      expect(marcusConv).toBeDefined();
      expect(marcusConv?.otherParticipant.name).toBe("Marcus Vance");
    });

    it("isolates channels so athletes never see other athletes' private messages", () => {
      // Marcus Vance persona
      localMockStore.setPersona("usr_athlete");
      const marcusConvs = localMockStore.executeQuery(
        "messages:listConversations",
        {},
      ) as Array<{ _id: string }>;

      const marcusConvIds = marcusConvs.map((c) => c._id);
      expect(marcusConvIds).toContain("conv_marcus_coach");
      // Marcus must NOT see Elena's channel with Admin
      expect(marcusConvIds).not.toContain("conv_elena_admin");
      // Marcus must NOT see Coach Dave's channel with Admin
      expect(marcusConvIds).not.toContain("conv_coach_admin");

      // Elena Rostova persona
      localMockStore.setPersona("usr_athlete_elena");
      const elenaConvs = localMockStore.executeQuery(
        "messages:listConversations",
        {},
      ) as Array<{ _id: string }>;

      const elenaConvIds = elenaConvs.map((c) => c._id);
      expect(elenaConvIds).toContain("conv_elena_admin");
      // Elena must NOT see Marcus's channel with Coach
      expect(elenaConvIds).not.toContain("conv_marcus_coach");
    });

    it("prevents unauthorized access to another athlete's message thread", () => {
      localMockStore.setPersona("usr_athlete"); // Marcus

      // Trying to fetch Elena's conversation must throw
      expect(() => {
        localMockStore.executeQuery("messages:getConversation", {
          conversationId: "conv_elena_admin",
        });
      }).toThrow(/Forbidden/);

      expect(() => {
        localMockStore.executeQuery("messages:listMessages", {
          conversationId: "conv_elena_admin",
        });
      }).toThrow(/Forbidden/);
    });
  });

  describe("Message Sending & Real-Time Stream", () => {
    it("allows a coach to send a message to an athlete and updates conversation lastMessage", async () => {
      localMockStore.setPersona("usr_coach");
      const content = "Focus on explosive hip extension on the second stride.";

      const msgId = (await localMockStore.executeMutation("messages:sendMessage", {
        conversationId: "conv_marcus_coach",
        content,
      })) as string;

      expect(msgId).toBeDefined();

      // Verify conversation lastMessageText was updated
      const conv = localMockStore.executeQuery("messages:getConversation", {
        conversationId: "conv_marcus_coach",
      }) as { lastMessageText?: string; lastSenderId?: string };

      expect(conv.lastMessageText).toBe(content);
      expect(conv.lastSenderId).toBe("usr_coach");

      // Verify message appears in message stream for athlete
      localMockStore.setPersona("usr_athlete");
      const messages = localMockStore.executeQuery("messages:listMessages", {
        conversationId: "conv_marcus_coach",
      }) as Array<{ content: string; senderName: string; isOutgoing: boolean }>;

      const sentMsg = messages.find((m) => m.content === content);
      expect(sentMsg).toBeDefined();
      expect(sentMsg?.senderName).toBe("Dave Miller");
      expect(sentMsg?.isOutgoing).toBe(false); // Incoming for Marcus
    });

    it("rejects empty or whitespace-only messages", async () => {
      localMockStore.setPersona("usr_coach");
      await expect(
        localMockStore.executeMutation("messages:sendMessage", {
          conversationId: "conv_marcus_coach",
          content: "   ",
        }),
      ).rejects.toThrow(/Message content cannot be empty/);
    });
  });

  describe("Read Receipts & Unread Message Badges", () => {
    it("tracks unread message count and clears it when conversation is marked read", async () => {
      // Coach sends a new message to Marcus
      localMockStore.setPersona("usr_coach");
      await localMockStore.executeMutation("messages:sendMessage", {
        conversationId: "conv_marcus_coach",
        content: "Check your split times from lane 3.",
      });

      // Switch to athlete persona
      localMockStore.setPersona("usr_athlete");
      const initialUnread = localMockStore.executeQuery(
        "messages:getUnreadMessagesCount",
        {},
      ) as number;
      expect(initialUnread).toBeGreaterThan(0);

      // Athlete marks conversation read
      await localMockStore.executeMutation("messages:markConversationRead", {
        conversationId: "conv_marcus_coach",
      });

      const updatedUnread = localMockStore.executeQuery(
        "messages:getUnreadMessagesCount",
        {},
      ) as number;
      expect(updatedUnread).toBe(0);

      // Verify readBy array includes usr_athlete
      const messages = localMockStore.executeQuery("messages:listMessages", {
        conversationId: "conv_marcus_coach",
      }) as Array<{ content: string; readBy: string[] }>;

      const targetMsg = messages.find((m) =>
        m.content.includes("Check your split times"),
      );
      expect(targetMsg?.readBy).toContain("usr_athlete");
    });
  });

  describe("Contextual Bindings & Idempotent Channels", () => {
    it("creates or reuses a channel bound to a training session", async () => {
      localMockStore.setPersona("usr_coach");

      // Create conversation with training session context
      const convId = (await localMockStore.executeMutation(
        "messages:getOrCreateConversation",
        {
          targetUserId: "usr_athlete_elena",
          contextType: "session",
          contextTitle: "Block 2 - 200m Sprint Mechanics",
          initialMessage: "Elena, great posture throughout the curve.",
        },
      )) as string;

      expect(convId).toBeDefined();

      const conv = localMockStore.executeQuery("messages:getConversation", {
        conversationId: convId,
      }) as {
        contextType?: string;
        contextTitle?: string;
        lastMessageText?: string;
      };

      expect(conv.contextType).toBe("session");
      expect(conv.contextTitle).toBe("Block 2 - 200m Sprint Mechanics");
      expect(conv.lastMessageText).toBe("Elena, great posture throughout the curve.");

      // Verify idempotency: Calling getOrCreateConversation again with same target user returns existing ID
      const secondCallId = (await localMockStore.executeMutation(
        "messages:getOrCreateConversation",
        {
          targetUserId: "usr_athlete_elena",
        },
      )) as string;

      expect(secondCallId).toBe(convId);
    });

    it("creates a channel bound to video review context", async () => {
      localMockStore.setPersona("usr_coach");

      const convId = (await localMockStore.executeMutation(
        "messages:getOrCreateConversation",
        {
          targetUserId: "usr_athlete",
          contextType: "video",
          contextTitle: "Hurdle Clearance Drill Slow-Mo Review",
          initialMessage: "Notice how your lead leg drops 5cm early.",
        },
      )) as string;

      const conv = localMockStore.executeQuery("messages:getConversation", {
        conversationId: convId,
      }) as { contextType?: string; contextTitle?: string };

      expect(conv.contextType).toBe("video");
      expect(conv.contextTitle).toBe("Hurdle Clearance Drill Slow-Mo Review");
    });
  });
});
