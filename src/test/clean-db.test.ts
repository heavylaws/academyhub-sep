import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Clean Database & Single Source of Identity", () => {
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

  it("contains 0 mock users by default since Firebase is the single source of identity", () => {
    const db = localMockStore.getDb();
    expect(db.users.length).toBe(0);
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
