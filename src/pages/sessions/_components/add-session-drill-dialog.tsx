import { useState, useMemo } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { toast } from "sonner";
import { Search, Plus, Check, Timer, Dumbbell, Shield, Filter } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { SOCCER_DRILLS, combineAllDrills, type SoccerDrill } from "@/data/soccer-drills.ts";

interface AddSessionDrillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: Id<"trainingSessions">;
  currentDrillIds: string[];
}

export default function AddSessionDrillDialog({
  open,
  onOpenChange,
  sessionId,
  currentDrillIds,
}: AddSessionDrillDialogProps) {
  const { user } = useCurrentUser();
  const { isAuthenticated } = useConvexAuth();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [addingId, setAddingId] = useState<string | null>(null);

  const customDrills = useQuery(
    api.drills.listDrills,
    isAuthenticated && user?.academyId ? { academyId: user.academyId } : "skip",
  );

  const linkDrill = useMutation(api.trainingSessions.linkDrillToSession);

  const allDrills = useMemo<SoccerDrill[]>(() => {
    return combineAllDrills(SOCCER_DRILLS, customDrills);
  }, [customDrills]);

  const filteredDrills = useMemo(() => {
    return allDrills.filter((d) => {
      if (category !== "all" && d.category !== category) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchTitle = d.title.toLowerCase().includes(q);
        const matchCategory = d.categoryLabel.toLowerCase().includes(q);
        const matchSummary = d.summary.toLowerCase().includes(q);
        if (!matchTitle && !matchCategory && !matchSummary) return false;
      }
      return true;
    });
  }, [allDrills, search, category]);

  const handleLink = async (drill: SoccerDrill) => {
    setAddingId(drill.id);
    try {
      await linkDrill({
        sessionId,
        drillId: drill.id,
      });
      toast.success(`"${drill.title}" added to session itinerary`);
    } catch {
      toast.error("Failed to link drill to session");
    } finally {
      setAddingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] flex flex-col w-[calc(100vw-2rem)] sm:max-w-2xl p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="font-display text-lg">Add Drill to Session Itinerary</DialogTitle>
          <DialogDescription className="text-xs">
            Select tactical routines, rondos, or physical conditioning drills to structure this practice session.
          </DialogDescription>
        </DialogHeader>

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 py-2 border-y">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search drills by name or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="passing_rondos">Passing & Rondos</SelectItem>
                <SelectItem value="tactical_possession">Tactical & Positional</SelectItem>
                <SelectItem value="defending_pressing">Defending & Pressing</SelectItem>
                <SelectItem value="ball_mastery">Ball Mastery & 1v1</SelectItem>
                <SelectItem value="shooting_finishing">Shooting & Finishing</SelectItem>
                <SelectItem value="agility_speed">Agility & Speed</SelectItem>
                <SelectItem value="goalkeeping">Goalkeeping</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Drills List */}
        <div className="flex-1 overflow-y-auto min-h-0 space-y-2.5 py-3 pr-1">
          {filteredDrills.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No drills match your filter criteria.
            </div>
          ) : (
            filteredDrills.map((drill) => {
              const isAlreadyAdded = currentDrillIds.includes(drill.id);
              const isAdding = addingId === drill.id;

              return (
                <div
                  key={drill.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-card/60 hover:bg-card hover:border-primary/40 transition-colors"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-sm text-foreground">{drill.title}</span>
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
                      <span className="flex items-center gap-1">
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
                          {drill.equipment.slice(0, 2).join(", ")}
                          {drill.equipment.length > 2 && "..."}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center justify-end">
                    {isAlreadyAdded ? (
                      <Badge
                        variant="outline"
                        className="h-8 px-3 text-xs gap-1 border-primary/40 text-primary bg-primary/5 font-medium"
                      >
                        <Check className="size-3.5" />
                        <span>In Itinerary</span>
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleLink(drill)}
                        disabled={isAdding}
                        className="h-8 text-xs font-semibold gap-1"
                      >
                        <Plus className="size-3.5" />
                        <span>Add</span>
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
