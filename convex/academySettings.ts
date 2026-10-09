import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireRole, requireUser } from "./lib/auth.ts";
import { benchmarkTargetValidator } from "./schema/academySettings.ts";

/** Get academy settings (benchmarks, currencies, branding, feature flags) */
export const getAcademySettings = query({
  args: {
    academyId: v.optional(v.id("academies")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const targetAcademyId = args.academyId || user.academyId;

    if (!targetAcademyId) {
      return null;
    }

    const settings = await ctx.db
      .query("academySettings")
      .withIndex("by_academy", (q) => q.eq("academyId", targetAcademyId))
      .first();

    return settings;
  },
});

/** Update or initialize academy settings */
export const updateAcademySettings = mutation({
  args: {
    academyId: v.optional(v.id("academies")),
    benchmarks: v.optional(v.record(v.string(), benchmarkTargetValidator)),
    defaultCurrency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    feeDueDayOfMonth: v.optional(v.number()),
    attendancePinLength: v.optional(v.number()),
    enableTacticalAI: v.optional(v.boolean()),
    enableVideoAnalysis: v.optional(v.boolean()),
    branding: v.optional(
      v.object({
        primaryColor: v.optional(v.string()),
        logoUrl: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "platform_admin"]);
    const targetAcademyId =
      user.role === "platform_admin" && args.academyId
        ? args.academyId
        : user.academyId;

    if (!targetAcademyId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Academy ID is required to update settings",
      });
    }

    const existing = await ctx.db
      .query("academySettings")
      .withIndex("by_academy", (q) => q.eq("academyId", targetAcademyId))
      .first();

    const nowIso = new Date().toISOString();

    const patchPayload: Record<string, unknown> = {
      updatedAt: nowIso,
      updatedBy: user._id,
    };

    if (args.benchmarks !== undefined) patchPayload.benchmarks = args.benchmarks;
    if (args.defaultCurrency !== undefined) patchPayload.defaultCurrency = args.defaultCurrency;
    if (args.timezone !== undefined) patchPayload.timezone = args.timezone;
    if (args.feeDueDayOfMonth !== undefined) patchPayload.feeDueDayOfMonth = args.feeDueDayOfMonth;
    if (args.attendancePinLength !== undefined) patchPayload.attendancePinLength = args.attendancePinLength;
    if (args.enableTacticalAI !== undefined) patchPayload.enableTacticalAI = args.enableTacticalAI;
    if (args.enableVideoAnalysis !== undefined) patchPayload.enableVideoAnalysis = args.enableVideoAnalysis;
    if (args.branding !== undefined) patchPayload.branding = args.branding;

    if (existing) {
      await ctx.db.patch("academySettings", existing._id, patchPayload);
      return existing._id;
    } else {
      return await ctx.db.insert("academySettings", {
        academyId: targetAcademyId,
        ...patchPayload,
      });
    }
  },
});

/** Update or set a single benchmark metric target */
export const setBenchmarkTarget = mutation({
  args: {
    academyId: v.optional(v.id("academies")),
    metricName: v.string(),
    benchmark: v.number(),
    unit: v.string(),
    lowerBetter: v.boolean(),
    attribute: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "platform_admin"]);
    const targetAcademyId =
      user.role === "platform_admin" && args.academyId
        ? args.academyId
        : user.academyId;

    if (!targetAcademyId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Academy ID is required",
      });
    }

    const existing = await ctx.db
      .query("academySettings")
      .withIndex("by_academy", (q) => q.eq("academyId", targetAcademyId))
      .first();

    const benchmarks = existing?.benchmarks ?? {};
    benchmarks[args.metricName] = {
      benchmark: args.benchmark,
      unit: args.unit,
      lowerBetter: args.lowerBetter,
      attribute: args.attribute,
    };

    const nowIso = new Date().toISOString();

    if (existing) {
      await ctx.db.patch("academySettings", existing._id, {
        benchmarks,
        updatedAt: nowIso,
        updatedBy: user._id,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("academySettings", {
        academyId: targetAcademyId,
        benchmarks,
        updatedAt: nowIso,
        updatedBy: user._id,
      });
    }
  },
});
