import { defineTable } from "convex/server";
import { v } from "convex/values";

export const facilityTypeValidator = v.union(
  v.literal("pitch"),
  v.literal("court"),
  v.literal("gym"),
  v.literal("pool"),
  v.literal("classroom"),
  v.literal("other"),
);

export const facilityStatusValidator = v.union(
  v.literal("available"),
  v.literal("maintenance"),
  v.literal("closed"),
);

export const facilities = defineTable({
  academyId: v.id("academies"),
  name: v.string(),
  type: facilityTypeValidator,
  surfaceType: v.optional(v.string()),
  capacity: v.optional(v.number()),
  status: facilityStatusValidator,
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_academy", ["academyId"])
  .index("by_academy_and_status", ["academyId", "status"]);
