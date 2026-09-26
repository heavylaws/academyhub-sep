import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.ts";
import { modules } from "./test.setup.ts";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";
import { onboardUser } from "./lib/onboarding.ts";

type T = ReturnType<typeof convexTest>;

const now = new Date().toISOString();

/** Convex Auth identities carry "<userId>|<sessionId>" as the subject. */
function as(t: T, userId: Id<"users">) {
  return t.withIdentity({ subject: `${userId}|session` });
}

async function seed(t: T) {
  return await t.run(async (ctx) => {
    const staffId = await ctx.db.insert("users", {
      email: "admin@academy.test",
      emailVerificationTime: 1,
      role: "academy_admin",
    });
    const academyId = await ctx.db.insert("academies", {
      name: "Academy",
      slug: "academy",
      status: "active",
      createdAt: now,
    });
    const otherAcademyId = await ctx.db.insert("academies", {
      name: "Other",
      slug: "other",
      status: "active",
      createdAt: now,
    });
    await ctx.db.patch("users", staffId, { academyId });
    const athlete = (first: string, extra: object = {}) =>
      ctx.db.insert("athletes", {
        academyId,
        firstName: first,
        lastName: "Test",
        status: "active",
        createdBy: staffId,
        createdAt: now,
        ...extra,
      });
    const childId = await athlete("Child", {
      guardianEmail: "parent@family.test",
    });
    const otherChildId = await athlete("Other");
    const selfId = await athlete("Self", { email: "self@athlete.test" });
    for (const athleteId of [childId, otherChildId, selfId]) {
      await ctx.db.insert("athleteFees", {
        academyId,
        athleteId,
        label: "Dues",
        amountDue: 100,
        currency: "USD",
        dueDate: "2026-12-01",
        status: "unpaid",
        createdBy: staffId,
        createdAt: now,
      });
    }
    return {
      staffId,
      academyId,
      otherAcademyId,
      childId,
      otherChildId,
      selfId,
    };
  });
}

async function newUser(t: T, email: string, verified: boolean) {
  return await t.run((ctx) =>
    ctx.db.insert("users", {
      email,
      ...(verified ? { emailVerificationTime: Date.now() } : {}),
    }),
  );
}

describe("onboarding", () => {
  beforeEach(() => {
    process.env.PLATFORM_ADMIN_EMAILS = "owner@platform.test";
  });
  afterEach(() => {
    delete process.env.PLATFORM_ADMIN_EMAILS;
  });

  it("gives no role until the email is verified", async () => {
    const t = convexTest(schema, modules);
    const { childId } = await seed(t);
    const userId = await newUser(t, "parent@family.test", false);
    await t.run((ctx) => onboardUser(ctx, userId));
    const before = await t.run((ctx) => ctx.db.get("users", userId));
    expect(before?.role).toBeUndefined();

    await t.run((ctx) =>
      ctx.db.patch("users", userId, { emailVerificationTime: Date.now() }),
    );
    await t.run((ctx) => onboardUser(ctx, userId));
    const after = await t.run((ctx) => ctx.db.get("users", userId));
    expect(after?.role).toBe("guardian");
    const child = await t.run((ctx) => ctx.db.get("athletes", childId));
    expect(child?.guardianUserId).toBe(userId);
  });

  it("makes PLATFORM_ADMIN_EMAILS platform admins, and nobody else", async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    const owner = await newUser(t, "owner@platform.test", true);
    const stranger = await newUser(t, "stranger@nowhere.test", true);
    await t.run((ctx) => onboardUser(ctx, owner));
    await t.run((ctx) => onboardUser(ctx, stranger));
    const [o, s] = await t.run(async (ctx) => [
      await ctx.db.get("users", owner),
      await ctx.db.get("users", stranger),
    ]);
    expect(o?.role).toBe("platform_admin");
    expect(s?.role).toBeUndefined();
  });

  it("links an athlete account to its athlete record", async () => {
    const t = convexTest(schema, modules);
    const { selfId } = await seed(t);
    const userId = await newUser(t, "self@athlete.test", true);
    await as(t, userId).mutation(api.users.updateCurrentUser, {});
    const user = await t.run((ctx) => ctx.db.get("users", userId));
    expect(user?.role).toBe("athlete");
    const self = await t.run((ctx) => ctx.db.get("athletes", selfId));
    expect(self?.userId).toBe(userId);
  });

  it("keeps an invite pending for an unverified account with that email", async () => {
    const t = convexTest(schema, modules);
    const { staffId, academyId } = await seed(t);
    const squatter = await newUser(t, "coach@academy.test", false);
    await as(t, staffId).mutation(api.invites.createInvite, {
      academyId,
      email: "coach@academy.test",
      role: "coach",
    });
    const user = await t.run((ctx) => ctx.db.get("users", squatter));
    expect(user?.role).toBeUndefined();
  });
});

describe("athlete data access", () => {
  async function guardianSetup() {
    const t = convexTest(schema, modules);
    const ids = await seed(t);
    const guardianId = await newUser(t, "parent@family.test", true);
    await t.run((ctx) => onboardUser(ctx, guardianId));
    return { t, ...ids, guardianId };
  }

  it("guardians only see their own children", async () => {
    const { t, guardianId, childId, otherChildId } = await guardianSetup();
    const g = as(t, guardianId);

    const list = await g.query(api.athletes.listAthletes, {});
    expect(list.map((a) => a._id)).toEqual([childId]);

    const mine = await g.query(api.athletes.listMyAthletes, {});
    expect(mine.map((a) => a._id)).toEqual([childId]);

    await expect(
      g.query(api.fees.listFeesForAthlete, { athleteId: childId }),
    ).resolves.toHaveLength(1);
    await expect(
      g.query(api.athletes.getAthlete, { athleteId: otherChildId }),
    ).rejects.toThrow();
    await expect(
      g.query(api.fees.listFeesForAthlete, { athleteId: otherChildId }),
    ).rejects.toThrow();
  });

  it("athletes cannot read another athlete's fees", async () => {
    const t = convexTest(schema, modules);
    const { selfId, otherChildId } = await seed(t);
    const userId = await newUser(t, "self@athlete.test", true);
    await t.run((ctx) => onboardUser(ctx, userId));
    const a = as(t, userId);
    await expect(
      a.query(api.fees.listFeesForAthlete, { athleteId: selfId }),
    ).resolves.toHaveLength(1);
    await expect(
      a.query(api.fees.listFeesForAthlete, { athleteId: otherChildId }),
    ).rejects.toThrow();
  });

  it("staff cannot read athletes of another academy", async () => {
    const t = convexTest(schema, modules);
    const { otherAcademyId, childId } = await seed(t);
    const outsider = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "coach@other.test",
        emailVerificationTime: 1,
        role: "coach",
        academyId: otherAcademyId,
      }),
    );
    await expect(
      as(t, outsider).query(api.fees.listFeesForAthlete, {
        athleteId: childId,
      }),
    ).rejects.toThrow();
  });

  it("unauthenticated callers are rejected", async () => {
    const t = convexTest(schema, modules);
    const { childId } = await seed(t);
    await expect(
      t.query(api.athletes.getAthlete, { athleteId: childId }),
    ).rejects.toThrow();
  });
});

describe("platform admin", () => {
  it("can work inside an academy and survives its deletion", async () => {
    const t = convexTest(schema, modules);
    const { academyId } = await seed(t);
    const adminId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "owner@platform.test",
        emailVerificationTime: 1,
        role: "platform_admin",
      }),
    );
    const admin = as(t, adminId);

    await admin.mutation(api.academies.setActiveAcademy, { academyId });
    await admin.mutation(api.athletes.createAthlete, {
      firstName: "New",
      lastName: "Athlete",
    });
    const list = await admin.query(api.athletes.listAthletes, {});
    expect(list.some((a) => a.firstName === "New")).toBe(true);

    await admin.mutation(api.academies.deleteAcademy, { academyId });
    const after = await t.run((ctx) => ctx.db.get("users", adminId));
    expect(after?.role).toBe("platform_admin");
    expect(after?.academyId).toBeUndefined();
  });

  it("non-admins cannot switch academy", async () => {
    const t = convexTest(schema, modules);
    const { staffId, otherAcademyId } = await seed(t);
    await expect(
      as(t, staffId).mutation(api.academies.setActiveAcademy, {
        academyId: otherAcademyId,
      }),
    ).rejects.toThrow();
  });

  it("platform admin sees every academy's counts and every user", async () => {
    const t = convexTest(schema, modules);
    const { staffId, academyId, otherAcademyId } = await seed(t);
    const adminId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "owner@platform.test",
        emailVerificationTime: 1,
        role: "platform_admin",
        academyId: otherAcademyId,
      }),
    );
    const admin = as(t, adminId);

    const overview = await admin.query(api.academies.platformOverview, {});
    expect(overview).toHaveLength(2);
    const main = overview.find((a) => a._id === academyId)!;
    expect(main.managers).toBe(1);
    expect(main.activeAthletes).toBeGreaterThan(0);
    // The platform admin working in an academy is not counted as its staff.
    const other = overview.find((a) => a._id === otherAcademyId)!;
    expect(other.managers + other.coaches + other.accounting).toBe(0);

    const users = await admin.query(api.users.listAllUsers, {});
    expect(users.find((u) => u._id === staffId)?.academyName).toBe("Academy");
    expect(users.find((u) => u._id === adminId)?.academyName).toBeUndefined();
  });

  it("non-admins cannot read the platform overview or user list", async () => {
    const t = convexTest(schema, modules);
    const { staffId } = await seed(t);
    await expect(
      as(t, staffId).query(api.academies.platformOverview, {}),
    ).rejects.toThrow();
    await expect(
      as(t, staffId).query(api.users.listAllUsers, {}),
    ).rejects.toThrow();
  });
});

describe("kiosk and check-in PINs", () => {
  async function kioskSetup() {
    const t = convexTest(schema, modules);
    const ids = await seed(t);
    const { sessionId } = await t.run(async (ctx) => {
      const teamId = await ctx.db.insert("teams", {
        academyId: ids.academyId,
        name: "Team",
        createdBy: ids.staffId,
        createdAt: now,
      });
      for (const athleteId of [ids.selfId, ids.childId]) {
        await ctx.db.insert("teamMembers", {
          teamId,
          athleteId,
          academyId: ids.academyId,
          createdAt: now,
        });
      }
      const sessionId = await ctx.db.insert("trainingSessions", {
        academyId: ids.academyId,
        teamId,
        title: "Practice",
        startsAt: new Date().toISOString(),
        durationMinutes: 60,
        createdBy: ids.staffId,
        createdAt: now,
      });
      return { sessionId };
    });
    const athleteUser = await newUser(t, "self@athlete.test", true);
    await t.run((ctx) => onboardUser(ctx, athleteUser));
    return { t, ...ids, sessionId, athleteUser };
  }

  it("assigns unique PINs and never sends them to the kiosk roster", async () => {
    const { t, staffId, sessionId } = await kioskSetup();
    const staff = as(t, staffId);
    const assigned = await staff.mutation(
      api.athletes.generateMissingCheckInPins,
      {},
    );
    expect(assigned).toBe(3);
    const pins = await t.run(async (ctx) =>
      (await ctx.db.query("athletes").collect()).map((a) => a.checkInPin),
    );
    expect(new Set(pins).size).toBe(3);
    expect(pins.every((p) => /^\d{4}$/.test(p ?? ""))).toBe(true);

    const kiosk = await staff.query(
      api.trainingSessions.getSessionKioskRoster,
      { sessionId },
    );
    for (const row of kiosk.roster) {
      expect(row).not.toHaveProperty("checkInPin");
      expect(row.hasPin).toBe(true);
    }
  });

  it("checks an athlete in by PIN on a staff device", async () => {
    const { t, staffId, sessionId, selfId } = await kioskSetup();
    const staff = as(t, staffId);
    const pin = await staff.mutation(api.athletes.regenerateCheckInPin, {
      athleteId: selfId,
    });
    const res = await staff.mutation(api.trainingSessions.checkInAthlete, {
      sessionId,
      pin,
    });
    expect(res.athlete._id).toBe(selfId);
  });

  it("athletes cannot use the kiosk or check anyone in remotely", async () => {
    const { t, sessionId, athleteUser, selfId } = await kioskSetup();
    const athlete = as(t, athleteUser);
    await expect(
      athlete.query(api.trainingSessions.getSessionKioskRoster, { sessionId }),
    ).rejects.toThrow();
    await expect(
      athlete.mutation(api.trainingSessions.checkInAthlete, {
        sessionId,
        athleteId: selfId,
      }),
    ).rejects.toThrow();
    await expect(
      athlete.mutation(api.athletes.regenerateCheckInPin, {
        athleteId: selfId,
      }),
    ).rejects.toThrow();
  });
});

describe("platform admin full access inside an academy", () => {
  async function adminInAcademy() {
    const t = convexTest(schema, modules);
    const ids = await seed(t);
    const adminId = await t.run((ctx) =>
      ctx.db.insert("users", {
        email: "owner@platform.test",
        emailVerificationTime: 1,
        role: "platform_admin",
        academyId: ids.academyId,
      }),
    );
    return { t, ...ids, admin: as(t, adminId) };
  }

  it("can invite coaches and academy managers to its academy", async () => {
    const { admin, academyId } = await adminInAcademy();
    for (const role of ["coach", "academy_admin", "accounting"] as const) {
      await admin.mutation(api.invites.createInvite, {
        academyId,
        email: `${role}@new.test`,
        role,
      });
    }
    const invites = await admin.query(api.invites.listInvites, {});
    expect(invites.map((i) => i.role).sort()).toEqual([
      "academy_admin",
      "accounting",
      "coach",
    ]);
    await expect(
      admin.mutation(api.invites.createInvite, {
        academyId,
        email: "another@platform.test",
        role: "platform_admin",
      }),
    ).rejects.toThrow();
  });

  it("can edit athletes and read any conversation in its academy", async () => {
    const { t, admin, academyId, staffId, childId } = await adminInAcademy();
    await admin.mutation(api.athletes.regenerateCheckInPin, {
      athleteId: childId,
    });
    const conversationId = await t.run((ctx) =>
      ctx.db.insert("conversations", {
        academyId,
        participantIds: [staffId],
        createdAt: now,
      }),
    );
    await expect(
      admin.query(api.messages.listMessages, { conversationId }),
    ).resolves.toBeDefined();
  });
});
