import {
  Timer,
  Shield,
  Dumbbell,
  Compass,
  CheckCircle2,
  Target,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import type { SoccerDrill } from "@/data/soccer-drills.ts";

interface DrillInspectionModalProps {
  drill: SoccerDrill | null;
  onClose: () => void;
  onOpenBoard: (drill: SoccerDrill) => void;
}

export function DrillInspectionModal({
  drill,
  onClose,
  onOpenBoard,
}: DrillInspectionModalProps) {
  return (
    <Dialog
      open={Boolean(drill)}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-h-[85vh] flex flex-col w-[calc(100vw-2rem)] sm:max-w-xl p-4 sm:p-6 overflow-hidden">
        {drill && (
          <>
            <DialogHeader className="shrink-0 pb-2">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <Badge variant="secondary" className="text-[10px]">
                  {drill.categoryLabel}
                </Badge>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {drill.difficulty}
                </Badge>
                <Badge variant="outline" className="text-[10px] font-mono">
                  <Timer className="size-3 mr-1 text-primary" />
                  {drill.durationMinutes} mins
                </Badge>
              </div>
              <DialogTitle className="font-display text-lg">{drill.title}</DialogTitle>
              <DialogDescription className="text-xs">
                {drill.summary}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2 pr-1 text-xs">
              {/* Tactical Parameters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2.5 rounded-xl border bg-muted/40 text-[11px]">
                <div>
                  <span className="text-muted-foreground block">Age Group:</span>
                  <span className="font-semibold text-foreground">{drill.ageGroup}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Grid Size:</span>
                  <span className="font-semibold text-foreground">{drill.gridDimensions || "Open pitch"}</span>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <span className="text-muted-foreground block">Volume:</span>
                  <span className="font-semibold text-foreground">
                    {drill.recommendedSets} sets × {drill.recommendedReps} reps
                  </span>
                </div>
              </div>

              {/* Equipment */}
              {drill.equipment && drill.equipment.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Dumbbell className="size-3.5 text-primary" />
                    Required Equipment
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {drill.equipment.map((eq, i) => (
                      <Badge key={i} variant="outline" className="text-[11px]">
                        {eq}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Setup */}
              {drill.setup && (
                <div className="space-y-1">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Layers className="size-3.5 text-primary" />
                    Pitch Setup & Organization
                  </span>
                  <p className="text-muted-foreground leading-relaxed p-2.5 rounded-lg border bg-muted/20">
                    {drill.setup}
                  </p>
                </div>
              )}

              {/* Instructions */}
              {drill.instructions && drill.instructions.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <CheckCircle2 className="size-3.5 text-primary" />
                    Execution Steps
                  </span>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground bg-muted/20 p-2.5 rounded-lg border">
                    {drill.instructions.map((step, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Coaching Points */}
              {drill.coachingPoints && drill.coachingPoints.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground flex items-center gap-1">
                    <Target className="size-3.5 text-primary" />
                    Key Tactical Coaching Points
                  </span>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground bg-primary/5 border border-primary/20 p-2.5 rounded-lg">
                    {drill.coachingPoints.map((cp, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {cp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="shrink-0 pt-3 border-t flex items-center justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenBoard(drill)}
                className="h-8 text-xs font-medium gap-1 border-primary/30 text-primary"
              >
                <Compass className="size-3.5" />
                <span>Open in Tactical Board</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
