import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.ts";
import { modules } from "./test.setup.ts";
import { api } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";

type T = ReturnType<typeof convexTest>;
const now = new Date().toISOString();

function as(t: T, userId: Id<"users">) {
  return t.withIdentity({ subject: `${userId}|session` });
}

async function seedPipelineEnvironment(t: T) {
  return await t.run(async (ctx) => {
    const academyId = await ctx.db.insert("academies", {
      name: "Olympic Biomechanics Academy",
      slug: "olympic-biomechanics",
      status: "active",
      createdAt: now,
    });

    const rivalAcademyId = await ctx.db.insert("academies", {
      name: "Rival Training Centre",
      slug: "rival-training",
      status: "active",
      createdAt: now,
    });

    const sportingDirectorId = await ctx.db.insert("users", {
      email: "director@olympic.test",
      name: "Dr. Biomechanics Director",
      emailVerificationTime: Date.now(),
      role: "sporting_director",
      academyId,
    });

    const coachId = await ctx.db.insert("users", {
      email: "coach@olympic.test",
      name: "Head Coach Sprint",
      emailVerificationTime: Date.now(),
      role: "coach",
      academyId,
    });

    const rivalCoachId = await ctx.db.insert("users", {
      email: "coach@rival.test",
      name: "Rival Coach",
      emailVerificationTime: Date.now(),
      role: "coach",
      academyId: rivalAcademyId,
    });

    const athleteUserId = await ctx.db.insert("users", {
      email: "athlete@olympic.test",
      name: "Marcus Sprint",
      emailVerificationTime: Date.now(),
      role: "athlete",
      academyId,
    });

    const athleteId = await ctx.db.insert("athletes", {
      academyId,
      userId: athleteUserId,
      firstName: "Marcus",
      lastName: "Sprint",
      gender: "male",
      dateOfBirth: "2008-05-12",
      status: "active",
      createdBy: sportingDirectorId,
      createdAt: now,
    });

    const storageId = await ctx.storage.store(new Blob(["video-dummy-content"]));

    return {
      academyId,
      rivalAcademyId,
      sportingDirectorId,
      coachId,
      rivalCoachId,
      athleteUserId,
      athleteId,
      storageId,
    };
  });
}

describe("Phase 5: Resilient AI Video Biomechanics Pipeline & Corrective Drill Linking", () => {
  it("creates video analysis document with structured biomechanics telemetry", async () => {
    const t = convexTest(schema, modules);
    const env = await seedPipelineEnvironment(t);

    const analysisId = await t.run(async (ctx) => {
      return await ctx.db.insert("videoAnalyses", {
        academyId: env.academyId,
        athleteId: env.athleteId,
        storageId: env.storageId,
        filename: "sprint_acceleration_drive_phase.mp4",
        context: "10m to 20m sprint acceleration transition",
        status: "complete",
        requestedAt: now,
        completedAt: now,
        createdBy: env.coachId,
        retryCount: 0,
        structuredTelemetry: {
          overallBiomechanicsScore: 84,
          keyframeObservations: [
            {
              timestampSec: 0.15,
              phase: "Initial Ground Strike",
              observation: "Optimal projection angle of 44 degrees preserved.",
              riskLevel: "low",
            },
            {
              timestampSec: 0.45,
              phase: "Mid-Stance Load Absorption",
              observation: "Dynamic knee valgus exceeded safe boundary by 5 degrees.",
              riskLevel: "moderate",
            },
          ],
          jointAngles: [
            {
              jointName: "Knee Valgus",
              measuredAngleDeg: 12,
              idealRangeDeg: "0° - 6°",
              deviationStatus: "critical",
            },
            {
              jointName: "Drive Shin Angle",
              measuredAngleDeg: 45,
              idealRangeDeg: "42° - 48°",
              deviationStatus: "optimal",
            },
          ],
          detectedFlaws: [
            "Excessive knee valgus under dynamic deceleration",
            "Slight contralateral hip drop during load phase",
          ],
          recommendedCorrectiveDrills: [
            {
              name: "Single-Leg Deceleration & Stick",
              sets: 3,
              reps: "8 reps/side",
              focusArea: "Eccentric Knee Stability & Valgus Prevention",
              coachingCue: "Absorb through midfoot, knee tracks strictly over 2nd toe",
            },
            {
              name: "Band-Resisted Spanish Squats",
              sets: 3,
              reps: "10 reps",
              focusArea: "Quad Tendon Loading & Tibiofemoral Alignment",
              coachingCue: "Vertical shins, 3s isometric hold at bottom",
            },
          ],
        },
      });
    });

    const analyses = await as(t, env.coachId).query(
      api.videoAnalyses.listAnalysesForAthlete,
      { athleteId: env.athleteId },
    );

    expect(analyses).toHaveLength(1);
    expect(analyses[0]._id).toBe(analysisId);
    expect(analyses[0].structuredTelemetry).toBeDefined();
    expect(analyses[0].structuredTelemetry?.overallBiomechanicsScore).toBe(84);
    expect(analyses[0].structuredTelemetry?.jointAngles).toHaveLength(2);
    expect(analyses[0].structuredTelemetry?.recommendedCorrectiveDrills).toHaveLength(2);
  });

  it("applies corrective drills to plan: creates new plan when targetPlanId is omitted", async () => {
    const t = convexTest(schema, modules);
    const env = await seedPipelineEnvironment(t);

    const analysisId = await t.run(async (ctx) => {
      return await ctx.db.insert("videoAnalyses", {
        academyId: env.academyId,
        athleteId: env.athleteId,
        storageId: env.storageId,
        filename: "landing_mechanics.mp4",
        context: "Countermovement Jump Landing Assessment",
        status: "complete",
        requestedAt: now,
        completedAt: now,
        createdBy: env.coachId,
        structuredTelemetry: {
          overallBiomechanicsScore: 72,
          keyframeObservations: [
            {
              timestampSec: 0.8,
              phase: "Landing",
              observation: "Stiff landing with dominant quad absorption.",
              riskLevel: "moderate",
            },
          ],
          jointAngles: [
            {
              jointName: "Landing Knee Flexion",
              measuredAngleDeg: 62,
              idealRangeDeg: "80° - 90°",
              deviationStatus: "suboptimal",
            },
          ],
          detectedFlaws: ["Stiff landing mechanics with high impact loading"],
          recommendedCorrectiveDrills: [
            {
              name: "Depth Drop to Athletic Stick",
              sets: 4,
              reps: "6 reps",
              focusArea: "Eccentric Deceleration & Impact Attenuation",
              coachingCue: "Land as soft as a feather, hips back",
            },
            {
              name: "Single-Leg RDL with Pause",
              sets: 3,
              reps: "8 reps",
              focusArea: "Posterior Chain Hamstring Recruitment",
              coachingCue: "Flat spine, squeeze glute at top",
            },
          ],
        },
      });
    });

    const result = await as(t, env.sportingDirectorId).mutation(
      api.videoAnalyses.applyCorrectiveDrillsToPlan,
      { analysisId },
    );

    expect(result.addedDrillsCount).toBe(2);
    expect(result.planId).toBeDefined();

    // Verify the new plan was created correctly
    await t.run(async (ctx) => {
      const plan = await ctx.db.get("trainingPlans", result.planId);
      expect(plan).toBeDefined();
      expect(plan?.athleteId).toBe(env.athleteId);
      expect(plan?.phase).toBe("rehab_return_to_play");
      expect(plan?.title).toContain("AI Biomechanics Corrective Plan");

      const items = await ctx.db
        .query("planItems")
        .withIndex("by_plan", (q) => q.eq("planId", result.planId))
        .collect();
      expect(items).toHaveLength(2);
      expect(items[0].name).toBe("Depth Drop to Athletic Stick");
      expect(items[0].sets).toBe(4);
      expect(items[0].reps).toBe(6);

      // Verify analysis document was patched with link
      const updatedAnalysis = await ctx.db.get("videoAnalyses", analysisId);
      expect(updatedAnalysis?.appliedToPlanId).toBe(result.planId);
      expect(updatedAnalysis?.appliedAt).toBeDefined();
    });
  });

  it("applies corrective drills to existing active plan without duplicate exercise names", async () => {
    const t = convexTest(schema, modules);
    const env = await seedPipelineEnvironment(t);

    const { existingPlanId, analysisId } = await t.run(async (ctx) => {
      const planId = await ctx.db.insert("trainingPlans", {
        academyId: env.academyId,
        athleteId: env.athleteId,
        title: "Sprint Development Phase 1",
        status: "active",
        phase: "in_season_early",
        createdBy: env.coachId,
        createdAt: now,
      });

      // Existing drill with the same name as one of the recommended drills
      await ctx.db.insert("planItems", {
        planId,
        academyId: env.academyId,
        order: 0,
        name: "Single-Leg Deceleration & Stick",
        sets: 2,
        reps: 5,
      });

      const aId = await ctx.db.insert("videoAnalyses", {
        academyId: env.academyId,
        athleteId: env.athleteId,
        storageId: env.storageId,
        filename: "sprint_video.mp4",
        status: "complete",
        requestedAt: now,
        createdBy: env.coachId,
        structuredTelemetry: {
          overallBiomechanicsScore: 80,
          keyframeObservations: [],
          jointAngles: [],
          detectedFlaws: [],
          recommendedCorrectiveDrills: [
            // Should be skipped as duplicate
            {
              name: "Single-Leg Deceleration & Stick",
              sets: 3,
              reps: "8 reps",
              focusArea: "Knee Stability",
              coachingCue: "Soft knee landing",
            },
            // Should be appended
            {
              name: "Band-Resisted Spanish Squats",
              sets: 3,
              reps: "10 reps",
              focusArea: "Quad Tendon",
              coachingCue: "Vertical shins",
            },
          ],
        },
      });

      return { existingPlanId: planId, analysisId: aId };
    });

    const result = await as(t, env.coachId).mutation(
      api.videoAnalyses.applyCorrectiveDrillsToPlan,
      {
        analysisId,
        targetPlanId: existingPlanId,
      },
    );

    // Only 1 new drill should be appended (duplicate was skipped)
    expect(result.addedDrillsCount).toBe(1);
    expect(result.planId).toBe(existingPlanId);

    await t.run(async (ctx) => {
      const items = await ctx.db
        .query("planItems")
        .withIndex("by_plan", (q) => q.eq("planId", existingPlanId))
        .collect();
      expect(items).toHaveLength(2);
      expect(items.map((i) => i.name)).toContain("Single-Leg Deceleration & Stick");
      expect(items.map((i) => i.name)).toContain("Band-Resisted Spanish Squats");
    });
  });

  it("retries a failed analysis, increments retryCount, and clears error telemetry", async () => {
    const t = convexTest(schema, modules);
    const env = await seedPipelineEnvironment(t);

    const analysisId = await t.run(async (ctx) => {
      return await ctx.db.insert("videoAnalyses", {
        academyId: env.academyId,
        athleteId: env.athleteId,
        storageId: env.storageId,
        filename: "failed_upload.mp4",
        status: "failed",
        requestedAt: now,
        createdBy: env.coachId,
        retryCount: 1,
        errorMessage: "Network timeout while streaming frames",
        lastError: "Network timeout while streaming frames",
      });
    });

    const retryResult = await as(t, env.coachId).mutation(
      api.videoAnalyses.retryVideoAnalysis,
      { analysisId },
    );

    expect(retryResult.success).toBe(true);
    expect(retryResult.retryCount).toBe(2);

    await t.run(async (ctx) => {
      const updated = await ctx.db.get("videoAnalyses", analysisId);
      expect(updated?.status).toBe("processing");
      expect(updated?.retryCount).toBe(2);
      expect(updated?.errorMessage).toBeUndefined();
      expect(updated?.lastError).toBeUndefined();
    });
  });

  it("strictly enforces RBAC and tenant isolation on corrective drill linking and retry", async () => {
    const t = convexTest(schema, modules);
    const env = await seedPipelineEnvironment(t);

    const analysisId = await t.run(async (ctx) => {
      return await ctx.db.insert("videoAnalyses", {
        academyId: env.academyId,
        athleteId: env.athleteId,
        storageId: env.storageId,
        filename: "test_security.mp4",
        status: "complete",
        requestedAt: now,
        createdBy: env.coachId,
        structuredTelemetry: {
          overallBiomechanicsScore: 85,
          keyframeObservations: [],
          jointAngles: [],
          detectedFlaws: [],
          recommendedCorrectiveDrills: [
            {
              name: "Wall Ankle Mobilization",
              sets: 3,
              reps: "10 reps",
              focusArea: "Dorsiflexion",
              coachingCue: "Knee over toe",
            },
          ],
        },
      });
    });

    // 1. Athlete cannot apply corrective drills to plans (coaching privilege required)
    await expect(
      as(t, env.athleteUserId).mutation(
        api.videoAnalyses.applyCorrectiveDrillsToPlan,
        { analysisId },
      ),
    ).rejects.toThrow();

    // 2. Athlete cannot trigger video analysis retry
    await expect(
      as(t, env.athleteUserId).mutation(
        api.videoAnalyses.retryVideoAnalysis,
        { analysisId },
      ),
    ).rejects.toThrow();

    // 3. Rival academy coach cannot apply drills to Olympic Academy athlete
    await expect(
      as(t, env.rivalCoachId).mutation(
        api.videoAnalyses.applyCorrectiveDrillsToPlan,
        { analysisId },
      ),
    ).rejects.toThrow();

    // 4. Rival academy coach cannot retry Olympic Academy analysis
    await expect(
      as(t, env.rivalCoachId).mutation(
        api.videoAnalyses.retryVideoAnalysis,
        { analysisId },
      ),
    ).rejects.toThrow();
  });
});
