import { defineTable } from "convex/server";
import { v } from "convex/values";

export const workoutLogs = defineTable({
  academyId: v.id("academies"),
  athleteId: v.id("athletes"),
  trainingPlanId: v.id("trainingPlans"),
  completedAt: v.number(), // Unix ms
  durationMinutes: v.number(),
  rpe: v.number(), // 1–10
  calculatedLoad: v.number(), // durationMinutes * rpe
  completedExercises: v.array(
    v.object({
      exerciseName: v.string(),
      setsCompleted: v.number(),
      repsCompleted: v.string(),
      weightKg: v.optional(v.number()),
    }),
  ),
  athleteNotes: v.optional(v.string()),
  loggedByUserId: v.id("users"),
})
  .index("by_athlete_and_date", ["athleteId", "completedAt"])
  .index("by_plan", ["trainingPlanId"])
  .index("by_academy", ["academyId"]);
