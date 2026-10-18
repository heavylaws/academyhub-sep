import { ConvexError, v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import {
  FINANCE_ROLES,
  requireAcademyMember,
  requireAthleteAccess,
  requireRole,
} from "./lib/auth.ts";
import { feeStatusValidator } from "./schema.ts";

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
        const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
        return {
          ...fee,
          athleteName: athlete
            ? `${athlete.firstName} ${athlete.lastName}`
            : "Unknown",
          athleteSport: athlete?.sport,
          totalPaid,
          remainingBalance: Math.max(0, fee.amountDue - totalPaid),
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
    const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
    return {
      ...fee,
      athleteName: athlete
        ? `${athlete.firstName} ${athlete.lastName}`
        : "Athlete",
      athleteEmail: athlete?.email ?? null,
      guardianEmail: athlete?.guardianEmail ?? null,
      remainingBalance: Math.max(0, fee.amountDue - totalPaid),
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
        const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
        return {
          ...fee,
          payments,
          totalPaid,
          remainingBalance: Math.max(0, fee.amountDue - totalPaid),
        };
      }),
    );
    return result;
  },
});
