import {
  Timer,
  Plus,
  Shield,
  Dumbbell,
  Compass,
  Trash2,
} from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import type { SoccerDrill } from "@/data/soccer-drills.ts";

interface SessionDrillItineraryProps {
  session: Doc<"trainingSessions">;
  resolvedDrillsList: SoccerDrill[];
  totalDrillsDuration: number;
  durationPercentage: number;
  canManage: boolean;
  removingDrillId: string | null;
  onAddDrill: () => void;
  onInspectDrill: (drill: SoccerDrill) => void;
  onOpenBoardForDrill: (drillId: string) => void;
  onRemoveDrill: (drillId: string) => void;
}

export function SessionDrillItinerary({
  session,
  resolvedDrillsList,
  totalDrillsDuration,
  durationPercentage,
  canManage,
  removingDrillId,
  onAddDrill,
  onInspectDrill,
  onOpenBoardForDrill,
  onRemoveDrill,
}: SessionDrillItineraryProps) {
  return (
    <div className="pt-2 border-t space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Timer className="size-4 text-primary" />
            <span className="font-semibold text-sm">Practice Itinerary & Drills</span>
            <Badge variant="outline" className="text-[10px] font-mono">
              {totalDrillsDuration}m / {session.durationMinutes}m planned
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Sequential drills and rondos structured for this training block.
          </p>
        </div>

        {canManage && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAddDrill}
            className="h-8 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
          >
            <Plus className="size-3.5" />
            <span>Add Drill to Itinerary</span>
          </Button>
        )}
      </div>

      {/* Time progress bar */}
      <div className="space-y-1">
        <Progress value={durationPercentage} className="h-1.5" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>0m</span>
          <span className={durationPercentage > 100 ? "text-destructive font-semibold" : ""}>
            {totalDrillsDuration} mins ({durationPercentage}%)
          </span>
          <span>{session.durationMinutes}m capacity</span>
        </div>
      </div>

      {/* Drills List */}
      {resolvedDrillsList.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
          <span>No drills attached to this training session yet.</span>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAddDrill}
              className="h-8 text-xs gap-1"
            >
              <Plus className="size-3.5" />
              <span>Browse Playbook Drills</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {resolvedDrillsList.map((drill, idx) => (
            <div
              key={drill.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card/70 hover:bg-card transition-colors"
            >
              <div className="space-y-1 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center justify-center size-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-sm">{drill.title}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {drill.categoryLabel}
                  </Badge>
                  {drill.isCustom && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px]"
                    >
                      Custom
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">
                    {drill.difficulty}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-1">
                  {drill.summary}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground pt-0.5">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Timer className="size-3 text-primary" />
                    {drill.durationMinutes} mins
                  </span>
                  {drill.gridDimensions && (
                    <span className="flex items-center gap-1">
                      <Shield className="size-3 text-primary" />
                      Grid: {drill.gridDimensions}
                    </span>
                  )}
                  {drill.equipment && drill.equipment.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Dumbbell className="size-3 text-primary" />
                      {drill.equipment.slice(0, 3).join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onInspectDrill(drill)}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  Details
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenBoardForDrill(drill.id)}
                  className="h-8 text-xs font-medium gap-1 border-primary/30 text-primary hover:bg-primary/10"
                  title="Open drill in tactical pitch view"
                >
                  <Compass className="size-3.5" />
                  <span className="hidden sm:inline">Board</span>
                </Button>
                {canManage && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveDrill(drill.id)}
                    disabled={removingDrillId === drill.id}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Remove drill from session"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
