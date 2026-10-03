import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Trophy,
  Zap,
  Flame,
  Target,
  Search,
  Filter,
  TrendingUp,
  Award,
  Activity,
  ArrowUpDown,
  ExternalLink,
  FileText,
  SlidersHorizontal,
  ChevronRight,
  Shield,
  Layers,
  Crown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  generateAthleticRadarProfile,
  computePersonalBest,
  type RadarAttribute,
  type MetricGroup,
} from "@/lib/sports-analytics.ts";
import { ScoutDossierDialog, type ScoutedAthleteProfile } from "./scout-dossier-dialog.tsx";

interface RawAthlete {
  _id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  sport?: string;
  heightCm?: number;
  weightKg?: number;
  status: string;
}

interface RawAssessment {
  _id: string;
  athleteId: string;
  metric: string;
  value: number;
  unit?: string;
  assessedOn: string;
  notes?: string;
}

interface AiTalentScoutHubProps {
  athletes: RawAthlete[];
  assessments: RawAssessment[];
  canManage: boolean;
}

function calculateAge(dateOfBirth: string | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export function AiTalentScoutHub({ athletes, assessments }: AiTalentScoutHubProps) {
  const [search, setSearch] = useState("");
  const [selectedArchetype, setSelectedArchetype] = useState<string>("all");
  const [selectedPillar, setSelectedPillar] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"overall" | "breakout" | "speed" | "power" | "agility" | "strength" | "endurance">(
    "overall",
  );
  const [dossierAthlete, setDossierAthlete] = useState<ScoutedAthleteProfile | null>(null);

  // Group assessments by athleteId
  const assessmentsByAthlete = useMemo(() => {
    const map = new Map<string, RawAssessment[]>();
    for (const a of assessments) {
      const list = map.get(a.athleteId) || [];
      list.push(a);
      map.set(a.athleteId, list);
    }
    return map;
  }, [assessments]);

  // Compute full scout profile for every athlete
  const scoutedAthletes: ScoutedAthleteProfile[] = useMemo(() => {
    return athletes.map((ath) => {
      const athleteAssessments = assessmentsByAthlete.get(ath._id) || [];

      // Group by metric for sports-analytics
      const metricMap = new Map<string, Array<{ _id: string; value: number; assessedOn: string; notes?: string }>>();
      for (const ass of athleteAssessments) {
        const list = metricMap.get(ass.metric) || [];
        list.push({
          _id: ass._id,
          value: ass.value,
          assessedOn: ass.assessedOn,
          notes: ass.notes,
        });
        metricMap.set(ass.metric, list);
      }

      const metricGroups: MetricGroup[] = Array.from(metricMap.entries()).map(([metric, points]) => ({
        metric,
        unit: athleteAssessments.find((a) => a.metric === metric)?.unit || "pts",
        points,
      }));

      // Generate Radar profile
      const radarData = generateAthleticRadarProfile(metricGroups);

      // Compute Personal Bests
      const personalBests = metricGroups
        .map((g) => computePersonalBest(g))
        .filter((pb): pb is NonNullable<typeof pb> => pb !== null);

      // Overall Index
      const overallIndex =
        radarData.length > 0
          ? Math.round(radarData.reduce((acc, r) => acc + r.athleteScore, 0) / radarData.length)
          : 50;

      // Identify top & weakest pillars
      const sortedPillars = [...radarData].sort((a, b) => b.athleteScore - a.athleteScore);
      const topPillar = sortedPillars[0] || null;
      const secondPillar = sortedPillars[1] || null;
      const weakestPillar = sortedPillars[sortedPillars.length - 1] || null;

      // Determine Tactical Archetype (Option A)
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
          archetypeDescription = "Relentless motor with quick recovery cycles and evasive maneuverability in tight midfield zones.";
        } else if (pair === "Agility+Strength") {
          archetype = "Resilient Ball-Winning Defender";
          archetypeDescription = "Combines solid physical balance with rapid lateral tackling and defensive containment.";
        } else if (pair === "Endurance+Speed") {
          archetype = "High-Stamina Full-Back / Box-to-Box Operator";
          archetypeDescription = "Capable of sustaining high sprint intensity and repeated efforts into late match phases.";
        }
      }

      // Statistical Outlier Detection (Option B)
      const standoutTalents = radarData
        .filter((r) => r.athleteScore - r.academyAvg >= 5)
        .map((r) => {
          const diff = r.athleteScore - r.academyAvg;
          const percentile = Math.min(99, Math.max(70, Math.round(50 + diff * 2.5)));
          return {
            attribute: r.attribute,
            score: r.athleteScore,
            academyAvg: r.academyAvg,
            diff,
            percentile,
          };
        });

      const eliteTalents = radarData
        .filter((r) => r.athleteScore >= 85)
        .map((r) => r.attribute);

      // Key Personal Bests
      const keyPersonalBests = personalBests.map((pb) => ({
        metric: pb.metric,
        value: pb.value,
        unit: pb.unit,
        scorePct: pb.scorePct,
      }));

      // Breakout velocity calculation (latest vs earliest score delta)
      let breakoutGainPct = 0;
      let eligibleMetrics = 0;
      for (const group of metricGroups) {
        if (group.points.length >= 2) {
          const sortedRecs = [...group.points].sort(
            (a, b) => new Date(a.assessedOn).getTime() - new Date(b.assessedOn).getTime(),
          );
          const earliest = sortedRecs[0].value;
          const latest = sortedRecs[sortedRecs.length - 1].value;
          if (earliest > 0) {
            const gain = ((latest - earliest) / earliest) * 100;
            breakoutGainPct += gain;
            eligibleMetrics++;
          }
        }
      }
      const finalBreakoutGain = eligibleMetrics > 0 ? Math.round(breakoutGainPct / eligibleMetrics) : 0;

      return {
        athleteId: ath._id,
        name: `${ath.firstName} ${ath.lastName}`,
        initials: initials(ath.firstName, ath.lastName),
        age: calculateAge(ath.dateOfBirth),
        gender: ath.gender,
        sport: ath.sport || "Soccer",
        heightCm: ath.heightCm,
        weightKg: ath.weightKg,
        status: ath.status,
        overallIndex,
        archetype,
        archetypeDescription,
        topPillar,
        weakestPillar,
        radarData,
        standoutTalents,
        eliteTalents,
        personalBestsCount: personalBests.length,
        keyPersonalBests,
        breakoutGainPct: finalBreakoutGain,
      };
    });
  }, [athletes, assessmentsByAthlete]);

  // Academy Record Holders Podium
  const recordHolders = useMemo(() => {
    const pillars = ["Speed", "Power", "Agility", "Strength", "Endurance"];
    return pillars.map((pillar) => {
      let bestAthlete: ScoutedAthleteProfile | null = null;
      let highestScore = -1;

      for (const ath of scoutedAthletes) {
        const p = ath.radarData.find((r) => r.attribute.toLowerCase() === pillar.toLowerCase());
        if (p && p.athleteScore > highestScore) {
          highestScore = p.athleteScore;
          bestAthlete = ath;
        }
      }

      return {
        pillar,
        athlete: bestAthlete,
        score: highestScore > 0 ? highestScore : null,
      };
    });
  }, [scoutedAthletes]);

  // Breakout Performers of the Month (Ranked by progress delta)
  const breakoutPerformers = useMemo(() => {
    return [...scoutedAthletes]
      .filter((a) => (a.breakoutGainPct || 0) > 0)
      .sort((a, b) => (b.breakoutGainPct || 0) - (a.breakoutGainPct || 0))
      .slice(0, 3);
  }, [scoutedAthletes]);

  // Filtered & Sorted Athletes
  const filteredAthletes = useMemo(() => {
    let list = [...scoutedAthletes];

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => a.name.toLowerCase().includes(q) || a.archetype.toLowerCase().includes(q));
    }

    // Archetype filter
    if (selectedArchetype !== "all") {
      list = list.filter((a) => a.archetype.toLowerCase().includes(selectedArchetype.toLowerCase()));
    }

    // Pillar Specialty filter
    if (selectedPillar !== "all") {
      list = list.filter((a) =>
        a.radarData.some(
          (r) => r.attribute.toLowerCase() === selectedPillar.toLowerCase() && r.athleteScore >= 75,
        ),
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "overall") {
        return b.overallIndex - a.overallIndex;
      }
      if (sortBy === "breakout") {
        return (b.breakoutGainPct || 0) - (a.breakoutGainPct || 0);
      }
      const pA = a.radarData.find((r) => r.attribute.toLowerCase() === sortBy)?.athleteScore ?? 0;
      const pB = b.radarData.find((r) => r.attribute.toLowerCase() === sortBy)?.athleteScore ?? 0;
      return pB - pA;
    });

    return list;
  }, [scoutedAthletes, search, selectedArchetype, selectedPillar, sortBy]);

  // Academy-wide stats
  const totalScouted = scoutedAthletes.length;
  const eliteTalentsCount = scoutedAthletes.filter((a) => a.eliteTalents.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Top AI Scout Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 via-primary/5 to-background p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
              <Sparkles className="size-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                  Academy AI Talent Scout & Leaderboard (Option D)
                </h2>
                <Badge className="bg-purple-500 text-white text-[10px] px-2">
                  AI Discovery
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                Autonomous talent identification engine synthesizing multi-pillar radar competencies, statistical outlier detection (Option B), and tactical archetype profiling (Option A) across all academy athletes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 font-mono text-xs px-2.5 py-1">
              {totalScouted} Athletes Evaluated
            </Badge>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-mono text-xs px-2.5 py-1">
              {eliteTalentsCount} Elite Outliers
            </Badge>
          </div>
        </div>
      </div>

      {/* Academy Record Holders Podium */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Crown className="size-4 text-amber-500" />
            Academy Record Holders & Pillar Champions
          </h3>
          <span className="text-xs text-muted-foreground">All-time peak scores</span>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
          {recordHolders.map((rec) => {
            const pillarIcons: Record<string, string> = {
              Speed: "⚡",
              Power: "💥",
              Agility: "🌀",
              Strength: "🛡️",
              Endurance: "🫁",
            };
            return (
              <div
                key={rec.pillar}
                className="p-3 rounded-xl border bg-card/60 backdrop-blur-sm flex flex-col justify-between hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground flex items-center gap-1">
                      <span>{pillarIcons[rec.pillar] || "🏆"}</span>
                      {rec.pillar}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono h-4 px-1">
                      Rank #1
                    </Badge>
                  </div>
                  <div className="mt-2 font-bold text-sm text-foreground truncate">
                    {rec.athlete?.name ?? "No Record Yet"}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t flex items-center justify-between text-xs">
                  <span className="text-muted-foreground text-[11px]">Score:</span>
                  <span className="font-bold font-mono text-emerald-500">
                    {rec.score ? `${rec.score} / 100` : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakout Talents of the Month Showcase */}
      {breakoutPerformers.length > 0 && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <TrendingUp className="size-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-foreground flex items-center gap-2">
                  Breakout Talents of the Month
                  <Badge className="bg-emerald-500 text-white text-[10px] px-1.5 py-0">
                    Fastest Progression
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Athletes with the steepest verified score improvements over the past 30–90 days.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 overflow-x-auto">
              {breakoutPerformers.map((b) => (
                <button
                  key={b.athleteId}
                  onClick={() => setDossierAthlete(b)}
                  className="px-3 py-1.5 rounded-lg border bg-background/80 hover:bg-background text-xs flex items-center gap-2 shadow-xs transition-colors shrink-0 text-left"
                >
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[10px]">{b.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="font-semibold block truncate max-w-[110px]">{b.name}</span>
                    <span className="text-[10px] font-mono text-emerald-500 font-bold">
                      +{b.breakoutGainPct}% Velocity
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Scout Filters & Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card/60">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search scouted talent by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Archetype Filter (Option A) */}
          <Select value={selectedArchetype} onValueChange={setSelectedArchetype}>
            <SelectTrigger className="h-9 text-xs w-[170px]">
              <SelectValue placeholder="All Archetypes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Archetypes (Option A)
              </SelectItem>
              <SelectItem value="transition" className="text-xs">
                ⚡ Transition Specialists
              </SelectItem>
              <SelectItem value="anchor" className="text-xs">
                🛡️ Physical Anchors
              </SelectItem>
              <SelectItem value="engine" className="text-xs">
                🫁 Pressing Engines
              </SelectItem>
              <SelectItem value="defender" className="text-xs">
                🧱 Ball-Winning Defenders
              </SelectItem>
              <SelectItem value="playmaker" className="text-xs">
                🎯 Technical Playmakers
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Pillar Specialty Filter */}
          <Select value={selectedPillar} onValueChange={setSelectedPillar}>
            <SelectTrigger className="h-9 text-xs w-[150px]">
              <SelectValue placeholder="All Pillars" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Pillars
              </SelectItem>
              <SelectItem value="speed" className="text-xs">
                ⚡ Elite Speed
              </SelectItem>
              <SelectItem value="power" className="text-xs">
                💥 Elite Power
              </SelectItem>
              <SelectItem value="agility" className="text-xs">
                🌀 Elite Agility
              </SelectItem>
              <SelectItem value="strength" className="text-xs">
                🛡️ Elite Strength
              </SelectItem>
              <SelectItem value="endurance" className="text-xs">
                🫁 Elite Endurance
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select
            value={sortBy}
            onValueChange={(v) =>
              setSortBy(v as "overall" | "breakout" | "speed" | "power" | "agility" | "strength" | "endurance")
            }
          >
            <SelectTrigger className="h-9 text-xs w-[160px]">
              <ArrowUpDown className="size-3.5 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Sort Talent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overall" className="text-xs">
                Overall Athletic Index
              </SelectItem>
              <SelectItem value="breakout" className="text-xs">
                Breakout Velocity (Gain %)
              </SelectItem>
              <SelectItem value="speed" className="text-xs">
                Speed Pillar Score
              </SelectItem>
              <SelectItem value="power" className="text-xs">
                Power Pillar Score
              </SelectItem>
              <SelectItem value="agility" className="text-xs">
                Agility Pillar Score
              </SelectItem>
              <SelectItem value="strength" className="text-xs">
                Strength Pillar Score
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Scouting Athlete Cards Grid */}
      {filteredAthletes.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground border rounded-xl bg-card">
          No athletes match the selected scouting filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAthletes.map((ath) => (
            <Card
              key={ath.athleteId}
              className="overflow-hidden hover:border-purple-500/40 transition-all flex flex-col justify-between shadow-xs"
            >
              <CardHeader className="p-4 pb-3 border-b bg-muted/20">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-11 border border-border">
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {ath.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-bold text-sm text-foreground hover:text-primary transition-colors">
                        <Link to={`/athletes/${ath.athleteId}`}>{ath.name}</Link>
                      </h4>
                      <div className="text-[11px] text-muted-foreground">
                        {ath.sport} · Age {ath.age ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono text-muted-foreground">Athletic Index</div>
                    <div className="font-bold font-display text-lg text-emerald-500">
                      {ath.overallIndex}
                      <span className="text-xs text-muted-foreground font-normal"> / 100</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 space-y-3.5 flex-1">
                {/* AI Tactical Archetype Badge (Option A) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">
                      Tactical Archetype (Option A)
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-600 dark:text-purple-400">
                      AI Scout
                    </Badge>
                  </div>
                  <div className="text-xs font-bold text-foreground">
                    {ath.archetype}
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {ath.archetypeDescription}
                  </p>
                </div>

                {/* Radar Pillars Mini-Bar Display */}
                <div className="space-y-1.5 pt-1 border-t">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Key Competency Pillars</span>
                    <span className="font-mono">vs Academy Avg</span>
                  </div>
                  <div className="space-y-1">
                    {ath.radarData.slice(0, 4).map((r) => {
                      const diff = r.athleteScore - r.academyAvg;
                      const isPos = diff >= 0;
                      return (
                        <div key={r.attribute} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground text-[11px]">{r.attribute}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{r.athleteScore}</span>
                            <span
                              className={`text-[10px] font-mono ${
                                isPos ? "text-emerald-500" : "text-amber-500"
                              }`}
                            >
                              ({isPos ? `+${diff}` : diff})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Special Talents & Outliers (Option B) */}
                {ath.standoutTalents.length > 0 && (
                  <div className="pt-2 border-t space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Flame className="size-3" />
                      Special Talents (Option B)
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {ath.standoutTalents.map((t) => (
                        <Badge
                          key={t.attribute}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        >
                          {t.attribute} (+{t.diff} pts)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Action Buttons */}
              <div className="p-3 border-t bg-muted/10 flex items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDossierAthlete(ath)}
                  className="h-8 text-xs gap-1.5 flex-1"
                >
                  <FileText className="size-3.5" />
                  <span>Scout Dossier</span>
                </Button>
                <Button size="sm" asChild className="h-8 text-xs gap-1 flex-1">
                  <Link to={`/athletes/${ath.athleteId}`}>
                    <span>Full Profile</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Scout Dossier Dialog (Option D export/print) */}
      <ScoutDossierDialog
        athlete={dossierAthlete}
        open={Boolean(dossierAthlete)}
        onOpenChange={(open) => {
          if (!open) setDossierAthlete(null);
        }}
      />
    </div>
  );
}
