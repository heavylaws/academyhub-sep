import React from "react";
import {
  Plus,
  Trash2,
  Copy,
  Shield,
  Target,
  Goal,
  ChevronDown,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import type { BoardInteractionMode } from "./tactical-board-canvas.tsx";
import type { EquipmentType, PitchType, TacticalPhase } from "@/domain/tactics/tactical-domain.ts";

interface TacticalBoardControlsProps {
  mode?: BoardInteractionMode;
  onSetMode?: (mode: BoardInteractionMode) => void;
  activeColor?: string;
  onSetColor?: (color: string) => void;
  pitchType: PitchType;
  onSetPitchType: (type: PitchType) => void;
  phases: TacticalPhase[];
  activePhaseIndex: number;
  onSelectPhase: (index: number) => void;
  onAddPhase: () => void;
  onDuplicatePhase: () => void;
  onDeletePhase: (index: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
  onResetPlayback?: () => void;
  showHeatmap?: boolean;
  onToggleHeatmap?: () => void;
  onClearAnnotations?: () => void;
  onAddPlayer: (team: "home" | "away" | "neutral" | "gk_home") => void;
  onAddEquipment: (type: EquipmentType) => void;
  selectedCount?: number;
  onClearSelection?: () => void;
}

export const TacticalBoardControls: React.FC<TacticalBoardControlsProps> = ({
  pitchType,
  onSetPitchType,
  phases,
  activePhaseIndex,
  onSelectPhase,
  onAddPhase,
  onDuplicatePhase,
  onDeletePhase,
  onAddPlayer,
  onAddEquipment,
  selectedCount = 0,
  onClearSelection,
}) => {
  return (
    <div
      id="tactical-apparatus-deployment-bar"
      className="flex flex-wrap items-center justify-between gap-2.5 w-full bg-[#0D1826]/90 backdrop-blur-md border border-[#1E3249] rounded-xl p-3 shadow-md text-white text-xs"
    >
      {/* Left: Pitch Selector & Phase Management */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={pitchType} onValueChange={(val) => onSetPitchType(val as PitchType)}>
          <SelectTrigger className="h-8 w-[160px] text-xs bg-[#142337] border-[#1E334A] text-white">
            <SelectValue placeholder="Pitch type" />
          </SelectTrigger>
          <SelectContent className="bg-[#0D1826] border-[#1E3249] text-white text-xs">
            <SelectItem value="full">⚽ Full Pitch (105×68)</SelectItem>
            <SelectItem value="attacking_half">⚽ Attacking Half</SelectItem>
            <SelectItem value="defending_half">⚽ Defending Half</SelectItem>
            <SelectItem value="penalty_box">⚽ 18-Yard Box</SelectItem>
            <SelectItem value="rondo_grid">⚽ Rondo / Grid</SelectItem>
            <SelectItem value="basketball_half">🏀 Basketball Half Court</SelectItem>
            <SelectItem value="basketball_full">🏀 Basketball Full Court</SelectItem>
            <SelectItem value="futsal_court">⚡ Futsal Court</SelectItem>
            <SelectItem value="handball_court">🤾 Handball Court</SelectItem>
            <SelectItem value="volleyball_court">🏐 Volleyball Court</SelectItem>
            <SelectItem value="rugby_pitch">🏉 Rugby Pitch</SelectItem>
          </SelectContent>
        </Select>

        {/* Phase Management Buttons */}
        <div className="flex items-center gap-1 bg-[#142337] p-1 rounded-lg border border-[#1E334A]">
          <span className="text-[10px] text-gray-400 font-semibold px-1">Phase:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddPhase}
            className="h-6 px-2 text-xs font-bold text-[#00E5FF] hover:bg-[#1E3550] gap-1"
            title="Add Next Phase"
          >
            <Plus className="size-3" />
            <span>Add</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDuplicatePhase}
            className="h-6 px-2 text-xs text-gray-300 hover:text-white hover:bg-[#1E3550] gap-1"
            title="Duplicate Active Phase"
          >
            <Copy className="size-3" />
            <span>Copy</span>
          </Button>
          {phases.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeletePhase(activePhaseIndex)}
              className="h-6 px-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/60"
              title="Delete Active Phase"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="flex items-center gap-1.5 bg-[#00E5FF]/15 border border-[#00E5FF]/40 px-2 py-1 rounded-lg">
            <span className="text-[11px] font-bold text-[#00E5FF]">
              {selectedCount} selected
            </span>
            <button
              onClick={onClearSelection}
              className="text-[10px] text-gray-400 hover:text-white underline ml-1"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Right: Quick Deploy Players & Field Apparatus */}
      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
        {/* Add Home Player */}
        <button
          onClick={() => onAddPlayer("home")}
          className="px-2.5 py-1.5 bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/40 rounded-lg text-xs font-semibold text-[#00E5FF] transition-all flex items-center gap-1"
        >
          <Plus className="size-3" />
          <span>Home</span>
        </button>

        {/* Add Away Defender */}
        <button
          onClick={() => onAddPlayer("away")}
          className="px-2.5 py-1.5 bg-[#FF6E40]/15 hover:bg-[#FF6E40]/25 border border-[#FF6E40]/40 rounded-lg text-xs font-semibold text-[#FF6E40] transition-all flex items-center gap-1"
        >
          <Plus className="size-3" />
          <span>Away</span>
        </button>

        {/* Add Neutral Joker */}
        <button
          onClick={() => onAddPlayer("neutral")}
          className="px-2.5 py-1.5 bg-[#69F0AE]/15 hover:bg-[#69F0AE]/25 border border-[#69F0AE]/40 rounded-lg text-xs font-semibold text-[#69F0AE] transition-all flex items-center gap-1"
        >
          <Plus className="size-3" />
          <span>Neutral</span>
        </button>

        {/* Add Training Cone */}
        <button
          onClick={() => onAddEquipment("cone")}
          className="px-2.5 py-1.5 bg-[#142337] hover:bg-[#1B2F48] border border-[#1E334A] rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all flex items-center gap-1"
          title="Add Cone"
        >
          <Target className="size-3 text-amber-500" />
          <span>Cone</span>
        </button>

        {/* Add Free-kick Mannequin */}
        <button
          onClick={() => onAddEquipment("mannequin")}
          className="px-2.5 py-1.5 bg-[#142337] hover:bg-[#1B2F48] border border-[#1E334A] rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all flex items-center gap-1"
          title="Add Defender Mannequin"
        >
          <Shield className="size-3 text-amber-600" />
          <span>Mannequin</span>
        </button>

        {/* Add Target Mini Goal */}
        <button
          onClick={() => onAddEquipment("mini_goal")}
          className="px-2.5 py-1.5 bg-[#142337] hover:bg-[#1B2F48] border border-[#1E334A] rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all flex items-center gap-1"
          title="Add Target Mini Goal"
        >
          <Goal className="size-3 text-emerald-400" />
          <span>Mini-Goal</span>
        </button>

        {/* Expanded Apparatus Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="px-2.5 py-1.5 bg-[#142337] hover:bg-[#1B2F48] border border-dashed border-[#1E334A] rounded-lg text-xs font-medium text-gray-300 hover:text-white transition-all flex items-center gap-1"
              title="More Training Field Apparatus"
            >
              <span>Apparatus</span>
              <ChevronDown className="size-3 text-gray-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#0D1826] border-[#1E3249] text-white text-xs">
            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-gray-400">
              Training Field Apparatus
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="hover:bg-[#16273B] cursor-pointer"
              onClick={() => onAddEquipment("agility_pole")}
            >
              🚩 Slalom Agility Pole
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-[#16273B] cursor-pointer"
              onClick={() => onAddEquipment("hurdle")}
            >
              🏃 Speed Hurdle
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-[#16273B] cursor-pointer"
              onClick={() => onAddEquipment("speed_ladder")}
            >
              🪜 Agility Speed Ladder
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-[#16273B] cursor-pointer"
              onClick={() => onAddEquipment("passing_gate")}
            >
              ⭕ Cone Passing Gate
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-[#16273B] cursor-pointer"
              onClick={() => onAddEquipment("rebounder_board")}
            >
              🧱 Wall Rebounder Board
            </DropdownMenuItem>
            <DropdownMenuItem
              className="hover:bg-[#16273B] cursor-pointer"
              onClick={() => onAddEquipment("ball_cart")}
            >
              ⚽ Ball Supply Cart
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
