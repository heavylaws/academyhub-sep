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

    const rivalAcademyId = await ctx.db.insert("academies", {
      name: "Rival Academy",
      slug: "rival-academy",
      status: "active",
      createdAt: now,
    });

    const medicalStaffId = await ctx.db.insert("users", {
      email: "doc@premier.test",
      name: "Dr. Elena Vance",
      emailVerificationTime: Date.now(),
      role: "medical_staff",
      academyId,
    });

    const sportingDirectorId = await ctx.db.insert("users", {
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

    const athleteUserId = await ctx.db.insert("users", {
      email: "athlete@premier.test",
      name: "Leo Messi",
      emailVerificationTime: Date.now(),
      role: "athlete",
      academyId,
    });

    const foreignMedicalStaffId = await ctx.db.insert("users", {
      email: "doc@rival.test",
      name: "Dr. Foreign",
      emailVerificationTime: Date.now(),
      role: "medical_staff",
      academyId: rivalAcademyId,
    });

    const athleteId = await ctx.db.insert("athletes", {
      academyId,
      firstName: "Leo",
      lastName: "Messi",
      status: "active",
      userId: athleteUserId,
      createdBy: sportingDirectorId,
      createdAt: now,
    });

    return {
      academyId,
      rivalAcademyId,
      medicalStaffId,
      sportingDirectorId,
      coachId,
      athleteUserId,
      foreignMedicalStaffId,
      athleteId,
    };
  });
}

describe("Medical Ledger & Privacy Projections (convex/injuries.ts)", () => {
  it("allows medical_staff to log and resolve an injury record", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    const injuryDate = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const expectedReturnDate = Date.now() + 10 * 24 * 60 * 60 * 1000;

    // 1. Log injury
    const injuryId = await as(t, env.medicalStaffId).mutation(api.injuries.logInjuryRecord, {
      athleteId: env.athleteId,
      availabilityStatus: "modified_training",
      bodyPart: "Hamstring",
      laterality: "left",
      mechanism: "non_contact_acute",
      severity: "moderate_8_28_days",
      injuryDate,
      expectedReturnDate,
      coachingRestrictions: "No high-speed sprint >70%, max 45 mins",
      clinicalNotes: "Grade 2 biceps femoris strain confirmed via ultrasound.",
    });

    expect(injuryId).toBeDefined();

    // Verify record in database
    const record = await t.run((ctx) => ctx.db.get("injuries", injuryId));
    expect(record).not.toBeNull();
    expect(record?.isResolved).toBe(false);
    expect(record?.availabilityStatus).toBe("modified_training");

    // 2. Update and resolve injury
    const actualReturnDate = Date.now();
    await as(t, env.medicalStaffId).mutation(api.injuries.updateInjuryStatus, {
      injuryId,
      availabilityStatus: "fit",
      actualReturnDate,
      isResolved: true,
      coachingRestrictions: "Cleared for full training",
      clinicalNotes: "Follow-up ultrasound clear. RTP protocol complete.",
    });

    const updated = await t.run((ctx) => ctx.db.get("injuries", injuryId));
    expect(updated?.isResolved).toBe(true);
    expect(updated?.availabilityStatus).toBe("fit");
    expect(updated?.actualReturnDate).toBe(actualReturnDate);
  });

  it("prevents non-medical staff (coach) from logging injuries", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    await expect(
      as(t, env.coachId).mutation(api.injuries.logInjuryRecord, {
        athleteId: env.athleteId,
        availabilityStatus: "injured_out",
        bodyPart: "Ankle",
        mechanism: "contact",
        severity: "minor_1_7_days",
        injuryDate: Date.now(),
      }),
    ).rejects.toThrow();
  });

  it("strictly strips clinicalNotes for coach and athlete callers", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // Medical staff logs an injury with sensitive diagnosis
    await as(t, env.medicalStaffId).mutation(api.injuries.logInjuryRecord, {
      athleteId: env.athleteId,
      availabilityStatus: "modified_training",
      bodyPart: "Knee",
      mechanism: "non_contact_acute",
      severity: "moderate_8_28_days",
      injuryDate: Date.now() - 86400000,
      coachingRestrictions: "Non-contact drills only, no kicking",
      clinicalNotes: "Grade 1 MCL sprain with mild joint effusion.",
    });

    // 1. Coach queries athlete injuries
    const coachView = await as(t, env.coachId).query(api.injuries.getAthleteInjuries, {
      athleteId: env.athleteId,
    });
    expect(coachView.length).toBe(1);
    expect(coachView[0].bodyPart).toBe("Knee");
    expect(coachView[0].availabilityStatus).toBe("modified_training");
    expect(coachView[0].coachingRestrictions).toBe("Non-contact drills only, no kicking");
    expect(coachView[0].clinicalNotes).toBeUndefined(); // MUST BE STRIPPED

    // 2. Athlete queries their own injuries
    const athleteView = await as(t, env.athleteUserId).query(api.injuries.getAthleteInjuries, {
      athleteId: env.athleteId,
    });
    expect(athleteView.length).toBe(1);
    expect(athleteView[0].bodyPart).toBe("Knee");
    expect(athleteView[0].coachingRestrictions).toBe("Non-contact drills only, no kicking");
    expect(athleteView[0].clinicalNotes).toBeUndefined(); // MUST BE STRIPPED
  });

  it("preserves clinicalNotes for sporting_director and medical_staff callers", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    await as(t, env.medicalStaffId).mutation(api.injuries.logInjuryRecord, {
      athleteId: env.athleteId,
      availabilityStatus: "injured_out",
      bodyPart: "Concussion",
      mechanism: "contact",
      severity: "moderate_8_28_days",
      injuryDate: Date.now() - 86400000,
      coachingRestrictions: "Complete rest, SCAT5 protocol",
      clinicalNotes: "SCAT5 score 24/132. Graduated return-to-school initiated.",
    });

    // 1. Medical staff view
    const medicalView = await as(t, env.medicalStaffId).query(api.injuries.getAthleteInjuries, {
      athleteId: env.athleteId,
    });
    expect(medicalView.length).toBe(1);
    expect(medicalView[0].clinicalNotes).toBe("SCAT5 score 24/132. Graduated return-to-school initiated.");

    // 2. Sporting director view
    const directorView = await as(t, env.sportingDirectorId).query(api.injuries.getAthleteInjuries, {
      athleteId: env.athleteId,
    });
    expect(directorView.length).toBe(1);
    expect(directorView[0].clinicalNotes).toBe("SCAT5 score 24/132. Graduated return-to-school initiated.");
  });

  it("enforces tenant isolation against cross-academy access", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    // Foreign medical staff attempts to log injury for athlete in another academy
    await expect(
      as(t, env.foreignMedicalStaffId).mutation(api.injuries.logInjuryRecord, {
        athleteId: env.athleteId,
        availabilityStatus: "injured_out",
        bodyPart: "Hamstring",
        mechanism: "contact",
        severity: "minor_1_7_days",
        injuryDate: Date.now(),
      }),
    ).rejects.toThrow();

    // Foreign medical staff attempts to read injuries for athlete in another academy
    await expect(
      as(t, env.foreignMedicalStaffId).query(api.injuries.getAthleteInjuries, {
        athleteId: env.athleteId,
      }),
    ).rejects.toThrow();
  });

  it("provides academy medical room summary with role-based privacy projection", async () => {
    const t = convexTest(schema, modules);
    const env = await seedTestEnvironment(t);

    await as(t, env.medicalStaffId).mutation(api.injuries.logInjuryRecord, {
      athleteId: env.athleteId,
      availabilityStatus: "modified_training",
      bodyPart: "Ankle",
      mechanism: "contact",
      severity: "minor_1_7_days",
      injuryDate: Date.now(),
      coachingRestrictions: "Strapped ankle, no jumping",
      clinicalNotes: "Anterior talofibular ligament mild sprain.",
    });

    // Medical staff gets summary
    const medSummary = await as(t, env.medicalStaffId).query(
      api.injuries.getAcademyMedicalRoomSummary,
      {},
    );
    expect(medSummary.length).toBe(1);
    expect(medSummary[0].athleteName).toBe("Leo Messi");
    expect(medSummary[0].clinicalNotes).toBe("Anterior talofibular ligament mild sprain.");

    // Coach gets summary
    const coachSummary = await as(t, env.coachId).query(
      api.injuries.getAcademyMedicalRoomSummary,
      {},
    );
    expect(coachSummary.length).toBe(1);
    expect(coachSummary[0].athleteName).toBe("Leo Messi");
    expect(coachSummary[0].coachingRestrictions).toBe("Strapped ankle, no jumping");
    expect(coachSummary[0].clinicalNotes).toBeUndefined(); // Stripped for coach
  });
});
