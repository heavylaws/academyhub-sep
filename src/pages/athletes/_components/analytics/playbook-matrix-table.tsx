import { Layers, Search, Award } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  getDrillMetricSpec,
  type SoccerDrill,
} from "@/data/soccer-drills.ts";
import {
  computePersonalBest,
  type MetricGroup,
} from "@/lib/sports-analytics.ts";

interface PlaybookMatrixTableProps {
  allDrills: SoccerDrill[];
  assessmentData: MetricGroup[];
  matrixSearch: string;
  onMatrixSearchChange: (search: string) => void;
  onSelectMetric: (metric: string) => void;
}

export function PlaybookMatrixTable({
  allDrills,
  assessmentData,
  matrixSearch,
  onMatrixSearchChange,
  onSelectMetric,
}: PlaybookMatrixTableProps) {
  const filteredDrills = allDrills
    .filter((d) => {
      if (!matrixSearch.trim()) return true;
      const q = matrixSearch.toLowerCase();
      return (
        d.title.toLowerCase().includes(q) ||
        d.categoryLabel.toLowerCase().includes(q) ||
        d.ageGroup.toLowerCase().includes(q)
      );
    })
    .slice(0, 15);

  return (
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
              onChange={(e) => onMatrixSearchChange(e.target.value)}
              className="pl-8 h-10 sm:h-8 text-xs"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Mobile View: High-ergonomics drill cards */}
        <div className="flex flex-col gap-3 sm:hidden">
          {filteredDrills.map((drill) => {
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
                    onSelectMetric(drill.metricName || drill.title);
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
              {filteredDrills.map((drill) => {
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
                          onSelectMetric(drill.metricName || drill.title);
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
  );
}
