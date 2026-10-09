import { Sparkles, Target, Flame, Zap, Trophy, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import type { SoccerDrill } from "@/data/soccer-drills.ts";

export interface AiTalentInsights {
  archetype: string;
  archetypeDescription: string;
  standoutTalents: Array<{ attribute: string; athleteScore: number; academyAvg: number }>;
  elitePerformances: Array<{ attribute: string }>;
  weakestPillar?: { attribute: string; athleteScore: number };
  recommendedDrill: SoccerDrill;
}

interface AiTalentCardProps {
  insights: AiTalentInsights;
  onAnalyzeDrill: (metricName: string) => void;
}

export function AiTalentCard({ insights, onAnalyzeDrill }: AiTalentCardProps) {
  return (
    <Card className="border-purple-500/30 bg-gradient-to-br from-purple-500/5 via-primary/5 to-card overflow-hidden shadow-sm">
      <CardHeader className="pb-3 border-b border-purple-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                AI Talent Identification & Tactical Archetype
                <Badge variant="outline" className="text-[10px] font-mono border-purple-500/40 text-purple-600 dark:text-purple-400">
                  AI Scout
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Synthesized from multi-pillar radar competencies, drill personal bests, and academy benchmark variances.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Badge className="bg-purple-500 text-white hover:bg-purple-600 text-xs px-2.5 py-0.5">
              {insights.archetype}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Tactical Profile */}
          <div className="rounded-xl border bg-card/60 p-3.5 space-y-1.5 backdrop-blur-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="size-3.5 text-primary" />
              Tactical Archetype
            </div>
            <div className="font-bold text-sm text-foreground">
              {insights.archetype}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {insights.archetypeDescription}
            </p>
          </div>

          {/* Special Talents / Standout Metrics */}
          <div className="rounded-xl border bg-card/60 p-3.5 space-y-1.5 backdrop-blur-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Flame className="size-3.5 text-emerald-500" />
              Special Talents vs Academy
            </div>
            {insights.standoutTalents.length > 0 ? (
              <div className="space-y-1.5">
                {insights.standoutTalents.map((t) => {
                  const diff = t.athleteScore - t.academyAvg;
                  return (
                    <div key={t.attribute} className="flex items-center justify-between text-xs">
                      <span className="font-medium text-foreground flex items-center gap-1">
                        <Zap className="size-3 text-emerald-500 shrink-0" />
                        {t.attribute}
                      </span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                        +{diff} pts vs avg ({t.athleteScore}/100)
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Athlete performs right along academy baseline with solid balance across all measured pillars.
              </p>
            )}
            {insights.elitePerformances.length > 0 && (
              <div className="pt-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                ⭐ Ranks in elite academy top tier in {insights.elitePerformances.map((p) => p.attribute).join(", ")}.
              </div>
            )}
          </div>

          {/* AI Coaching Prescription */}
          <div className="rounded-xl border bg-card/60 p-3.5 space-y-1.5 backdrop-blur-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Trophy className="size-3.5 text-amber-500" />
              Target Development Drill
            </div>
            <div className="font-bold text-sm text-foreground">
              Focus: {insights.weakestPillar?.attribute}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Recommended Playbook Drill:{" "}
              <strong className="text-foreground">
                {insights.recommendedDrill.title}
              </strong>{" "}
              ({insights.recommendedDrill.category}) to elevate baseline competency.
            </p>
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onAnalyzeDrill(
                    insights.recommendedDrill.metricName ||
                      insights.recommendedDrill.title,
                  );
                }}
                className="h-6 text-[11px] px-2 gap-1 border-primary/30 text-primary hover:bg-primary/5"
              >
                <span>Analyze Drill</span>
                <TrendingUp className="size-3" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
