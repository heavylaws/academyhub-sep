import { describe, expect, it } from "vitest";

describe("Dashboard KPI Summary Cards Suite", () => {
  it("formats currency values cleanly without decimal overflow", () => {
    const rawRevenue = 18450;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(rawRevenue);

    expect(formatted).toBe("$18,450");
  });

  it("calculates accurate attendance percentages and ratings", () => {
    const records = [
      { status: "present" },
      { status: "present" },
      { status: "late" },
      { status: "absent" },
    ];

    const presentCount = records.filter(
      (r) => r.status === "present" || r.status === "late",
    ).length;
    const rate = Math.round((presentCount / records.length) * 1000) / 10;

    expect(rate).toBe(75);
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });

  it("generates 6-month historical athlete growth trend aligning with current total", () => {
    const activeAthletesCount = 28;
    const monthNames = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
    const baseCount = Math.max(activeAthletesCount, 18);

    const athleteTrend = monthNames.map((month, idx) => {
      const factor = 0.65 + (idx / (monthNames.length - 1)) * 0.35;
      const count = Math.max(1, Math.round(baseCount * factor));
      return { name: month, count };
    });

    if (activeAthletesCount > 0) {
      athleteTrend[athleteTrend.length - 1].count = activeAthletesCount;
    }

    expect(athleteTrend.length).toBe(6);
    expect(athleteTrend[0].name).toBe("May");
    expect(athleteTrend[5].name).toBe("Oct");
    expect(athleteTrend[5].count).toBe(28);
    // Early months should show progressive ramp-up
    expect(athleteTrend[0].count).toBeLessThan(athleteTrend[5].count);
  });
});
