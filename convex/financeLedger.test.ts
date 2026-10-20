import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.ts";
import { modules } from "./test.setup.ts";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";

const TODAY = "2026-10-19";

async function setupTestEnvironment() {
  const t = convexTest(schema, modules);

  const ids = await t.run(async (ctx) => {
    // 1. Academy A
    const academyAId = await ctx.db.insert("academies", {
      name: "Hercules Academy A",
      slug: "hercules-a",
      status: "active",
      createdAt: TODAY,
    });

    // 2. Academy B (Cross-tenant isolation check)
    const academyBId = await ctx.db.insert("academies", {
      name: "Spartan Academy B",
      slug: "spartan-b",
      status: "active",
      createdAt: TODAY,
    });

    // Staff in Academy A
    const financeAId = await ctx.db.insert("users", {
      name: "Finance Officer A",
      email: "finance-a@hercules.test",
      emailVerificationTime: 1,
      role: "accounting",
      academyId: academyAId,
    });

    const coachAId = await ctx.db.insert("users", {
      name: "Coach A",
      email: "coach-a@hercules.test",
      emailVerificationTime: 1,
      role: "coach",
      academyId: academyAId,
    });

    // Staff in Academy B
    const financeBId = await ctx.db.insert("users", {
      name: "Finance Officer B",
      email: "finance-b@spartan.test",
      emailVerificationTime: 1,
      role: "accounting",
      academyId: academyBId,
    });

    // Athlete in Academy A
    const athleteAId = await ctx.db.insert("athletes", {
      academyId: academyAId,
      firstName: "Leo",
      lastName: "Messi",
      status: "active",
      createdBy: financeAId,
      createdAt: TODAY,
    });

    // Athlete in Academy B
    const athleteBId = await ctx.db.insert("athletes", {
      academyId: academyBId,
      firstName: "Cristiano",
      lastName: "Ronaldo",
      status: "active",
      createdBy: financeBId,
      createdAt: TODAY,
    });

    // Guardian with billing permissions for Leo
    const guardianUserId = await ctx.db.insert("users", {
      name: "Jorge Messi",
      email: "jorge@family.test",
      emailVerificationTime: 1,
      role: "guardian",
      academyId: academyAId,
    });

    await ctx.db.insert("guardianLinks", {
      academyId: academyAId,
      guardianUserId,
      athleteId: athleteAId,
      invitedEmail: "jorge@family.test",
      relationship: "father",
      isPrimaryContact: true,
      canManageBilling: true,
      hasSignedMedicalConsent: true,
      hasSignedMediaRelease: true,
      createdAt: Date.now(),
      createdBy: financeAId,
    });

    return {
      academyAId,
      academyBId,
      financeAId,
      coachAId,
      financeBId,
      athleteAId,
      athleteBId,
      guardianUserId,
    };
  });

  const financeA = t.withIdentity({ subject: `${ids.financeAId}|sub` });
  const coachA = t.withIdentity({ subject: `${ids.coachAId}|sub` });
  const financeB = t.withIdentity({ subject: `${ids.financeBId}|sub` });
  const guardian = t.withIdentity({ subject: `${ids.guardianUserId}|sub` });

  return { t, financeA, coachA, financeB, guardian, ...ids };
}

describe("Phase 6: Immutable Payment Ledger, Scholarships & Delinquency Engine", () => {
  it("records partial payments ($40 on $100) and transitions to paid on full settlement ($60)", async () => {
    const { t, financeA, athleteAId, academyAId, financeAId } =
      await setupTestEnvironment();

    // 1. Create a $100 fee
    const feeId = (await t.run((ctx) =>
      ctx.db.insert("athleteFees", {
        academyId: academyAId,
        athleteId: athleteAId,
        label: "October 2026 Tuition",
        amountDue: 100,
        currency: "USD",
        dueDate: "2026-10-31",
        status: "unpaid",
        createdBy: financeAId,
        createdAt: TODAY,
      }),
    )) as Id<"athleteFees">;

    // 2. Partial payment: $40
    const partialResult = await financeA.mutation(
      api.fees.recordPaymentTransaction,
      {
        feeId,
        amount: 40,
        paymentMethod: "bank_transfer",
        referenceNumber: "WIRE-001",
        notes: "First installment",
      },
    );

    expect(partialResult.newAmountPaid).toBe(40);
    expect(partialResult.remainingBalance).toBe(60);
    expect(partialResult.isFullyPaid).toBe(false);

    // Verify fee state in DB
    const feeAfterPartial = await t.run((ctx) => ctx.db.get("athleteFees", feeId));
    expect(feeAfterPartial?.status).toBe("partially_paid");
    expect(feeAfterPartial?.amountPaid).toBe(40);

    // Verify ledger entry
    const ledger = await t.run((ctx) =>
      ctx.db
        .query("paymentTransactions")
        .withIndex("by_fee", (q) => q.eq("feeId", feeId))
        .collect(),
    );
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      amount: 40,
      paymentMethod: "bank_transfer",
      referenceNumber: "WIRE-001",
      notes: "First installment",
    });

    // 3. Second payment: $60 (Full settlement)
    const finalResult = await financeA.mutation(
      api.fees.recordPaymentTransaction,
      {
        feeId,
        amount: 60,
        paymentMethod: "card",
        referenceNumber: "AUTH-8921",
        notes: "Final settlement",
      },
    );

    expect(finalResult.newAmountPaid).toBe(100);
    expect(finalResult.remainingBalance).toBe(0);
    expect(finalResult.isFullyPaid).toBe(true);

    const feeAfterFinal = await t.run((ctx) => ctx.db.get("athleteFees", feeId));
    expect(feeAfterFinal?.status).toBe("paid");
    expect(feeAfterFinal?.amountPaid).toBe(100);
    expect(feeAfterFinal?.paidAt).toBeDefined();

    // Verify total ledger records for this fee
    const ledgerAfterFinal = await t.run((ctx) =>
      ctx.db
        .query("paymentTransactions")
        .withIndex("by_fee", (q) => q.eq("feeId", feeId))
        .collect(),
    );
    expect(ledgerAfterFinal).toHaveLength(2);
  });

  it("rejects overpayments (amount > remainingBalance) and negative payments", async () => {
    const { t, financeA, athleteAId, academyAId, financeAId } =
      await setupTestEnvironment();

    const feeId = (await t.run((ctx) =>
      ctx.db.insert("athleteFees", {
        academyId: academyAId,
        athleteId: athleteAId,
        label: "Uniform Kit Fee",
        amountDue: 80,
        currency: "USD",
        dueDate: "2026-10-31",
        status: "unpaid",
        createdBy: financeAId,
        createdAt: TODAY,
      }),
    )) as Id<"athleteFees">;

    // Reject negative amount
    await expect(
      financeA.mutation(api.fees.recordPaymentTransaction, {
        feeId,
        amount: -10,
        paymentMethod: "cash",
      }),
    ).rejects.toThrow(/Payment amount must be greater than zero/);

    // Reject 0 amount
    await expect(
      financeA.mutation(api.fees.recordPaymentTransaction, {
        feeId,
        amount: 0,
        paymentMethod: "cash",
      }),
    ).rejects.toThrow(/Payment amount must be greater than zero/);

    // Reject overpayment ($95 on an $80 fee)
    await expect(
      financeA.mutation(api.fees.recordPaymentTransaction, {
        feeId,
        amount: 95,
        paymentMethod: "cash",
      }),
    ).rejects.toThrow(/exceeds remaining balance/);
  });

  it("applies a 50% scholarship discount and recalculates effective balance", async () => {
    const { t, financeA, athleteAId, academyAId, financeAId } =
      await setupTestEnvironment();

    const feeId = (await t.run((ctx) =>
      ctx.db.insert("athleteFees", {
        academyId: academyAId,
        athleteId: athleteAId,
        label: "Full Season Training Program",
        amountDue: 200,
        currency: "USD",
        dueDate: "2026-11-15",
        status: "unpaid",
        createdBy: financeAId,
        createdAt: TODAY,
      }),
    )) as Id<"athleteFees">;

    // Apply 50% scholarship
    const discountResult = await financeA.mutation(
      api.fees.applyScholarshipDiscount,
      {
        feeId,
        discountPercent: 50,
        reason: "Elite Youth Merit Scholarship",
      },
    );

    expect(discountResult.effectiveAmount).toBe(100);
    expect(discountResult.discountPercent).toBe(50);
    expect(discountResult.scholarshipReason).toBe("Elite Youth Merit Scholarship");
    expect(discountResult.isFullyPaid).toBe(false);

    // Verify DB state
    const fee = await t.run((ctx) => ctx.db.get("athleteFees", feeId));
    expect(fee?.scholarshipDiscountPercent).toBe(50);
    expect(fee?.scholarshipReason).toBe("Elite Youth Merit Scholarship");

    // Attempting to pay $150 should be rejected because effective remaining is $100
    await expect(
      financeA.mutation(api.fees.recordPaymentTransaction, {
        feeId,
        amount: 150,
        paymentMethod: "scholarship_credit",
      }),
    ).rejects.toThrow(/exceeds remaining balance/);

    // Settling $100 completes the fee
    const payment = await financeA.mutation(api.fees.recordPaymentTransaction, {
      feeId,
      amount: 100,
      paymentMethod: "scholarship_credit",
      notes: "Scholarship allocation",
    });
    expect(payment.isFullyPaid).toBe(true);
    expect(payment.remainingBalance).toBe(0);

    const feeSettled = await t.run((ctx) => ctx.db.get("athleteFees", feeId));
    expect(feeSettled?.status).toBe("paid");
  });

  it("enforces delinquency holds and strict cross-tenant isolation in getAcademyDelinquencyFlags", async () => {
    const { t, financeA, coachA, financeB, academyAId, academyBId, athleteAId, athleteBId, financeAId, financeBId } =
      await setupTestEnvironment();

    // 1. Insert overdue fee in Academy A for Athlete A
    await t.run((ctx) =>
      ctx.db.insert("athleteFees", {
        academyId: academyAId,
        athleteId: athleteAId,
        label: "Overdue September Fee",
        amountDue: 75,
        currency: "USD",
        dueDate: "2026-09-30",
        status: "overdue",
        createdBy: financeAId,
        createdAt: TODAY,
      }),
    );

    // 2. Insert overdue fee in Academy B for Athlete B
    await t.run((ctx) =>
      ctx.db.insert("athleteFees", {
        academyId: academyBId,
        athleteId: athleteBId,
        label: "Overdue B Fee",
        amountDue: 150,
        currency: "USD",
        dueDate: "2026-09-15",
        status: "overdue",
        createdBy: financeBId,
        createdAt: TODAY,
      }),
    );

    // 3. Finance A checks delinquency flags
    const flagsForFinanceA = await financeA.query(
      api.fees.getAcademyDelinquencyFlags,
      {},
    );
    expect(flagsForFinanceA).toHaveLength(1);
    expect(flagsForFinanceA[0].athleteId).toBe(athleteAId);
    expect(flagsForFinanceA[0].hasOverdueHold).toBe(true);
    expect(flagsForFinanceA[0].overdueCount).toBe(1);
    expect(flagsForFinanceA[0].totalOverdueBalance).toBe(75);

    // 4. Coach A checks delinquency flags (privacy: coach sees hold, without financial notes)
    const flagsForCoachA = await coachA.query(
      api.fees.getAcademyDelinquencyFlags,
      {},
    );
    expect(flagsForCoachA).toHaveLength(1);
    expect(flagsForCoachA[0].athleteId).toBe(athleteAId);
    expect(flagsForCoachA[0].hasOverdueHold).toBe(true);
    expect(flagsForCoachA[0].totalOverdueBalance).toBeUndefined();

    // 5. Cross-tenant check: Finance B only sees Athlete B
    const flagsForFinanceB = await financeB.query(
      api.fees.getAcademyDelinquencyFlags,
      {},
    );
    expect(flagsForFinanceB).toHaveLength(1);
    expect(flagsForFinanceB[0].athleteId).toBe(athleteBId);
    expect(flagsForFinanceB[0].totalOverdueBalance).toBe(150);

    // Cross-tenant breach attempt: Finance A cannot query Academy B
    await expect(
      financeA.query(api.fees.getAcademyDelinquencyFlags, {
        academyId: academyBId,
      }),
    ).rejects.toThrow(/You cannot perform operations on another academy/);
  });

  it("allows linked guardian with canManageBilling to record payment", async () => {
    const { t, guardian, athleteAId, academyAId, financeAId } =
      await setupTestEnvironment();

    const feeId = (await t.run((ctx) =>
      ctx.db.insert("athleteFees", {
        academyId: academyAId,
        athleteId: athleteAId,
        label: "Monthly Academy Dues",
        amountDue: 50,
        currency: "USD",
        dueDate: "2026-10-31",
        status: "unpaid",
        createdBy: financeAId,
        createdAt: TODAY,
      }),
    )) as Id<"athleteFees">;

    const result = await guardian.mutation(api.fees.recordPaymentTransaction, {
      feeId,
      amount: 50,
      paymentMethod: "card",
      referenceNumber: "GUARDIAN-PAY-01",
    });

    expect(result.isFullyPaid).toBe(true);
    expect(result.remainingBalance).toBe(0);

    const fee = await t.run((ctx) => ctx.db.get("athleteFees", feeId));
    expect(fee?.status).toBe("paid");
    expect(fee?.amountPaid).toBe(50);
  });
});
