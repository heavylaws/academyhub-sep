import { defineTable } from "convex/server";
import { v } from "convex/values";

export const feeStatusValidator = v.union(
  v.literal("unpaid"),
  v.literal("partially_paid"),
  v.literal("paid"),
  v.literal("overdue"),
  v.literal("waived"),
);

/** One fee record per athlete per billing period */
export const athleteFees = defineTable({
  academyId: v.id("academies"),
  athleteId: v.id("athletes"),
  label: v.string(), // e.g. "Monthly Fee – October 2026"
  amountDue: v.number(), // in currency units (e.g. USD)
  currency: v.string(), // e.g. "USD"
  dueDate: v.string(), // YYYY-MM-DD
  status: feeStatusValidator,
  notes: v.optional(v.string()),
  createdBy: v.id("users"),
  createdAt: v.string(),
  // Set when generated from a recurring fee schedule: which schedule and
  // which billing month ("YYYY-MM"), so a month is never billed twice.
  scheduleId: v.optional(v.id("feeSchedules")),
  period: v.optional(v.string()),
  // When the "due soon" reminder / overdue notice were emailed.
  reminderSentAt: v.optional(v.string()),
  overdueNotifiedAt: v.optional(v.string()),
})
  .index("by_academy", ["academyId"])
  .index("by_athlete", ["athleteId"])
  .index("by_academy_and_status", ["academyId", "status"])
  .index("by_status_and_dueDate", ["status", "dueDate"])
  .index("by_schedule_and_period", ["scheduleId", "period"]);

/** A recurring monthly fee for one athlete (e.g. "Monthly membership"). */
export const feeSchedules = defineTable({
  academyId: v.id("academies"),
  athleteId: v.id("athletes"),
  label: v.string(),
  amount: v.number(),
  currency: v.string(),
  // Day of the month the fee is due (1-28, so it exists in every month).
  dueDay: v.number(),
  // First billing month, "YYYY-MM".
  startPeriod: v.string(),
  active: v.boolean(),
  createdBy: v.id("users"),
  createdAt: v.string(),
})
  .index("by_academy", ["academyId"])
  .index("by_athlete", ["athleteId"])
  .index("by_active", ["active"]);

/** Payment event log — one row per payment received */
export const feePayments = defineTable({
  feeId: v.id("athleteFees"),
  athleteId: v.id("athletes"),
  academyId: v.id("academies"),
  amountPaid: v.number(),
  currency: v.string(),
  paidOn: v.string(), // YYYY-MM-DD
  method: v.optional(v.string()), // e.g. "Cash", "Bank Transfer"
  note: v.optional(v.string()),
  recordedBy: v.id("users"),
  recordedAt: v.string(),
})
  .index("by_fee", ["feeId"])
  .index("by_athlete", ["athleteId"])
  .index("by_academy", ["academyId"]);
