import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireRole } from "./lib/auth.ts";
import { validateServerTacticalPlan } from "./lib/tacticalValidation.ts";

export const listTacticalPlans = query({
  args: {
    academyId: v.optional(v.id("academies")),
    drillId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user;
    try {
      user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin", "athlete"]);
    } catch {
      return [];
    }

    const targetAcademyId = args.academyId || user.academyId;
    if (!targetAcademyId) return [];

    await requireAcademyMember(ctx, targetAcademyId);

    let queryBuilder = ctx.db
      .query("tacticalPlans")
      .withIndex("by_academy", (q) => q.eq("academyId", targetAcademyId));

    const records = await queryBuilder.order("desc").collect();

    if (args.drillId) {
      return records.filter((r) => r.drillId === args.drillId);
    }

    return records;
  },
});

export const getTacticalPlan = query({
  args: {
    id: v.id("tacticalPlans"),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get("tacticalPlans", args.id);
    if (!plan) return null;

    await requireAcademyMember(ctx, plan.academyId);
    return plan;
  },
});

export const saveTacticalPlan = mutation({
  args: {
    planId: v.optional(v.id("tacticalPlans")),
    title: v.string(),
    drillId: v.optional(v.string()),
    category: v.optional(v.string()),
    pitchType: v.string(),
    gridDimensions: v.optional(v.string()),
    coachingPoints: v.array(v.string()),
    planData: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const academyId = user.academyId;
    if (!academyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You must be associated with an academy to save tactical plans",
      });
    }

    // Validate title
    const title = args.title.trim();
    if (!title) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Tactical plan title is required",
      });
    }

    // Server-side JSON syntax check
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(args.planData);
    } catch {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Malformed planData: invalid JSON format",
      });
    }

    // Server-side Tactical Domain Verification
    const validationResult = validateServerTacticalPlan(parsedData);
    if (!validationResult.valid) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: `Tactical domain validation failed: ${validationResult.errors.join("; ")}`,
      });
    }

    const validatedPlan = validationResult.normalizedPlan;
    const sanitizedPlanData = validatedPlan ? JSON.stringify(validatedPlan) : args.planData;

    const nowIso = new Date().toISOString();

    if (args.planId) {
      const existing = await ctx.db.get("tacticalPlans", args.planId);
      if (!existing) {
        throw new ConvexError({
          code: "NOT_FOUND",
          message: "Tactical plan not found",
        });
      }
      if (existing.academyId !== academyId && user.role !== "platform_admin") {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Cannot modify a tactical plan belonging to another academy",
        });
      }

      await ctx.db.patch("tacticalPlans", args.planId, {
        title,
        drillId: args.drillId,
        category: args.category,
        pitchType: args.pitchType,
        gridDimensions: args.gridDimensions,
        coachingPoints: args.coachingPoints,
        planData: sanitizedPlanData,
        updatedAt: nowIso,
      });

      return args.planId;
    }

    const newId = await ctx.db.insert("tacticalPlans", {
      academyId,
      title,
      drillId: args.drillId,
      category: args.category,
      pitchType: args.pitchType,
      gridDimensions: args.gridDimensions,
      coachingPoints: args.coachingPoints,
      planData: sanitizedPlanData,
      createdBy: user._id,
      createdByName: user.name ?? undefined,
      createdByRole: user.role ?? undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    return newId;
  },
});

export const deleteTacticalPlan = mutation({
  args: {
    id: v.id("tacticalPlans"),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach", "platform_admin"]);
    const plan = await ctx.db.get("tacticalPlans", args.id);
    if (!plan) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Tactical plan not found",
      });
    }

    if (plan.academyId !== user.academyId && user.role !== "platform_admin") {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot delete a tactical plan from another academy",
      });
    }

    await ctx.db.delete("tacticalPlans", args.id);
    return { success: true };
  },
});
