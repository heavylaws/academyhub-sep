import { describe, expect, it } from "vitest";
import {
  synthesizeTacticalDrill,
  type AgeGroup,
  type TacticalCategory,
} from "@/services/tactical-ai-service.ts";
import { validateTacticalPlan } from "@/domain/tactics/tactical-domain.ts";

describe("Phase 6: CoachTactics AI Drill Designer & Tactical Assistant Pipeline Suite", () => {
  describe("1. Multi-Age Group Synthesis & Birth Year Mapping", () => {
    const ageGroups: Array<{ age: AgeGroup; expectedBirthYears: string }> = [
      { age: "U6-U8", expectedBirthYears: "2018–2020" },
      { age: "U9-U10", expectedBirthYears: "2016–2017" },
      { age: "U11-U12", expectedBirthYears: "2014–2015" },
      { age: "U13-U14", expectedBirthYears: "2012–2013" },
      { age: "U15-U16", expectedBirthYears: "2011" },
    ];

    it.each(ageGroups)(
      "synthesizes appropriate drill for $age with birth years $expectedBirthYears",
      ({ age, expectedBirthYears }) => {
        const response = synthesizeTacticalDrill({
          ageGroup: age,
          category: "tactical_possession",
        });

        expect(response.drill.ageGroup).toBe(age);
        expect(response.drill.birthYears).toBe(expectedBirthYears);
        expect(response.drill.title).toContain(age);
        expect(response.validationResult.valid).toBe(true);
      },
    );
  });

  describe("2. Tactical Category Synthesis & Pitch Setup", () => {
    it("synthesizes a directional rondo with central and boundary jokers", () => {
      const response = synthesizeTacticalDrill({
        ageGroup: "U11-U12",
        category: "passing_rondos",
      });

      expect(response.drill.category).toBe("passing_rondos");
      expect(response.tacticalPlan.pitchType).toBe("rondo_grid");
      expect(response.tacticalPlan.phases.length).toBeGreaterThanOrEqual(1);

      const p1 = response.tacticalPlan.phases[0];
      // Has home players, away players, and neutral jokers
      expect(p1.players.some((p) => p.team === "home")).toBe(true);
      expect(p1.players.some((p) => p.team === "away")).toBe(true);
      expect(p1.players.some((p) => p.team === "neutral")).toBe(true);

      // Has disc cones marking the grid
      expect(p1.equipment.some((eq) => eq.type === "cone")).toBe(true);
      expect(response.validationResult.valid).toBe(true);
    });

    it("synthesizes an overlapping wide cross and box finish scenario", () => {
      const response = synthesizeTacticalDrill({
        ageGroup: "U15-U16",
        category: "finishing_crossing",
      });

      expect(response.drill.category).toBe("finishing_crossing");
      expect(response.tacticalPlan.pitchType).toBe("attacking_half");

      const p1 = response.tacticalPlan.phases[0];
      // Has winger and overlapping fullback
      expect(p1.players.some((p) => p.role === "RW" || p.role === "WNG")).toBe(true);
      expect(p1.players.some((p) => p.role === "RB" || p.role === "FB")).toBe(true);
      expect(p1.players.some((p) => p.role === "GK")).toBe(true);

      // Has running and crossing annotations
      expect(p1.annotations.some((a) => a.type === "run_arrow")).toBe(true);
      expect(p1.annotations.some((a) => a.type === "pass_line")).toBe(true);
      expect(response.validationResult.valid).toBe(true);
    });

    it("synthesizes a 3v2 counter-attacking transition scenario", () => {
      const response = synthesizeTacticalDrill({
        ageGroup: "U13-U14",
        category: "counter_attack",
      });

      expect(response.drill.category).toBe("counter_attack");
      const p1 = response.tacticalPlan.phases[0];
      expect(p1.players.filter((p) => p.team === "home").length).toBe(3);
      expect(p1.players.filter((p) => p.team === "away").length).toBe(2);
      expect(response.validationResult.valid).toBe(true);
    });

    it("synthesizes agility transition with agility poles and mini-goals", () => {
      const response = synthesizeTacticalDrill({
        ageGroup: "U9-U10",
        category: "agility_transitions",
      });

      expect(response.drill.category).toBe("agility_transitions");
      const p1 = response.tacticalPlan.phases[0];
      expect(p1.equipment.some((eq) => eq.type === "agility_pole")).toBe(true);
      expect(p1.equipment.some((eq) => eq.type === "mini_goal")).toBe(true);
      expect(response.validationResult.valid).toBe(true);
    });

    it("synthesizes 1v1 ball mastery with feint annotations and cones", () => {
      const response = synthesizeTacticalDrill({
        ageGroup: "U6-U8",
        category: "ball_mastery",
      });

      expect(response.drill.category).toBe("ball_mastery");
      const p1 = response.tacticalPlan.phases[0];
      expect(p1.annotations.some((a) => a.type === "dribble_wave")).toBe(true);
      expect(response.validationResult.valid).toBe(true);
    });
  });

  describe("3. Strict Tactical Domain Model Validation", () => {
    it("ensures all synthesized plans pass validateTacticalPlan without errors", () => {
      const categories: TacticalCategory[] = [
        "ball_mastery",
        "passing_rondos",
        "tactical_possession",
        "finishing_crossing",
        "agility_transitions",
        "counter_attack",
      ];

      for (const cat of categories) {
        const response = synthesizeTacticalDrill({
          ageGroup: "U13-U14",
          category: cat,
          promptNotes: "Fast tempo decision making",
        });

        const validation = validateTacticalPlan(response.tacticalPlan);
        expect(validation.valid).toBe(true);
        expect(validation.errors).toHaveLength(0);

        // Verify player positions are bounded within [0, 100]
        response.tacticalPlan.phases.forEach((phase) => {
          phase.players.forEach((p) => {
            expect(p.position.x).toBeGreaterThanOrEqual(0);
            expect(p.position.x).toBeLessThanOrEqual(100);
            expect(p.position.y).toBeGreaterThanOrEqual(0);
            expect(p.position.y).toBeLessThanOrEqual(100);
          });

          // Verify ball is in bounds
          expect(phase.ball.x).toBeGreaterThanOrEqual(0);
          expect(phase.ball.x).toBeLessThanOrEqual(100);
          expect(phase.ball.y).toBeGreaterThanOrEqual(0);
          expect(phase.ball.y).toBeLessThanOrEqual(100);

          // Verify equipment is in bounds
          phase.equipment.forEach((eq) => {
            expect(eq.position.x).toBeGreaterThanOrEqual(0);
            expect(eq.position.x).toBeLessThanOrEqual(100);
            expect(eq.position.y).toBeGreaterThanOrEqual(0);
            expect(eq.position.y).toBeLessThanOrEqual(100);
          });
        });
      }
    });
  });

  describe("4. Drill Metadata Completeness & Prescriptions", () => {
    it("provides complete coaching metadata suitable for individual training plan assignment", () => {
      const response = synthesizeTacticalDrill({
        ageGroup: "U15-U16",
        category: "tactical_possession",
        difficulty: "Advanced",
        targetAttribute: "Tactical",
      });

      const { drill } = response;
      expect(drill.title.length).toBeGreaterThan(5);
      expect(drill.summary.length).toBeGreaterThan(20);
      expect(drill.setup.length).toBeGreaterThan(15);
      expect(drill.instructions.length).toBeGreaterThanOrEqual(3);
      expect(drill.coachingPoints.length).toBeGreaterThanOrEqual(3);
      expect(drill.durationMinutes).toBeGreaterThan(0);
      expect(drill.recommendedSets).toBeGreaterThan(0);
      expect(drill.recommendedReps).toBeGreaterThan(0);
      expect(drill.metricName).toBeTruthy();
      expect(drill.benchmark).toBeGreaterThan(0);
      expect(drill.targetAttribute).toBe("Tactical");
    });
  });
});
