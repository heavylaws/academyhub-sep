import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import {
  requireAcademyMember,
  requireAthleteAccess,
  requireRole,
  requireUser,
} from "./lib/auth.ts";
import { logAction } from "./lib/logger.ts";
import {
  sanitizeOptionalString,
  sanitizeOptionalText,
  sanitizeString,
} from "./lib/sanitize.ts";
import {
  goalCornerValidator,
  goalOptimizationDirectionValidator,
  goalStatusValidator,
} from "./schema.ts";

function inferOptimizationDirection(
  explicitDirection?: "higher_is_better" | "lower_is_better",
  unit?: string,
): "higher_is_better" | "lower_is_better" {
  if (explicitDirection) return explicitDirection;
  if (!unit) return "higher_is_better";
  const clean = unit.trim().toLowerCase();
  if (clean === "s" || clean === "sec" || clean === "seconds" || clean === "ms") {
    return "lower_is_better";
  }
  return "higher_is_better";
}

function checkIsAchieved(
  current: number,
  target: number,
  direction: "higher_is_better" | "lower_is_better",
): boolean {
  if (direction === "lower_is_better") {
    return current <= target;
  }
  return current >= target;
}

/**
 * List all Individual Development Plan (IDP) goals for an athlete.
 * Accessible to academy staff and the athlete / guardian.
 */
export const listAthleteGoals = query({
  args: {
    athleteId: v.id("athletes"),
    status: v.optional(goalStatusValidator),
  },
  handler: async (ctx, args) => {
    const { athlete } = await requireAthleteAccess(ctx, args.athleteId);

    const goals = await ctx.db
      .query("athleteGoals")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .collect();

    let filtered = goals;
    if (args.status) {
      filtered = filtered.filter((g) => g.status === args.status);
    }

    // Enrich with creator name
    const enriched = await Promise.all(
      filtered.map(async (goal) => {
        const creator = await ctx.db.get("users", goal.createdByUserId);
        return {
          ...goal,
          creatorName: creator?.name ?? "Coach",
          athleteName: `${athlete.firstName} ${athlete.lastName}`,
        };
      }),
    );

    // Sort order: in_progress & at_risk first, then achieved, then archived, sorted by targetDate
    const statusWeight: Record<string, number> = {
      at_risk: 1,
      in_progress: 2,
      achieved: 3,
      archived: 4,
    };

    enriched.sort((a, b) => {
      const weightA = statusWeight[a.status] ?? 99;
      const weightB = statusWeight[b.status] ?? 99;
      if (weightA !== weightB) return weightA - weightB;
      return a.targetDate.localeCompare(b.targetDate);
    });

    return enriched;
  },
});

/**
 * Create a new IDP goal for an athlete.
 * Accessible to coaching and sporting director roles.
 */
export const createAthleteGoal = mutation({
  args: {
    athleteId: v.id("athletes"),
    title: v.string(),
    corner: goalCornerValidator,
    linkedMetricName: v.optional(v.string()),
    baselineValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    currentValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    optimizationDirection: v.optional(goalOptimizationDirectionValidator),
    targetDate: v.string(),
    actionPlanNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "platform_admin",
      "academy_admin",
      "sporting_director",
      "coach",
    ]);

    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }

    await requireAcademyMember(ctx, athlete.academyId);

    const cleanTitle = sanitizeString(args.title, 120, "Title");
    if (!cleanTitle) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Goal title is required",
      });
    }

    const cleanUnit = sanitizeOptionalString(args.unit, 30, "Unit");
    const direction = inferOptimizationDirection(
      args.optimizationDirection,
      cleanUnit,
    );

    const curVal = args.currentValue ?? args.baselineValue;
    let initialStatus: "in_progress" | "achieved" | "at_risk" | "archived" =
      "in_progress";

    if (curVal !== undefined && args.targetValue !== undefined) {
      if (checkIsAchieved(curVal, args.targetValue, direction)) {
        initialStatus = "achieved";
      }
    }

    const now = Date.now();
    const id = await ctx.db.insert("athleteGoals", {
      academyId: athlete.academyId,
      athleteId: args.athleteId,
      createdByUserId: user._id,
      title: cleanTitle,
      corner: args.corner,
      linkedMetricName: sanitizeOptionalString(
        args.linkedMetricName,
        80,
        "Linked metric name",
      ),
      baselineValue: args.baselineValue,
      targetValue: args.targetValue,
      currentValue: curVal,
      unit: cleanUnit,
      optimizationDirection: direction,
      targetDate: args.targetDate,
      status: initialStatus,
      actionPlanNotes: sanitizeOptionalText(
        args.actionPlanNotes,
        2000,
        "Action plan notes",
      ),
      createdAt: now,
      updatedAt: now,
    });

    logAction("athleteGoal:create", {
      userId: user._id,
      academyId: athlete.academyId,
      athleteId: args.athleteId,
      goalId: id,
      title: cleanTitle,
      corner: args.corner,
    });

    return id;
  },
});

/**
 * Update an IDP goal.
 * Coaches have full update permissions. Athletes can update currentValue and actionPlanNotes.
 * Automatically transitions status to 'achieved' when target is reached.
 */
export const updateAthleteGoal = mutation({
  args: {
    goalId: v.id("athleteGoals"),
    title: v.optional(v.string()),
    currentValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    baselineValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    optimizationDirection: v.optional(goalOptimizationDirectionValidator),
    targetDate: v.optional(v.string()),
    status: v.optional(goalStatusValidator),
    actionPlanNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const goal = await ctx.db.get("athleteGoals", args.goalId);
    if (!goal) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete goal not found",
      });
    }

    const athlete = await ctx.db.get("athletes", goal.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }

    const isCoachOrAdmin =
      user.role === "platform_admin" ||
      ((user.role === "academy_admin" ||
        user.role === "sporting_director" ||
        user.role === "coach") &&
        user.academyId === goal.academyId);

    const isLinkedAthlete =
      user.role === "athlete" && athlete.userId === user._id;

    if (!isCoachOrAdmin && !isLinkedAthlete) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have permission to update this goal",
      });
    }

    const direction =
      args.optimizationDirection ??
      goal.optimizationDirection ??
      inferOptimizationDirection(undefined, args.unit ?? goal.unit);

    const newTargetValue = args.targetValue ?? goal.targetValue;
    const newCurrentValue = args.currentValue ?? goal.currentValue;

    let updatedStatus = args.status ?? goal.status;

    // Automatic achievement transition when currentValue meets or exceeds target
    if (newCurrentValue !== undefined && newTargetValue !== undefined) {
      const achieved = checkIsAchieved(
        newCurrentValue,
        newTargetValue,
        direction,
      );
      if (achieved) {
        updatedStatus = "achieved";
      } else if (goal.status === "achieved" && !achieved && !args.status) {
        updatedStatus = "in_progress";
      }
    }

    const patch: Partial<typeof goal> = {
      updatedAt: Date.now(),
      status: updatedStatus,
    };

    if (args.currentValue !== undefined) {
      patch.currentValue = args.currentValue;
    }

    if (args.actionPlanNotes !== undefined) {
      patch.actionPlanNotes = sanitizeOptionalText(
        args.actionPlanNotes,
        2000,
        "Action plan notes",
      );
    }

    // Coaches/Admins can modify structural goal parameters
    if (isCoachOrAdmin) {
      if (args.title !== undefined) {
        patch.title = sanitizeString(args.title, 120, "Title");
      }
      if (args.baselineValue !== undefined) {
        patch.baselineValue = args.baselineValue;
      }
      if (args.targetValue !== undefined) {
        patch.targetValue = args.targetValue;
      }
      if (args.unit !== undefined) {
        patch.unit = sanitizeOptionalString(args.unit, 30, "Unit");
      }
      if (args.optimizationDirection !== undefined) {
        patch.optimizationDirection = args.optimizationDirection;
      }
      if (args.targetDate !== undefined) {
        patch.targetDate = args.targetDate;
      }
    }

    await ctx.db.patch("athleteGoals", args.goalId, patch);

    logAction("athleteGoal:update", {
      userId: user._id,
      goalId: args.goalId,
      status: updatedStatus,
      currentValue: newCurrentValue,
    });

    return args.goalId;
  },
});

/**
 * Delete an IDP goal. Accessible to coaching/management roles.
 */
export const deleteAthleteGoal = mutation({
  args: { goalId: v.id("athleteGoals") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [
      "platform_admin",
      "academy_admin",
      "sporting_director",
      "coach",
    ]);

    const goal = await ctx.db.get("athleteGoals", args.goalId);
    if (!goal) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete goal not found",
      });
    }

    await requireAcademyMember(ctx, goal.academyId);

    await ctx.db.delete("athleteGoals", args.goalId);

    logAction("athleteGoal:delete", {
      userId: user._id,
      academyId: goal.academyId,
      goalId: args.goalId,
    });

    return null;
  },
});
