import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Academy Announcements & Team Notification Board Suite", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
  });

  describe("Announcement Queries & Filtering", () => {
    it("retrieves seeded announcements sorted with pinned notices first", () => {
      localMockStore.setPersona("usr_coach");
      const list = localMockStore.executeQuery(
        "announcements:listAnnouncements",
        {},
      ) as Array<{ _id: string; title: string; isPinned: boolean }>;

      expect(list.length).toBeGreaterThan(0);
      // Pinned notices must appear before non-pinned notices
      let seenUnpinned = false;
      for (const item of list) {
        if (!item.isPinned) {
          seenUnpinned = true;
        } else if (seenUnpinned) {
          throw new Error("Found pinned item after unpinned item in list");
        }
      }
    });

    it("filters announcements by category", () => {
      localMockStore.setPersona("usr_coach");
      const facilityList = localMockStore.executeQuery(
        "announcements:listAnnouncements",
        { category: "facility" },
      ) as Array<{ category: string }>;

      expect(facilityList.length).toBeGreaterThan(0);
      expect(facilityList.every((a) => a.category === "facility")).toBe(true);

      const feesList = localMockStore.executeQuery(
        "announcements:listAnnouncements",
        { category: "fees" },
      ) as Array<{ category: string }>;

      expect(feesList.length).toBeGreaterThan(0);
      expect(feesList.every((a) => a.category === "fees")).toBe(true);
    });

    it("filters role-targeted announcements for athletes", async () => {
      // Create a coach-only announcement as coach
      localMockStore.setPersona("usr_coach");
      await localMockStore.executeMutation("announcements:createAnnouncement", {
        title: "Staff Strategy Meeting",
        content: "Coaches debrief on Saturday evening.",
        category: "general",
        priority: "normal",
        targetRole: "coach",
        isPinned: false,
      });

      // Switch to athlete persona
      localMockStore.setPersona("usr_athlete");
      const athleteList = localMockStore.executeQuery(
        "announcements:listAnnouncements",
        {},
      ) as Array<{ title: string; targetRole?: string }>;

      // Athlete should not see coach-only announcement
      expect(
        athleteList.some((a) => a.title === "Staff Strategy Meeting"),
      ).toBe(false);

      // But coach should see it
      localMockStore.setPersona("usr_coach");
      const coachList = localMockStore.executeQuery(
        "announcements:listAnnouncements",
        {},
      ) as Array<{ title: string }>;
      expect(
        coachList.some((a) => a.title === "Staff Strategy Meeting"),
      ).toBe(true);
    });
  });

  describe("Read Tracking & Unread Counts", () => {
    it("reports positive unread count for athlete on initial seed", () => {
      localMockStore.setPersona("usr_athlete");
      const unreadCount = localMockStore.executeQuery(
        "announcements:getUnreadCount",
        {},
      ) as number;

      expect(unreadCount).toBeGreaterThan(0);
    });

    it("marks an announcement as read and decrements unread count", async () => {
      localMockStore.setPersona("usr_athlete");
      const initialUnread = localMockStore.executeQuery(
        "announcements:getUnreadCount",
        {},
      ) as number;

      const list = localMockStore.executeQuery(
        "announcements:listAnnouncements",
        {},
      ) as Array<{ _id: string; isRead: boolean }>;

      const unreadItem = list.find((a) => !a.isRead);
      expect(unreadItem).toBeDefined();

      if (unreadItem) {
        await localMockStore.executeMutation(
          "announcements:markAnnouncementAsRead",
          { announcementId: unreadItem._id },
        );

        const newUnread = localMockStore.executeQuery(
          "announcements:getUnreadCount",
          {},
        ) as number;
        expect(newUnread).toBe(initialUnread - 1);

        const updatedList = localMockStore.executeQuery(
          "announcements:listAnnouncements",
          {},
        ) as Array<{ _id: string; isRead: boolean }>;
        const updatedItem = updatedList.find((a) => a._id === unreadItem._id);
        expect(updatedItem?.isRead).toBe(true);
      }
    });

    it("is idempotent when marking the same announcement as read multiple times", async () => {
      localMockStore.setPersona("usr_athlete");
      const list = localMockStore.executeQuery(
        "announcements:listAnnouncements",
        {},
      ) as Array<{ _id: string }>;
      const item = list[0];

      await localMockStore.executeMutation(
        "announcements:markAnnouncementAsRead",
        { announcementId: item._id },
      );
      const countAfterFirst = localMockStore.executeQuery(
        "announcements:getUnreadCount",
        {},
      ) as number;

      await localMockStore.executeMutation(
        "announcements:markAnnouncementAsRead",
        { announcementId: item._id },
      );
      const countAfterSecond = localMockStore.executeQuery(
        "announcements:getUnreadCount",
        {},
      ) as number;

      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });

  describe("Announcement Authoring & Permissions", () => {
    it("allows a coach to create a new announcement", async () => {
      localMockStore.setPersona("usr_coach");

      const announcementId = await localMockStore.executeMutation(
        "announcements:createAnnouncement",
        {
          title: "Pre-Season Fitness Testing Schedule",
          content:
            "Mandatory VO2 max and sprint assessment on Friday at 8:00 AM.",
          category: "general",
          priority: "urgent",
          isPinned: true,
        },
      );

      expect(announcementId).toBeDefined();

      const list = localMockStore.executeQuery(
        "announcements:listAnnouncements",
        {},
      ) as Array<{ _id: string; title: string; priority: string; isPinned: boolean }>;

      const created = list.find((a) => a._id === announcementId);
      expect(created).toBeDefined();
      expect(created?.title).toBe("Pre-Season Fitness Testing Schedule");
      expect(created?.priority).toBe("urgent");
      expect(created?.isPinned).toBe(true);
    });

    it("allows an academy admin to create and delete announcements", async () => {
      localMockStore.setPersona("usr_admin");

      const announcementId = (await localMockStore.executeMutation(
        "announcements:createAnnouncement",
        {
          title: "Temporary Maintenance Alert",
          content: "Weight room sanitization from 2 PM to 4 PM.",
          category: "facility",
          priority: "normal",
          isPinned: false,
        },
      )) as string;

      expect(announcementId).toBeDefined();

      // Delete announcement
      await localMockStore.executeMutation(
        "announcements:deleteAnnouncement",
        { announcementId },
      );

      const list = localMockStore.executeQuery(
        "announcements:listAnnouncements",
        {},
      ) as Array<{ _id: string }>;

      expect(list.some((a) => a._id === announcementId)).toBe(false);
    });

    it("rejects unauthorized announcement creation by athletes", async () => {
      localMockStore.setPersona("usr_athlete");

      await expect(
        localMockStore.executeMutation("announcements:createAnnouncement", {
          title: "Unauthorized Post",
          content: "This should fail permission checks.",
          category: "general",
          priority: "normal",
          isPinned: false,
        }),
      ).rejects.toThrow(/Forbidden/i);
    });
  });
});
