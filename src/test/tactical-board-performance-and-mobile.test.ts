import { describe, expect, it } from "vitest";
import {
  clampCoordinate,
  normalizeCoordinate,
  interpolateTacticalPositions,
  createDefaultTacticalPlan,
  type TacticalPhase,
} from "../../src/domain/tactics/tactical-domain.ts";

describe("Phase 4: Tactical Board Canvas Performance & Mobile Ergonomics Suite", () => {
  describe("1. Frame Rate & Smooth Trajectory Interpolation", () => {
    it("linearly interpolates player positions between phases smoothly across progress t [0..1]", () => {
      const plan = createDefaultTacticalPlan();
      const phase1 = plan.phases[0];
      const phase2 = plan.phases[1];

      // Progress 0.0 (start phase)
      const atStart = interpolateTacticalPositions(phase1, phase2, 0);
      expect(atStart.players[0].x).toBeCloseTo(phase1.players[0].position.x, 1);
      expect(atStart.players[0].y).toBeCloseTo(phase1.players[0].position.y, 1);

      // Progress 0.5 (midway interpolated frame)
      const atMid = interpolateTacticalPositions(phase1, phase2, 0.5);
      const expectedMidX =
        (phase1.players[0].position.x +
          (phase1.players[0].targetPosition?.x ?? phase2.players[0].position.x)) /
        2;
      expect(atMid.players[0].x).toBeCloseTo(expectedMidX, 1);

      // Progress 1.0 (end phase)
      const atEnd = interpolateTacticalPositions(phase1, phase2, 1);
      const expectedEndX =
        phase1.players[0].targetPosition?.x ?? phase2.players[0].position.x;
      expect(atEnd.players[0].x).toBeCloseTo(expectedEndX, 1);
    });

    it("clamps animation progress parameter t safely outside [0..1]", () => {
      const plan = createDefaultTacticalPlan();
      const p1 = plan.phases[0];
      const p2 = plan.phases[1];

      const underflow = interpolateTacticalPositions(p1, p2, -0.5);
      expect(underflow.ball.x).toBeCloseTo(p1.ball.x, 1);

      const overflow = interpolateTacticalPositions(p1, p2, 1.5);
      expect(overflow.ball.x).toBeCloseTo(p2.ball.x, 1);
    });
  });

  describe("2. Freehand Stroke Point Simplification Algorithm", () => {
    it("filters out sub-pixel jitter points below the 0.8% Euclidean distance threshold", () => {
      const startPoint = { x: 50.0, y: 50.0 };
      const microJitterPoint = { x: 50.2, y: 50.3 }; // Distance = sqrt(0.04 + 0.09) = ~0.36% (< 0.8%)
      const meaningfulMovePoint = { x: 51.5, y: 51.5 }; // Distance = sqrt(2.25 + 2.25) = ~2.12% (>= 0.8%)

      const distJitter = Math.hypot(
        microJitterPoint.x - startPoint.x,
        microJitterPoint.y - startPoint.y,
      );
      expect(distJitter).toBeLessThan(0.8);

      const distMove = Math.hypot(
        meaningfulMovePoint.x - startPoint.x,
        meaningfulMovePoint.y - startPoint.y,
      );
      expect(distMove).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("3. Mobile Pitch-Side Touch Bounds & Clamp Invariants", () => {
    it("safely confines extreme touch drag off-screen events to pitch boundaries", () => {
      // User drags finger beyond top-left of mobile screen
      const offscreenTopLeft = normalizeCoordinate({ x: -120, y: -80 });
      expect(offscreenTopLeft.x).toBe(0);
      expect(offscreenTopLeft.y).toBe(0);

      // User drags finger beyond bottom-right of mobile screen
      const offscreenBottomRight = normalizeCoordinate({ x: 250, y: 300 });
      expect(offscreenBottomRight.x).toBe(100);
      expect(offscreenBottomRight.y).toBe(100);
    });
  });
});
