import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.ts";
import { modules } from "./test.setup.ts";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";

type T = ReturnType<typeof convexTest>;
const now = new Date().toISOString();

function as(t: T, userId: Id<"users">) {
  return t.withIdentity({ subject: `${userId}|session` });
}

async function seedTestEnvironment(t: T) {
  return await t.run(async (ctx) => {
    const academyId = await ctx.db.insert("academies", {
      name: "Premier Sports Academy",
      slug: "premier-academy",
      status: "active",
      createdAt: now,
    });

    const otherAcademyId = await ctx.db.insert("academies", {
      name: "Rival Academy",
      slug: "rival-academy",
      status: "active",
      createdAt: now,
    });

    const adminId = await ctx.db.insert("users", {
      email: "director@premier.test",
      name: "Director Dave",
      emailVerificationTime: Date.now(),
      role: "sporting_director",
      academyId,
    });

    const coachId = await ctx.db.insert("users", {
      email: "coach@premier.test",
      name: "Coach Chris",
      emailVerificationTime: Date.now(),
      role: "coach",
      academyId,
    });

    const foreignAdminId = await ctx.db.insert("users", {
      email: "boss@rival.test",
      name: "Rival Boss",
      emailVerificationTime: Date.now(),
      role: "academy_admin",
      academyId: otherAcademyId,
    });

    const athleteId = await ctx.db.insert("athletes", {
      academyId,
      firstName: "Leo",
      lastName: "Messi",
      status: "active",
      createdBy: adminId,
      createdAt: now,
    });

    const guardianUserId = await ctx.db.insert("users", {
      email: "jorge.messi@family.test",
      name: "Jorge Messi",
      emailVerificationTime: Date.now(),
      role: "guardian",
      academyId,
    });

    return {
      academyId,
      otherAcademyId,
      adminId,
      coachId,
      foreignAdminId,
      athleteId,
      guardianUserId,
    };
  });
}

describe("Guardian Links & Legal Consents Architecture", () => {
  it("linkGuardianToAthlete links guardian, prevents duplicates, and binds verified users", async () => {
    const t = convexTest(schema, modules);
    const { adminId, athleteId, guardianUserId, foreignAdminId } =
      await seedTestEnvironment(t);

    // 1. Staff can create guardian link
    const linkId = await as(t, adminId).mutation(
      api.guardians.linkGuardianToAthlete,
      {
        athleteId,
        invitedEmail: "jorge.messi@family.test",
        relationship: "father",
        isPrimaryContact: true,
        canManageBilling: true,
      },
    );

    expect(linkId).toBeDefined();

    // Verify guardianUserId was automatically bound to the existing verified user
    const link = await t.run((ctx) => ctx.db.get("guardianLinks", linkId));
    expect(link?.guardianUserId).toBe(guardianUserId);
    expect(link?.relationship).toBe("father");
    expect(link?.isPrimaryContact).toBe(true);
    expect(link?.hasSignedMedicalConsent).toBe(false);

    // 2. Reject duplicate email link for same athlete
    await expect(
      as(t, adminId).mutation(api.guardians.linkGuardianToAthlete, {
        athleteId,
        invitedEmail: "JORGE.MESSI@FAMILY.TEST", // case-insensitive duplicate check
        relationship: "father",
      }),
    ).rejects.toThrow(/already exists/i);

    // 3. Foreign academy staff cannot link guardians for this athlete
    await expect(
      as(t, foreignAdminId).mutation(api.guardians.linkGuardianToAthlete, {
        athleteId,
        invitedEmail: "stranger@rival.test",
        relationship: "legal_guardian",
      }),
    ).rejects.toThrow();
  });

  it("submitGuardianConsent permits authorized guardian to execute legal & medical consents", async () => {
    const t = convexTest(schema, modules);
    const { adminId, coachId, athleteId, guardianUserId } =
      await seedTestEnvironment(t);

    const linkId = await as(t, coachId).mutation(
      api.guardians.linkGuardianToAthlete,
      {
        athleteId,
        invitedEmail: "jorge.messi@family.test",
        relationship: "father",
        isPrimaryContact: true,
      },
    );

    // Unrelated coach cannot sign guardian legal consent
    await expect(
      as(t, coachId).mutation(api.guardians.submitGuardianConsent, {
        linkId,
        hasSignedMedicalConsent: true,
        hasSignedMediaRelease: true,
      }),
    ).rejects.toThrow(/not authorized/i);

    // Linked guardian can sign consent
    const consentResult = await as(t, guardianUserId).mutation(
      api.guardians.submitGuardianConsent,
      {
        linkId,
        hasSignedMedicalConsent: true,
        hasSignedMediaRelease: true,
      },
    );

    expect(consentResult.success).toBe(true);
    expect(consentResult.signedMedicalNow).toBe(true);
    expect(consentResult.medicalConsentSignedAt).toBeGreaterThan(0);

    const updatedLink = await t.run((ctx) => ctx.db.get("guardianLinks", linkId));
    expect(updatedLink?.hasSignedMedicalConsent).toBe(true);
    expect(updatedLink?.hasSignedMediaRelease).toBe(true);
    expect(updatedLink?.medicalConsentSignedAt).toBe(consentResult.medicalConsentSignedAt);
  });

  it("getGuardiansForAthlete returns enriched guardian records with access control", async () => {
    const t = convexTest(schema, modules);
    const { adminId, athleteId, guardianUserId, foreignAdminId } =
      await seedTestEnvironment(t);

    await as(t, adminId).mutation(api.guardians.linkGuardianToAthlete, {
      athleteId,
      invitedEmail: "jorge.messi@family.test",
      relationship: "father",
      isPrimaryContact: true,
    });

    await as(t, adminId).mutation(api.guardians.linkGuardianToAthlete, {
      athleteId,
      invitedEmail: "celia.cuccittini@family.test",
      relationship: "mother",
      isPrimaryContact: false,
    });

    // 1. Staff in academy can view all guardians
    const guardians = await as(t, adminId).query(
      api.guardians.getGuardiansForAthlete,
      { athleteId },
    );
    expect(guardians).toHaveLength(2);
    expect(guardians[0].guardianName).toBe("Jorge Messi");

    // 2. Foreign academy staff cannot view guardians for this athlete
    await expect(
      as(t, foreignAdminId).query(api.guardians.getGuardiansForAthlete, {
        athleteId,
      }),
    ).rejects.toThrow();

    // 3. Linked guardian can query their children via getMyChildren
    const myChildren = await as(t, guardianUserId).query(
      api.guardians.getMyChildren,
      {},
    );
    expect(myChildren.some((a) => a._id === athleteId)).toBe(true);
  });
});
