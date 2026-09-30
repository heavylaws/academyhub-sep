import { afterEach, describe, expect, it, beforeEach, vi } from "vitest";
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

  describe("super admin demo login", () => {
    const DEMO_PASSWORD = "test-demo-password-not-real";

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("is disabled when VITE_DEMO_ADMIN_PASSWORD is not configured", () => {
      vi.stubEnv("VITE_DEMO_ADMIN_PASSWORD", "");
      const attempt = localMockStore.authenticateWithPassword("heavylaws", "");
      expect(attempt.success).toBe(false);
      expect(attempt.error).toContain("VITE_DEMO_ADMIN_PASSWORD");
    });

    it("rejects incorrect passwords for heavylaws", () => {
      vi.stubEnv("VITE_DEMO_ADMIN_PASSWORD", DEMO_PASSWORD);
      const wrongAttempt = localMockStore.authenticateWithPassword("heavylaws", "wrongPassword123");
      expect(wrongAttempt.success).toBe(false);
      expect(wrongAttempt.error).toContain("Incorrect password");
    });

    it("accepts heavylaws with the configured demo password and grants platform_admin", () => {
      vi.stubEnv("VITE_DEMO_ADMIN_PASSWORD", DEMO_PASSWORD);
      const validAttempt = localMockStore.authenticateWithPassword("heavylaws", DEMO_PASSWORD);
      expect(validAttempt.success).toBe(true);
      expect(validAttempt.user?.name).toBe("heavylaws");
      expect(validAttempt.user?.role).toBe("platform_admin");
      expect(localMockStore.getCurrentUser()?._id).toBe("usr_heavylaws");
    });

    it("accepts heavylaws@gmail.com and ah.baalbaki@gmail.com with the configured demo password", () => {
      vi.stubEnv("VITE_DEMO_ADMIN_PASSWORD", DEMO_PASSWORD);
      const validEmailAttempt = localMockStore.authenticateWithPassword("heavylaws@gmail.com", DEMO_PASSWORD);
      expect(validEmailAttempt.success).toBe(true);
      expect(validEmailAttempt.user?.role).toBe("platform_admin");

      const validPersonalEmailAttempt = localMockStore.authenticateWithPassword("ah.baalbaki@gmail.com", DEMO_PASSWORD);
      expect(validPersonalEmailAttempt.success).toBe(true);
      expect(validPersonalEmailAttempt.user?.role).toBe("platform_admin");
    });
  });

  it("rejects an empty password for accounts that have no password set", () => {
    localMockStore.seedTestFixtures();
    const attempt = localMockStore.authenticateWithPassword("alex.admin@test.local", "");
    expect(attempt.success).toBe(false);
  });

  it("does not allow signing in by display name or internal id", () => {
    localMockStore.seedTestFixtures();
    expect(localMockStore.authenticateWithPassword("Alex Thorne", "").success).toBe(false);
    expect(localMockStore.authenticateWithPassword("usr_admin", "").success).toBe(false);
  });

  it("rejects unknown user accounts on the clean database", () => {
    const unknownAttempt = localMockStore.authenticateWithPassword("random_coach@example.com", "anypass");
    expect(unknownAttempt.success).toBe(false);
    expect(unknownAttempt.error).toContain("User not found");
  });
});
