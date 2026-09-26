import { defineTable } from "convex/server";
import { v } from "convex/values";

export const invoiceStatusValidator = v.union(
  v.literal("draft"),
  v.literal("sent"),
  v.literal("paid"),
  v.literal("overdue"),
);

export const invoices = defineTable({
  academyId: v.id("academies"),
  /** Optional: if set, invoice is addressed to a specific athlete */
  athleteId: v.optional(v.id("athletes")),
  invoiceNumber: v.string(), // e.g. "INV-0001"
  description: v.string(),
  amount: v.number(),
  currency: v.string(), // e.g. "USD"
  dueDate: v.string(), // YYYY-MM-DD
  status: invoiceStatusValidator,
  /** Optional free-text note, e.g. reason for paid/sent action */
  note: v.optional(v.string()),
  issuedAt: v.string(), // ISO 8601
  createdBy: v.id("users"),
})
  .index("by_academy", ["academyId"])
  .index("by_academy_and_status", ["academyId", "status"])
  .index("by_athlete", ["athleteId"]);
