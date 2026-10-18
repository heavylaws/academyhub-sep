import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.ts";
import { modules } from "./test.setup.ts";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";

type T = ReturnType<typeof convexTest>;

function as(t: T, userId: Id<"users">) {
  return t.withIdentity({ subject: `${userId}|session` });
}

describe("Step 4: Auth Rate-Limiting & Invite Security Suite", () => {
  it("enforces login rate limiting after 5 failed attempts and bounds spam", async () => {
    const t = convexTest(schema, modules);

    // Initial check: ok
    const check1 = await t.mutation(api.authRateLimit.checkLoginRateLimit, {
      email: "athlete@example.com",
    });
    expect(check1.ok).toBe(true);

    // Record 5 failed attempts
    for (let i = 0; i < 5; i++) {
      await t.mutation(api.authRateLimit.recordLoginAttempt, {
        email: "athlete@example.com",
        success: false,
      });
    }

    // Now checkLoginRateLimit must throw ConvexError
    await expect(
      t.mutation(api.authRateLimit.checkLoginRateLimit, {
        email: "athlete@example.com",
      }),
    ).rejects.toThrow(/Too many failed login attempts/i);

    // Anti-spam bounding: Spamming 20 more failed attempts should be capped in the DB
    for (let i = 0; i < 20; i++) {
      await t.mutation(api.authRateLimit.recordLoginAttempt, {
        email: "athlete@example.com",
        success: false,
      });
    }

    const records = await t.run(async (ctx) => {
      return await ctx.db
        .query("loginAttempts")
        .withIndex("by_email", (q) => q.eq("email", "athlete@example.com"))
        .collect();
    });
    // Should be capped to MAX_STORED_ATTEMPTS_PER_WINDOW (10)
    expect(records.length).toBeLessThanOrEqual(10);

    // Unauthenticated caller cannot clear failed attempts with success: true
    const unauthReset = await t.mutation(api.authRateLimit.recordLoginAttempt, {
      email: "athlete@example.com",
      success: true,
    });
    expect(unauthReset.ok).toBe(false);

    // Still rate limited
    await expect(
      t.mutation(api.authRateLimit.checkLoginRateLimit, {
        email: "athlete@example.com",
      }),
    ).rejects.toThrow(/Too many failed login attempts/i);

    // Authenticated user can clear on verified success
    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "athlete@example.com",
        emailVerificationTime: Date.now(),
      });
    });

    const authReset = await as(t, userId).mutation(
      api.authRateLimit.recordLoginAttempt,
      {
        email: "athlete@example.com",
        success: true,
      },
    );
    expect(authReset.ok).toBe(true);

    // Now unlocked
    const checkAfter = await t.mutation(api.authRateLimit.checkLoginRateLimit, {
      email: "athlete@example.com",
    });
    expect(checkAfter.ok).toBe(true);
  });

  it("generates cryptographically random invite tokens with expiration and single-use guarantee", async () => {
    const t = convexTest(schema, modules);

    // Setup academy and admin
    const { academyId, adminId } = await t.run(async (ctx) => {
      const acad = await ctx.db.insert("academies", {
        name: "Olympic Track Academy",
        slug: "olympic-track",
        status: "active",
        createdAt: new Date().toISOString(),
      });
      const adm = await ctx.db.insert("users", {
        email: "director@olympic.test",
        role: "academy_admin",
        academyId: acad,
        emailVerificationTime: Date.now(),
      });
      return { academyId: acad, adminId: adm };
    });

    // Create an invite for a coach
    const inviteId = await as(t, adminId).mutation(api.invites.createInvite, {
      academyId,
      email: "coach.alex@example.com",
      role: "coach",
    });

    // Verify token was generated and indexed
    const inviteDoc = await t.run(async (ctx) => {
      return await ctx.db.get("invites", inviteId);
    });
    expect(inviteDoc).toBeDefined();
    expect(inviteDoc?.token).toBeDefined();
    expect(inviteDoc?.token?.length).toBe(64); // 32 bytes hex = 64 characters
    expect(inviteDoc?.expiresAt).toBeDefined();
    expect(inviteDoc?.status).toBe("pending");

    const token = inviteDoc!.token!;

    // Validate token query
    const validation = await t.query(api.invites.validateInviteToken, { token });
    expect(validation.valid).toBe(true);
    expect(validation.email).toBe("coach.alex@example.com");
    expect(validation.role).toBe("coach");

    // Setup an authenticated user with matching email
    const coachUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "coach.alex@example.com",
        emailVerificationTime: Date.now(),
      });
    });

    // User with wrong email cannot accept
    const wrongUserId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "intruder@example.com",
        emailVerificationTime: Date.now(),
      });
    });
    await expect(
      as(t, wrongUserId).mutation(api.invites.acceptInviteByToken, { token }),
    ).rejects.toThrow(/was issued for/i);

    // User with matching email accepts invite
    const redemption = await as(t, coachUserId).mutation(
      api.invites.acceptInviteByToken,
      { token },
    );
    expect(redemption.success).toBe(true);
    expect(redemption.role).toBe("coach");
    expect(redemption.academyId).toBe(academyId);

    // Verify user is strictly bound to academyId and role
    const updatedUser = await t.run(async (ctx) => {
      return await ctx.db.get("users", coachUserId);
    });
    expect(updatedUser?.role).toBe("coach");
    expect(updatedUser?.academyId).toBe(academyId);

    // Single-use: Second redemption attempt must fail
    await expect(
      as(t, coachUserId).mutation(api.invites.acceptInviteByToken, { token }),
    ).rejects.toThrow(/already been accepted/i);

    // Validation query now rejects
    await expect(
      t.query(api.invites.validateInviteToken, { token }),
    ).rejects.toThrow(/already been accepted/i);
  });

  it("rejects expired invite tokens", async () => {
    const t = convexTest(schema, modules);

    const { academyId, adminId } = await t.run(async (ctx) => {
      const acad = await ctx.db.insert("academies", {
        name: "Speed Academy",
        slug: "speed-academy",
        status: "active",
        createdAt: new Date().toISOString(),
      });
      const adm = await ctx.db.insert("users", {
        email: "head@speed.test",
        role: "academy_admin",
        academyId: acad,
        emailVerificationTime: Date.now(),
      });
      return { academyId: acad, adminId: adm };
    });

    const inviteId = await as(t, adminId).mutation(api.invites.createInvite, {
      academyId,
      email: "late.coach@example.com",
      role: "coach",
    });

    // Force expire the invite
    await t.run(async (ctx) => {
      await ctx.db.patch("invites", inviteId, {
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      });
    });

    const inviteDoc = await t.run(async (ctx) => {
      return await ctx.db.get("invites", inviteId);
    });
    const token = inviteDoc!.token!;

    // Validation should reject expired token
    await expect(
      t.query(api.invites.validateInviteToken, { token }),
    ).rejects.toThrow(/expired/i);

    const userId = await t.run(async (ctx) => {
      return await ctx.db.insert("users", {
        email: "late.coach@example.com",
        emailVerificationTime: Date.now(),
      });
    });

    // Acceptance should reject expired token
    await expect(
      as(t, userId).mutation(api.invites.acceptInviteByToken, { token }),
    ).rejects.toThrow(/expired/i);
  });
});
