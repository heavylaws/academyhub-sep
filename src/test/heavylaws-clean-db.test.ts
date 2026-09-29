import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Clean Database & Heavylaws Superadmin Authentication", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
  });

  it("boots with a clean empty database with 0 previous athletes, teams, or sessions", () => {
    const db = localMockStore.getDb();
    expect(db.athletes.length).toBe(0);
    expect(db.teams.length).toBe(0);
    expect(db.trainingSessions.length).toBe(0);
    expect(db.attendanceRecords.length).toBe(0);
    expect(db.invoices.length).toBe(0);
    expect(db.announcements.length).toBe(0);
    expect(db.messages.length).toBe(0);
    expect(db.conversations.length).toBe(0);
    expect(db.drills.length).toBe(0);
  });

  it("contains only the registered superadmin account 'heavylaws'", () => {
    const db = localMockStore.getDb();
    expect(db.users.length).toBe(1);
    expect(db.users[0].name).toBe("heavylaws");
    expect(db.users[0].role).toBe("platform_admin");
  });

  it("rejects login attempts with incorrect passwords for heavylaws", () => {
    const wrongAttempt = localMockStore.authenticateWithPassword("heavylaws", "wrongPassword123");
    expect(wrongAttempt.success).toBe(false);
    expect(wrongAttempt.error).toContain("Incorrect password");
  });

  it("accepts login for heavylaws with password //A!t3r3g0 and grants platform_admin role", () => {
    const validAttempt = localMockStore.authenticateWithPassword("heavylaws", "//A!t3r3g0");
    expect(validAttempt.success).toBe(true);
    expect(validAttempt.user).toBeDefined();
    expect(validAttempt.user?.name).toBe("heavylaws");
    expect(validAttempt.user?.role).toBe("platform_admin");
    expect(localMockStore.getCurrentUser()?._id).toBe("usr_heavylaws");
  });

  it("accepts heavylaws@gmail.com with password //A!t3r3g0", () => {
    const validEmailAttempt = localMockStore.authenticateWithPassword("heavylaws@gmail.com", "//A!t3r3g0");
    expect(validEmailAttempt.success).toBe(true);
    expect(validEmailAttempt.user?.role).toBe("platform_admin");
  });

  it("rejects unknown user accounts on the clean database", () => {
    const unknownAttempt = localMockStore.authenticateWithPassword("random_coach@example.com", "anypass");
    expect(unknownAttempt.success).toBe(false);
    expect(unknownAttempt.error).toContain("User not found");
  });
});
