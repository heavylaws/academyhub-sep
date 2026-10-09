import { Compass, BookOpen } from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";

interface SessionTacticalRoutineProps {
  tacticalPlan?: Doc<"tacticalPlans"> | null;
  tacticalPlans?: Doc<"tacticalPlans">[] | null;
  teamId: Id<"teams">;
  canManage: boolean;
  onOpenTacticalBoard: (planId?: string) => void;
  onLinkTacticalPlan: (planId?: Id<"tacticalPlans">) => Promise<void>;
}

export function SessionTacticalRoutine({
  tacticalPlan,
  tacticalPlans,
  teamId,
  canManage,
  onOpenTacticalBoard,
  onLinkTacticalPlan,
}: SessionTacticalRoutineProps) {
  return (
    <Card className="border border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <div>
              <CardTitle className="text-base">Tactical Routine & Playbook Link</CardTitle>
              <CardDescription>
                Pitch layout, passing patterns, and tactical concepts assigned to this session.
              </CardDescription>
            </div>
          </div>
          {tacticalPlan && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenTacticalBoard(tacticalPlan._id)}
              className="h-9 gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
            >
              <Compass className="size-4" />
              <span>Open in Tactical Board</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {tacticalPlan ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-muted/30">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{tacticalPlan.title}</span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono">
                  {tacticalPlan.pitchType.replace(/_/g, " ")}
                </Badge>
                {tacticalPlan.category && (
                  <Badge variant="secondary" className="text-[10px]">
                    {tacticalPlan.category}
                  </Badge>
                )}
              </div>
              {tacticalPlan.coachingPoints && tacticalPlan.coachingPoints.length > 0 && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  🎯 Coaching Points: {tacticalPlan.coachingPoints.join(" • ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="default"
                onClick={() => onOpenTacticalBoard(tacticalPlan._id)}
                className="h-8 text-xs font-medium gap-1"
              >
                <Compass className="size-3.5" />
                <span>Launch Board</span>
              </Button>
              {canManage && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onLinkTacticalPlan(undefined)}
                  className="h-8 text-xs text-muted-foreground hover:text-destructive"
                >
                  Unlink
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-xl border border-dashed text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-muted-foreground" />
              <span>No tactical routine linked to this session yet.</span>
            </div>
            {canManage && (
              <div className="flex items-center gap-2 flex-wrap">
                {tacticalPlans && tacticalPlans.length > 0 && (
                  <select
                    className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) return;
                      onLinkTacticalPlan(val as Id<"tacticalPlans">);
                    }}
                  >
                    <option value="" disabled>
                      + Link from Playbook...
                    </option>
                    {tacticalPlans.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenTacticalBoard()}
                  className="h-8 text-xs gap-1"
                >
                  <Compass className="size-3.5" />
                  <span>Create on Board</span>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
