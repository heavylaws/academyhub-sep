import { describe, expect, it } from "vitest";
import {
  clampCoordinate,
  normalizeCoordinate,
  validateTacticalPlan,
  interpolateTacticalPositions,
  createDefaultTacticalPlan,
  type TacticalPlan,
  type TacticalPhase,
} from "@/domain/tactics/tactical-domain.ts";

describe("Phase 5: CoachTactics Tactical Board & Domain Model Suite", () => {
  describe("1. Coordinate Normalization & Bounds Enforcement", () => {
    it("clamps coordinates safely to pitch boundary [0, 100]", () => {
      expect(clampCoordinate(-15)).toBe(0);
      expect(clampCoordinate(125)).toBe(100);
      expect(clampCoordinate(50.456)).toBe(50.46);
      expect(clampCoordinate(NaN)).toBe(50);
    });

    it("normalizes malformed coordinate objects without throwing", () => {
      const c1 = normalizeCoordinate({ x: -10, y: 110 });
      expect(c1.x).toBe(0);
      expect(c1.y).toBe(100);

      const c2 = normalizeCoordinate(null);
      expect(c2.x).toBe(50);
      expect(c2.y).toBe(50);

      const c3 = normalizeCoordinate({ x: "invalid", y: undefined });
      expect(c3.x).toBe(50);
      expect(c3.y).toBe(50);
    });
  });

  describe("2. Tactical Plan Domain Validation", () => {
    it("validates a standard tactical plan and normalizes safely", () => {
      const defaultPlan = createDefaultTacticalPlan("High Press & Counter Attack");
      const result = validateTacticalPlan(defaultPlan);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.normalizedPlan).toBeDefined();
      expect(result.normalizedPlan?.title).toBe("High Press & Counter Attack");
      expect(result.normalizedPlan?.phases.length).toBeGreaterThanOrEqual(1);
    });

    it("detects missing title or empty phases", () => {
      const invalidPlan1 = {
        title: "",
        phases: [],
      };
      const res1 = validateTacticalPlan(invalidPlan1);
      expect(res1.valid).toBe(false);
      expect(res1.errors.some((e) => e.includes("title"))).toBe(true);
      expect(res1.errors.some((e) => e.includes("phase"))).toBe(true);
    });

    it("detects duplicate player identifiers in the same phase and normalizes", () => {
      const planWithDupPlayers = {
        title: "Duplicated Players Drill",
        phases: [
          {
            phaseNumber: 1,
            title: "Phase 1",
            durationSeconds: 5,
            players: [
              { id: "player_dup", team: "home", number: 9, position: { x: 50, y: 50 } },
              { id: "player_dup", team: "home", number: 10, position: { x: 60, y: 60 } },
            ],
            ball: { x: 50, y: 50 },
            equipment: [],
            annotations: [],
          },
        ],
      };

      const result = validateTacticalPlan(planWithDupPlayers);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("Duplicate player ID"))).toBe(true);
      // But normalization provides unique IDs
      expect(result.normalizedPlan?.phases[0].players[0].id).not.toBe(
        result.normalizedPlan?.phases[0].players[1].id,
      );
    });

    it("normalizes out-of-range phase duration to safe limits [1..300]", () => {
      const planWithBadDuration = {
        title: "Duration Test Drill",
        phases: [
          {
            phaseNumber: 1,
            title: "Phase 1",
            durationSeconds: 9999, // Out of bounds
            players: [{ id: "p1", team: "home", position: { x: 20, y: 20 } }],
            ball: { x: 20, y: 20 },
            equipment: [],
            annotations: [],
          },
        ],
      };

      const result = validateTacticalPlan(planWithBadDuration);
      expect(result.valid).toBe(true);
      expect(result.warnings.some((w) => w.includes("duration"))).toBe(true);
      expect(result.normalizedPlan?.phases[0].durationSeconds).toBe(300);
    });

    it("normalizes pitch type and sanitizes annotations and equipment", () => {
      const raw = {
        title: "Rondo Warmup",
        pitchType: "rondo_grid",
        phases: [
          {
            phaseNumber: 1,
            title: "Grid",
            durationSeconds: 3,
            players: [{ id: "p1", team: "home", position: { x: 10, y: 10 } }],
            ball: { x: 10, y: 10 },
            equipment: [
              { id: "eq1", type: "cone", position: { x: 105, y: -5 } }, // Out of bounds
            ],
            annotations: [
              {
                id: "ann1",
                type: "pass_line",
                points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
                color: "#60A5FA",
                width: 2,
              },
            ],
          },
        ],
      };

      const result = validateTacticalPlan(raw);
      expect(result.valid).toBe(true);
      expect(result.normalizedPlan?.pitchType).toBe("rondo_grid");
      expect(result.normalizedPlan?.phases[0].equipment[0].position.x).toBe(100);
      expect(result.normalizedPlan?.phases[0].equipment[0].position.y).toBe(0);
      expect(result.normalizedPlan?.phases[0].annotations[0].type).toBe("pass_line");
    });
  });

  describe("3. Multi-Phase Animation & Linear Interpolation Math", () => {
    const phaseA: TacticalPhase = {
      id: "pA",
      phaseNumber: 1,
      title: "Phase A",
      durationSeconds: 4,
      players: [
        {
          id: "striker",
          team: "home",
          number: 9,
          role: "ST",
          label: "Striker",
          position: { x: 50, y: 50 },
          targetPosition: { x: 70, y: 30 }, // Moving toward penalty area
        },
      ],
      ball: { x: 50, y: 50 },
      equipment: [],
      annotations: [],
    };

    const phaseB: TacticalPhase = {
      id: "pB",
      phaseNumber: 2,
      title: "Phase B",
      durationSeconds: 4,
      players: [
        {
          id: "striker",
          team: "home",
          number: 9,
          role: "ST",
          label: "Striker",
          position: { x: 70, y: 30 },
        },
      ],
      ball: { x: 70, y: 30 },
      equipment: [],
      annotations: [],
    };

    it("interpolates player and ball at t = 0 to exact start positions", () => {
      const state = interpolateTacticalPositions(phaseA, phaseB, 0.0);
      expect(state.players[0].x).toBe(50);
      expect(state.players[0].y).toBe(50);
      expect(state.ball.x).toBe(50);
      expect(state.ball.y).toBe(50);
    });

    it("interpolates player and ball at t = 0.5 to exact midpoint", () => {
      const state = interpolateTacticalPositions(phaseA, phaseB, 0.5);
      // (50 + 70) / 2 = 60
      expect(state.players[0].x).toBe(60);
      // (50 + 30) / 2 = 40
      expect(state.players[0].y).toBe(40);
      expect(state.ball.x).toBe(60);
      expect(state.ball.y).toBe(40);
    });

    it("interpolates player and ball at t = 1.0 to exact end positions", () => {
      const state = interpolateTacticalPositions(phaseA, phaseB, 1.0);
      expect(state.players[0].x).toBe(70);
      expect(state.players[0].y).toBe(30);
      expect(state.ball.x).toBe(70);
      expect(state.ball.y).toBe(30);
    });

    it("safely handles t out of bounds by clamping [0, 1]", () => {
      const under = interpolateTacticalPositions(phaseA, phaseB, -0.5);
      expect(under.players[0].x).toBe(50);

      const over = interpolateTacticalPositions(phaseA, phaseB, 1.8);
      expect(over.players[0].x).toBe(70);
    });
  });

  describe("4. Default Tactical Plan Generation", () => {
    it("generates a rich tactical setup with opposing teams, ball possession, cones, and annotations", () => {
      const plan = createDefaultTacticalPlan("Positional Play & Overloads");
      expect(plan.phases.length).toBe(2);

      const p1 = plan.phases[0];
      // Has home and away players
      expect(p1.players.some((p) => p.team === "home")).toBe(true);
      expect(p1.players.some((p) => p.team === "away")).toBe(true);
      expect(p1.players.some((p) => p.team === "gk_home")).toBe(true);

      // Has ball attached
      expect(p1.ball.attachedPlayerId).toBeTruthy();

      // Has equipment
      expect(p1.equipment.length).toBeGreaterThan(0);

      // Has tactical annotations
      expect(p1.annotations.length).toBeGreaterThan(0);
      expect(p1.annotations.some((a) => a.type === "pass_line")).toBe(true);
      expect(p1.annotations.some((a) => a.type === "run_arrow")).toBe(true);
    });
  });
});
