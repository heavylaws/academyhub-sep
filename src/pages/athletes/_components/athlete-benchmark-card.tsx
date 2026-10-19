import { useState } from "react";
import { useQuery } from "convex/react";
import {
  Activity,
  Award,
  Brain,
  Crosshair,
  Gauge,
  Info,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
} from "recharts";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

interface AthleteBenchmarkCardProps {
  athleteId: Id<"athletes">;
  athleteName: string;
  teams?: Array<{ _id: string; name: string }>;
}

type CornerKey = "physical" | "technical" | "tactical" | "psychological";

const CORNER_CONFIG: Record<
  CornerKey,
  { label: string; icon: typeof Activity; color: string; badgeClass: string; stroke: string; fill: string }
> = {
  physical: {
    label: "Physical",
    icon: Zap,
    color: "text-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    stroke: "#3b82f6",
    fill: "#3b82f6",
  },
  technical: {
    label: "Technical",
    icon: Crosshair,
    color: "text-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    stroke: "#10b981",
    fill: "#10b981",
  },
  tactical: {
    label: "Tactical",
    icon: Gauge,
    color: "text-amber-500",
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    stroke: "#f59e0b",
    fill: "#f59e0b",
  },
  psychological: {
    label: "Psychological",
    icon: Brain,
    color: "text-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    stroke: "#8b5cf6",
    fill: "#8b5cf6",
  },
};

function getScoreTier(score: number): { label: string; color: string } {
  if (score >= 85) return { label: "Elite (Top 15%)", color: "text-emerald-500 font-semibold" };
  if (score >= 65) return { label: "Above Average", color: "text-blue-500 font-medium" };
  if (score >= 45) return { label: "Cohort Average", color: "text-muted-foreground" };
  if (score >= 30) return { label: "Developing", color: "text-amber-500 font-medium" };
  return { label: "High Priority", color: "text-rose-500 font-medium" };
}

export function AthleteBenchmarkCard({
  athleteId,
  athleteName,
  teams = [],
}: AthleteBenchmarkCardProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("auto");
  const [cornerFilter, setCornerFilter] = useState<string>("all");

  const queryTeamId =
    selectedTeamId === "auto"
      ? undefined
      : (selectedTeamId as Id<"teams">);

  const benchmarkData = useQuery(api.assessments.getAthleteBenchmarkReport, {
    athleteId,
    teamId: queryTeamId,
  });

  if (benchmarkData === undefined) {
    return (
      <Card className="border">
        <CardHeader className="pb-3 border-b">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96 mt-1" />
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const { metrics, cornerComposites, cohortSize, teamName } = benchmarkData;

  const radarChartData = [
    {
      subject: "Physical",
      score: cornerComposites.physical,
      benchmark: 50,
      fullMark: 100,
    },
    {
      subject: "Technical",
      score: cornerComposites.technical,
      benchmark: 50,
      fullMark: 100,
    },
    {
      subject: "Tactical",
      score: cornerComposites.tactical,
      benchmark: 50,
      fullMark: 100,
    },
    {
      subject: "Psychological",
      score: cornerComposites.psychological,
      benchmark: 50,
      fullMark: 100,
    },
  ];

  const filteredMetrics =
    cornerFilter === "all"
      ? metrics
      : metrics.filter((m) => m.corner === cornerFilter);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Award className="size-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                Sporting Director 4-Corner Intelligence & Cohort Z-Scores
              </CardTitle>
            </div>
            <CardDescription className="text-xs mt-1">
              Statistical cohort benchmarking normalized for directional optimization across squad peers.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {teams.length > 0 && (
              <Select
                value={selectedTeamId}
                onValueChange={(val) => setSelectedTeamId(val)}
              >
                <SelectTrigger className="h-8 text-xs w-[180px]">
                  <Users className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Cohort group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Primary Squad (Auto)</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Badge variant="outline" className="text-xs px-2.5 py-1 gap-1">
              <Users className="size-3 text-muted-foreground" />
              <span>
                {teamName ? `${teamName} Cohort` : "Academy Cohort"} (n={cohortSize})
              </span>
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* 4-Corner Composite Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(["physical", "technical", "tactical", "psychological"] as CornerKey[]).map(
            (corner) => {
              const cfg = CORNER_CONFIG[corner];
              const Icon = cfg.icon;
              const score = cornerComposites[corner];
              const tier = getScoreTier(score);
              const count = metrics.filter((m) => m.corner === corner).length;

              return (
                <div
                  key={corner}
                  className="rounded-xl border p-4 bg-muted/20 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Icon className={`size-3.5 ${cfg.color}`} />
                      {cfg.label}
                    </span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${cfg.badgeClass}`}>
                      {count} {count === 1 ? "metric" : "metrics"}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold font-mono tracking-tight">
                        {score}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">/100</span>
                    </div>
                    <p className={`text-[11px] mt-0.5 ${tier.color}`}>{tier.label}</p>
                  </div>

                  <div className="space-y-1">
                    <Progress value={score} className="h-1.5" />
                  </div>
                </div>
              );
            },
          )}
        </div>

        {/* Radar Spider Visualization + Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center rounded-xl border bg-card p-4 sm:p-5">
          <div className="lg:col-span-5 h-[260px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarChartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="currentColor" className="text-border" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  className="text-foreground font-medium"
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: "currentColor" }}
                  className="text-muted-foreground"
                />
                <Radar
                  name="Cohort Baseline (Avg = 50)"
                  dataKey="benchmark"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.15}
                  strokeDasharray="3 3"
                />
                <Radar
                  name={athleteName}
                  dataKey="score"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-popover p-2.5 text-xs shadow-md space-y-1">
                          <p className="font-semibold text-foreground">{data.subject} Corner</p>
                          <p className="text-blue-500 font-medium">
                            Athlete Score: {data.score} / 100
                          </p>
                          <p className="text-muted-foreground">
                            Cohort Baseline: 50 / 100
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="lg:col-span-7 space-y-3.5">
            <div className="flex items-center gap-2">
              <Info className="size-4 text-primary" />
              <h4 className="text-sm font-semibold">Director Evaluation Summary</h4>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              Composite indices synthesize multi-session testing into standard normal distributions (Z-scores). A positive score reflects performance exceeding squad average, inverted automatically for sprint and reactive timing protocols.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-[11px] text-muted-foreground block">Strongest Corner</span>
                <span className="text-sm font-semibold capitalize flex items-center gap-1.5 mt-0.5">
                  {(() => {
                    const entries = Object.entries(cornerComposites) as [CornerKey, number][];
                    entries.sort((a, b) => b[1] - a[1]);
                    const top = entries[0];
                    const cfg = CORNER_CONFIG[top[0]];
                    const Icon = cfg.icon;
                    return (
                      <>
                        <Icon className={`size-3.5 ${cfg.color}`} />
                        {cfg.label} ({top[1]} / 100)
                      </>
                    );
                  })()}
                </span>
              </div>

              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="text-[11px] text-muted-foreground block">Development Priority</span>
                <span className="text-sm font-semibold capitalize flex items-center gap-1.5 mt-0.5">
                  {(() => {
                    const entries = Object.entries(cornerComposites) as [CornerKey, number][];
                    entries.sort((a, b) => a[1] - b[1]);
                    const lowest = entries[0];
                    const cfg = CORNER_CONFIG[lowest[0]];
                    const Icon = cfg.icon;
                    return (
                      <>
                        <Icon className={`size-3.5 ${cfg.color}`} />
                        {cfg.label} ({lowest[1]} / 100)
                      </>
                    );
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Benchmarking Table Section */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                <span>Cohort Z-Score & Percentile Breakdown</span>
              </h4>
              <p className="text-xs text-muted-foreground">
                Individual latest metric readings compared against cohort mean and standard deviation.
              </p>
            </div>

            {/* Corner Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setCornerFilter("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  cornerFilter === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                }`}
              >
                All ({metrics.length})
              </button>
              {(["physical", "technical", "tactical", "psychological"] as CornerKey[]).map(
                (c) => {
                  const cfg = CORNER_CONFIG[c];
                  const count = metrics.filter((m) => m.corner === c).length;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCornerFilter(c)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        cornerFilter === c
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80 text-muted-foreground"
                      }`}
                    >
                      {cfg.label} ({count})
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {filteredMetrics.length === 0 ? (
            <div className="text-center p-8 rounded-xl border border-dashed text-xs text-muted-foreground space-y-2">
              <Award className="size-8 mx-auto text-muted-foreground/60" />
              <p className="font-medium text-foreground">No assessment benchmarks in this corner</p>
              <p>Log physical, technical, tactical, or psychological assessments to compute cohort Z-scores.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b text-muted-foreground font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Metric & Corner</th>
                    <th className="py-2.5 px-3">Latest Value</th>
                    <th className="py-2.5 px-3">Cohort Mean (μ ± σ)</th>
                    <th className="py-2.5 px-3">Normalized Z-Score</th>
                    <th className="py-2.5 px-3">Percentile Rank</th>
                    <th className="py-2.5 px-3 text-right">Sample (n)</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredMetrics.map((row) => {
                    const cornerCfg = CORNER_CONFIG[row.corner];
                    const isPositive = row.zScore > 0.05;
                    const isNegative = row.zScore < -0.05;

                    return (
                      <tr key={row.metric} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{row.metric}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${cornerCfg.badgeClass}`}
                            >
                              {cornerCfg.label}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground block mt-0.5">
                            {row.optimizationDirection === "lower_is_better"
                              ? "Lower is better (speed/timing)"
                              : "Higher is better"}
                          </span>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-foreground">
                            {row.athleteValue}
                          </span>
                          {row.unit && (
                            <span className="text-muted-foreground ml-1">{row.unit}</span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono text-muted-foreground">
                          {row.cohortMean}
                          {row.unit ? ` ${row.unit}` : ""}{" "}
                          <span className="text-[10px] opacity-75">± {row.cohortStdDev}</span>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold ${
                              isPositive
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : isNegative
                                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                  : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {isPositive ? (
                              <TrendingUp className="size-3" />
                            ) : isNegative ? (
                              <TrendingDown className="size-3" />
                            ) : null}
                            {row.zScore > 0 ? `+${row.zScore.toFixed(2)}σ` : `${row.zScore.toFixed(2)}σ`}
                            <span className="text-[9px] font-sans font-normal opacity-80">
                              {isPositive ? "Above Avg" : isNegative ? "Below Avg" : "Average"}
                            </span>
                          </span>
                        </td>

                        <td className="py-3 px-3 min-w-[140px]">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-medium text-foreground">{row.percentile}th</span>
                            <span className="text-[10px] text-muted-foreground">
                              {row.percentile >= 80
                                ? "Top 20%"
                                : row.percentile <= 20
                                  ? "Bottom 20%"
                                  : "Mid cohort"}
                            </span>
                          </div>
                          <Progress
                            value={row.percentile}
                            className={`h-1.5 ${
                              row.percentile >= 70
                                ? "[&>[data-slot=progress-indicator]]:bg-emerald-500"
                                : row.percentile <= 30
                                  ? "[&>[data-slot=progress-indicator]]:bg-rose-500"
                                  : "[&>[data-slot=progress-indicator]]:bg-blue-500"
                            }`}
                          />
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                          {row.cohortSampleCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AthleteBenchmarkCard;
