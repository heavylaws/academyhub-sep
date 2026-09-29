import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
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
  ReferenceLine,
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
  Plus,
  Compass,
  Award,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  SOCCER_DRILLS,
  combineAllDrills,
  getDrillMetricSpec,
  type SoccerDrill,
} from "@/data/soccer-drills.ts";
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
  athleteId?: Id<"athletes">;
  canManage?: boolean;
  assessmentData: MetricGroup[] | undefined;
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
  const recordAssessment = useMutation(api.assessments.recordAssessment);

  const allDrills = useMemo(() => {
    return combineAllDrills(SOCCER_DRILLS, customDrills);
  }, [customDrills]);

  const [selectedMetric, setSelectedMetric] = useState<string>(() => {
    return assessmentData[0]?.metric ?? (allDrills[0]?.metricName || allDrills[0]?.title);
  });
  const [comparisonMetric, setComparisonMetric] = useState<string>("none");
  const [timeRange, setTimeRange] = useState<"all" | "90d" | "30d">("all");
  const [matrixSearch, setMatrixSearch] = useState("");

  // Inline Quick Logger State
  const [inlineScore, setInlineScore] = useState("");
  const [inlineNotes, setInlineNotes] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);

  // Active selected metric
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
    const known = ACADEMY_BENCHMARKS[activeSelectedMetric];
    return {
      metricName: activeSelectedMetric,
      metricUnit: known?.unit || "pts",
      benchmark: known?.benchmark ?? 10,
      isLowerBetter: known?.lowerBetter ?? isLowerBetterMetric(activeSelectedMetric),
      targetAttribute: "Technical" as const,
    };
  }, [matchingDrill, activeSelectedMetric]);

  const radarData = useMemo(() => {
    return generateAthleticRadarProfile(assessmentData);
  }, [assessmentData]);

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

  // Combined time-series data for chart
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

  const handleQuickLog = async () => {
    if (!athleteId || !inlineScore.trim() || isNaN(Number(inlineScore))) {
      toast.error("Please enter a valid numeric test result");
      return;
    }
    setInlineSaving(true);
    try {
      await recordAssessment({
        athleteId,
        metric: activeSelectedMetric,
        value: Number(inlineScore),
        unit: activeSpec.metricUnit,
        assessedOn: new Date().toISOString().slice(0, 10),
        notes:
          inlineNotes.trim() ||
          `Recorded via athlete performance statistics analysis (${matchingDrill?.title || activeSelectedMetric}).`,
      });
      toast.success("Assessment score saved!", {
        description: `Logged ${inlineScore} ${activeSpec.metricUnit} for ${athleteName}. Chart updated.`,
      });
      setInlineScore("");
      setInlineNotes("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record score");
    } finally {
      setInlineSaving(false);
    }
  };

  // Distinct non-drill assessment groups
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
        {/* Radar Profile */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  Athletic & Tactical Competency Radar
                </CardTitle>
                <CardDescription className="text-xs">
                  Scores calculated from technical soccer drills and physical assessments.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px]">
                {radarData.length}/6 areas
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {radarData.length < 3 ? (
              <p className="py-16 text-center text-sm text-muted-foreground max-w-xs">
                Log assessments in at least 3 areas (speed, agility, technical, tactical, power) to render the full spider radar.
              </p>
            ) : (
              <>
                <div className="w-full h-64 sm:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                      <PolarAngleAxis
                        dataKey="attribute"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        stroke="hsl(var(--border))"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 8 }}
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
                    <div className="text-muted-foreground text-[11px]">Top Competency</div>
                    <div className="font-semibold text-emerald-500">
                      {radarData.reduce((prev, curr) =>
                        curr.athleteScore > prev.athleteScore ? curr : prev,
                      ).attribute}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[11px]">Development Focus</div>
                    <div className="font-semibold text-amber-500">
                      {radarData.reduce((prev, curr) =>
                        curr.athleteScore < prev.athleteScore ? curr : prev,
                      ).attribute}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-[11px]">Areas Logged</div>
                    <div className="font-semibold text-foreground">{radarData.length} / 6</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Personal Bests & Progression Targets */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="size-4 text-amber-500" />
                  Personal Bests & Playbook Benchmarks
                </CardTitle>
                <CardDescription className="text-xs">
                  Peak scores achieved by {athleteName} relative to developmental targets
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {personalBests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground text-sm">
                No assessments recorded for {athleteName} yet. Select any drill below to record the first benchmark score!
              </div>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {personalBests.map((pb) => {
                  const isTopTier = pb.scorePct >= 100;
                  return (
                    <div
                      key={pb.metric}
                      onClick={() => setSelectedMetric(pb.metric)}
                      className="cursor-pointer p-3 rounded-xl border bg-muted/20 hover:bg-muted/40 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          {pb.metric}
                          {isTopTier && <Award className="size-3.5 text-amber-500 inline" />}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">
                            {pb.value} {pb.unit}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${
                              isTopTier
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                : "text-muted-foreground"
                            }`}
                          >
                            Target: {pb.benchmark} {pb.unit}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={Math.min(100, pb.scorePct)}
                          className="h-1.5 flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">
                          {pb.scorePct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Interactive Time-Series Studio: Analyze ANY Drill */}
      <Card>
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
                <Select value={activeSelectedMetric} onValueChange={setSelectedMetric}>
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

              {canManage && athleteId && (
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <Input
                    type="number"
                    step="any"
                    placeholder={`Score (${activeSpec.metricUnit})`}
                    value={inlineScore}
                    onChange={(e) => setInlineScore(e.target.value)}
                    className="h-8 w-36 text-xs text-center"
                  />
                  <Input
                    placeholder="Coach notes (optional)..."
                    value={inlineNotes}
                    onChange={(e) => setInlineNotes(e.target.value)}
                    className="h-8 w-52 text-xs"
                  />
                  <Button
                    size="sm"
                    className="h-8 text-xs gap-1.5"
                    onClick={handleQuickLog}
                    disabled={inlineSaving}
                  >
                    {inlineSaving ? <Spinner className="size-3" /> : <Plus className="size-3" />}
                    Record Assessment Point
                  </Button>
                </div>
              )}
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

                {/* Quick Add another test result point */}
                {canManage && athleteId && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="any"
                      placeholder={`New score (${activeSpec.metricUnit})`}
                      value={inlineScore}
                      onChange={(e) => setInlineScore(e.target.value)}
                      className="h-7 w-32 text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      onClick={handleQuickLog}
                      disabled={inlineSaving}
                    >
                      {inlineSaving ? <Spinner className="size-3" /> : <Plus className="size-3" />}
                      Add Point
                    </Button>
                  </div>
                )}
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

      {/* Playbook Drills Performance Matrix Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                Playbook Drills Statistics Matrix
              </CardTitle>
              <CardDescription className="text-xs">
                Comprehensive data analysis across all {allDrills.length} youth soccer and technical drills.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search drills in matrix..."
                value={matrixSearch}
                onChange={(e) => setMatrixSearch(e.target.value)}
                className="pl-8 h-10 sm:h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile View: High-ergonomics drill cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {allDrills
              .filter((d) => {
                if (!matrixSearch.trim()) return true;
                const q = matrixSearch.toLowerCase();
                return (
                  d.title.toLowerCase().includes(q) ||
                  d.categoryLabel.toLowerCase().includes(q) ||
                  d.ageGroup.toLowerCase().includes(q)
                );
              })
              .slice(0, 15)
              .map((drill) => {
                const drillSpec = getDrillMetricSpec(drill);
                const matchingGroup = assessmentData.find((g) => {
                  const gName = g.metric.toLowerCase();
                  const dTitle = drill.title.toLowerCase();
                  const dMetric = drillSpec.metricName.toLowerCase();
                  return gName === dTitle || gName === dMetric || gName.includes(dTitle);
                });
                const pb = matchingGroup ? computePersonalBest(matchingGroup) : null;
                const isExceeding = pb && pb.scorePct >= 100;

                return (
                  <div
                    key={drill.id}
                    className="p-3.5 rounded-2xl border border-border bg-card flex flex-col gap-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-display font-bold text-sm text-foreground">
                          {drill.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{drill.categoryLabel}</span>
                          <span>•</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {drill.ageGroup}
                          </Badge>
                        </div>
                      </div>

                      {pb ? (
                        <Badge
                          className={`text-[10px] font-medium shrink-0 ${
                            isExceeding
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                          }`}
                        >
                          {isExceeding ? "Exceeds" : "On Track"} ({pb.scorePct}%)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px] shrink-0">
                          Pending
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-muted/20 p-2.5 rounded-xl border">
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Target Benchmark</span>
                        <span className="font-mono font-semibold text-foreground">
                          {drillSpec.benchmark} {drillSpec.metricUnit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-[11px] block">Athlete Personal Best</span>
                        <span className="font-mono font-bold text-foreground flex items-center gap-1">
                          {pb ? `${pb.value} ${drillSpec.metricUnit}` : "Not Tested"}
                          {isExceeding && <Award className="size-3 text-amber-500" />}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="h-10 text-xs font-semibold rounded-xl text-primary border-primary/30 hover:bg-primary/10 active:scale-98 transition-all"
                      onClick={() => {
                        setSelectedMetric(drill.metricName || drill.title);
                      }}
                    >
                      Inspect Trend & Record Data
                    </Button>
                  </div>
                );
              })}
          </div>

          {/* Tablet & Desktop View: Table */}
          <div className="hidden sm:block border rounded-xl overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead>Drill & Tactical Focus</TableHead>
                  <TableHead>Target Age</TableHead>
                  <TableHead>Target Benchmark</TableHead>
                  <TableHead>Athlete Personal Best</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Analyze</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allDrills
                  .filter((d) => {
                    if (!matrixSearch.trim()) return true;
                    const q = matrixSearch.toLowerCase();
                    return (
                      d.title.toLowerCase().includes(q) ||
                      d.categoryLabel.toLowerCase().includes(q) ||
                      d.ageGroup.toLowerCase().includes(q)
                    );
                  })
                  .slice(0, 15)
                  .map((drill) => {
                    const drillSpec = getDrillMetricSpec(drill);
                    const matchingGroup = assessmentData.find((g) => {
                      const gName = g.metric.toLowerCase();
                      const dTitle = drill.title.toLowerCase();
                      const dMetric = drillSpec.metricName.toLowerCase();
                      return gName === dTitle || gName === dMetric || gName.includes(dTitle);
                    });

                    const pb = matchingGroup ? computePersonalBest(matchingGroup) : null;
                    const isExceeding = pb && pb.scorePct >= 100;

                    return (
                      <TableRow key={drill.id}>
                        <TableCell className="font-medium text-xs">
                          <div className="flex flex-col">
                            <span className="font-semibold text-foreground">
                              {drill.title}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {drill.categoryLabel}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {drill.ageGroup}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {drillSpec.benchmark} {drillSpec.metricUnit}
                        </TableCell>
                        <TableCell>
                          {pb ? (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                              <span>{pb.value} {drillSpec.metricUnit}</span>
                              {isExceeding && <Award className="size-3.5 text-amber-500" />}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Not Tested</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {pb ? (
                            <Badge
                              className={`text-[10px] font-medium ${
                                isExceeding
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                  : "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              }`}
                            >
                              {isExceeding ? "Exceeds Target" : "On Track"} ({pb.scorePct}%)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              Pending Evaluation
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => {
                              setSelectedMetric(drill.metricName || drill.title);
                            }}
                          >
                            Inspect Trend
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
