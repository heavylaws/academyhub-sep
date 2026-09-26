import { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { format } from "date-fns";
import {
  Trophy,
  Activity,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  computePersonalBest,
  computeTrend,
  generateAthleticRadarProfile,
  isLowerBetterMetric,
  ACADEMY_BENCHMARKS,
  type MetricGroup,
} from "@/lib/sports-analytics.ts";

interface Props {
  athleteName: string;
  assessmentData: MetricGroup[] | undefined;
}

export default function AthletePerformanceAnalytics({
  athleteName,
  assessmentData = [],
}: Props) {
  const [selectedMetric, setSelectedMetric] = useState<string>(() => {
    return assessmentData[0]?.metric ?? "Sprint 40m (s)";
  });
  const [comparisonMetric, setComparisonMetric] = useState<string>("none");
  const [timeRange, setTimeRange] = useState<"all" | "90d" | "30d">("all");

  // If selectedMetric doesn't exist in data, derive fallback to first available
  const activeSelectedMetric = useMemo(() => {
    if (assessmentData.length === 0) return selectedMetric;
    const exists = assessmentData.some((g) => g.metric === selectedMetric);
    return exists ? selectedMetric : assessmentData[0].metric;
  }, [assessmentData, selectedMetric]);

  const radarData = useMemo(() => {
    return generateAthleticRadarProfile(assessmentData);
  }, [assessmentData]);

  const personalBests = useMemo(() => {
    return assessmentData
      .map((group) => computePersonalBest(group))
      .filter((pb): pb is NonNullable<typeof pb> => pb !== null);
  }, [assessmentData]);

  const primaryGroup = useMemo(() => {
    return assessmentData.find((g) => g.metric === activeSelectedMetric);
  }, [assessmentData, activeSelectedMetric]);

  const secondaryGroup = useMemo(() => {
    if (comparisonMetric === "none") return null;
    return assessmentData.find((g) => g.metric === comparisonMetric);
  }, [assessmentData, comparisonMetric]);

  // Combined time-series data for dual-axis chart
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

    if (timeRange === "all") return sorted;
    const daysLimit = timeRange === "30d" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysLimit);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    return sorted.filter((p) => p.date >= cutoffStr);
  }, [primaryGroup, secondaryGroup, timeRange]);

  const primaryTrend = useMemo(() => {
    if (!primaryGroup) return null;
    return computeTrend(
      primaryGroup.points,
      isLowerBetterMetric(primaryGroup.metric),
    );
  }, [primaryGroup]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner & Quick Highlights */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Trophy className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Personal Bests</div>
              <div className="text-2xl font-bold font-display">{personalBests.length} Records</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Flame className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Active Metrics</div>
              <div className="text-2xl font-bold font-display">{assessmentData.length} Tracked</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-blue-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Activity className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Profile Score</div>
              <div className="text-2xl font-bold font-display">
                {radarData.length === 0 ? (
                  "—"
                ) : (
                  <>
                    {Math.round(
                      radarData.reduce((acc, curr) => acc + curr.athleteScore, 0) /
                        radarData.length,
                    )}
                    <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-purple-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground font-medium">Personal Bests</div>
              <div className="text-2xl font-bold font-display">{personalBests.length}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Dimensional Athletic Radar Profile + PB Highlights */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Radar Profile */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  Athletic Competency Radar
                </CardTitle>
                <CardDescription className="text-xs">
                  Measured areas only. 100 = reference target for each test
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px]">
                {radarData.length}/6 areas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {radarData.length < 3 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Record assessments in at least 3 areas (speed, power, agility,
                strength, endurance, mobility) to see this profile.
              </p>
            ) : (
            <>
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <PolarAngleAxis
                    dataKey="attribute"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    stroke="hsl(var(--border))"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                  />
                  <Radar
                    name="Athlete"
                    dataKey="athleteScore"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.4}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center text-xs">
              <div>
                <div className="text-muted-foreground">Top Attribute</div>
                <div className="font-semibold text-emerald-400">
                  {radarData.reduce((prev, curr) =>
                    curr.athleteScore > prev.athleteScore ? curr : prev,
                  ).attribute}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Focus Area</div>
                <div className="font-semibold text-amber-400">
                  {radarData.reduce((prev, curr) =>
                    curr.athleteScore < prev.athleteScore ? curr : prev,
                  ).attribute}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Areas measured</div>
                <div className="font-semibold text-foreground">{radarData.length} / 6</div>
              </div>
            </div>
            </>
            )}
          </CardContent>
        </Card>

        {/* Personal Bests & Academy Benchmarks Showcase */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="size-4 text-amber-500" />
                  Personal Bests & Academy Standards
                </CardTitle>
                <CardDescription className="text-xs">
                  Peak records compared to official academy progression standards
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {personalBests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
                No assessment records recorded for {athleteName} yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {personalBests.map((pb) => {
                  const isTopTier = pb.scorePct >= 100;
                  return (
                    <div
                      key={pb.metric}
                      className="flex flex-col gap-2 rounded-xl border bg-muted/20 p-3.5 transition-all hover:bg-muted/40 hover:border-primary/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-foreground truncate">
                            {pb.metric}
                          </h4>
                          <div className="text-[11px] text-muted-foreground">
                            Set on {pb.assessedOn}
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] shrink-0 font-medium ${
                            isTopTier
                              ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                              : "bg-blue-500/15 text-blue-400 border-blue-500/30"
                          }`}
                        >
                          {isTopTier ? "Target Met" : "In Progress"}
                        </Badge>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div className="flex items-baseline gap-1">
                          <span className="font-display text-2xl font-bold tracking-tight">
                            {pb.value}
                          </span>
                          {pb.unit && (
                            <span className="text-xs font-medium text-muted-foreground">
                              {pb.unit}
                            </span>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-muted-foreground">
                          Target: <span className="font-medium text-foreground">{pb.benchmark} {pb.unit}</span>
                        </div>
                      </div>

                      {/* Progress bar towards benchmark */}
                      <div className="w-full bg-secondary/70 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isTopTier ? "bg-emerald-500" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(100, pb.scorePct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interactive Time-Series & Dual-Metric Correlation Studio */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-primary" />
                Performance Progression & Metric Correlation
              </CardTitle>
              <CardDescription className="text-xs">
                Track historical assessment trends and correlate two athletic indicators
              </CardDescription>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Primary:</span>
                <Select value={activeSelectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Metric" />
                  </SelectTrigger>
                  <SelectContent>
                    {assessmentData.map((g) => (
                      <SelectItem key={g.metric} value={g.metric} className="text-xs">
                        {g.metric}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Correlate:</span>
                <Select value={comparisonMetric} onValueChange={setComparisonMetric}>
                  <SelectTrigger className="h-8 w-36 text-xs">
                    <SelectValue placeholder="Compare with..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      None (Single Axis)
                    </SelectItem>
                    {assessmentData
                      .filter((g) => g.metric !== activeSelectedMetric)
                      .map((g) => (
                        <SelectItem key={g.metric} value={g.metric} className="text-xs">
                          {g.metric}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex rounded-lg border bg-muted/30 p-0.5">
                {(["all", "90d", "30d"] as const).map((r) => (
                  <Button
                    key={r}
                    variant={timeRange === r ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2 text-[11px] uppercase font-semibold"
                    onClick={() => setTimeRange(r)}
                  >
                    {r}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {chartPoints.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              Not enough points recorded for this selection.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Stat badges */}
              <div className="flex items-center gap-4 flex-wrap text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-emerald-500" />
                  <span className="font-medium text-foreground">{activeSelectedMetric}</span>
                  {primaryTrend && (
                    <span
                      className={`inline-flex items-center gap-0.5 font-semibold ${
                        primaryTrend.isPositiveImprovement
                          ? "text-emerald-500"
                          : primaryTrend.isNoChange
                          ? "text-muted-foreground"
                          : "text-rose-500"
                      }`}
                    >
                      {primaryTrend.isPositiveImprovement ? (
                        <TrendingUp className="size-3.5" />
                      ) : primaryTrend.isNoChange ? (
                        <Minus className="size-3.5" />
                      ) : (
                        <TrendingDown className="size-3.5" />
                      )}
                      {primaryTrend.diff > 0 ? "+" : ""}
                      {primaryTrend.diff.toFixed(2)} ({primaryTrend.pct}%)
                    </span>
                  )}
                </div>

                {secondaryGroup && (
                  <div className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full bg-indigo-500" />
                    <span className="font-medium text-foreground">{comparisonMetric}</span>
                  </div>
                )}
              </div>

              {/* Chart */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="displayDate"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="#10b981"
                      fontSize={11}
                      domain={["auto", "auto"]}
                    />
                    {secondaryGroup && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke="#6366f1"
                        fontSize={11}
                        domain={["auto", "auto"]}
                      />
                    )}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="primaryVal"
                      name={activeSelectedMetric}
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#10b981" }}
                      activeDot={{ r: 6 }}
                    />
                    {secondaryGroup && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="secondaryVal"
                        name={comparisonMetric}
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        strokeDasharray="4 4"
                        dot={{ r: 4, fill: "#6366f1" }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
