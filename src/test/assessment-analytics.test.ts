import { describe, expect, it } from "vitest";
import {
  isLowerBetterMetric,
  computePersonalBest,
  computeTrend,
  generateAthleticRadarProfile,
  type MetricGroup,
} from "@/lib/sports-analytics.ts";

describe("Sports Performance Analytics & Calculations Suite", () => {
  describe("Metric Directionality (isLowerBetterMetric)", () => {
    it("recognizes race times and split sprints as lower-is-better", () => {
      expect(isLowerBetterMetric("Sprint 40m (s)")).toBe(true);
      expect(isLowerBetterMetric("100m Dash (s)")).toBe(true);
      expect(isLowerBetterMetric("10m Acceleration Split")).toBe(true);
      expect(isLowerBetterMetric("Pro Agility Shuttle 5-10-5")).toBe(true);
      expect(isLowerBetterMetric("50m Free (s)")).toBe(true);
    });

    it("recognizes power, jumps, and strength metrics as higher-is-better", () => {
      expect(isLowerBetterMetric("Vertical Jump (cm)")).toBe(false);
      expect(isLowerBetterMetric("Broad Jump (m)")).toBe(false);
      expect(isLowerBetterMetric("1RM Back Squat (kg)")).toBe(false);
      expect(isLowerBetterMetric("Bench Press 1RM (kg)")).toBe(false);
      expect(isLowerBetterMetric("Yo-Yo Test Level")).toBe(false);
    });
  });

  describe("Personal Best (PB) Determination", () => {
    it("selects lowest numeric value as PB for sprint time trials", () => {
      const sprintGroup: MetricGroup = {
        metric: "Sprint 40m (s)",
        unit: "s",
        points: [
          { _id: "1", assessedOn: "2026-07-01", value: 4.65 },
          { _id: "2", assessedOn: "2026-08-01", value: 4.52 },
          { _id: "3", assessedOn: "2026-09-01", value: 4.58 },
        ],
      };

      const pb = computePersonalBest(sprintGroup);
      expect(pb).not.toBeNull();
      expect(pb?.value).toBe(4.52);
      expect(pb?.assessedOn).toBe("2026-08-01");
      expect(pb?.isLowerBetter).toBe(true);
    });

    it("selects highest numeric value as PB for jumps and weights", () => {
      const jumpGroup: MetricGroup = {
        metric: "Vertical Jump (cm)",
        unit: "cm",
        points: [
          { _id: "1", assessedOn: "2026-07-01", value: 66 },
          { _id: "2", assessedOn: "2026-08-01", value: 74 },
          { _id: "3", assessedOn: "2026-09-01", value: 70 },
        ],
      };

      const pb = computePersonalBest(jumpGroup);
      expect(pb).not.toBeNull();
      expect(pb?.value).toBe(74);
      expect(pb?.assessedOn).toBe("2026-08-01");
      expect(pb?.isLowerBetter).toBe(false);
    });

    it("returns null for empty assessment groups", () => {
      expect(computePersonalBest({ metric: "Empty", points: [] })).toBeNull();
    });
  });

  describe("Progress Trend Calculations", () => {
    it("detects positive improvement when sprint time drops", () => {
      const points = [
        { _id: "1", assessedOn: "2026-08-01", value: 4.60 },
        { _id: "2", assessedOn: "2026-09-01", value: 4.50 },
      ];
      const trend = computeTrend(points, true);
      expect(trend).not.toBeNull();
      expect(trend?.isPositiveImprovement).toBe(true);
      expect(trend?.isNoChange).toBe(false);
      expect(trend?.pct).toBe("2.2");
    });

    it("detects positive improvement when jump height increases", () => {
      const points = [
        { _id: "1", assessedOn: "2026-08-01", value: 70 },
        { _id: "2", assessedOn: "2026-09-01", value: 75 },
      ];
      const trend = computeTrend(points, false);
      expect(trend).not.toBeNull();
      expect(trend?.isPositiveImprovement).toBe(true);
      expect(trend?.diff).toBe(5);
    });

    it("flags equal values as no change", () => {
      const points = [
        { _id: "1", assessedOn: "2026-08-01", value: 70 },
        { _id: "2", assessedOn: "2026-09-01", value: 70 },
      ];
      const trend = computeTrend(points, false);
      expect(trend?.isNoChange).toBe(true);
      expect(trend?.isPositiveImprovement).toBe(false);
    });

    it("returns null when less than 2 data points exist", () => {
      expect(computeTrend([{ _id: "1", assessedOn: "2026-08-01", value: 70 }])).toBeNull();
    });
  });

  describe("Athletic Radar Profile Generation", () => {
    it("never invents scores: no assessments means no pillars", () => {
      expect(generateAthleticRadarProfile([])).toEqual([]);
    });

    it("only returns pillars that have recorded assessments", () => {
      const profile = generateAthleticRadarProfile([
        {
          metric: "Sprint 40m (s)",
          unit: "s",
          points: [{ _id: "1", assessedOn: "2026-09-01", value: 4.6 }],
        },
      ]);
      expect(profile.map((p) => p.attribute)).toEqual(["Speed"]);
    });

    it("bounds all scores within 40 to 100 percentage range", () => {
      const testGroups: MetricGroup[] = [
        {
          metric: "Sprint 40m (s)",
          unit: "s",
          points: [{ _id: "1", assessedOn: "2026-09-01", value: 4.40 }],
        },
        {
          metric: "Vertical Jump (cm)",
          unit: "cm",
          points: [{ _id: "2", assessedOn: "2026-09-01", value: 78 }],
        },
      ];

      const profile = generateAthleticRadarProfile(testGroups);
      for (const pillar of profile) {
        expect(pillar.athleteScore).toBeGreaterThanOrEqual(40);
        expect(pillar.athleteScore).toBeLessThanOrEqual(100);
      }
    });
  });
});
