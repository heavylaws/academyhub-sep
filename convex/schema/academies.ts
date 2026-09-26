import { defineTable } from "convex/server";
import { v } from "convex/values";

export const academies = defineTable({
  name: v.string(),
  slug: v.string(),
  status: v.union(v.literal("active"), v.literal("suspended")),
  createdBy: v.optional(v.id("users")),
  createdAt: v.string(),
  nextInvoiceNumber: v.optional(v.number()),
})
  .index("by_slug", ["slug"])
  .index("by_status", ["status"]);
