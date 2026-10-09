import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Activity, Dumbbell } from "lucide-react";
import { StatCard } from "@/pages/dashboard/shared/stat-card.tsx";
import { SessionRow } from "@/pages/dashboard/shared/session-row.tsx";
import { SectionSkeleton } from "@/pages/dashboard/shared/section-skeleton.tsx";
import { ErrorBoundary } from "@/components/error-boundary.tsx";
import {
  generateAthleticRadarProfile,
  isLowerBetterMetric,
  ACADEMY_BENCHMARKS,
} from "@/lib/sports-analytics.ts";

describe("Phase 5 Component Testing Suite", () => {
  describe("StatCard Component", () => {
    it("renders label, value and icon correctly", () => {
      render(
        <StatCard
          label="Active Athletes"
          value={42}
          icon={Activity}
        />,
      );

      expect(screen.getByText("Active Athletes")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    it("renders a skeleton when value is undefined (loading state)", () => {
      const { container } = render(
        <StatCard
          label="Total Revenue"
          value={undefined}
          icon={Dumbbell}
        />,
      );

      expect(screen.getByText("Total Revenue")).toBeInTheDocument();
      // Skeleton element has animate-pulse or skeleton class
      const skeleton = container.querySelector("[class*='animate-pulse']");
      expect(skeleton).toBeInTheDocument();
    });

    it("wraps card inside a router Link when 'to' prop is provided", () => {
      render(
        <BrowserRouter>
          <StatCard
            label="Teams"
            value="6"
            icon={Activity}
            to="/teams"
          />
        </BrowserRouter>,
      );

      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/teams");
      expect(screen.getByText("Teams")).toBeInTheDocument();
      expect(screen.getByText("6")).toBeInTheDocument();
    });
  });

  describe("SessionRow Component", () => {
    it("renders title, team badge, duration, and formatted date", () => {
      render(
        <BrowserRouter>
          <SessionRow
            session={{
              _id: "session_123",
              title: "U18 Tactical Scrimmage",
              startsAt: "2026-10-15T18:00:00Z",
              durationMinutes: 90,
              location: "Pitch 1",
              teamName: "Hercules U18",
            }}
          />
        </BrowserRouter>,
      );

      expect(screen.getByText("U18 Tactical Scrimmage")).toBeInTheDocument();
      expect(screen.getByText("Hercules U18")).toBeInTheDocument();
      expect(screen.getByText("90 min")).toBeInTheDocument();
      expect(screen.getByText("Pitch 1")).toBeInTheDocument();
      const link = screen.getByRole("link");
      expect(link).toHaveAttribute("href", "/sessions/session_123");
    });
  });

  describe("SectionSkeleton Component", () => {
    it("renders skeleton container with pulse animations", () => {
      const { container } = render(<SectionSkeleton />);
      const pulseElements = container.querySelectorAll("[class*='animate-pulse']");
      expect(pulseElements.length).toBeGreaterThan(0);
    });
  });

  describe("Sports Analytics Integration", () => {
    it("computes accurate athletic radar profile with custom academy averages", () => {
      const mockGroups = [
        {
          metric: "Sprint 100m (s)",
          points: [{ _id: "1", value: 11.2, assessedOn: "2026-10-01" }],
        },
        {
          metric: "Vertical Jump (cm)",
          points: [{ _id: "2", value: 65, assessedOn: "2026-10-02" }],
        },
        {
          metric: "Agility Shuttle (s)",
          points: [{ _id: "3", value: 4.3, assessedOn: "2026-10-03" }],
        },
        {
          metric: "1RM Bench Press (kg)",
          points: [{ _id: "4", value: 85, assessedOn: "2026-10-04" }],
        },
        {
          metric: "Yo-Yo Test Level",
          points: [{ _id: "5", value: 18.5, assessedOn: "2026-10-05" }],
        },
        {
          metric: "Sit and Reach (cm)",
          points: [{ _id: "6", value: 35, assessedOn: "2026-10-06" }],
        },
      ];

      const customAverages = {
        Speed: 78,
        Power: 72,
        Agility: 74,
        Strength: 69,
        Endurance: 80,
        Mobility: 82,
      };

      const profile = generateAthleticRadarProfile(mockGroups, customAverages);

      expect(profile).toHaveLength(6);
      for (const pillar of profile) {
        expect(pillar.attribute).toBeDefined();
        expect(pillar.athleteScore).toBeGreaterThanOrEqual(40);
        expect(pillar.athleteScore).toBeLessThanOrEqual(100);
        expect(pillar.academyAvg).toBe(customAverages[pillar.attribute as keyof typeof customAverages]);
      }
    });

    it("correctly identifies lower-is-better metrics", () => {
      expect(isLowerBetterMetric("Sprint 100m (s)")).toBe(true);
      expect(isLowerBetterMetric("40m Dash")).toBe(true);
      expect(isLowerBetterMetric("Agility Shuttle")).toBe(true);
      expect(isLowerBetterMetric("Vertical Jump (cm)")).toBe(false);
      expect(isLowerBetterMetric("1RM Back Squat (kg)")).toBe(false);
    });

    it("includes standard academy benchmarks with targets and units", () => {
      const sprintBenchmark = ACADEMY_BENCHMARKS["Sprint 100m (s)"];
      expect(sprintBenchmark).toBeDefined();
      expect(sprintBenchmark.benchmark).toBe(11.2);
      expect(sprintBenchmark.lowerBetter).toBe(true);

      const squatBenchmark = ACADEMY_BENCHMARKS["1RM Back Squat (kg)"];
      expect(squatBenchmark).toBeDefined();
      expect(squatBenchmark.benchmark).toBe(140);
      expect(squatBenchmark.lowerBetter).toBe(false);
    });
  });

  describe("ErrorBoundary Component", () => {
    it("renders children normally when no error occurs", () => {
      render(
        <ErrorBoundary>
          <div>Protected Content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });

    it("catches render errors and renders the error fallback UI", () => {
      const BadComponent = () => {
        throw new Error("Simulated component render failure");
      };

      // Suppress console.error in test runner output for expected caught error
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <BadComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
      expect(screen.getByText("Simulated component render failure")).toBeInTheDocument();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
      expect(screen.getByText("Reload Page")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it("renders custom fallback node when provided", () => {
      const BadComponent = () => {
        throw new Error("Crash");
      };

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      render(
        <ErrorBoundary fallback={<div>Custom Error View</div>}>
          <BadComponent />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Custom Error View")).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });
});
