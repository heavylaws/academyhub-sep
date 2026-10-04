import { describe, expect, it } from "vitest";
import {
  easeNatural,
  interpolateSpline,
  smoothInterpolatePhase,
  resolveGlobalTime,
} from "../../src/domain/tactics/tactical-interpolator.ts";
import { createDefaultTacticalPlan, type TacticalPhase } from "../../src/domain/tactics/tactical-domain.ts";

describe("Phase 12: Production Hardening & Multi-Phase Animation Interpolator Suite", () => {
  it("computes organic athletic easing with gentle acceleration and deceleration", () => {
    expect(easeNatural(0)).toBe(0);
    expect(easeNatural(1)).toBe(1);
    expect(easeNatural(0.5)).toBe(0.5);

    // Initial movement should accelerate gently (ease value less than linear)
    expect(easeNatural(0.1)).toBeLessThan(0.1);
    // Ending deceleration
    expect(easeNatural(0.9)).toBeGreaterThan(0.9);
  });

  it("smoothly interpolates player positions between phases with boundary safety", () => {
    const fromPhase: TacticalPhase = {
      id: "p1",
      phaseNumber: 1,
      title: "Build-up",
      durationSeconds: 4,
      players: [
        { id: "p_st", team: "home", number: 9, role: "ST", label: "Striker", position: { x: 50, y: 50 } },
      ],
      ball: { x: 50, y: 50, speed: "ground" },
      equipment: [],
      annotations: [],
    };

    const toPhase: TacticalPhase = {
      id: "p2",
      phaseNumber: 2,
      title: "Box Entry",
      durationSeconds: 4,
      players: [
        { id: "p_st", team: "home", number: 9, role: "ST", label: "Striker", position: { x: 80, y: 50 } },
      ],
      ball: { x: 80, y: 50, speed: "ground" },
      equipment: [],
      annotations: [],
    };

    const stateHalfway = smoothInterpolatePhase(fromPhase, toPhase, 0.5, { useEasing: false });
    expect(stateHalfway.players[0].x).toBe(65);
    expect(stateHalfway.players[0].y).toBe(50);
    expect(stateHalfway.ball.x).toBe(65);
    expect(stateHalfway.ball.y).toBe(50);
  });

  it("calculates parabolic lofted pass arc height peaking at mid-flight", () => {
    const fromPhase: TacticalPhase = {
      id: "p1",
      phaseNumber: 1,
      title: "Cross",
      durationSeconds: 3,
      players: [],
      ball: { x: 20, y: 20, speed: "lofted" },
      equipment: [],
      annotations: [],
    };

    const toPhase: TacticalPhase = {
      id: "p2",
      phaseNumber: 2,
      title: "Header",
      durationSeconds: 3,
      players: [],
      ball: { x: 85, y: 50, speed: "lofted" },
      equipment: [],
      annotations: [],
    };

    const atStart = smoothInterpolatePhase(fromPhase, toPhase, 0.0);
    const atApex = smoothInterpolatePhase(fromPhase, toPhase, 0.5);
    const atEnd = smoothInterpolatePhase(fromPhase, toPhase, 1.0);

    expect(atStart.ball.arcHeight).toBe(0);
    expect(atApex.ball.arcHeight).toBeCloseTo(12, 1);
    expect(atEnd.ball.arcHeight).toBeCloseTo(0, 1);
  });

  it("accurately resolves global timeline scrubber across multiple distinct phases", () => {
    const phases: TacticalPhase[] = [
      { id: "p1", phaseNumber: 1, title: "P1", durationSeconds: 4, players: [], ball: { x: 50, y: 50 }, equipment: [], annotations: [] },
      { id: "p2", phaseNumber: 2, title: "P2", durationSeconds: 6, players: [], ball: { x: 50, y: 50 }, equipment: [], annotations: [] },
      { id: "p3", phaseNumber: 3, title: "P3", durationSeconds: 5, players: [], ball: { x: 50, y: 50 }, equipment: [], annotations: [] },
    ];
    // Total duration: 4 + 6 + 5 = 15 seconds

    // At globalT = 0
    const res0 = resolveGlobalTime(phases, 0);
    expect(res0.activePhaseIndex).toBe(0);
    expect(res0.localT).toBe(0);
    expect(res0.totalDurationSeconds).toBe(15);

    // At globalT = 2s / 15s = 0.133
    const res2s = resolveGlobalTime(phases, 2 / 15);
    expect(res2s.activePhaseIndex).toBe(0);
    expect(res2s.localT).toBeCloseTo(0.5, 2);

    // At globalT = 7s / 15s (Phase 2, 3 seconds in out of 6)
    const res7s = resolveGlobalTime(phases, 7 / 15);
    expect(res7s.activePhaseIndex).toBe(1);
    expect(res7s.localT).toBeCloseTo(0.5, 2);

    // At globalT = 1.0 (Phase 3 end)
    const resEnd = resolveGlobalTime(phases, 1.0);
    expect(resEnd.activePhaseIndex).toBe(2);
    expect(resEnd.localT).toBe(1);
  });

  it("interpolates multi-waypoint spline curves correctly", () => {
    const points = [
      { x: 10, y: 10 },
      { x: 30, y: 40 },
      { x: 70, y: 80 },
    ];

    const start = interpolateSpline(points, 0);
    const mid = interpolateSpline(points, 0.5);
    const end = interpolateSpline(points, 1.0);

    expect(start.x).toBe(10);
    expect(start.y).toBe(10);
    expect(mid.x).toBe(30);
    expect(mid.y).toBe(40);
    expect(end.x).toBe(70);
    expect(end.y).toBe(80);
  });
});
