import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Academy Announcements & Coach-Athlete Messaging Architecture", () => {
  const academyId = "acad_hercules";

  beforeEach(() => {
    localMockStore.resetToDefault();
  });

  describe("Announcements: Staff write, Academy members read", () => {
    it("allows staff (coach and academy_admin) to broadcast announcements", async () => {
      // 1. Academy Admin creates announcement
      localMockStore.setPersona("usr_admin");
      const annId1 = (await localMockStore.executeMutation("announcements:createAnnouncement", {
        academyId,
        title: "Season Opening Ceremony",
        content: "All squads report to the main pitch at 09:00.",
        category: "general",
        priority: "important",
        isPinned: true,
      })) as string;

      expect(annId1).toBeDefined();

      // 2. Coach creates announcement
      localMockStore.setPersona("usr_coach");
      const annId2 = (await localMockStore.executeMutation("announcements:createAnnouncement", {
        academyId,
        title: "Tactical Film Review",
        content: "Video breakdown session scheduled for 17:00.",
        category: "training",
        priority: "normal",
        isPinned: false,
      })) as string;

      expect(annId2).toBeDefined();

      // Verify stored announcements
      const announcements = localMockStore.getDb().announcements.filter((a) => a.academyId === academyId);
      expect(announcements.length).toBe(2);
      expect(announcements.some((a) => a.title === "Season Opening Ceremony")).toBe(true);
      expect(announcements.some((a) => a.title === "Tactical Film Review")).toBe(true);
    });

    it("forbids athletes and guardians from creating announcements", async () => {
      // Switch persona to athlete
      localMockStore.setPersona("usr_athlete");
      await expect(
        localMockStore.executeMutation("announcements:createAnnouncement", {
          academyId,
          title: "Unauthorized Athlete Notice",
          content: "Spam notice",
          category: "general",
          priority: "normal",
        }),
      ).rejects.toThrow(/Forbidden/);

      // Switch persona to guardian
      localMockStore.setPersona("usr_guardian_test");
      localMockStore.setCurrentUser({
        _id: "usr_guardian_test",
        role: "guardian",
        academyId,
        name: "Test Guardian",
      });

      await expect(
        localMockStore.executeMutation("announcements:createAnnouncement", {
          academyId,
          title: "Unauthorized Guardian Notice",
          content: "Parent announcement",
          category: "general",
          priority: "normal",
        }),
      ).rejects.toThrow(/Forbidden/);
    });

    it("allows all academy members to read announcements", async () => {
      // Admin publishes announcement
      localMockStore.setPersona("usr_admin");
      await localMockStore.executeMutation("announcements:createAnnouncement", {
        academyId,
        title: "Welcome All Members",
        content: "Facility guidelines are now posted.",
        category: "facility",
        priority: "normal",
        isPinned: false,
      });

      // Athlete reads announcements
      localMockStore.setPersona("usr_athlete");
      const athleteList = localMockStore.executeQuery("announcements:listAnnouncements", {
        academyId,
      }) as Array<{ title: string }>;

      expect(athleteList.length).toBe(1);
      expect(athleteList[0].title).toBe("Welcome All Members");
    });
  });

  describe("Conversations & Messages: Participant isolation and senderId verification", () => {
    it("restricts conversation access strictly to users in participantUids", async () => {
      const coachId = "usr_coach";
      const athleteId = "usr_athlete_marcus";

      localMockStore.setCurrentUser({
        _id: athleteId,
        role: "athlete",
        academyId,
        name: "Marcus Athlete",
      });

      // Coach initiates conversation with athlete Marcus
      localMockStore.setPersona(coachId);
      const convId = (await localMockStore.executeMutation("messages:getOrCreateConversation", {
        academyId,
        targetUserId: athleteId,
        title: "Tactical Feedback",
        initialMessage: "Review your defensive positioning from the weekend match.",
      })) as string;

      expect(convId).toBeDefined();

      const conv = localMockStore.getDb().conversations.find((c) => c._id === convId);
      expect(conv).toBeDefined();
      expect(conv?.participantUids).toContain(coachId);
      expect(conv?.participantUids).toContain(athleteId);

      // 1. Coach can read conversation
      localMockStore.setPersona(coachId);
      const coachConvs = localMockStore.executeQuery("messages:listConversations", {
        academyId,
      }) as Array<{ _id: string }>;
      expect(coachConvs.some((c) => c._id === convId)).toBe(true);

      // 2. Athlete Marcus can read conversation
      localMockStore.setPersona(athleteId);
      const athleteConvs = localMockStore.executeQuery("messages:listConversations", {
        academyId,
      }) as Array<{ _id: string }>;
      expect(athleteConvs.some((c) => c._id === convId)).toBe(true);

      // 3. Another athlete (unlisted user) cannot see or read this conversation
      const otherAthleteId = "usr_athlete_other";
      localMockStore.setCurrentUser({
        _id: otherAthleteId,
        role: "athlete",
        academyId,
        name: "Other Athlete",
      });
      localMockStore.setPersona(otherAthleteId);

      const otherConvs = localMockStore.executeQuery("messages:listConversations", {
        academyId,
      }) as Array<{ _id: string }>;
      expect(otherConvs.some((c) => c._id === convId)).toBe(false);

      expect(() => {
        localMockStore.executeQuery("messages:getConversation", { conversationId: convId });
      }).toThrow(/Forbidden/);

      expect(() => {
        localMockStore.executeQuery("messages:listMessages", { conversationId: convId });
      }).toThrow(/Forbidden/);
    });

    it("enforces that a message's senderId equals the authenticated user ID", async () => {
      const coachId = "usr_coach";
      const athleteId = "usr_athlete_marcus";

      // Coach creates conversation
      localMockStore.setPersona(coachId);
      const convId = (await localMockStore.executeMutation("messages:getOrCreateConversation", {
        academyId,
        targetUserId: athleteId,
      })) as string;

      // Coach sends message
      const coachMsgId = (await localMockStore.executeMutation("messages:sendMessage", {
        conversationId: convId,
        content: "Good session today.",
      })) as string;

      const coachMsg = localMockStore.getDb().messages.find((m) => m._id === coachMsgId);
      expect(coachMsg).toBeDefined();
      expect(coachMsg?.senderId).toBe(coachId);

      // Athlete replies
      localMockStore.setPersona(athleteId);
      const athleteMsgId = (await localMockStore.executeMutation("messages:sendMessage", {
        conversationId: convId,
        content: "Thank you coach, ready for tomorrow!",
      })) as string;

      const athleteMsg = localMockStore.getDb().messages.find((m) => m._id === athleteMsgId);
      expect(athleteMsg).toBeDefined();
      expect(athleteMsg?.senderId).toBe(athleteId);

      // Unauthenticated user cannot send message
      localMockStore.setPersona(null);
      await expect(
        localMockStore.executeMutation("messages:sendMessage", {
          conversationId: convId,
          content: "Unauthenticated message",
        }),
      ).rejects.toThrow(/Unauthenticated/);

      // Non-participant cannot send message
      localMockStore.setCurrentUser({
        _id: "usr_athlete_third",
        role: "athlete",
        academyId,
        name: "Third Party",
      });
      localMockStore.setPersona("usr_athlete_third");
      await expect(
        localMockStore.executeMutation("messages:sendMessage", {
          conversationId: convId,
          content: "Interloper message",
        }),
      ).rejects.toThrow(/Forbidden/);
    });
  });
});
