import { describe, expect, it } from "vitest";
import {
  clampCoord,
  normalizeCoord,
  validateServerTacticalPlan,
  type TacticalPlan,
} from "../../convex/lib/tacticalValidation.ts";

describe("Phase 2: Server-Side Tactical Validation & Convex Authority Suite", () => {
  describe("1. Coordinate Clamping & Normalization Invariants", () => {
    it("safely clamps negative and out-of-bounds coordinates to [0, 100]", () => {
      expect(clampCoord(-25)).toBe(0);
      expect(clampCoord(145)).toBe(100);
      expect(clampCoord(48.234)).toBe(48.23);
      expect(clampCoord(NaN)).toBe(50);
    });

    it("normalizes malformed coordinate payloads to default safe values", () => {
      const c1 = normalizeCoord(null);
      expect(c1).toEqual({ x: 50, y: 50 });

      const c2 = normalizeCoord({ x: -10, y: 150 });
      expect(c2).toEqual({ x: 0, y: 100 });

      const c3 = normalizeCoord({ x: "invalid", y: "bad" });
      expect(c3).toEqual({ x: 50, y: 50 });
    });
  });

  describe("2. Server Tactical Plan Validation Invariants", () => {
    it("rejects non-object or null input", () => {
      const res = validateServerTacticalPlan(null);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain("expected a JSON object");
    });

    it("rejects plan with missing or whitespace-only title", () => {
      const res = validateServerTacticalPlan({
        title: "   ",
        phases: [{ phaseNumber: 1, players: [], ball: { x: 50, y: 50 }, equipment: [], annotations: [] }],
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("title"))).toBe(true);
    });

    it("rejects plan with empty phases array", () => {
      const res = validateServerTacticalPlan({
        title: "Empty Phases Routine",
        phases: [],
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("at least one tactical phase"))).toBe(true);
    });

    it("detects and flags duplicate player identifiers within a single phase", () => {
      const res = validateServerTacticalPlan({
        title: "Duplicate IDs Routine",
        pitchType: "full",
        phases: [
          {
            phaseNumber: 1,
            title: "Phase 1",
            durationSeconds: 5,
            players: [
              { id: "duplicate_id", team: "home", number: 9, position: { x: 40, y: 40 } },
              { id: "duplicate_id", team: "away", number: 4, position: { x: 60, y: 60 } },
            ],
            ball: { x: 50, y: 50 },
            equipment: [],
            annotations: [],
          },
        ],
      });

      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("Duplicate player ID 'duplicate_id'"))).toBe(true);
      // Normalized plan generates unique IDs for safety
      expect(res.normalizedPlan?.phases[0].players[0].id).not.toBe(
        res.normalizedPlan?.phases[0].players[1].id,
      );
    });

    it("clamps out-of-bounds phase duration to safe bounds [1..300]", () => {
      const res = validateServerTacticalPlan({
        title: "Duration Clamp Routine",
        pitchType: "full",
        phases: [
          {
            phaseNumber: 1,
            title: "Phase 1",
            durationSeconds: 99999, // Exceeds 300
            players: [{ id: "p1", team: "home", number: 1, position: { x: 10, y: 50 } }],
            ball: { x: 10, y: 50 },
            equipment: [],
            annotations: [],
          },
        ],
      });

      expect(res.warnings.some((w) => w.includes("duration"))).toBe(true);
      expect(res.normalizedPlan?.phases[0].durationSeconds).toBe(300);
    });

    it("successfully validates and normalizes a multi-phase soccer tactical drill", () => {
      const validDrill: Partial<TacticalPlan> = {
        title: "4-3-3 Attacking Transition",
        category: "Counter Attack",
        pitchType: "attacking_half",
        gridDimensions: "Half Pitch",
        phases: [
          {
            id: "ph_1",
            phaseNumber: 1,
            title: "Build from back",
            durationSeconds: 4,
            players: [
              { id: "p_gk", team: "gk_home", number: 1, role: "GK", label: "GK", position: { x: 10, y: 50 } },
              { id: "p_cb", team: "home", number: 4, role: "CB", label: "CB", position: { x: 25, y: 50 } },
            ],
            ball: { x: 10, y: 50, attachedPlayerId: "p_gk", speed: "ground" },
            equipment: [{ id: "c1", type: "cone", position: { x: 30, y: 30 }, rotation: 0 }],
            annotations: [
              {
                id: "ann_1",
                type: "pass_line",
                points: [{ x: 10, y: 50 }, { x: 25, y: 50 }],
                color: "#60A5FA",
                width: 2.5,
              },
            ],
          },
          {
            id: "ph_2",
            phaseNumber: 2,
            title: "Transition to Midfield",
            durationSeconds: 5,
            players: [
              { id: "p_gk", team: "gk_home", number: 1, role: "GK", label: "GK", position: { x: 12, y: 50 } },
              { id: "p_cb", team: "home", number: 4, role: "CB", label: "CB", position: { x: 35, y: 50 } },
            ],
            ball: { x: 35, y: 50, attachedPlayerId: "p_cb", speed: "driven" },
            equipment: [{ id: "c1", type: "cone", position: { x: 30, y: 30 }, rotation: 0 }],
            annotations: [],
          },
        ],
        coachingPoints: ["Body shape open", "Firm pass with inside of boot"],
      };

      const res = validateServerTacticalPlan(validDrill);
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
      expect(res.normalizedPlan).toBeDefined();
      expect(res.normalizedPlan?.title).toBe("4-3-3 Attacking Transition");
      expect(res.normalizedPlan?.phases.length).toBe(2);
      expect(res.normalizedPlan?.phases[0].players.length).toBe(2);
      expect(res.normalizedPlan?.phases[0].ball.attachedPlayerId).toBe("p_gk");
    });
  });
});
