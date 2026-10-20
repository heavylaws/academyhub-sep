import { ConvexError, v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
  FINANCE_ROLES,
  requireAcademyMember,
  requireAthleteAccess,
  requireRole,
  requireUser,
  resolveTargetAcademyId,
} from "./lib/auth.ts";
import { feeStatusValidator, paymentMethodValidator } from "./schema.ts";
import type { Id } from "./_generated/dataModel.d.ts";

/** Create a new fee record for an athlete. */
export const createFee = mutation({
  args: {
    athleteId: v.id("athletes"),
    label: v.string(),
    amountDue: v.number(),
    currency: v.string(),
    dueDate: v.string(),
    notes: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    if (!user.academyId)
      throw new ConvexError({ code: "FORBIDDEN", message: "No academy" });
    await requireAcademyMember(ctx, user.academyId);

    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete || athlete.academyId !== user.academyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Athlete not in your academy",
      });
    }
    await requireAcademyMember(ctx, athlete.academyId);

    // 1. Explicit idempotencyKey match
    if (args.idempotencyKey) {
      const existingKeyFee = await ctx.db
        .query("athleteFees")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", args.idempotencyKey),
        )
        .first();
      if (existingKeyFee) {
        return existingKeyFee._id;
      }
    }

    // 2. Strict idempotency / double-click prevention (within 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
    const recentFees = await ctx.db
      .query("athleteFees")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .order("desc")
      .take(15);

    const existingRecentFee = recentFees.find(
      (f) =>
        f.label === args.label.trim() &&
        f.amountDue === args.amountDue &&
        f.currency === args.currency &&
        f.dueDate === args.dueDate &&
        f.status === "unpaid" &&
        f.createdAt >= thirtySecondsAgo,
    );

    if (existingRecentFee) {
      return existingRecentFee._id;
    }

    const feeId = await ctx.db.insert("athleteFees", {
      academyId: user.academyId,
      athleteId: args.athleteId,
      label: args.label.trim(),
      amountDue: args.amountDue,
      currency: args.currency,
      dueDate: args.dueDate,
      status: "unpaid",
      notes: args.notes,
      idempotencyKey: args.idempotencyKey,
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });

    // Notify athlete by email
    await ctx.scheduler.runAfter(0, internal.emails.sendFeeNotification, {
      feeId,
      type: "new_fee",
    });

    return feeId;
  },
});

/** Update fee status (and optionally notes). */
export const updateFeeStatus = mutation({
  args: {
    feeId: v.id("athleteFees"),
    status: feeStatusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    const fee = await ctx.db.get("athleteFees", args.feeId);
    if (!fee)
      throw new ConvexError({ code: "NOT_FOUND", message: "Fee not found" });
    await requireAcademyMember(ctx, fee.academyId);

    await ctx.db.patch("athleteFees", args.feeId, {
      status: args.status,
      ...(args.notes !== undefined ? { notes: args.notes } : {}),
    });

    // Notify athlete of status change
    await ctx.scheduler.runAfter(0, internal.emails.sendFeeNotification, {
      feeId: args.feeId,
      type: "status_change",
      newStatus: args.status,
    });

    return null;
  },
});

/** Record a payment against a fee. */
export const recordPayment = mutation({
  args: {
    feeId: v.id("athleteFees"),
    amountPaid: v.number(),
    paidOn: v.string(),
    method: v.optional(v.string()),
    note: v.optional(v.string()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    const fee = await ctx.db.get("athleteFees", args.feeId);
    if (!fee)
      throw new ConvexError({ code: "NOT_FOUND", message: "Fee not found" });
    await requireAcademyMember(ctx, fee.academyId);

    if (args.amountPaid <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Amount paid must be greater than zero",
      });
    }

    // 1. Explicit idempotency key match
    if (args.idempotencyKey) {
      const existingKeyPayment = await ctx.db
        .query("feePayments")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", args.idempotencyKey),
        )
        .first();
      if (existingKeyPayment) {
        return null;
      }
    }

    // 2. Double-click prevention: duplicate payment recorded within last 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10_000).toISOString();
    const recentPayments = await ctx.db
      .query("feePayments")
      .withIndex("by_fee", (q) => q.eq("feeId", args.feeId))
      .order("desc")
      .take(10);

    const existingRecentPayment = recentPayments.find(
      (p) =>
        p.amountPaid === args.amountPaid &&
        p.paidOn === args.paidOn &&
        p.method === args.method &&
        p.recordedBy === user._id &&
        p.recordedAt >= tenSecondsAgo,
    );

    if (existingRecentPayment) {
      return null;
    }

    await ctx.db.insert("feePayments", {
      feeId: args.feeId,
      athleteId: fee.athleteId,
      academyId: fee.academyId,
      amountPaid: args.amountPaid,
      currency: fee.currency,
      paidOn: args.paidOn,
      method: args.method,
      note: args.note,
      idempotencyKey: args.idempotencyKey,
      recordedBy: user._id,
      recordedAt: new Date().toISOString(),
    });

    // Query cumulative payments to accurately determine paid vs partially_paid status
    const allPayments = await ctx.db
      .query("feePayments")
      .withIndex("by_fee", (q) => q.eq("feeId", args.feeId))
      .collect();
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amountPaid, 0);

    const newStatus =
      totalPaid >= fee.amountDue
        ? ("paid" as const)
        : ("partially_paid" as const);
    await ctx.db.patch("athleteFees", args.feeId, { status: newStatus });

    // Notify athlete payment received
    await ctx.scheduler.runAfter(0, internal.emails.sendFeeNotification, {
      feeId: args.feeId,
      type: "payment_received",
      amountPaid: args.amountPaid,
    });

    return null;
  },
});

/** Delete a fee (and its payment records). */
export const deleteFee = mutation({
  args: { feeId: v.id("athleteFees") },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    const fee = await ctx.db.get("athleteFees", args.feeId);
    if (!fee)
      throw new ConvexError({ code: "NOT_FOUND", message: "Fee not found" });
    await requireAcademyMember(ctx, fee.academyId);
    const payments = await ctx.db
      .query("feePayments")
      .withIndex("by_fee", (q) => q.eq("feeId", args.feeId))
      .collect();
    for (const p of payments) {
      await ctx.db.delete("feePayments", p._id);
    }
    await ctx.db.delete("athleteFees", args.feeId);
    return null;
  },
});

/** List all fees for the caller's academy, optionally filtered by status. */
export const listFeesForAcademy = query({
  args: { status: v.optional(feeStatusValidator) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...FINANCE_ROLES, "coach"]);
    if (!user.academyId) return [];
    await requireAcademyMember(ctx, user.academyId);

    const fees = args.status
      ? await ctx.db
          .query("athleteFees")
          .withIndex("by_academy_and_status", (q) =>
            q.eq("academyId", user.academyId!).eq("status", args.status!),
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("athleteFees")
          .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
          .order("desc")
          .collect();

    // Attach athlete name, payments sum, and remaining balance
    const result = await Promise.all(
      fees.map(async (fee) => {
        const [athlete, payments] = await Promise.all([
          ctx.db.get("athletes", fee.athleteId),
          ctx.db
            .query("feePayments")
            .withIndex("by_fee", (q) => q.eq("feeId", fee._id))
            .collect(),
        ]);
        const totalPaidFromPayments = payments.reduce((s, p) => s + p.amountPaid, 0);
        const totalPaid = fee.amountPaid ?? totalPaidFromPayments;
        const discount = fee.scholarshipDiscountPercent ?? 0;
        const effectiveAmountDue = Math.round((fee.amountDue * (1 - discount / 100)) * 100) / 100;
        return {
          ...fee,
          athleteName: athlete
            ? `${athlete.firstName} ${athlete.lastName}`
            : "Unknown",
          athleteSport: athlete?.sport,
          totalPaid,
          effectiveAmountDue,
          remainingBalance: Math.max(0, Math.round((effectiveAmountDue - totalPaid) * 100) / 100),
        };
      }),
    );
    return result;
  },
});

/** Internal: fetch fee + athlete email for notification sending. */
export const _getFeeForEmail = internalQuery({
  args: { feeId: v.id("athleteFees") },
  handler: async (ctx, args) => {
    const fee = await ctx.db.get("athleteFees", args.feeId);
    if (!fee) return null;
    const athlete = await ctx.db.get("athletes", fee.athleteId);
    const payments = await ctx.db
      .query("feePayments")
      .withIndex("by_fee", (q) => q.eq("feeId", fee._id))
      .collect();
    const totalPaidFromPayments = payments.reduce((s, p) => s + p.amountPaid, 0);
    const totalPaid = fee.amountPaid ?? totalPaidFromPayments;
    const discount = fee.scholarshipDiscountPercent ?? 0;
    const effectiveAmountDue = Math.round((fee.amountDue * (1 - discount / 100)) * 100) / 100;
    return {
      ...fee,
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "Athlete",
      athleteEmail: athlete?.email ?? null,
      guardianEmail: athlete?.guardianEmail ?? null,
      remainingBalance: Math.max(0, Math.round((effectiveAmountDue - totalPaid) * 100) / 100),
    };
  },
});

/** List fees for a specific athlete. */
export const listFeesForAthlete = query({
  args: { athleteId: v.id("athletes") },
  handler: async (ctx, args) => {
    await requireAthleteAccess(ctx, args.athleteId);

    const fees = await ctx.db
      .query("athleteFees")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .order("desc")
      .collect();

    // Attach payment history, total paid and remaining balance per fee
    const result = await Promise.all(
      fees.map(async (fee) => {
        const payments = await ctx.db
          .query("feePayments")
          .withIndex("by_fee", (q) => q.eq("feeId", fee._id))
          .order("desc")
          .collect();
        const totalPaidFromPayments = payments.reduce((s, p) => s + p.amountPaid, 0);
        const totalPaid = fee.amountPaid ?? totalPaidFromPayments;
        const discount = fee.scholarshipDiscountPercent ?? 0;
        const effectiveAmountDue = Math.round((fee.amountDue * (1 - discount / 100)) * 100) / 100;
        return {
          ...fee,
          payments,
          totalPaid,
          effectiveAmountDue,
          remainingBalance: Math.max(0, Math.round((effectiveAmountDue - totalPaid) * 100) / 100),
        };
      }),
    );
    return result;
  },
});

/**
 * Record a partial or full payment into the immutable payment ledger.
 * Accessible to FINANCE_ROLES (platform_admin, academy_admin, accounting)
 * and linked guardians with canManageBilling: true.
 */
export const recordPaymentTransaction = mutation({
  args: {
    feeId: v.optional(v.id("athleteFees")),
    invoiceId: v.optional(v.id("invoices")),
    amount: v.number(),
    paymentMethod: paymentMethodValidator,
    referenceNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    idempotencyKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);

    if (args.amount <= 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Payment amount must be greater than zero",
      });
    }

    if (!args.feeId && !args.invoiceId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Either feeId or invoiceId must be provided",
      });
    }

    // 1. If idempotencyKey is supplied, check for existing transaction
    if (args.idempotencyKey) {
      const existing = await ctx.db
        .query("paymentTransactions")
        .withIndex("by_idempotencyKey", (q) =>
          q.eq("idempotencyKey", args.idempotencyKey),
        )
        .first();
      if (existing) {
        let existingAmountPaid = 0;
        let effectiveTotal = existing.amount;
        if (args.feeId) {
          const fee = await ctx.db.get("athleteFees", args.feeId);
          if (fee) {
            const discount = fee.scholarshipDiscountPercent ?? 0;
            effectiveTotal = Math.round((fee.amountDue * (1 - discount / 100)) * 100) / 100;
            existingAmountPaid = fee.amountPaid ?? 0;
          }
        }
        const remaining = Math.max(0, Math.round((effectiveTotal - existingAmountPaid) * 100) / 100);
        return {
          transactionId: existing._id,
          newAmountPaid: existingAmountPaid,
          remainingBalance: remaining,
          isFullyPaid: existingAmountPaid >= effectiveTotal - 0.001,
        };
      }
    }

    if (args.feeId) {
      const fee = await ctx.db.get("athleteFees", args.feeId);
      if (!fee) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Fee not found" });
      }

      // Check authorization
      if (user.role === "platform_admin") {
        // allowed
      } else if (user.role && FINANCE_ROLES.includes(user.role)) {
        if (user.academyId !== fee.academyId) {
          throw new ConvexError({
            code: "FORBIDDEN",
            message: "You do not have access to this academy",
          });
        }
      } else if (user.role === "guardian") {
        const links = await ctx.db
          .query("guardianLinks")
          .withIndex("by_athlete", (q) => q.eq("athleteId", fee.athleteId))
          .collect();
        const canManage = links.some(
          (l) => l.guardianUserId === user._id && l.canManageBilling,
        );
        const athlete = await ctx.db.get("athletes", fee.athleteId);
        const isLegacyGuardian = athlete?.guardianUserId === user._id;
        if (!canManage && !isLegacyGuardian) {
          throw new ConvexError({
            code: "FORBIDDEN",
            message: "Guardian is not authorized to manage billing for this athlete",
          });
        }
      } else {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "You do not have permission to record payments",
        });
      }

      // Compute effective total and remaining balance
      const discount = fee.scholarshipDiscountPercent ?? 0;
      const effectiveTotalAmount =
        Math.round((fee.amountDue * (1 - discount / 100)) * 100) / 100;
      const existingAmountPaid = fee.amountPaid ?? 0;
      const remainingBalance = Math.max(
        0,
        Math.round((effectiveTotalAmount - existingAmountPaid) * 100) / 100,
      );

      // Validate payment does not exceed remaining unpaid balance
      if (args.amount > remainingBalance + 0.001) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: `Payment amount (${args.amount}) exceeds remaining balance (${remainingBalance})`,
        });
      }

      const paidTimestamp = args.paidAt ?? Date.now();

      // Insert immutable ledger record
      const transactionId = await ctx.db.insert("paymentTransactions", {
        academyId: fee.academyId,
        athleteId: fee.athleteId,
        feeId: fee._id,
        invoiceId: args.invoiceId,
        amount: args.amount,
        currency: fee.currency,
        paymentMethod: args.paymentMethod,
        referenceNumber: args.referenceNumber,
        recordedByUserId: user._id,
        notes: args.notes,
        idempotencyKey: args.idempotencyKey,
        paidAt: paidTimestamp,
        createdAt: Date.now(),
      });

      // Synchronize feePayments for backward-compatibility with legacy queries
      await ctx.db.insert("feePayments", {
        feeId: fee._id,
        athleteId: fee.athleteId,
        academyId: fee.academyId,
        amountPaid: args.amount,
        currency: fee.currency,
        paidOn: new Date(paidTimestamp).toISOString().split("T")[0],
        method: args.paymentMethod,
        note: args.notes,
        idempotencyKey: args.idempotencyKey,
        recordedBy: user._id,
        recordedAt: new Date().toISOString(),
      });

      const newAmountPaid =
        Math.round((existingAmountPaid + args.amount) * 100) / 100;
      const isFullyPaid = newAmountPaid >= effectiveTotalAmount - 0.001;
      const newStatus = isFullyPaid
        ? ("paid" as const)
        : ("partially_paid" as const);

      await ctx.db.patch("athleteFees", fee._id, {
        amountPaid: newAmountPaid,
        status: newStatus,
        ...(isFullyPaid ? { paidAt: paidTimestamp } : {}),
      });

      // If linked invoice exists, synchronize it
      if (args.invoiceId) {
        const inv = await ctx.db.get("invoices", args.invoiceId);
        if (inv) {
          const invDiscount = inv.scholarshipDiscountPercent ?? 0;
          const invEffective =
            Math.round((inv.amount * (1 - invDiscount / 100)) * 100) / 100;
          const newInvPaid =
            Math.round(((inv.amountPaid ?? 0) + args.amount) * 100) / 100;
          const invPaid = newInvPaid >= invEffective - 0.001;
          await ctx.db.patch("invoices", inv._id, {
            amountPaid: newInvPaid,
            status: invPaid ? "paid" : "partially_paid",
            ...(invPaid ? { paidAt: paidTimestamp } : {}),
          });
        }
      }

      // Notify athlete
      await ctx.scheduler.runAfter(0, internal.emails.sendFeeNotification, {
        feeId: fee._id,
        type: "payment_received",
        amountPaid: args.amount,
      });

      const newRemaining = Math.max(
        0,
        Math.round((effectiveTotalAmount - newAmountPaid) * 100) / 100,
      );

      return {
        transactionId,
        newAmountPaid,
        remainingBalance: newRemaining,
        isFullyPaid,
      };
    }

    // Invoice-only branch
    const inv = await ctx.db.get("invoices", args.invoiceId!);
    if (!inv) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Invoice not found" });
    }
    if (user.role !== "platform_admin" && user.academyId !== inv.academyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have access to this academy",
      });
    }

    if (!inv.athleteId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invoice must be linked to an athlete to record a payment ledger transaction",
      });
    }

    const discount = inv.scholarshipDiscountPercent ?? 0;
    const effectiveTotal =
      Math.round((inv.amount * (1 - discount / 100)) * 100) / 100;
    const existingPaid = inv.amountPaid ?? 0;
    const remaining = Math.max(
      0,
      Math.round((effectiveTotal - existingPaid) * 100) / 100,
    );

    if (args.amount > remaining + 0.001) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Payment amount (${args.amount}) exceeds remaining balance (${remaining})`,
      });
    }

    const paidTimestamp = args.paidAt ?? Date.now();
    const transactionId = await ctx.db.insert("paymentTransactions", {
      academyId: inv.academyId,
      athleteId: inv.athleteId,
      invoiceId: inv._id,
      amount: args.amount,
      currency: inv.currency,
      paymentMethod: args.paymentMethod,
      referenceNumber: args.referenceNumber,
      recordedByUserId: user._id,
      notes: args.notes,
      idempotencyKey: args.idempotencyKey,
      paidAt: paidTimestamp,
      createdAt: Date.now(),
    });

    const newAmountPaid = Math.round((existingPaid + args.amount) * 100) / 100;
    const isFullyPaid = newAmountPaid >= effectiveTotal - 0.001;

    await ctx.db.patch("invoices", inv._id, {
      amountPaid: newAmountPaid,
      status: isFullyPaid ? "paid" : "partially_paid",
      ...(isFullyPaid ? { paidAt: paidTimestamp } : {}),
    });

    return {
      transactionId,
      newAmountPaid,
      remainingBalance: Math.max(0, Math.round((effectiveTotal - newAmountPaid) * 100) / 100),
      isFullyPaid,
    };
  },
});

/**
 * Apply a scholarship or discount to an athlete fee.
 * Accessible to platform_admin, academy_admin, and accounting.
 */
export const applyScholarshipDiscount = mutation({
  args: {
    feeId: v.id("athleteFees"),
    discountPercent: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    const fee = await ctx.db.get("athleteFees", args.feeId);
    if (!fee) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Fee not found" });
    }
    await requireAcademyMember(ctx, fee.academyId);

    if (args.discountPercent < 0 || args.discountPercent > 100) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Discount percent must be between 0 and 100",
      });
    }
    if (!args.reason.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Scholarship reason is required",
      });
    }

    const effectiveTotalAmount =
      Math.round((fee.amountDue * (1 - args.discountPercent / 100)) * 100) / 100;
    const currentPaid = fee.amountPaid ?? 0;
    const isFullyPaid = currentPaid >= effectiveTotalAmount - 0.001;

    let newStatus = fee.status;
    if (isFullyPaid) {
      newStatus = "paid";
    } else if (currentPaid > 0) {
      newStatus = "partially_paid";
    } else if (fee.status === "paid") {
      newStatus = "unpaid";
    }

    await ctx.db.patch("athleteFees", fee._id, {
      scholarshipDiscountPercent: args.discountPercent,
      scholarshipReason: args.reason.trim(),
      status: newStatus,
      ...(isFullyPaid ? { paidAt: fee.paidAt ?? Date.now() } : {}),
    });

    return {
      feeId: fee._id,
      effectiveAmount: effectiveTotalAmount,
      discountPercent: args.discountPercent,
      scholarshipReason: args.reason.trim(),
      isFullyPaid,
    };
  },
});

/**
 * List payment transactions for an academy or specific athlete/fee.
 * Returns immutable audit log enriched with athleteName and recordedByName.
 */
export const listPaymentTransactions = query({
  args: {
    academyId: v.optional(v.id("academies")),
    athleteId: v.optional(v.id("athletes")),
    feeId: v.optional(v.id("athleteFees")),
    invoiceId: v.optional(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    let targetAcademyId: Id<"academies"> | undefined = args.academyId;

    if (user.role === "platform_admin") {
      targetAcademyId = args.academyId ?? user.academyId;
    } else if (user.role === "guardian" || user.role === "athlete") {
      if (args.athleteId) {
        await requireAthleteAccess(ctx, args.athleteId);
      }
      targetAcademyId = user.academyId;
    } else {
      targetAcademyId = resolveTargetAcademyId(user, args.academyId);
    }

    let txs;
    if (args.feeId) {
      const feeId = args.feeId;
      txs = await ctx.db
        .query("paymentTransactions")
        .withIndex("by_fee", (q) => q.eq("feeId", feeId))
        .collect();
    } else if (args.athleteId) {
      const athleteId = args.athleteId;
      txs = await ctx.db
        .query("paymentTransactions")
        .withIndex("by_athlete", (q) => q.eq("athleteId", athleteId))
        .collect();
    } else if (args.invoiceId) {
      const invoiceId = args.invoiceId;
      txs = await ctx.db
        .query("paymentTransactions")
        .withIndex("by_invoice", (q) => q.eq("invoiceId", invoiceId))
        .collect();
    } else if (targetAcademyId) {
      const academyId = targetAcademyId;
      txs = await ctx.db
        .query("paymentTransactions")
        .withIndex("by_academy", (q) => q.eq("academyId", academyId))
        .collect();
    } else {
      txs = await ctx.db.query("paymentTransactions").collect();
    }

    if (targetAcademyId && user.role !== "platform_admin") {
      txs = txs.filter((t) => t.academyId === targetAcademyId);
    }

    txs.sort((a, b) => (b.paidAt || b.createdAt) - (a.paidAt || a.createdAt));

    const enriched = await Promise.all(
      txs.map(async (t) => {
        const [athlete, recorder] = await Promise.all([
          ctx.db.get("athletes", t.athleteId),
          ctx.db.get("users", t.recordedByUserId),
        ]);
        return {
          ...t,
          athleteName: athlete
            ? `${athlete.firstName} ${athlete.lastName}`
            : "Unknown Athlete",
          recordedByName: recorder?.name ?? recorder?.email ?? "Staff Member",
        };
      }),
    );

    return enriched;
  },
});

/**
 * Returns athletes in the academy who currently have overdue fees.
 * Coaches receive hasOverdueHold and overdueCount without sensitive financial notes.
 */
export const getAcademyDelinquencyFlags = query({
  args: { academyId: v.optional(v.id("academies")) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "platform_admin",
      "academy_admin",
      "accounting",
      "sporting_director",
      "coach",
    ]);
    const targetAcademyId = resolveTargetAcademyId(user, args.academyId);

    const overdueFees = await ctx.db
      .query("athleteFees")
      .withIndex("by_academy_and_status", (q) =>
        q.eq("academyId", targetAcademyId).eq("status", "overdue"),
      )
      .collect();

    const isCoach = user.role === "coach";
    const map = new Map<
      string,
      {
        athleteId: Id<"athletes">;
        hasOverdueHold: boolean;
        overdueCount: number;
        totalOverdueBalance?: number;
        currency?: string;
      }
    >();

    for (const fee of overdueFees) {
      const existing = map.get(fee.athleteId);
      const discount = fee.scholarshipDiscountPercent ?? 0;
      const effectiveTotal =
        Math.round((fee.amountDue * (1 - discount / 100)) * 100) / 100;
      const paid = fee.amountPaid ?? 0;
      const unpaid = Math.max(0, effectiveTotal - paid);

      if (existing) {
        existing.overdueCount += 1;
        if (!isCoach && existing.totalOverdueBalance !== undefined) {
          existing.totalOverdueBalance =
            Math.round((existing.totalOverdueBalance + unpaid) * 100) / 100;
        }
      } else {
        map.set(fee.athleteId, {
          athleteId: fee.athleteId,
          hasOverdueHold: true,
          overdueCount: 1,
          ...(!isCoach
            ? {
                totalOverdueBalance: unpaid,
                currency: fee.currency,
              }
            : {}),
        });
      }
    }

    return Array.from(map.values());
  },
});

