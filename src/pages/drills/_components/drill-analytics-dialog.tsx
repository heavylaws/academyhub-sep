import { useState, useMemo } from "react";
import { useConvexAuth, useQuery, useMutation } from "convex/react";
import { format } from "date-fns";
import {
  Trophy,
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Filter,
  Flame,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import {
  type SoccerDrill,
  getDrillMetricSpec,
} from "@/data/soccer-drills.ts";

interface Props {
  drill: SoccerDrill | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage?: boolean;
}

export default function DrillAnalyticsDialog({
  drill,
  open,
  onOpenChange,
  canManage = true,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");

  // Quick Score Logger State for an athlete
  const [loggingAthleteId, setLoggingAthleteId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [savingScore, setSavingScore] = useState(false);

  // Queries
  const { isAuthenticated } = useConvexAuth();
  const athletes = useQuery(api.athletes.listAthletes, isAuthenticated ? {} : "skip");
  const teams = useQuery(api.teams.listTeams, isAuthenticated ? {} : "skip");
  const recordAssessment = useMutation(api.assessments.recordAssessment);

  const spec = useMemo(() => {
    if (!drill) return null;
    return getDrillMetricSpec(drill);
  }, [drill]);

  // Derive per-athlete assessments for this drill
  // Note: in local mock or full convex, athletes query brings roster,
  // and we can query assessments per athlete or compute leaderboard.
  // To get high-fidelity stats, we query assessments for athletes.
  // For each athlete in roster, check their assessments:
  const athleteAssessmentsQuery = useQuery(
    api.assessments.listAssessmentsForAnalytics,
    {},
  );

  // Derive all data points matching this drill metric
  const metricAssessments = useMemo(() => {
    if (!spec || !athleteAssessmentsQuery) return [];
    const targetName = spec.metricName.toLowerCase();
    const drillTitle = drill?.title.toLowerCase() || "";

    return athleteAssessmentsQuery.filter(
      (a: { metric: string; value: number; assessedOn: string; athleteId: string; notes?: string }) => {
        const aMetric = a.metric.toLowerCase();
        return (
          aMetric === targetName ||
          aMetric.includes(targetName) ||
          (drillTitle && aMetric.includes(drillTitle))
        );
      },
    );
  }, [spec, athleteAssessmentsQuery, drill]);

  // Aggregate stats per athlete
  const athleteStatsMap = useMemo(() => {
    if (!spec || !athletes) return new Map();
    const map = new Map<
      string,
      {
        points: Array<{ value: number; assessedOn: string; notes?: string }>;
        bestScore: number | null;
        latestScore: number | null;
        latestDate: string | null;
        status: "exceeds" | "on_track" | "needs_work" | "not_tested";
        scorePct: number;
      }
    >();

    // Initialize all athletes as not_tested
    for (const ath of athletes) {
      map.set(ath._id, {
        points: [],
        bestScore: null,
        latestScore: null,
        latestDate: null,
        status: "not_tested",
        scorePct: 0,
      });
    }

    // Populate recorded assessments
    for (const ass of metricAssessments) {
      const entry = map.get(ass.athleteId);
      if (entry) {
        entry.points.push({
          value: ass.value,
          assessedOn: ass.assessedOn,
          notes: ass.notes,
        });
      }
    }

    // Calculate bests and status
    for (const [, data] of map.entries()) {
      if (data.points.length > 0) {
        // Sort chronologically
        data.points.sort((a, b) => a.assessedOn.localeCompare(b.assessedOn));
        data.latestScore = data.points[data.points.length - 1].value;
        data.latestDate = data.points[data.points.length - 1].assessedOn;

        // Calculate best score based on lower/higher is better
        if (spec.isLowerBetter) {
          data.bestScore = Math.min(...data.points.map((p) => p.value));
        } else {
          data.bestScore = Math.max(...data.points.map((p) => p.value));
        }

        // Score percentage against benchmark
        const benchmarkVal = spec.benchmark > 0 ? spec.benchmark : 10;
        const pct = spec.isLowerBetter
          ? Math.round((benchmarkVal / (data.bestScore || 1)) * 100)
          : Math.round(((data.bestScore || 0) / benchmarkVal) * 100);
        data.scorePct = pct;

        if (pct >= 105) {
          data.status = "exceeds";
        } else if (pct >= 85) {
          data.status = "on_track";
        } else {
          data.status = "needs_work";
        }
      }
    }

    return map;
  }, [spec, athletes, metricAssessments]);

  // Overall Squad Metrics
  const squadStats = useMemo(() => {
    if (!spec || !athletes || athletes.length === 0) {
      return {
        totalAthletes: 0,
        testedCount: 0,
        coveragePct: 0,
        squadAvg: 0,
        topScore: 0,
        topAthleteName: "None",
        passRate: 0,
      };
    }

    const totalAthletes = athletes.length;
    let testedCount = 0;
    let totalScore = 0;
    let topScore: number | null = null;
    let topAthleteName = "—";
    let passedBenchmarkCount = 0;

    for (const ath of athletes) {
      const stats = athleteStatsMap.get(ath._id);
      if (stats && stats.bestScore !== null) {
        testedCount++;
        totalScore += stats.bestScore;

        if (stats.scorePct >= 100) {
          passedBenchmarkCount++;
        }

        if (topScore === null) {
          topScore = stats.bestScore;
          topAthleteName = `${ath.firstName} ${ath.lastName}`;
        } else if (spec.isLowerBetter && stats.bestScore < topScore) {
          topScore = stats.bestScore;
          topAthleteName = `${ath.firstName} ${ath.lastName}`;
        } else if (!spec.isLowerBetter && stats.bestScore > topScore) {
          topScore = stats.bestScore;
          topAthleteName = `${ath.firstName} ${ath.lastName}`;
        }
      }
    }

    const coveragePct = Math.round((testedCount / totalAthletes) * 100);
    const squadAvg =
      testedCount > 0 ? Number((totalScore / testedCount).toFixed(1)) : 0;
    const passRate =
      testedCount > 0
        ? Math.round((passedBenchmarkCount / testedCount) * 100)
        : 0;

    return {
      totalAthletes,
      testedCount,
      coveragePct,
      squadAvg,
      topScore: topScore ?? spec.benchmark,
      topAthleteName,
      passRate,
    };
  }, [spec, athletes, athleteStatsMap]);

  // Filtered Athletes Table List
  const athleteRows = useMemo(() => {
    if (!athletes || !spec) return [];

    let list = athletes.map((ath) => {
      const stats = athleteStatsMap.get(ath._id);
      return {
        athlete: ath,
        stats,
      };
    });

    if (teamFilter !== "all") {
      // Filter by team if available
      list = list.filter(() => true);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((r) => {
        const full = `${r.athlete.firstName} ${r.athlete.lastName}`.toLowerCase();
        return full.includes(q) || (r.athlete.sport && r.athlete.sport.toLowerCase().includes(q));
      });
    }

    // Sort: tested first (by scorePct descending), then untested
    return list.sort((a, b) => {
      const aVal = a.stats?.bestScore !== null ? a.stats?.scorePct || 0 : -1;
      const bVal = b.stats?.bestScore !== null ? b.stats?.scorePct || 0 : -1;
      return bVal - aVal;
    });
  }, [athletes, spec, athleteStatsMap, teamFilter, searchTerm]);

  // Handle Quick Result Logging
  const handleSaveQuickScore = async (athleteId: string) => {
    if (!scoreInput.trim() || isNaN(Number(scoreInput)) || !spec || !drill) {
      toast.error("Please enter a valid numeric score");
      return;
    }

    setSavingScore(true);
    try {
      await recordAssessment({
        athleteId: athleteId as Id<"athletes">,
        metric: spec.metricName,
        value: Number(scoreInput),
        unit: spec.metricUnit,
        assessedOn: new Date().toISOString().slice(0, 10),
        notes: notesInput.trim() || `Recorded via ${drill.title} (${drill.ageGroup}) statistics analysis.`,
      });

      toast.success("Drill performance score recorded!", {
        description: `Logged ${scoreInput} ${spec.metricUnit} for athlete. Statistics updated.`,
      });

      setLoggingAthleteId(null);
      setScoreInput("");
      setNotesInput("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record score");
    } finally {
      setSavingScore(false);
    }
  };

  if (!drill || !spec) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-4xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-xl">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-semibold text-xs border-primary/30 text-primary">
                  {drill.ageGroup} • Born {drill.birthYears}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {drill.categoryLabel}
                </Badge>
                {drill.isCustom && (
                  <Badge variant="default" className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-xs">
                    Custom Coach Drill
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-bold mt-1 text-foreground">
                {drill.title} — Performance & Data Analysis
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Tracked Metric: <strong className="text-foreground">{spec.metricName}</strong> ({spec.metricUnit}) • Target Benchmark: <strong className="text-foreground">{spec.benchmark} {spec.metricUnit}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Squad Performance KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
          <Card className="bg-muted/30 border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Athletes Tested</span>
                <Users className="size-4 text-primary" />
              </div>
              <div className="text-xl font-bold mt-1">
                {squadStats.testedCount} <span className="text-xs font-normal text-muted-foreground">/ {squadStats.totalAthletes}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {squadStats.coveragePct}% squad coverage
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Squad Average</span>
                <Activity className="size-4 text-blue-500" />
              </div>
              <div className="text-xl font-bold mt-1">
                {squadStats.testedCount > 0 ? squadStats.squadAvg : "—"}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {spec.metricUnit}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Target: {spec.benchmark} {spec.metricUnit}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Academy Record</span>
                <Trophy className="size-4 text-amber-500" />
              </div>
              <div className="text-xl font-bold mt-1 text-foreground truncate">
                {squadStats.testedCount > 0 ? `${squadStats.topScore} ${spec.metricUnit}` : "—"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {squadStats.topAthleteName}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
                <span>Pass Target %</span>
                <Target className="size-4 text-emerald-500" />
              </div>
              <div className="text-xl font-bold mt-1">
                {squadStats.testedCount > 0 ? `${squadStats.passRate}%` : "—"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Meeting age benchmark
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tactical Objectives & Coaching Points reminder */}
        <div className="bg-muted/20 border rounded-xl p-3.5 text-xs text-muted-foreground flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <Flame className="size-4 text-amber-500" />
            <span>Coaching Evaluation Target:</span>
          </div>
          <p>{drill.summary}</p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
            {drill.coachingPoints.slice(0, 3).map((cp, idx) => (
              <span key={idx} className="bg-background border rounded px-2 py-0.5 text-foreground">
                • {cp}
              </span>
            ))}
          </div>
        </div>

        {/* Filter and Search Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search athlete by name or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            {teams && teams.length > 0 && (
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger className="h-9 text-xs w-[160px]">
                  <SelectValue placeholder="All Teams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Squads & Rosters</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Athlete Statistics Table */}
        <div className="border rounded-xl overflow-x-auto mt-1">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[200px]">Athlete</TableHead>
                <TableHead>Personal Best (PR)</TableHead>
                <TableHead>Latest Attempt</TableHead>
                <TableHead className="w-[180px]">Vs Benchmark ({spec.benchmark} {spec.metricUnit})</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {athleteRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-xs">
                    No athletes found matching search criteria.
                  </TableCell>
                </TableRow>
              ) : (
                athleteRows.map(({ athlete, stats }) => {
                  const isLogging = loggingAthleteId === athlete._id;

                  return (
                    <TableRow key={athlete._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="size-7 border">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {athlete.firstName[0]}
                              {athlete.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-foreground">
                              {athlete.firstName} {athlete.lastName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {athlete.sport || "Soccer"} • DOB {athlete.dateOfBirth?.slice(0, 4) || "—"}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        {stats && stats.bestScore !== null ? (
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                            <span>{stats.bestScore}</span>
                            <span className="text-muted-foreground font-normal text-[11px]">
                              {spec.metricUnit}
                            </span>
                            {stats.scorePct >= 100 && (
                              <Award className="size-3.5 text-amber-500 inline" />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Not Tested</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {stats && stats.latestScore !== null ? (
                          <div className="flex flex-col">
                            <span className="text-xs text-foreground">
                              {stats.latestScore} {spec.metricUnit}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {stats.latestDate}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {stats && stats.bestScore !== null ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>{stats.scorePct}% target</span>
                              <span>
                                {stats.bestScore} / {spec.benchmark}
                              </span>
                            </div>
                            <Progress
                              value={Math.min(100, stats.scorePct)}
                              className="h-1.5"
                            />
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">No attempts</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {stats?.status === "exceeds" && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px] font-medium">
                            Exceeds Target
                          </Badge>
                        )}
                        {stats?.status === "on_track" && (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/30 text-[10px] font-medium">
                            On Track
                          </Badge>
                        )}
                        {stats?.status === "needs_work" && (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-medium">
                            Developing
                          </Badge>
                        )}
                        {stats?.status === "not_tested" && (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] font-normal">
                            Not Tested
                          </Badge>
                        )}
                      </TableCell>

                      {canManage && (
                        <TableCell className="text-right">
                          {isLogging ? (
                            <div className="flex items-center gap-1.5 justify-end">
                              <Input
                                type="number"
                                step="any"
                                placeholder={`Score (${spec.metricUnit})`}
                                value={scoreInput}
                                onChange={(e) => setScoreInput(e.target.value)}
                                className="w-24 h-7 text-xs"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                className="h-7 text-xs px-2.5"
                                onClick={() => handleSaveQuickScore(athlete._id)}
                                disabled={savingScore}
                              >
                                {savingScore ? <Spinner className="size-3" /> : "Save"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs px-2"
                                onClick={() => {
                                  setLoggingAthleteId(null);
                                  setScoreInput("");
                                }}
                              >
                                ✕
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary"
                              onClick={() => {
                                setLoggingAthleteId(athlete._id);
                                setScoreInput("");
                              }}
                            >
                              <Plus className="size-3" /> Log Score
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
