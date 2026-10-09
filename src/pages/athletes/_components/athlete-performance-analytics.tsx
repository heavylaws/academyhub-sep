import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import {
  Trophy,
  Activity,
  Sparkles,
  Compass,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  SOCCER_DRILLS,
  combineAllDrills,
  getDrillMetricSpec,
} from "@/data/soccer-drills.ts";
import {
  computePersonalBest,
  computeTrend,
  generateAthleticRadarProfile,
  isLowerBetterMetric,
  ACADEMY_BENCHMARKS,
  type MetricGroup,
} from "@/lib/sports-analytics.ts";

import { RadarProfileCard } from "./analytics/radar-profile-card.tsx";
import { PersonalBestsTable } from "./analytics/personal-bests-table.tsx";
import { AiTalentCard } from "./analytics/ai-talent-card.tsx";
import { MetricTrendChart } from "./analytics/metric-trend-chart.tsx";
import { AddAssessmentInline } from "./analytics/add-assessment-inline.tsx";
import { PlaybookMatrixTable } from "./analytics/playbook-matrix-table.tsx";

interface Props {
  athleteName: string;
  athleteId?: Id<"athletes">;
  canManage?: boolean;
  assessmentData?: MetricGroup[];
}

export default function AthletePerformanceAnalytics({
  athleteName,
  athleteId,
  canManage = true,
  assessmentData = [],
}: Props) {
  const { user } = useCurrentUser();
  const customDrills = useQuery(
    api.drills.listDrills,
    user?.academyId ? { academyId: user.academyId } : {},
  );
  const academySettings = useQuery(
    api.academySettings.getAcademySettings,
    user?.academyId ? { academyId: user.academyId } : {},
  );
  const academyAverages = useQuery(
    api.assessments.getAcademyAverages,
    user?.academyId ? { academyId: user.academyId } : {},
  );

  const allDrills = useMemo(() => {
    return combineAllDrills(SOCCER_DRILLS, customDrills);
  }, [customDrills]);

  const [selectedMetric, setSelectedMetric] = useState<string>(() => {
    return assessmentData[0]?.metric ?? (allDrills[0]?.metricName || allDrills[0]?.title);
  });
  const [comparisonMetric, setComparisonMetric] = useState<string>("none");
  const [timeRange, setTimeRange] = useState<"all" | "90d" | "30d">("all");
  const [matrixSearch, setMatrixSearch] = useState("");

  const activeSelectedMetric = selectedMetric;

  // Matching drill if the selected metric corresponds to a playbook drill
  const matchingDrill = useMemo(() => {
    return allDrills.find(
      (d) =>
        d.title.toLowerCase() === activeSelectedMetric.toLowerCase() ||
        (d.metricName && d.metricName.toLowerCase() === activeSelectedMetric.toLowerCase()),
    );
  }, [allDrills, activeSelectedMetric]);

  const activeSpec = useMemo(() => {
    if (matchingDrill) {
      return getDrillMetricSpec(matchingDrill);
    }
    const customTarget = academySettings?.benchmarks?.[activeSelectedMetric];
    const known = customTarget
      ? {
          benchmark: customTarget.benchmark,
          unit: customTarget.unit,
          lowerBetter: customTarget.lowerBetter,
        }
      : ACADEMY_BENCHMARKS[activeSelectedMetric];

    return {
      metricName: activeSelectedMetric,
      metricUnit: known?.unit || "pts",
      benchmark: known?.benchmark ?? 10,
      isLowerBetter: known?.lowerBetter ?? isLowerBetterMetric(activeSelectedMetric),
      targetAttribute: "Technical" as const,
    };
  }, [matchingDrill, activeSelectedMetric, academySettings]);

  const radarData = useMemo(() => {
    return generateAthleticRadarProfile(assessmentData, academyAverages ?? undefined);
  }, [assessmentData, academyAverages]);

  // AI Talent Discovery & Special Performance Insights
  const aiTalentInsights = useMemo(() => {
    if (radarData.length === 0) return null;

    const standoutTalents = radarData.filter((r) => r.athleteScore - r.academyAvg >= 5);
    const elitePerformances = radarData.filter((r) => r.athleteScore >= 85);

    const sorted = [...radarData].sort((a, b) => b.athleteScore - a.athleteScore);
    const topPillar = sorted[0];
    const secondPillar = sorted[1];
    const weakestPillar = sorted[sorted.length - 1];

    let archetype = "Dynamic All-Rounder";
    let archetypeDescription = "Maintains a balanced athletic and tactical base across core disciplines.";

    if (topPillar && secondPillar) {
      const pair = [topPillar.attribute, secondPillar.attribute].sort().join("+");
      if (pair === "Agility+Speed" || pair === "Mobility+Speed") {
        archetype = "Explosive Transition Specialist / Winger";
        archetypeDescription = "Dominates open-field counter-attacks, rapid transitions, and wide-channel accelerations.";
      } else if (pair === "Power+Strength") {
        archetype = "Commanding Physical Anchor / Target Player";
        archetypeDescription = "Dominates physical duels, aerial contests, and provides a commanding central spine.";
      } else if (pair === "Agility+Mobility" || pair === "Agility+Power") {
        archetype = "High-Pressing Box-to-Box Engine";
        archetypeDescription = "Excells in continuous transition press, recovery runs, and high-intensity work rate.";
      }
    }

    const overallAthleteAvg = Math.round(
      radarData.reduce((acc, curr) => acc + curr.athleteScore, 0) / radarData.length,
    );
    const overallAcademyAvg = Math.round(
      radarData.reduce((acc, curr) => acc + curr.academyAvg, 0) / radarData.length,
    );
    const netDelta = overallAthleteAvg - overallAcademyAvg;

    const recommendedDrill =
      allDrills.find((d) => {
        const cat = d.category?.toLowerCase() || "";
        const weak = weakestPillar?.attribute.toLowerCase() || "";
        if (weak === "speed" && (cat.includes("counter") || cat.includes("transition"))) return true;
        if (weak === "power" && (cat.includes("finish") || cat.includes("shooting"))) return true;
        if (weak === "agility" && (cat.includes("dribbl") || cat.includes("pass"))) return true;
        if (weak === "strength" && (cat.includes("press") || cat.includes("defend"))) return true;
        return false;
      }) || allDrills[0];

    return {
      archetype,
      archetypeDescription,
      standoutTalents,
      elitePerformances,
      topPillar,
      secondPillar,
      weakestPillar,
      overallAthleteAvg,
      overallAcademyAvg,
      netDelta,
      recommendedDrill,
    };
  }, [radarData, allDrills]);

  const personalBests = useMemo(() => {
    return assessmentData
      .map((group) => computePersonalBest(group))
      .filter((pb): pb is NonNullable<typeof pb> => pb !== null);
  }, [assessmentData]);

  const primaryGroup = useMemo(() => {
    return assessmentData.find((g) => {
      const gName = g.metric.toLowerCase();
      const targetName = activeSelectedMetric.toLowerCase();
      const drillTitle = matchingDrill?.title.toLowerCase() || "";
      return (
        gName === targetName ||
        (drillTitle && (gName.includes(drillTitle) || drillTitle.includes(gName)))
      );
    });
  }, [assessmentData, activeSelectedMetric, matchingDrill]);

  const secondaryGroup = useMemo(() => {
    if (comparisonMetric === "none") return null;
    return assessmentData.find((g) => g.metric === comparisonMetric);
  }, [assessmentData, comparisonMetric]);

  const chartPoints = useMemo(() => {
    if (!primaryGroup) return [];

    const dateMap = new Map<
      string,
      { date: string; displayDate: string; primaryVal?: number; secondaryVal?: number }
    >();

    for (const pt of primaryGroup.points) {
      const displayDate = (() => {
        try {
          return format(new Date(pt.assessedOn + "T00:00:00"), "MMM d");
        } catch {
          return pt.assessedOn;
        }
      })();
      dateMap.set(pt.assessedOn, {
        date: pt.assessedOn,
        displayDate,
        primaryVal: pt.value,
      });
    }

    if (secondaryGroup) {
      for (const pt of secondaryGroup.points) {
        const existing = dateMap.get(pt.assessedOn);
        if (existing) {
          existing.secondaryVal = pt.value;
        } else {
          const displayDate = (() => {
            try {
              return format(new Date(pt.assessedOn + "T00:00:00"), "MMM d");
            } catch {
              return pt.assessedOn;
            }
          })();
          dateMap.set(pt.assessedOn, {
            date: pt.assessedOn,
            displayDate,
            secondaryVal: pt.value,
          });
        }
      }
    }

    const sorted = Array.from(dateMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    if (timeRange === "30d") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      const iso = cutoff.toISOString().slice(0, 10);
      return sorted.filter((p) => p.date >= iso);
    }
    if (timeRange === "90d") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      const iso = cutoff.toISOString().slice(0, 10);
      return sorted.filter((p) => p.date >= iso);
    }

    return sorted;
  }, [primaryGroup, secondaryGroup, timeRange]);

  const primaryTrend = useMemo(() => {
    if (!primaryGroup) return null;
    return computeTrend(primaryGroup.points, activeSpec.isLowerBetter);
  }, [primaryGroup, activeSpec]);

  const nonDrillAssessments = useMemo(() => {
    return assessmentData.filter((g) => {
      const gName = g.metric.toLowerCase();
      return !allDrills.some((d) => {
        const title = d.title.toLowerCase();
        const mName = d.metricName?.toLowerCase() || "";
        return gName === title || gName === mName || gName.includes(title);
      });
    });
  }, [assessmentData, allDrills]);

  return (
    <div className="space-y-6">
      {/* Top Athletic Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Drills Assessed</div>
              <div className="text-2xl font-bold font-display">
                {assessmentData.length}
                <span className="text-xs text-muted-foreground font-normal"> / {allDrills.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Compass className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Playbook Drills</div>
              <div className="text-2xl font-bold font-display text-blue-500">{allDrills.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Trophy className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Personal Bests</div>
              <div className="text-2xl font-bold font-display text-emerald-500">{personalBests.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Radar Profile</div>
              <div className="text-2xl font-bold font-display">
                {radarData.length > 0 ? (
                  <>
                    {Math.round(radarData.reduce((s, r) => s + r.athleteScore, 0) / radarData.length)}
                    <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Dimensional Radar + Personal Bests */}
      <div className="grid gap-6 lg:grid-cols-12">
        <RadarProfileCard
          radarData={radarData}
          aiTalentInsights={aiTalentInsights}
        />
        <PersonalBestsTable
          personalBests={personalBests}
          athleteName={athleteName}
          onSelectMetric={setSelectedMetric}
        />
      </div>

      {/* AI Talent Discovery & Special Performance Insights */}
      {aiTalentInsights && (
        <AiTalentCard
          insights={aiTalentInsights}
          onAnalyzeDrill={setSelectedMetric}
        />
      )}

      {/* Drill Performance Progression & Trend Studio */}
      <MetricTrendChart
        activeSelectedMetric={activeSelectedMetric}
        onSelectMetric={setSelectedMetric}
        activeSpec={activeSpec}
        matchingDrill={matchingDrill}
        allDrills={allDrills}
        nonDrillAssessments={nonDrillAssessments}
        assessmentData={assessmentData}
        comparisonMetric={comparisonMetric}
        onComparisonChange={setComparisonMetric}
        secondaryGroup={secondaryGroup}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        chartPoints={chartPoints}
        primaryTrend={primaryTrend}
        emptyAction={
          canManage && athleteId ? (
            <AddAssessmentInline
              athleteId={athleteId}
              athleteName={athleteName}
              activeSelectedMetric={activeSelectedMetric}
              activeSpec={activeSpec}
              matchingDrill={matchingDrill}
              variant="full"
            />
          ) : undefined
        }
        bannerAction={
          canManage && athleteId ? (
            <AddAssessmentInline
              athleteId={athleteId}
              athleteName={athleteName}
              activeSelectedMetric={activeSelectedMetric}
              activeSpec={activeSpec}
              matchingDrill={matchingDrill}
              variant="compact"
            />
          ) : undefined
        }
      />

      {/* Playbook Drills Performance Matrix Table */}
      <PlaybookMatrixTable
        allDrills={allDrills}
        assessmentData={assessmentData}
        matrixSearch={matrixSearch}
        onMatrixSearchChange={setMatrixSearch}
        onSelectMetric={setSelectedMetric}
      />
    </div>
  );
}
