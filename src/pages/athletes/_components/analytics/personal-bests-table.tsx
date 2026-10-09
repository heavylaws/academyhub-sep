import { Trophy, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import type { PersonalBest } from "@/lib/sports-analytics.ts";

interface PersonalBestsTableProps {
  personalBests: PersonalBest[];
  athleteName: string;
  onSelectMetric: (metric: string) => void;
}

export function PersonalBestsTable({
  personalBests,
  athleteName,
  onSelectMetric,
}: PersonalBestsTableProps) {
  return (
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
                  onClick={() => onSelectMetric(pb.metric)}
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
  );
}
