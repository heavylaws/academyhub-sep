import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireRole } from "./lib/auth.ts";

export const listDrills = query({
  args: {
    academyId: v.optional(v.id("academies")),
    ageGroup: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.academyId) return [];
    await requireAcademyMember(ctx, args.academyId);
    const results = await ctx.db
      .query("drills")
      .withIndex("by_academy", (q) => q.eq("academyId", args.academyId!))
      .collect();

    return results.filter((d) => {
      if (args.ageGroup && args.ageGroup !== "all" && d.ageGroup !== args.ageGroup) return false;
      if (args.category && args.category !== "all" && d.category !== args.category) return false;
      return true;
    });
  },
});

export const createDrill = mutation({
  args: {
    title: v.string(),
    ageGroup: v.string(),
    birthYears: v.string(),
    category: v.string(),
    categoryLabel: v.string(),
    difficulty: v.string(),
    durationMinutes: v.number(),
    durationSeconds: v.optional(v.number()),
    recommendedSets: v.number(),
    recommendedReps: v.number(),
    gridDimensions: v.string(),
    equipment: v.array(v.string()),
    summary: v.string(),
    setup: v.string(),
    instructions: v.array(v.string()),
    coachingPoints: v.array(v.string()),
    variations: v.optional(v.array(v.string())),
    metricName: v.string(),
    metricUnit: v.string(),
    benchmark: v.number(),
    isLowerBetter: v.boolean(),
    targetAttribute: v.string(),
  },
  handler: async (ctx, args) => {
    // Coach, academy_admin, and platform_admin only
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    if (!user.academyId && user.role !== "platform_admin") {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "User must belong to an academy to create drills",
      });
    }
    const academyId = user.academyId!;
    await requireAcademyMember(ctx, academyId);

    if (!args.title.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Drill title is required" });
    }
    if (!args.metricName.trim()) {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Performance metric name is required" });
    }

    const drillId = await ctx.db.insert("drills", {
      academyId,
      title: args.title.trim(),
      ageGroup: args.ageGroup,
      birthYears: args.birthYears.trim(),
      category: args.category,
      categoryLabel: args.categoryLabel,
      difficulty: args.difficulty,
      durationMinutes: args.durationMinutes,
      durationSeconds: args.durationSeconds ?? args.durationMinutes * 60,
      recommendedSets: args.recommendedSets,
      recommendedReps: args.recommendedReps,
      gridDimensions: args.gridDimensions.trim(),
      equipment: args.equipment,
      summary: args.summary.trim(),
      setup: args.setup.trim(),
      instructions: args.instructions,
      coachingPoints: args.coachingPoints,
      variations: args.variations ?? [],
      metricName: args.metricName.trim(),
      metricUnit: args.metricUnit.trim() || "pts",
      benchmark: args.benchmark,
      isLowerBetter: args.isLowerBetter,
      targetAttribute: args.targetAttribute,
      createdBy: user._id,
      createdByName: user.name ?? "Coach",
      createdByRole: user.role ?? "coach",
      createdAt: new Date().toISOString(),
    });

    return drillId;
  },
});

export const deleteDrill = mutation({
  args: { drillId: v.id("drills") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const drill = await ctx.db.get("drills", args.drillId);
    if (!drill) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Drill not found" });
    }
    await requireAcademyMember(ctx, drill.academyId);
    await ctx.db.delete("drills", args.drillId);
    return null;
  },
});
