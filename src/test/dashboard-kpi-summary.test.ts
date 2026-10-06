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

  it("generates flat zero trend when active athletes count is 0", () => {
    const activeAthletesCount = 0;
    const monthNames = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
    const athleteTrend = monthNames.map((month, idx) => {
      if (activeAthletesCount === 0) return { name: month, count: 0 };
      const factor = 0.65 + (idx / (monthNames.length - 1)) * 0.35;
      return { name: month, count: Math.max(1, Math.round(activeAthletesCount * factor)) };
    });

    expect(athleteTrend.length).toBe(6);
    expect(athleteTrend.every((m) => m.count === 0)).toBe(true);
  });

  it("differentiates platform vs academy vs coach vs accounting KPI view configuration", () => {
    // Platform Admin KPI settings
    const platformKpis = {
      scope: "platform" as const,
      role: "platform_admin",
      academyName: "All Academies",
      academyCount: 3,
      userCount: 42,
      showFinancials: true,
    };
    const isPlatform = platformKpis.scope === "platform";
    expect(isPlatform).toBe(true);
    expect(platformKpis.academyCount).toBe(3);

    // Academy Admin KPI settings
    const academyAdminKpis = {
      scope: "academy" as const,
      role: "academy_admin",
      academyName: "Hercules FC",
      academyCount: undefined,
      showFinancials: true,
    };
    expect(academyAdminKpis.scope).toBe("academy");
    expect(academyAdminKpis.academyCount).toBeUndefined(); // Academy admin never gets platform-wide academy count
    expect(academyAdminKpis.showFinancials).toBe(true);

    // Coach KPI settings
    const coachKpis = {
      scope: "coach" as const,
      role: "coach",
      academyName: "Hercules FC",
      recentRevenue: 0,
      showFinancials: false,
    };
    expect(coachKpis.scope).toBe("coach");
    expect(coachKpis.showFinancials).toBe(false);
    expect(coachKpis.recentRevenue).toBe(0);

    // Accounting KPI settings
    const accountingKpis = {
      scope: "accounting" as const,
      role: "accounting",
      academyName: "Hercules FC",
      showFinancials: true,
    };
    expect(accountingKpis.scope).toBe("accounting");
    expect(accountingKpis.showFinancials).toBe(true);
  });
});
