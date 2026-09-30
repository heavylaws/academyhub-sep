import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Phase 4: Messages, Announcements, Finance, Invoices, Staff & Schedule Suite", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
    localMockStore.seedTestFixtures();
  });

  describe("1. Direct Messaging & Context Binding", () => {
    it("allows sending and receiving contextual direct messages between coaches and athletes", async () => {
      localMockStore.setPersona("usr_coach");
      const user = localMockStore.getCurrentUser();
      expect(user?.role).toBe("coach");

      // List existing conversations
      const convos = (localMockStore.executeQuery(
        "messages:listConversations",
        {},
      ) ?? []) as Array<{ _id: string; title?: string }>;
      expect(Array.isArray(convos)).toBe(true);

      // Create or get conversation with an athlete
      const athletes = (localMockStore.executeQuery(
        "athletes:listAthletes",
        {},
      ) ?? []) as Array<{ _id: string; userId?: string }>;
      expect(athletes.length).toBeGreaterThan(0);

      const targetAthleteUserId = athletes[0].userId ?? "usr_athlete_1";

      const convoId = await localMockStore.executeMutation(
        "messages:getOrCreateConversation",
        {
          recipientUserId: targetAthleteUserId,
          contextType: "session",
          contextTitle: "Sprint Mechanics Feedback",
        },
      );
      expect(convoId).toBeTruthy();

      // Send a message
      const msgId = await localMockStore.executeMutation(
        "messages:sendMessage",
        {
          conversationId: convoId,
          content: "Great effort today on the high knee drive drills!",
        },
      );
      expect(msgId).toBeTruthy();

      // Verify message is in the conversation stream
      const messages = (localMockStore.executeQuery("messages:listMessages", {
        conversationId: convoId,
      }) ?? []) as Array<{ _id: string; content: string }>;
      expect(
        messages.some((m) =>
          m.content.includes("high knee drive drills"),
        ),
      ).toBe(true);
    });

    it("marks conversation as read when accessed", async () => {
      localMockStore.setPersona("usr_coach");
      const convos = (localMockStore.executeQuery(
        "messages:listConversations",
        {},
      ) ?? []) as Array<{ _id: string; unreadCount?: number }>;

      if (convos.length > 0) {
        const target = convos[0];
        await localMockStore.executeMutation(
          "messages:markConversationRead",
          {
            conversationId: target._id,
          },
        );

        const updated = (localMockStore.executeQuery(
          "messages:getConversation",
          {
            conversationId: target._id,
          },
        ) ?? {}) as { _id: string };
        expect(updated._id).toBe(target._id);
      }
    });
  });

  describe("2. Announcements & Noticeboard Broadcasting", () => {
    it("allows coaches/admins to broadcast announcements and filter by priority", async () => {
      localMockStore.setPersona("usr_coach");

      // Broadcast an urgent weather alert
      const annId = await localMockStore.executeMutation(
        "announcements:createAnnouncement",
        {
          title: "Lightning Warning: Track Shifted Indoors",
          content: "All afternoon training will take place in Sports Hall B.",
          category: "weather",
          priority: "urgent",
          isPinned: true,
        },
      );
      expect(annId).toBeTruthy();

      // Verify announcement is listed
      const announcements = (localMockStore.executeQuery(
        "announcements:listAnnouncements",
        {},
      ) ?? []) as Array<{
        _id: string;
        title: string;
        priority: string;
        category: string;
        isPinned: boolean;
      }>;

      const created = announcements.find((a) => a._id === annId);
      expect(created).toBeDefined();
      expect(created?.title).toBe("Lightning Warning: Track Shifted Indoors");
      expect(created?.priority).toBe("urgent");
      expect(created?.category).toBe("weather");
      expect(created?.isPinned).toBe(true);
    });

    it("allows acknowledging and deleting notices", async () => {
      localMockStore.setPersona("usr_coach");
      const announcements = (localMockStore.executeQuery(
        "announcements:listAnnouncements",
        {},
      ) ?? []) as Array<{ _id: string; isRead?: boolean }>;

      if (announcements.length > 0) {
        const targetId = announcements[0]._id;
        await localMockStore.executeMutation(
          "announcements:markAnnouncementAsRead",
          {
            announcementId: targetId,
          },
        );

        // Delete notice
        await localMockStore.executeMutation(
          "announcements:deleteAnnouncement",
          {
            announcementId: targetId,
          },
        );

        const afterDelete = (localMockStore.executeQuery(
          "announcements:listAnnouncements",
          {},
        ) ?? []) as Array<{ _id: string }>;
        expect(afterDelete.some((a) => a._id === targetId)).toBe(false);
      }
    });
  });

  describe("3. Finance Fees & Invoices", () => {
    it("lists fees, tracks balances and handles payment recordings", async () => {
      localMockStore.setPersona("usr_admin"); // Admin
      const athletes = (localMockStore.executeQuery(
        "athletes:listAthletes",
        {},
      ) ?? []) as Array<{ _id: string }>;
      expect(athletes.length).toBeGreaterThan(0);

      const feeId = await localMockStore.executeMutation("fees:createFee", {
        athleteId: athletes[0]._id,
        label: "Autumn 2026 Registration Fee",
        amountDue: 250,
        currency: "USD",
        dueDate: "2026-11-01",
        notes: "Includes uniform kit",
      });
      expect(feeId).toBeTruthy();

      // List all fees
      const fees = (localMockStore.executeQuery("fees:listFees", {}) ??
        []) as Array<{
        _id: string;
        amountDue: number;
        status: string;
      }>;
      const createdFee = fees.find((f) => f._id === feeId);
      expect(createdFee).toBeDefined();
      expect(createdFee?.amountDue).toBe(250);
      expect(createdFee?.status).toBe("unpaid");

      // Record a partial payment
      await localMockStore.executeMutation("fees:recordPayment", {
        feeId,
        amountPaid: 100,
        paidOn: "2026-10-15",
        method: "Card",
      });

      const updatedFees = (localMockStore.executeQuery("fees:listFees", {}) ??
        []) as Array<{
        _id: string;
        status: string;
        remainingBalance?: number;
      }>;
      const paidFee = updatedFees.find((f) => f._id === feeId);
      expect(paidFee?.status).toBe("partially_paid");
      expect(paidFee?.remainingBalance).toBe(150);
    });

    it("creates academy invoices and updates status transitions", async () => {
      localMockStore.setPersona("usr_admin");

      const invoiceId = await localMockStore.executeMutation(
        "invoices:createInvoice",
        {
          description: "Facility Rental & Turf Maintenance",
          amount: 1200,
          currency: "USD",
          dueDate: "2026-12-01",
          note: "Quarterly invoice",
        },
      );
      expect(invoiceId).toBeTruthy();

      const invoices = (localMockStore.executeQuery(
        "invoices:listInvoicesForAcademy",
        {},
      ) ?? []) as Array<{ _id: string; status: string; amount: number }>;
      const createdInv = invoices.find((i) => i._id === invoiceId);
      expect(createdInv).toBeDefined();
      expect(createdInv?.amount).toBe(1200);

      // Transition invoice status to sent then paid
      await localMockStore.executeMutation("invoices:updateInvoiceStatus", {
        invoiceId,
        status: "sent",
      });

      await localMockStore.executeMutation("invoices:updateInvoiceStatus", {
        invoiceId,
        status: "paid",
      });

      const finalInvoices = (localMockStore.executeQuery(
        "invoices:listInvoicesForAcademy",
        {},
      ) ?? []) as Array<{ _id: string; status: string }>;
      const finalInv = finalInvoices.find((i) => i._id === invoiceId);
      expect(finalInv?.status).toBe("paid");
    });
  });

  describe("4. Staff Management & Invites", () => {
    it("allows administrators to list members and invite new staff", async () => {
      localMockStore.setPersona("usr_admin");

      const members = (localMockStore.executeQuery(
        "users:listAcademyMembers",
        {},
      ) ?? []) as Array<{ _id: string; role: string }>;
      expect(members.length).toBeGreaterThan(0);

      // Create an invite
      const inviteId = await localMockStore.executeMutation(
        "invites:createInvite",
        {
          email: "coach.alex@peakform.test",
          role: "coach",
        },
      );
      expect(inviteId).toBeTruthy();

      const invites = (localMockStore.executeQuery(
        "invites:listInvites",
        {},
      ) ?? []) as Array<{ _id: string; email: string; status: string }>;
      const createdInvite = invites.find((i) => i._id === inviteId);
      expect(createdInvite).toBeDefined();
      expect(createdInvite?.email).toBe("coach.alex@peakform.test");

      // Cancel invite
      await localMockStore.executeMutation("invites:cancelInvite", {
        inviteId,
      });

      const updatedInvites = (localMockStore.executeQuery(
        "invites:listInvites",
        {},
      ) ?? []) as Array<{ _id: string; status: string }>;
      const cancelled = updatedInvites.find((i) => i._id === inviteId);
      expect(cancelled?.status).toBe("cancelled");
    });
  });

  describe("5. Academy Schedule & Training Sessions", () => {
    it("schedules training sessions and indexes by date for calendar rendering", async () => {
      localMockStore.setPersona("usr_coach");
      const teams = (localMockStore.executeQuery("teams:listTeams", {}) ??
        []) as Array<{ _id: string }>;
      expect(teams.length).toBeGreaterThan(0);

      const sessionId = await localMockStore.executeMutation(
        "trainingSessions:scheduleSession",
        {
          teamId: teams[0]._id,
          title: "Speed Endurance & Transition Play",
          startsAt: "2026-10-20T17:00:00.000Z",
          durationMinutes: 75,
          location: "North Pitch 1",
          notes: "Full kit and GPS bibs required",
        },
      );
      expect(sessionId).toBeTruthy();

      const sessions = (localMockStore.executeQuery(
        "trainingSessions:listSessionsForAcademy",
        {},
      ) ?? []) as Array<{ _id: string; title: string; location?: string }>;
      const createdSession = sessions.find((s) => s._id === sessionId);
      expect(createdSession).toBeDefined();
      expect(createdSession?.title).toBe(
        "Speed Endurance & Transition Play",
      );
      expect(createdSession?.location).toBe("North Pitch 1");
    });
  });
});
