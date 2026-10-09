import { useState } from "react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip,
  Legend,
} from "recharts";
import { Activity, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import type { AthleticRadarPoint } from "@/lib/sports-analytics.ts";

interface RadarProfileCardProps {
  radarData: AthleticRadarPoint[];
  aiTalentInsights: {
    topPillar?: { attribute: string; athleteScore: number };
    weakestPillar?: { attribute: string; athleteScore: number };
    netDelta?: number;
  } | null;
}

export function RadarProfileCard({ radarData, aiTalentInsights }: RadarProfileCardProps) {
  const [showAthleteRadar, setShowAthleteRadar] = useState(true);
  const [showAcademyAvg, setShowAcademyAvg] = useState(true);
  const [showEliteBenchmark, setShowEliteBenchmark] = useState(true);
  const [showDetailedMetrics, setShowDetailedMetrics] = useState(false);

  return (
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
            <div className="flex items-center gap-3 text-xs mb-1">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAthleteRadar}
                  onChange={(e) => setShowAthleteRadar(e.target.checked)}
                  className="rounded border-emerald-500 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="font-semibold text-emerald-500">Athlete</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showAcademyAvg}
                  onChange={(e) => setShowAcademyAvg(e.target.checked)}
                  className="rounded border-indigo-400 text-indigo-400 focus:ring-indigo-400"
                />
                <span className="text-indigo-400">Academy Avg</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showEliteBenchmark}
                  onChange={(e) => setShowEliteBenchmark(e.target.checked)}
                  className="rounded border-amber-400 text-amber-400 focus:ring-amber-400"
                />
                <span className="text-amber-400">Elite Target</span>
              </label>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis
                    dataKey="attribute"
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} stroke="transparent" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const d = payload[0].payload as {
                        attribute: string;
                        athleteScore: number;
                        academyAvg: number;
                        eliteBenchmark: number;
                      };
                      const diff = d.athleteScore - d.academyAvg;
                      return (
                        <div className="rounded-lg border bg-popover/95 p-2.5 shadow-lg backdrop-blur-md text-xs space-y-1 min-w-[170px]">
                          <div className="font-bold text-foreground border-b pb-1">
                            {d.attribute} Competency
                          </div>
                          <div className="flex items-center justify-between text-emerald-500 font-medium">
                            <span>Athlete Score:</span>
                            <span className="font-bold">{d.athleteScore} / 100</span>
                          </div>
                          <div className="flex items-center justify-between text-indigo-400 font-medium">
                            <span>Academy Avg:</span>
                            <span>{d.academyAvg} / 100</span>
                          </div>
                          <div className="flex items-center justify-between text-amber-400 font-medium">
                            <span>Elite Target:</span>
                            <span>{d.eliteBenchmark} / 100</span>
                          </div>
                          <div className="pt-1 border-t text-[11px] flex items-center justify-between">
                            <span className="text-muted-foreground">Variance:</span>
                            <span className={`font-semibold ${diff >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                              {diff >= 0 ? `+${diff}` : diff} pts vs Avg
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  {showAthleteRadar && (
                    <Radar
                      name="Athlete"
                      dataKey="athleteScore"
                      stroke="#10b981"
                      fill="#10b981"
                      fillOpacity={0.4}
                      strokeWidth={2}
                    />
                  )}
                  {showAcademyAvg && (
                    <Radar
                      name="Academy Avg"
                      dataKey="academyAvg"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.15}
                      strokeWidth={2}
                      strokeDasharray="4 4"
                    />
                  )}
                  {showEliteBenchmark && (
                    <Radar
                      name="Elite Benchmark"
                      dataKey="eliteBenchmark"
                      stroke="#f59e0b"
                      fill="#f59e0b"
                      fillOpacity={0.06}
                      strokeWidth={1.5}
                      strokeDasharray="2 2"
                    />
                  )}
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-center text-xs">
              <div>
                <div className="text-muted-foreground text-[11px]">Top Competency</div>
                <div className="font-semibold text-emerald-500">
                  {aiTalentInsights?.topPillar?.attribute ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px]">Development Focus</div>
                <div className="font-semibold text-amber-500">
                  {aiTalentInsights?.weakestPillar?.attribute ?? "—"}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-[11px]">vs Academy Avg</div>
                <div
                  className={`font-semibold ${
                    (aiTalentInsights?.netDelta ?? 0) >= 0 ? "text-emerald-500" : "text-amber-500"
                  }`}
                >
                  {(aiTalentInsights?.netDelta ?? 0) >= 0 ? "+" : ""}
                  {aiTalentInsights?.netDelta ?? 0} pts
                </div>
              </div>
            </div>

            {/* Comparative Breakdown Toggle */}
            <div className="w-full mt-3 pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowDetailedMetrics((prev) => !prev)}
                className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1 px-1 transition-colors"
              >
                <span className="font-medium">
                  {showDetailedMetrics ? "Hide" : "Show"} Detailed Competency Breakdown
                </span>
                {showDetailedMetrics ? (
                  <ChevronUp className="size-3.5" />
                ) : (
                  <ChevronDown className="size-3.5" />
                )}
              </button>

              {showDetailedMetrics && (
                <div className="space-y-2 pt-2 animate-in fade-in duration-200">
                  {radarData.map((row) => {
                    const diff = row.athleteScore - row.academyAvg;
                    const isPositive = diff >= 0;
                    return (
                      <div
                        key={row.attribute}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 border text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-foreground">{row.attribute}</span>
                          <div className="text-[10px] text-muted-foreground">
                            Athlete: <strong className="text-emerald-500">{row.athleteScore}</strong> · Academy:{" "}
                            <strong className="text-indigo-400">{row.academyAvg}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            variant={isPositive ? "default" : "secondary"}
                            className={`text-[10px] h-5 px-1.5 font-mono ${
                              isPositive
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border-amber-500/30"
                            }`}
                          >
                            {isPositive ? `+${diff}` : diff} pts
                          </Badge>
                          {row.athleteScore >= 85 && (
                            <Badge variant="outline" className="text-[9px] h-5 px-1 border-amber-500/40 text-amber-500">
                              Elite
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
