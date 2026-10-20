import { defineTable } from "convex/server";
import { v } from "convex/values";

export const paymentMethodValidator = v.union(
  v.literal("cash"),
  v.literal("card"),
  v.literal("bank_transfer"),
  v.literal("scholarship_credit"),
  v.literal("other"),
);

export const paymentTransactions = defineTable({
  academyId: v.id("academies"),
  athleteId: v.id("athletes"),
  feeId: v.optional(v.id("athleteFees")),
  invoiceId: v.optional(v.id("invoices")),
  amount: v.number(),
  currency: v.optional(v.string()),
  paymentMethod: paymentMethodValidator,
  referenceNumber: v.optional(v.string()),
  recordedByUserId: v.id("users"),
  notes: v.optional(v.string()),
  idempotencyKey: v.optional(v.string()),
  paidAt: v.number(),
  createdAt: v.number(),
})
  .index("by_academy", ["academyId"])
  .index("by_athlete", ["athleteId"])
  .index("by_fee", ["feeId"])
  .index("by_invoice", ["invoiceId"])
  .index("by_idempotencyKey", ["idempotencyKey"]);
