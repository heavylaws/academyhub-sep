import React from "react";
import {
  MousePointer,
  ArrowRight,
  TrendingUp,
  CircleDot,
  Pencil,
  Eraser,
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Copy,
  Flame,
  LayoutGrid,
  Shield,
  Target,
  Goal,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import type { BoardInteractionMode } from "./tactical-board-canvas.tsx";
import type { PitchType, TacticalPhase } from "@/domain/tactics/tactical-domain.ts";

interface TacticalBoardControlsProps {
  mode: BoardInteractionMode;
  onSetMode: (mode: BoardInteractionMode) => void;
  activeColor: string;
  onSetColor: (color: string) => void;
  pitchType: PitchType;
  onSetPitchType: (type: PitchType) => void;
  phases: TacticalPhase[];
  activePhaseIndex: number;
  onSelectPhase: (index: number) => void;
  onAddPhase: () => void;
  onDuplicatePhase: () => void;
  onDeletePhase: (index: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetPlayback: () => void;
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  onClearAnnotations: () => void;
  onAddPlayer: (team: "home" | "away" | "neutral" | "gk_home") => void;
  onAddEquipment: (type: "cone" | "mannequin" | "mini_goal") => void;
}

const PALETTE = [
  { label: "White", value: "#FFFFFF", bg: "bg-white" },
  { label: "Yellow", value: "#FBBF24", bg: "bg-amber-400" },
  { label: "Blue", value: "#60A5FA", bg: "bg-blue-400" },
  { label: "Green", value: "#34D399", bg: "bg-emerald-400" },
  { label: "Red", value: "#F87171", bg: "bg-red-400" },
];

export const TacticalBoardControls: React.FC<TacticalBoardControlsProps> = ({
  mode,
  onSetMode,
  activeColor,
  onSetColor,
  pitchType,
  onSetPitchType,
  phases,
  activePhaseIndex,
  onSelectPhase,
  onAddPhase,
  onDuplicatePhase,
  onDeletePhase,
  isPlaying,
  onTogglePlay,
  onResetPlayback,
  showHeatmap,
  onToggleHeatmap,
  onClearAnnotations,
  onAddPlayer,
  onAddEquipment,
}) => {
  return (
    <div className="flex flex-col gap-3 w-full bg-card/60 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-xs">
      {/* Top Bar: Pitch Selector, Timeline & Playback */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
        {/* Pitch type view */}
        <div className="flex items-center gap-1.5">
          <Select value={pitchType} onValueChange={(val) => onSetPitchType(val as PitchType)}>
            <SelectTrigger className="h-9 w-[150px] text-xs">
              <SelectValue placeholder="Pitch type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">Full Pitch (105×68)</SelectItem>
              <SelectItem value="attacking_half">Attacking Half</SelectItem>
              <SelectItem value="defending_half">Defending Half</SelectItem>
              <SelectItem value="penalty_box">18-Yard Box</SelectItem>
              <SelectItem value="rondo_grid">Rondo / Grid</SelectItem>
            </SelectContent>
          </Select>

          {/* Heatmap toggle */}
          <Button
            variant={showHeatmap ? "default" : "outline"}
            size="sm"
            onClick={onToggleHeatmap}
            className="h-9 px-2.5 text-xs gap-1"
            title="Toggle team coverage & density heatmap"
          >
            <Flame className={`size-3.5 ${showHeatmap ? "text-amber-300" : "text-amber-500"}`} />
            <span className="hidden sm:inline">Density Heatmap</span>
          </Button>
        </div>

        {/* Phase Timeline & Playback */}
        <div className="flex items-center gap-2">
          {/* Phase selection tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-[260px] sm:max-w-none">
            {phases.map((phase, idx) => (
              <Button
                key={phase.id}
                variant={activePhaseIndex === idx ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onSelectPhase(idx)}
                className={`h-8 px-2.5 text-xs font-semibold gap-1 shrink-0 ${
                  activePhaseIndex === idx ? "border border-primary/50 text-primary shadow-xs" : ""
                }`}
              >
                <span>Phase {phase.phaseNumber}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                  {phase.durationSeconds}s
                </Badge>
              </Button>
            ))}

            <Button
              variant="outline"
              size="icon"
              onClick={onAddPhase}
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              title="Add Next Phase"
            >
              <Plus className="size-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDuplicatePhase}
              className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
              title="Duplicate Current Phase"
            >
              <Copy className="size-3.5" />
            </Button>
            {phases.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDeletePhase(activePhaseIndex)}
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                title="Delete Current Phase"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>

          {/* Animated playback control */}
          <div className="flex items-center gap-1 border-l border-border/80 pl-2">
            <Button
              variant={isPlaying ? "default" : "secondary"}
              size="sm"
              onClick={onTogglePlay}
              className="h-9 px-3 gap-1.5 font-bold text-xs"
            >
              {isPlaying ? <Pause className="size-3.5" /> : <Play className="size-3.5 fill-current" />}
              <span>{isPlaying ? "Pause" : "Play Drill"}</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={onResetPlayback}
              className="size-9"
              title="Reset to Phase 1"
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Drawing Tools, Color Picker, and Quick Add Pieces */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Interaction / Drawing Tool Buttons */}
        <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-1 rounded-lg border">
          <Button
            variant={mode === "select" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("select")}
            className="h-8 px-2.5 text-xs gap-1.5 font-medium"
            title="Move / Drag Players & Ball"
          >
            <MousePointer className="size-3.5" />
            <span>Move</span>
          </Button>

          <Button
            variant={mode === "pass_line" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("pass_line")}
            className="h-8 px-2 text-xs gap-1"
            title="Passing Line (Dashed Arrow)"
          >
            <ArrowRight className="size-3.5 text-blue-400 stroke-dasharray" />
            <span>Pass</span>
          </Button>

          <Button
            variant={mode === "run_arrow" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("run_arrow")}
            className="h-8 px-2 text-xs gap-1"
            title="Player Run (Solid Arrow)"
          >
            <TrendingUp className="size-3.5 text-emerald-400" />
            <span>Run</span>
          </Button>

          <Button
            variant={mode === "dribble_wave" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("dribble_wave")}
            className="h-8 px-2 text-xs gap-1"
            title="Dribble Trajectory"
          >
            <ArrowRight className="size-3.5 text-amber-400" />
            <span>Dribble</span>
          </Button>

          <Button
            variant={mode === "press_zone" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("press_zone")}
            className="h-8 px-2 text-xs gap-1"
            title="Pressing / Tactical Zone"
          >
            <CircleDot className="size-3.5 text-red-400" />
            <span>Zone</span>
          </Button>

          <Button
            variant={mode === "freehand" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("freehand")}
            className="h-8 px-2 text-xs gap-1"
            title="Freehand Sketch"
          >
            <Pencil className="size-3.5" />
            <span>Draw</span>
          </Button>

          <Button
            variant={mode === "eraser" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onSetMode("eraser")}
            className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-destructive"
            title="Erase Annotation"
          >
            <Eraser className="size-3.5" />
            <span>Erase</span>
          </Button>
        </div>

        {/* Color Palette */}
        {mode !== "select" && mode !== "eraser" && (
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border">
            {PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => onSetColor(c.value)}
                className={`size-6 rounded-full ${c.bg} border transition-transform ${
                  activeColor === c.value
                    ? "ring-2 ring-primary ring-offset-1 scale-110"
                    : "opacity-80 hover:opacity-100"
                }`}
                title={c.label}
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAnnotations}
              className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-destructive ml-1"
            >
              Clear All
            </Button>
          </div>
        )}

        {/* Quick Add Elements */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPlayer("home")}
            className="h-8 px-2 text-xs font-semibold gap-1"
          >
            <Plus className="size-3 text-blue-500" />
            <span className="text-blue-600 dark:text-blue-400">Home</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPlayer("away")}
            className="h-8 px-2 text-xs font-semibold gap-1"
          >
            <Plus className="size-3 text-red-500" />
            <span className="text-red-600 dark:text-red-400">Away</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddPlayer("neutral")}
            className="h-8 px-2 text-xs font-semibold gap-1"
          >
            <Plus className="size-3 text-orange-500" />
            <span className="text-orange-600 dark:text-orange-400">Wall/Joker</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddEquipment("cone")}
            className="h-8 px-2 text-xs gap-1"
            title="Add Cone"
          >
            <Target className="size-3 text-amber-500" />
            <span>Cone</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddEquipment("mannequin")}
            className="h-8 px-2 text-xs gap-1"
            title="Add Defender Mannequin"
          >
            <Shield className="size-3 text-amber-600" />
            <span>Mannequin</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddEquipment("mini_goal")}
            className="h-8 px-2 text-xs gap-1"
            title="Add Target Mini Goal"
          >
            <Goal className="size-3 text-red-500" />
            <span>Goal</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
