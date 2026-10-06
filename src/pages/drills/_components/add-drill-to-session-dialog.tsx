import { useState, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { CalendarClock, Check, MapPin, Plus, Users } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import type { SoccerDrill } from "@/data/soccer-drills.ts";

interface AddDrillToSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drill: SoccerDrill | null;
}

export default function AddDrillToSessionDialog({
  open,
  onOpenChange,
  drill,
}: AddDrillToSessionDialogProps) {
  const [linkingSessionId, setLinkingSessionId] = useState<Id<"trainingSessions"> | null>(null);

  const [referenceTime] = useState(() => new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const sessions = useQuery(api.trainingSessions.listSessionsForAcademy, open ? {} : "skip");
  const linkDrill = useMutation(api.trainingSessions.linkDrillToSession);

  // Filter only upcoming or recent sessions (startsAt >= 24 hours ago)
  const upcomingSessions = useMemo(() => {
    if (!sessions) return [];
    return [...sessions]
      .filter((s) => s.startsAt >= referenceTime)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [sessions, referenceTime]);

  if (!drill) return null;

  const handleLinkToSession = async (session: Doc<"trainingSessions">) => {
    setLinkingSessionId(session._id);
    try {
      await linkDrill({
        sessionId: session._id,
        drillId: drill.id,
      });
      toast.success(`"${drill.title}" linked to session: ${session.title}`);
      onOpenChange(false);
    } catch {
      toast.error("Failed to link drill to session");
    } finally {
      setLinkingSessionId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] flex flex-col w-[calc(100vw-2rem)] sm:max-w-lg p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="font-display text-lg">Add Drill to Training Session</DialogTitle>
          <DialogDescription className="text-xs">
            Attach <strong className="text-foreground">{drill.title}</strong> ({drill.durationMinutes}m) to an upcoming practice session.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-2 py-3 pr-1">
          {sessions === undefined ? (
            <div className="flex items-center justify-center p-8">
              <Spinner className="size-6 text-muted-foreground" />
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="text-center p-8 text-xs text-muted-foreground">
              No upcoming training sessions found. Schedule a session for your team first.
            </div>
          ) : (
            upcomingSessions.map((s) => {
              const start = new Date(s.startsAt);
              const isAlreadyLinked = (s.drillIds ?? []).includes(drill.id);
              const isLinking = linkingSessionId === s._id;

              return (
                <div
                  key={s._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card/60 hover:bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{s.title}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {s.teamName}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarClock className="size-3.5 text-primary" />
                        {start.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      {s.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3.5 text-primary" />
                          {s.location}
                        </span>
                      )}
                      <span>({s.durationMinutes} min total)</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    {isAlreadyLinked ? (
                      <Badge
                        variant="outline"
                        className="h-8 px-2.5 text-xs gap-1 border-primary/40 text-primary bg-primary/5 font-medium"
                      >
                        <Check className="size-3.5" />
                        <span>Attached</span>
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleLinkToSession(s)}
                        disabled={isLinking}
                        className="h-8 text-xs font-semibold gap-1"
                      >
                        {isLinking ? (
                          <Spinner className="size-3.5" />
                        ) : (
                          <Plus className="size-3.5" />
                        )}
                        <span>Attach Drill</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
