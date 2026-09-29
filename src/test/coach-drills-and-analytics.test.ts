import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";
import {
  SOCCER_DRILLS,
  combineAllDrills,
  getDrillMetricSpec,
} from "@/data/soccer-drills.ts";

describe("Coach Specific Drills Creation & Athlete Analytics Suite", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
  });

  describe("Role & Permissions for Specific Drill Creation", () => {
    it("allows a coach to create a custom specific drill", async () => {
      localMockStore.setPersona("usr_coach");
      const user = localMockStore.getCurrentUser();
      expect(user?.role).toBe("coach");

      const drillId = await localMockStore.executeMutation("drills:createDrill", {
        title: "Under-14 Rondo Pressure Escape",
        ageGroup: "U13-U14",
        birthYears: "2013-2012",
        category: "possession",
        categoryLabel: "Possession & Rondos",
        difficulty: "intermediate",
        durationMinutes: 20,
        intensity: "high",
        recommendedSets: "3 sets",
        recommendedReps: "5 mins each",
        gridDimensions: "15x15m grid",
        equipmentNeeded: ["6 cones", "4 soccer balls", "bibs"],
        summary: "High-tempo 5v2 rondo focusing on breaking passing lines under pressure.",
        setup: "Set up a 15x15m square with 5 perimeter passers and 2 pressing defenders.",
        coachingPoints: [
          "Open body shape to receive across the field",
          "One-touch passing when defender commits",
          "Disguise the through pass",
        ],
        variations: [
          "Limit touches to 1 touch maximum",
          "Award 1 point for every 3rd-man pass completed",
        ],
        metricName: "Rondo Consecutive Passes",
        metricUnit: "passes",
        benchmark: 15,
        isLowerBetter: false,
        attribute: "tactical",
      });

      expect(drillId).toBeDefined();
      expect(typeof drillId).toBe("string");

      // Verify drill is returned in listDrills query
      const drills = localMockStore.executeQuery("drills:listDrills", {
        ageGroup: "U13-U14",
      }) as Array<{ _id: string; title: string; metricName?: string; createdByName?: string }>;

      const created = drills.find((d) => d._id === drillId);
      expect(created).toBeDefined();
      expect(created?.title).toBe("Under-14 Rondo Pressure Escape");
      expect(created?.metricName).toBe("Rondo Consecutive Passes");
      expect(created?.createdByName).toBe("Dave Miller");
    });

    it("allows academy admin to create specific drills", async () => {
      localMockStore.setPersona("usr_sara_awally");
      const user = localMockStore.getCurrentUser();
      expect(user?.role).toBe("academy_admin");

      const drillId = await localMockStore.executeMutation("drills:createDrill", {
        title: "U16 Rapid Counter-Attack Transition",
        ageGroup: "U15-U16",
        birthYears: "2011-2010",
        category: "shooting",
        categoryLabel: "Shooting & Finishing",
        difficulty: "advanced",
        durationMinutes: 25,
        intensity: "high",
        recommendedSets: "4 sets",
        recommendedReps: "6 reps",
        gridDimensions: "Half pitch",
        equipmentNeeded: ["Full size goal", "Cones", "8 balls"],
        summary: "3v2 transition from defensive third to shot on goal within 8 seconds.",
        setup: "Half pitch setup with goalkeeper and 2 recovery defenders.",
        coachingPoints: ["Drive into open space", "Early shot before defender recovers"],
        variations: ["Add a trailing midfielder defender"],
        metricName: "Transition Time to Shot",
        metricUnit: "seconds",
        benchmark: 7.5,
        isLowerBetter: true,
        attribute: "speed",
      });

      expect(drillId).toBeDefined();
    });

    it("rejects drill creation from unauthorized roles (athlete)", async () => {
      localMockStore.setPersona("usr_athlete");
      const user = localMockStore.getCurrentUser();
      expect(user?.role).toBe("athlete");

      await expect(
        localMockStore.executeMutation("drills:createDrill", {
          title: "Illegal Drill By Athlete",
          ageGroup: "U11-U12",
          category: "technical",
          durationMinutes: 15,
          summary: "Should fail authorization",
          setup: "Cones",
          coachingPoints: ["Point 1"],
          metricName: "Score",
          benchmark: 10,
        }),
      ).rejects.toThrow(/unauthorized/i);
    });

    it("validates required fields such as title and category", async () => {
      localMockStore.setPersona("usr_coach");

      await expect(
        localMockStore.executeMutation("drills:createDrill", {
          title: "   ",
          ageGroup: "U9-U10",
          category: "passing",
          durationMinutes: 15,
          summary: "Summary",
          setup: "Setup",
          coachingPoints: ["Point 1"],
          metricName: "Score",
          benchmark: 10,
        }),
      ).rejects.toThrow(/title is required/i);
    });
  });

  describe("Athlete Statistical Data Analysis for Drills", () => {
    it("allows recording assessment data against drill metrics and querying squad analytics", async () => {
      localMockStore.setPersona("usr_coach");

      // 1. Create a custom drill with a specific metric
      const drillId = await localMockStore.executeMutation("drills:createDrill", {
        title: "U12 First-Touch Wall Volley Test",
        ageGroup: "U11-U12",
        birthYears: "2015-2014",
        category: "technical",
        categoryLabel: "Technical & Ball Mastery",
        difficulty: "intermediate",
        durationMinutes: 15,
        intensity: "medium",
        recommendedSets: "3 sets",
        recommendedReps: "1 min",
        gridDimensions: "5x5m against rebound board",
        equipmentNeeded: ["Rebound wall", "Balls"],
        summary: "Testing alternating foot volleys off rebound board.",
        setup: "Athlete 2 meters from wall.",
        coachingPoints: ["Lock ankle", "Cushion the rebound"],
        variations: ["Weak foot only"],
        metricName: "Wall Volleys in 60s",
        metricUnit: "volleys",
        benchmark: 25,
        isLowerBetter: false,
        attribute: "technique",
      });

      expect(drillId).toBeDefined();

      // 2. Record assessments for two athletes using this exact drill metric
      await localMockStore.executeMutation("assessments:recordAssessment", {
        athleteId: "ath_marcus",
        metric: "Wall Volleys in 60s",
        value: 28,
        unit: "volleys",
        assessedOn: "2026-09-20",
        notes: "Excellent rhythm and balance.",
      });

      await localMockStore.executeMutation("assessments:recordAssessment", {
        athleteId: "ath_sarah",
        metric: "Wall Volleys in 60s",
        value: 31,
        unit: "volleys",
        assessedOn: "2026-09-21",
        notes: "Outstanding touch, exceeded benchmark of 25.",
      });

      // 3. Query analytics using assessments:listAssessmentsForAnalytics
      const analyticsRecords = localMockStore.executeQuery(
        "assessments:listAssessmentsForAnalytics",
        { metric: "Wall Volleys in 60s" },
      ) as Array<{ athleteId: string; metric: string; value: number; unit?: string }>;

      expect(analyticsRecords.length).toBeGreaterThanOrEqual(2);
      const marcusRecord = analyticsRecords.find((r) => r.athleteId === "ath_marcus");
      const sarahRecord = analyticsRecords.find((r) => r.athleteId === "ath_sarah");

      expect(marcusRecord).toBeDefined();
      expect(marcusRecord?.value).toBe(28);
      expect(marcusRecord?.unit).toBe("volleys");

      expect(sarahRecord).toBeDefined();
      expect(sarahRecord?.value).toBe(31);
      expect(sarahRecord?.value).toBeGreaterThan(25); // Exceeds benchmark
    });

    it("verifies all built-in and coach custom drills have performance metrics mapped for statistics", () => {
      const customDrills = localMockStore.executeQuery("drills:listDrills", {}) as Array<Record<string, unknown>>;
      const allDrills = combineAllDrills(SOCCER_DRILLS, customDrills);

      // Verify at least 20 drills exist (covering all U16 age categories)
      expect(allDrills.length).toBeGreaterThanOrEqual(20);

      // Ensure every drill maps to a standardized metric, unit, and positive benchmark for statistics
      for (const drill of allDrills) {
        const spec = getDrillMetricSpec(drill);
        expect(spec.metricName).toBeDefined();
        expect(spec.metricName.length).toBeGreaterThan(0);
        expect(spec.metricUnit).toBeDefined();
        expect(spec.metricUnit.length).toBeGreaterThan(0);
        expect(typeof spec.benchmark).toBe("number");
        expect(spec.benchmark).toBeGreaterThan(0);
        expect(spec.targetAttribute).toBeDefined();
      }
    });
  });
});
