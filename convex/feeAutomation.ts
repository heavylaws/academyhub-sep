import { ConvexError, v } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
} from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import type { Doc } from "./_generated/dataModel.d.ts";
import { requireRole } from "./lib/auth.ts";

/** Days before the due date that the "due soon" reminder is emailed. */
const REMINDER_DAYS_BEFORE = 3;
/** Grace period when a month's fee is only generated after its due day. */
const LATE_GENERATION_GRACE_DAYS = 7;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Dates are handled as UTC calendar dates ("YYYY-MM-DD"). */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
}

/** "YYYY-MM" for a date. */
export function periodOf(date: string): string {
  return date.slice(0, 7);
}

function periodLabel(period: string): string {
  const [year, month] = period.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/**
 * Creates the fee for `schedule` for `period` unless it already exists.
 * Returns true when a fee was created.
 */
async function generateFee(
  ctx: MutationCtx,
  schedule: Doc<"feeSchedules">,
  period: string,
  today: string,
): Promise<boolean> {
  if (!schedule.active || period < schedule.startPeriod) return false;

  const existing = await ctx.db
    .query("athleteFees")
    .withIndex("by_schedule_and_period", (q) =>
      q.eq("scheduleId", schedule._id).eq("period", period),
    )
    .first();
  if (existing) return false;

  const athlete = await ctx.db.get("athletes", schedule.athleteId);
  if (!athlete || athlete.status !== "active") return false;

  let dueDate = `${period}-${String(schedule.dueDay).padStart(2, "0")}`;
  // Generated after the due day (e.g. schedule created mid-month): don't
  // create a fee that is overdue on arrival.
  if (dueDate < today) {
    dueDate = addDays(today, LATE_GENERATION_GRACE_DAYS);
  }

  const feeId = await ctx.db.insert("athleteFees", {
    academyId: schedule.academyId,
    athleteId: schedule.athleteId,
    label: `${schedule.label} – ${periodLabel(period)}`,
    amountDue: schedule.amount,
    currency: schedule.currency,
    dueDate,
    status: "unpaid",
    createdBy: schedule.createdBy,
    createdAt: new Date().toISOString(),
    scheduleId: schedule._id,
    period,
  });
  await ctx.scheduler.runAfter(0, internal.emails.sendFeeNotification, {
    feeId,
    type: "new_fee",
  });
  return true;
}

// ── Staff functions ──────────────────────────────────────────────────────────

const FINANCE_ROLES: Array<"academy_admin" | "accounting"> = [
  "academy_admin",
  "accounting",
];

/** Lists the academy's recurring fee schedules with athlete names. */
export const listFeeSchedules = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    if (!user.academyId) return [];
    const schedules = await ctx.db
      .query("feeSchedules")
      .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
      .collect();
    return await Promise.all(
      schedules.map(async (s) => {
        const athlete = await ctx.db.get("athletes", s.athleteId);
        return {
          ...s,
          athleteName: athlete
            ? `${athlete.firstName} ${athlete.lastName}`
            : "Unknown athlete",
        };
      }),
    );
  },
});

/**
 * Creates a monthly fee schedule for each given athlete. This month's fee
 * (if the start month is this month or earlier) is created right away.
 */
export const createFeeSchedules = mutation({
  args: {
    athleteIds: v.array(v.id("athletes")),
    label: v.string(),
    amount: v.number(),
    currency: v.string(),
    dueDay: v.number(),
    startPeriod: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    if (!user.academyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "No academy" });
    }
    const label = args.label.trim();
    if (!label) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Description is required",
      });
    }
    if (!(args.amount > 0)) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Amount must be greater than zero",
      });
    }
    if (!Number.isInteger(args.dueDay) || args.dueDay < 1 || args.dueDay > 28) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Due day must be between 1 and 28",
      });
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(args.startPeriod)) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invalid start month",
      });
    }
    if (args.athleteIds.length === 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Select at least one athlete",
      });
    }

    const today = isoDate(new Date());
    let created = 0;
    for (const athleteId of args.athleteIds) {
      const athlete = await ctx.db.get("athletes", athleteId);
      if (!athlete || athlete.academyId !== user.academyId) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Athlete not in your academy",
        });
      }
      const scheduleId = await ctx.db.insert("feeSchedules", {
        academyId: user.academyId,
        athleteId,
        label,
        amount: args.amount,
        currency: args.currency,
        dueDay: args.dueDay,
        startPeriod: args.startPeriod,
        active: true,
        createdBy: user._id,
        createdAt: new Date().toISOString(),
      });
      const schedule = (await ctx.db.get("feeSchedules", scheduleId))!;
      await generateFee(ctx, schedule, periodOf(today), today);
      created++;
    }
    return created;
  },
});

/** Pause or resume a schedule. Already-created fees are not touched. */
export const setFeeScheduleActive = mutation({
  args: { scheduleId: v.id("feeSchedules"), active: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    const schedule = await ctx.db.get("feeSchedules", args.scheduleId);
    if (!schedule || schedule.academyId !== user.academyId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Schedule not found",
      });
    }
    await ctx.db.patch("feeSchedules", args.scheduleId, {
      active: args.active,
    });
    return null;
  },
});

/** Delete a schedule. Fees it already created stay on record. */
export const deleteFeeSchedule = mutation({
  args: { scheduleId: v.id("feeSchedules") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    const schedule = await ctx.db.get("feeSchedules", args.scheduleId);
    if (!schedule || schedule.academyId !== user.academyId) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Schedule not found",
      });
    }
    await ctx.db.delete("feeSchedules", args.scheduleId);
    return null;
  },
});

// ── Daily jobs (see crons.ts) ────────────────────────────────────────────────

/** Creates this month's fee for every active schedule that doesn't have one yet. */
export const generateMonthlyFees = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = isoDate(new Date());
    const period = periodOf(today);
    const schedules = await ctx.db
      .query("feeSchedules")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    let created = 0;
    for (const schedule of schedules) {
      if (await generateFee(ctx, schedule, period, today)) created++;
    }
    return created;
  },
});

/**
 * Marks unpaid / partially paid fees past their due date as overdue (emailing
 * the family once), and emails a reminder shortly before the due date.
 */
export const updateOverdueAndReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const today = isoDate(new Date());
    const reminderUntil = addDays(today, REMINDER_DAYS_BEFORE);
    const now = new Date().toISOString();
    let overdue = 0;
    let reminders = 0;

    for (const status of ["unpaid", "partially_paid"] as const) {
      const pastDue = await ctx.db
        .query("athleteFees")
        .withIndex("by_status_and_dueDate", (q) =>
          q.eq("status", status).lt("dueDate", today),
        )
        .collect();
      for (const fee of pastDue) {
        await ctx.db.patch("athleteFees", fee._id, {
          status: "overdue",
          ...(fee.overdueNotifiedAt ? {} : { overdueNotifiedAt: now }),
        });
        if (!fee.overdueNotifiedAt) {
          await ctx.scheduler.runAfter(0, internal.emails.sendFeeNotification, {
            feeId: fee._id,
            type: "overdue",
          });
        }
        overdue++;
      }

      const dueSoon = await ctx.db
        .query("athleteFees")
        .withIndex("by_status_and_dueDate", (q) =>
          q
            .eq("status", status)
            .gte("dueDate", today)
            .lte("dueDate", reminderUntil),
        )
        .collect();
      for (const fee of dueSoon) {
        if (fee.reminderSentAt) continue;
        await ctx.db.patch("athleteFees", fee._id, { reminderSentAt: now });
        await ctx.scheduler.runAfter(0, internal.emails.sendFeeNotification, {
          feeId: fee._id,
          type: "reminder",
        });
        reminders++;
      }
    }
    return { overdue, reminders };
  },
});
