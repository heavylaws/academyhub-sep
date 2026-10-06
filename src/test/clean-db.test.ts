import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Clean Database & Seeded Account Authentication", () => {
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

  it("contains populated seed users for all roles by default", () => {
    const db = localMockStore.getDb();
    expect(db.users.length).toBeGreaterThanOrEqual(6);
    const emails = db.users.map((u) => u.email.toLowerCase());
    expect(emails).toContain("ah.baalbaki@gmail.com");
    expect(emails).toContain("adminhercules@academieshub.com");
    expect(emails).toContain("dave.miller@test.local");
    expect(emails).toContain("alex.admin@test.local");
    expect(emails).toContain("marcus.vance@test.local");
    expect(emails).toContain("sarah.guardian@test.local");
  });

  it("authenticates Super Admin with password A!t3r3g0", () => {
    const attempt = localMockStore.authenticateWithPassword("ah.baalbaki@gmail.com", "A!t3r3g0");
    expect(attempt.success).toBe(true);
    expect(attempt.user?.role).toBe("platform_admin");
  });

  it("authenticates Head Coach with password hercules2026!", () => {
    const attempt = localMockStore.authenticateWithPassword("adminhercules@academieshub.com", "hercules2026!");
    expect(attempt.success).toBe(true);
    expect(attempt.user?.role).toBe("coach");
  });

  it("authenticates Coach Dave Miller with password hercules2026!", () => {
    const attempt = localMockStore.authenticateWithPassword("dave.miller@test.local", "hercules2026!");
    expect(attempt.success).toBe(true);
    expect(attempt.user?.role).toBe("coach");
  });

  it("authenticates Academy Admin with password Admin-123456", () => {
    const attempt = localMockStore.authenticateWithPassword("alex.admin@test.local", "Admin-123456");
    expect(attempt.success).toBe(true);
    expect(attempt.user?.role).toBe("academy_admin");
  });

  it("authenticates Athlete Marcus Vance with password Athlete-123456", () => {
    const attempt = localMockStore.authenticateWithPassword("marcus.vance@test.local", "Athlete-123456");
    expect(attempt.success).toBe(true);
    expect(attempt.user?.role).toBe("athlete");
  });

  it("authenticates Guardian Sarah Vance with password Guardian-123456", () => {
    const attempt = localMockStore.authenticateWithPassword("sarah.guardian@test.local", "Guardian-123456");
    expect(attempt.success).toBe(true);
    expect(attempt.user?.role).toBe("guardian");
  });

  it("rejects an empty password or wrong password for seeded accounts", () => {
    const emptyAttempt = localMockStore.authenticateWithPassword("alex.admin@test.local", "");
    expect(emptyAttempt.success).toBe(false);

    const wrongAttempt = localMockStore.authenticateWithPassword("alex.admin@test.local", "WrongPass123");
    expect(wrongAttempt.success).toBe(false);
    expect(wrongAttempt.error).toContain("Incorrect password");
  });

  it("does not allow signing in by display name or internal id", () => {
    expect(localMockStore.authenticateWithPassword("Alex Thorne", "Admin-123456").success).toBe(false);
    expect(localMockStore.authenticateWithPassword("usr_admin", "Admin-123456").success).toBe(false);
  });

  it("rejects unknown user accounts on the database", () => {
    const unknownAttempt = localMockStore.authenticateWithPassword("random_coach@example.com", "anypass");
    expect(unknownAttempt.success).toBe(false);
    expect(unknownAttempt.error).toContain("User not found");
  });
});
