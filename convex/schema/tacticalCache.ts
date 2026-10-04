import { defineTable } from "convex/server";
import { v } from "convex/values";

export const tacticalCache = defineTable({
  fingerprint: v.string(), // e.g. "drill-cache:v2:<64bit_hash>"
  canonicalKey: v.string(),
  drillData: v.string(), // Serialized TacticalDrillMetadata
  planData: v.string(), // Serialized TacticalPlan
  engineUsed: v.string(),
  hitCount: v.number(),
  createdAt: v.string(),
  lastAccessedAt: v.string(),
}).index("by_fingerprint", ["fingerprint"]);
