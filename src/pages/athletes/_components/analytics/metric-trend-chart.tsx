import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import {
  SlidersHorizontal,
  Compass,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import type { SoccerDrill } from "@/data/soccer-drills.ts";
import type { MetricGroup } from "@/lib/sports-analytics.ts";

export interface ChartPoint {
  date: string;
  displayDate: string;
  primaryVal?: number;
  secondaryVal?: number;
}

interface MetricTrendChartProps {
  activeSelectedMetric: string;
  onSelectMetric: (m: string) => void;
  activeSpec: {
    benchmark: number;
    metricUnit: string;
    isLowerBetter: boolean;
  };
  matchingDrill?: SoccerDrill;
  allDrills: SoccerDrill[];
  nonDrillAssessments: MetricGroup[];
  assessmentData: MetricGroup[];
  comparisonMetric: string;
  onComparisonChange: (m: string) => void;
  secondaryGroup?: MetricGroup | null;
  timeRange: "all" | "90d" | "30d";
  onTimeRangeChange: (r: "all" | "90d" | "30d") => void;
  chartPoints: ChartPoint[];
  primaryTrend: {
    diff: number;
    pct: number | string;
    isPositiveImprovement: boolean;
    isNoChange: boolean;
  } | null;
  emptyAction?: React.ReactNode;
  bannerAction?: React.ReactNode;
  children?: React.ReactNode;
}

export function MetricTrendChart({
  activeSelectedMetric,
  onSelectMetric,
  activeSpec,
  matchingDrill,
  allDrills,
  nonDrillAssessments,
  assessmentData,
  comparisonMetric,
  onComparisonChange,
  secondaryGroup,
  timeRange,
  onTimeRangeChange,
  chartPoints,
  primaryTrend,
  emptyAction,
  bannerAction,
  children,
}: MetricTrendChartProps) {
  return (
    <Card id="drill-performance-studio">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" />
              Drill Performance Progression & Data Analysis
            </CardTitle>
            <CardDescription className="text-xs">
              Inspect historical progression over time, compare metrics, or record scores for any drill in the playbook.
            </CardDescription>
          </div>

          {/* Drill / Metric Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Metric / Drill:</span>
              <Select value={activeSelectedMetric} onValueChange={onSelectMetric}>
                <SelectTrigger className="h-8 min-w-[200px] text-xs">
                  <SelectValue placeholder="Choose drill or test..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40">
                    ⚽ Soccer Drills & Playbook Tests ({allDrills.length})
                  </div>
                  {allDrills.map((d) => (
                    <SelectItem
                      key={d.id}
                      value={d.metricName || d.title}
                      className="text-xs"
                    >
                      {d.title} ({d.ageGroup})
                    </SelectItem>
                  ))}

                  {nonDrillAssessments.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/40 mt-1">
                        🏃 Physical & Agility Assessments
                      </div>
                      {nonDrillAssessments.map((g) => (
                        <SelectItem key={g.metric} value={g.metric} className="text-xs">
                          {g.metric}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground font-medium">Correlate:</span>
              <Select value={comparisonMetric} onValueChange={onComparisonChange}>
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
                  onClick={() => onTimeRangeChange(r)}
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
          <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed text-center bg-muted/10 space-y-3">
            <div className="p-3 rounded-full bg-primary/10 text-primary">
              <Compass className="size-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground text-sm">
                No recorded test points for "{activeSelectedMetric}" yet
              </h4>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Target Benchmark: <strong>{activeSpec.benchmark} {activeSpec.metricUnit}</strong>
                {matchingDrill && ` • Category: ${matchingDrill.categoryLabel} (${matchingDrill.ageGroup})`}
              </p>
              {matchingDrill && matchingDrill.summary && (
                <p className="text-[11px] text-muted-foreground italic max-w-sm mx-auto">
                  "{matchingDrill.summary}"
                </p>
              )}
            </div>

            {emptyAction ?? children}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Metric Stats Banner */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border text-xs">
              <div className="flex items-center gap-3">
                <span className="size-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-foreground">{activeSelectedMetric}</span>
                <Badge variant="outline" className="text-[10px]">
                  Target: {activeSpec.benchmark} {activeSpec.metricUnit}
                </Badge>
                {primaryTrend && (
                  <span
                    className={`inline-flex items-center gap-1 font-semibold ${
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

              {bannerAction ?? children}
            </div>

            {/* Progression LineChart */}
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
                  {activeSpec.benchmark > 0 && (
                    <ReferenceLine
                      y={activeSpec.benchmark}
                      yAxisId="left"
                      stroke="#10b981"
                      strokeDasharray="4 4"
                      label={{
                        value: `Target: ${activeSpec.benchmark}`,
                        fill: "#10b981",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                  )}
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
                      strokeWidth={2}
                      dot={{ r: 3, fill: "#6366f1" }}
                      activeDot={{ r: 5 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
