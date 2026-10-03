import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Sparkles,
  Zap,
  Flame,
  Target,
  Printer,
  ExternalLink,
  Shield,
  Activity,
  Award,
  TrendingUp,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from "recharts";
import type { RadarAttribute } from "@/lib/sports-analytics.ts";

export interface ScoutedAthleteProfile {
  athleteId: string;
  name: string;
  initials: string;
  age: number | null;
  gender?: string;
  sport?: string;
  heightCm?: number;
  weightKg?: number;
  status: string;
  overallIndex: number;
  archetype: string;
  archetypeDescription: string;
  topPillar: RadarAttribute | null;
  weakestPillar: RadarAttribute | null;
  radarData: RadarAttribute[];
  standoutTalents: Array<{
    attribute: string;
    score: number;
    academyAvg: number;
    diff: number;
    percentile: number;
  }>;
  eliteTalents: string[];
  personalBestsCount: number;
  keyPersonalBests: Array<{
    metric: string;
    value: number;
    unit?: string;
    scorePct: number;
  }>;
  breakoutGainPct?: number;
}

interface ScoutDossierDialogProps {
  athlete: ScoutedAthleteProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScoutDossierDialog({
  athlete,
  open,
  onOpenChange,
}: ScoutDossierDialogProps) {
  const [showAvg, setShowAvg] = useState(true);

  if (!athlete) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden sm:max-h-[92vh] flex flex-col border-purple-500/30 shadow-2xl">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-purple-500/10 via-primary/5 to-muted/40 border-b px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <Avatar className="size-12 border-2 border-purple-500/30 shadow-sm">
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm">
                {athlete.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-foreground">
                  {athlete.name}
                </DialogTitle>
                <Badge className="bg-purple-500 text-white hover:bg-purple-600 text-[11px] px-2 py-0.5">
                  {athlete.archetype}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>Age: {athlete.age ?? "—"}</span>
                <span>·</span>
                <span>
                  {athlete.heightCm ? `${athlete.heightCm} cm` : "Height unlisted"} ·{" "}
                  {athlete.weightKg ? `${athlete.weightKg} kg` : "Weight unlisted"}
                </span>
                <span>·</span>
                <span className="font-semibold text-emerald-500">
                  Athletic Index: {athlete.overallIndex} / 100
                </span>
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="text-xs h-8 gap-1.5 hidden sm:flex"
            >
              <Printer className="size-3.5" />
              <span>Print Dossier</span>
            </Button>
            <Button
              size="sm"
              asChild
              className="text-xs h-8 gap-1 bg-primary text-primary-foreground"
            >
              <Link to={`/athletes/${athlete.athleteId}`}>
                <span>Full Profile</span>
                <ExternalLink className="size-3" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Dossier Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* Tactical Profile & Archetype Breakdown (Option A) */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                <Target className="size-4" />
                AI Tactical Archetype & Pitch Role (Option A)
              </div>
              <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30">
                Composite Score: {athlete.overallIndex}/100
              </Badge>
            </div>
            <div className="text-sm font-bold text-foreground">
              {athlete.archetype}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {athlete.archetypeDescription}
            </p>
          </div>

          {/* Radar & Multi-Pillar Spider Comparison */}
          <div className="grid gap-5 sm:grid-cols-12 items-center">
            {/* Radar View */}
            <div className="sm:col-span-6 rounded-xl border bg-card/60 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Activity className="size-3.5 text-primary" />
                  Competency Radar Profile
                </span>
                <button
                  type="button"
                  onClick={() => setShowAvg(!showAvg)}
                  className="text-[11px] text-muted-foreground hover:text-foreground font-mono"
                >
                  {showAvg ? "[Hide Avg]" : "[Show Avg]"}
                </button>
              </div>

              {athlete.radarData.length >= 3 ? (
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={athlete.radarData}>
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
                        fillOpacity={0.35}
                        strokeWidth={2}
                      />
                      {showAvg && (
                        <Radar
                          name="Academy Avg"
                          dataKey="academyAvg"
                          stroke="#6366f1"
                          fill="#6366f1"
                          fillOpacity={0.12}
                          strokeWidth={2}
                          strokeDasharray="3 3"
                        />
                      )}
                      <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "4px" }} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-xs text-muted-foreground text-center">
                  Fewer than 3 areas logged. Radar requires at least 3 pillar assessments.
                </div>
              )}
            </div>

            {/* Pillar Breakdown list */}
            <div className="sm:col-span-6 space-y-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Award className="size-3.5 text-amber-500" />
                Pillar Scores vs Academy Benchmarks
              </span>

              <div className="space-y-1.5">
                {athlete.radarData.map((r) => {
                  const diff = r.athleteScore - r.academyAvg;
                  const isPositive = diff >= 0;
                  return (
                    <div
                      key={r.attribute}
                      className="p-2 rounded-lg border bg-muted/20 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-foreground">{r.attribute}</span>
                        <div className="text-[10px] text-muted-foreground">
                          Score: <strong className="text-emerald-500">{r.athleteScore}</strong> · Avg:{" "}
                          <strong className="text-indigo-400">{r.academyAvg}</strong>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={isPositive ? "default" : "secondary"}
                          className={`text-[10px] h-5 px-1.5 font-mono ${
                            isPositive
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {isPositive ? `+${diff}` : diff} pts
                        </Badge>
                        {r.athleteScore >= 85 && (
                          <Badge variant="outline" className="text-[9px] h-5 px-1 border-amber-500/40 text-amber-500">
                            Top Tier
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Statistical Outliers & Special Talents (Option B) */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                <Flame className="size-4" />
                Special Talents & Statistical Outliers (Option B)
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {athlete.standoutTalents.length} Standout Signals
              </Badge>
            </div>

            {athlete.standoutTalents.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {athlete.standoutTalents.map((t) => (
                  <div
                    key={t.attribute}
                    className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-start gap-2.5"
                  >
                    <div className="size-6 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="size-3.5" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <span>{t.attribute} Superiority</span>
                        <Badge variant="outline" className="text-[9px] font-mono text-emerald-500 border-emerald-500/30">
                          Top {100 - t.percentile}% Academy
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Scores <strong className="text-foreground">{t.score} / 100</strong> (+
                        {t.diff} pts above academy average of {t.academyAvg}).
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/20 border">
                Athlete develops steadily along the academy average across all competencies with balanced fundamentals.
              </p>
            )}
          </div>

          {/* Key Personal Bests Recorded */}
          {athlete.keyPersonalBests.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="size-3.5 text-amber-500" />
                Verified Playbook Benchmarks & Personal Bests ({athlete.keyPersonalBests.length})
              </span>
              <div className="grid gap-2 sm:grid-cols-3">
                {athlete.keyPersonalBests.slice(0, 6).map((pb, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg border bg-muted/30 text-xs space-y-0.5">
                    <span className="font-medium text-foreground truncate block">{pb.metric}</span>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="font-bold text-foreground">
                        {pb.value} {pb.unit}
                      </span>
                      <span className="font-mono text-emerald-500 font-semibold">{pb.scorePct}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-muted/40 border-t px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-muted-foreground">
            Scouting report generated by CoachTactics AI Scout Engine
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs h-8">
            Close Dossier
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
