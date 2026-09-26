import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireAthleteAccess, requireRole, requireUser } from "./lib/auth.ts";
import { planStatusValidator } from "./schema.ts";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

// ─── Plans ───────────────────────────────────────────────────────────────────

/** Academy admin/coach: create a new training plan for an athlete. */
export const createPlan = mutation({
  args: {
    athleteId: v.id("athletes"),
    title: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }
    await requireAcademyMember(ctx, athlete.academyId);
    if (!args.title.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Plan title is required",
      });
    }
    return await ctx.db.insert("trainingPlans", {
      academyId: athlete.academyId,
      athleteId: args.athleteId,
      title: args.title.trim(),
      description: args.description,
      status: "active",
      startDate: args.startDate,
      endDate: args.endDate,
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });
  },
});

/** Academy admin/coach: update plan metadata. */
export const updatePlan = mutation({
  args: {
    planId: v.id("trainingPlans"),
    title: v.string(),
    description: v.optional(v.string()),
    status: planStatusValidator,
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const { planId, ...updates } = args;
    const plan = await ctx.db.get("trainingPlans", planId);
    if (!plan) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Plan not found" });
    }
    await requireAcademyMember(ctx, plan.academyId);
    if (!updates.title.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Plan title is required",
      });
    }
    await ctx.db.patch("trainingPlans", planId, {
      ...updates,
      title: updates.title.trim(),
    });
    return null;
  },
});

/** Academy admin/coach: delete a plan and all its items. */
export const deletePlan = mutation({
  args: { planId: v.id("trainingPlans") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const plan = await ctx.db.get("trainingPlans", args.planId);
    if (!plan) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Plan not found" });
    }
    await requireAcademyMember(ctx, plan.academyId);
    const items = await ctx.db
      .query("planItems")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();
    for (const item of items) {
      await ctx.db.delete("planItems", item._id);
    }
    await ctx.db.delete("trainingPlans", args.planId);
    return null;
  },
});

/** List all plans for an athlete. */
export const listPlansForAthlete = query({
  args: { athleteId: v.id("athletes") },
  handler: async (
    ctx,
    args,
  ): Promise<
    Array<Doc<"trainingPlans"> & { itemCount: number; completedCount: number }>
  > => {
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }
    await requireAthleteAccess(ctx, args.athleteId);
    const plans = await ctx.db
      .query("trainingPlans")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .order("desc")
      .collect();

    return await Promise.all(
      plans.map(async (plan) => {
        const items = await ctx.db
          .query("planItems")
          .withIndex("by_plan", (q) => q.eq("planId", plan._id))
          .collect();
        const completedCount = items.filter(
          (i) => i.completedAt !== undefined,
        ).length;
        return { ...plan, itemCount: items.length, completedCount };
      }),
    );
  },
});

/** Fetch a single plan with its ordered items. */
export const getPlan = query({
  args: { planId: v.id("trainingPlans") },
  handler: async (
    ctx,
    args,
  ): Promise<{
    plan: Doc<"trainingPlans">;
    items: Doc<"planItems">[];
    athlete: Doc<"athletes">;
  } | null> => {
    const plan = await ctx.db.get("trainingPlans", args.planId);
    if (!plan) return null;
    await requireAcademyMember(ctx, plan.academyId);
    const athlete = await ctx.db.get("athletes", plan.athleteId);
    if (!athlete) return null;
    const items = await ctx.db
      .query("planItems")
      .withIndex("by_plan_and_order", (q) => q.eq("planId", args.planId))
      .order("asc")
      .collect();
    return { plan, items, athlete };
  },
});

// ─── Plan items ───────────────────────────────────────────────────────────────

/** Academy admin/coach: add an exercise item to a plan. */
export const addPlanItem = mutation({
  args: {
    planId: v.id("trainingPlans"),
    name: v.string(),
    sets: v.optional(v.number()),
    reps: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const plan = await ctx.db.get("trainingPlans", args.planId);
    if (!plan) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Plan not found" });
    }
    await requireAcademyMember(ctx, plan.academyId);
    if (!args.name.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Exercise name is required",
      });
    }
    // Determine next order value
    const existing = await ctx.db
      .query("planItems")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .collect();
    const order = existing.length;
    return await ctx.db.insert("planItems", {
      planId: args.planId,
      academyId: plan.academyId,
      order,
      name: args.name.trim(),
      sets: args.sets,
      reps: args.reps,
      durationSeconds: args.durationSeconds,
      notes: args.notes,
    });
  },
});

/** Academy admin/coach: update an exercise item's prescription. */
export const updatePlanItem = mutation({
  args: {
    itemId: v.id("planItems"),
    name: v.string(),
    sets: v.optional(v.number()),
    reps: v.optional(v.number()),
    durationSeconds: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const { itemId, ...updates } = args;
    const item = await ctx.db.get("planItems", itemId);
    if (!item) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Item not found" });
    }
    await requireAcademyMember(ctx, item.academyId);
    if (!updates.name.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Exercise name is required",
      });
    }
    await ctx.db.patch("planItems", itemId, {
      ...updates,
      name: updates.name.trim(),
    });
    return null;
  },
});

/** Academy admin/coach: delete a plan item. */
export const deletePlanItem = mutation({
  args: { itemId: v.id("planItems") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const item = await ctx.db.get("planItems", args.itemId);
    if (!item) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Item not found" });
    }
    await requireAcademyMember(ctx, item.academyId);
    await ctx.db.delete("planItems", args.itemId);
    return null;
  },
});

/** Academy admin/coach: record a result / mark an item complete (or clear it). */
export const recordItemResult = mutation({
  args: {
    itemId: v.id("planItems"),
    result: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    const item = await ctx.db.get("planItems", args.itemId);
    if (!item) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Item not found" });
    }
    await requireAcademyMember(ctx, item.academyId);
    const now = new Date().toISOString();
    await ctx.db.patch("planItems", args.itemId, {
      result: args.result || undefined,
      completedAt: args.result ? (item.completedAt ?? now) : undefined,
      completedBy: args.result ? user._id : undefined,
    });
    return null;
  },
});

/** Reorder items in a plan by providing the full ordered list of item IDs. */
export const reorderPlanItems = mutation({
  args: { planId: v.id("trainingPlans"), itemIds: v.array(v.id("planItems")) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const plan = await ctx.db.get("trainingPlans", args.planId);
    if (!plan) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Plan not found" });
    }
    await requireAcademyMember(ctx, plan.academyId);
    for (let i = 0; i < args.itemIds.length; i++) {
      await ctx.db.patch("planItems", args.itemIds[i] as Id<"planItems">, {
        order: i,
      });
    }
    return null;
  },
});
