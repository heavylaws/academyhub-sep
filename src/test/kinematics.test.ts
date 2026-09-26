import { describe, it, expect } from "vitest";
import {
  calculateAngle,
  calculateInclination,
  extractAthleticKinematics,
} from "../lib/pose-detection/kinematics.ts";
import {
  generateSprintPoseFrame,
  VideoPoseTracker,
} from "../lib/pose-detection/pose-engine.ts";
import { type PoseLandmark } from "../lib/pose-detection/types.ts";

describe("Kinematics Vector Math", () => {
  it("calculates a precise 90-degree right angle", () => {
    const a: PoseLandmark = { x: 0, y: 1 };
    const vertex: PoseLandmark = { x: 0, y: 0 };
    const c: PoseLandmark = { x: 1, y: 0 };

    const angle = calculateAngle(a, vertex, c);
    expect(angle).toBe(90);
  });

  it("calculates a 180-degree straight extension angle", () => {
    const a: PoseLandmark = { x: -1, y: 0 };
    const vertex: PoseLandmark = { x: 0, y: 0 };
    const c: PoseLandmark = { x: 1, y: 0 };

    const angle = calculateAngle(a, vertex, c);
    expect(angle).toBe(180);
  });

  it("calculates a 45-degree acute angle", () => {
    const a: PoseLandmark = { x: 1, y: 1 };
    const vertex: PoseLandmark = { x: 0, y: 0 };
    const c: PoseLandmark = { x: 1, y: 0 };

    const angle = calculateAngle(a, vertex, c);
    expect(angle).toBe(45);
  });

  it("handles degenerate zero-length vectors gracefully without throwing or NaN", () => {
    const a: PoseLandmark = { x: 0, y: 0 };
    const vertex: PoseLandmark = { x: 0, y: 0 };
    const c: PoseLandmark = { x: 0, y: 0 };

    const angle = calculateAngle(a, vertex, c);
    expect(angle).toBe(0);
    expect(Number.isNaN(angle)).toBe(false);
  });
});

describe("Inclination Angle Calculations", () => {
  it("calculates ground inclination (horizontal reference)", () => {
    // 45 degree slope
    const p1: PoseLandmark = { x: 0, y: 0 };
    const p2: PoseLandmark = { x: 1, y: 1 };
    expect(calculateInclination(p1, p2, "horizontal")).toBe(45);

    // Completely horizontal
    const pFlat: PoseLandmark = { x: 2, y: 0 };
    expect(calculateInclination(p1, pFlat, "horizontal")).toBe(0);

    // Completely vertical
    const pVert: PoseLandmark = { x: 0, y: 2 };
    expect(calculateInclination(p1, pVert, "horizontal")).toBe(90);
  });

  it("calculates plumb tilt (vertical reference)", () => {
    // Vertical line has 0° tilt from plumb line
    const p1: PoseLandmark = { x: 0, y: 0 };
    const pVert: PoseLandmark = { x: 0, y: 2 };
    expect(calculateInclination(p1, pVert, "vertical")).toBe(0);

    // Horizontal line has 90° tilt from plumb line
    const pFlat: PoseLandmark = { x: 2, y: 0 };
    expect(calculateInclination(p1, pFlat, "vertical")).toBe(90);
  });
});

describe("Sprint Kinematics Generator & Tracker", () => {
  it("generates all 33 valid MediaPipe landmarks within normalized [0, 1] range", () => {
    const frame = generateSprintPoseFrame(0.5);
    expect(frame.landmarks).toHaveLength(33);

    for (let i = 0; i < frame.landmarks.length; i++) {
      const lm = frame.landmarks[i];
      expect(lm).toBeDefined();
      expect(lm.x).toBeGreaterThanOrEqual(0);
      expect(lm.x).toBeLessThanOrEqual(1);
      expect(lm.y).toBeGreaterThanOrEqual(0);
      expect(lm.y).toBeLessThanOrEqual(1);
    }
  });

  it("extracts athletic kinematics angles with ratings", () => {
    const frame = generateSprintPoseFrame(0.8);
    const kinematics = extractAthleticKinematics(frame.landmarks);

    expect(kinematics).not.toBeNull();
    if (!kinematics) return;

    expect(kinematics.kneeDriveAngle.degrees).toBeGreaterThan(50);
    expect(kinematics.kneeDriveAngle.degrees).toBeLessThan(150);
    expect(kinematics.shinInclinationAngle.degrees).toBeGreaterThan(20);
    expect(kinematics.torsoLeanAngle.degrees).toBeGreaterThan(10);
    expect(kinematics.armDriveAngle.degrees).toBeGreaterThan(45);

    // Check rating fields
    expect(["optimal", "acceptable", "needs_attention", "warning"]).toContain(
      kinematics.kneeDriveAngle.rating,
    );
    expect(kinematics.kneeDriveAngle.ratingLabel).toBeTruthy();
  });

  it("caches consecutive calls on VideoPoseTracker", () => {
    const tracker = new VideoPoseTracker();
    const res1 = tracker.processFrame(1.0);
    const res2 = tracker.processFrame(1.005); // within 15ms threshold

    expect(res1.frame).toBe(res2.frame);

    const res3 = tracker.processFrame(1.5);
    expect(res3.frame.timestampSeconds).toBe(1.5);
  });
});
