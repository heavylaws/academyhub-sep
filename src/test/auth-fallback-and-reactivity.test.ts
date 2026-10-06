import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Auth Fallback & Reactivity", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
  });

  it("notifies subscribeAuth listeners whenever a user authenticates locally", () => {
    let authNotified = false;
    const unsub = localMockStore.subscribeAuth(() => {
      authNotified = true;
    });

    const res = localMockStore.authenticateWithPassword("ah.baalbaki@gmail.com", "A!t3r3g0");
    expect(res.success).toBe(true);
    expect(authNotified).toBe(true);
    expect(localMockStore.getCurrentUser()?._id).toBe("usr_superadmin");
    expect(localMockStore.getCurrentUser()?.role).toBe("platform_admin");

    unsub();
  });

  it("notifies subscribeAuth listeners when signing out (wipe / setPersona null)", () => {
    localMockStore.authenticateWithPassword("adminhercules@academieshub.com", "hercules2026!");
    expect(localMockStore.getCurrentUser()?._id).toBe("usr_coach_hercules");

    let authNotified = false;
    const unsub = localMockStore.subscribeAuth(() => {
      authNotified = true;
    });

    localMockStore.wipe();
    expect(authNotified).toBe(true);
    expect(localMockStore.getCurrentUser()).toBeNull();
    // Seed accounts are preserved so the next user can still log in
    expect(localMockStore.getDb().users.length).toBeGreaterThanOrEqual(6);

    unsub();
  });

  it("authenticates and switches between all requested roles seamlessly", () => {
    // 1. Academy Admin
    const adminRes = localMockStore.authenticateWithPassword("alex.admin@test.local", "Admin-123456");
    expect(adminRes.success).toBe(true);
    expect(localMockStore.getCurrentUser()?.role).toBe("academy_admin");

    // 2. Athlete
    const athleteRes = localMockStore.authenticateWithPassword("marcus.vance@test.local", "Athlete-123456");
    expect(athleteRes.success).toBe(true);
    expect(localMockStore.getCurrentUser()?.role).toBe("athlete");

    // 3. Guardian
    const guardianRes = localMockStore.authenticateWithPassword("sarah.guardian@test.local", "Guardian-123456");
    expect(guardianRes.success).toBe(true);
    expect(localMockStore.getCurrentUser()?.role).toBe("guardian");

    // 4. Head Coach
    const coachRes = localMockStore.authenticateWithPassword("dave.miller@test.local", "hercules2026!");
    expect(coachRes.success).toBe(true);
    expect(localMockStore.getCurrentUser()?.role).toBe("coach");
  });
});
