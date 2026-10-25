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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import type { EquipmentType, TacticalPhase } from "@/domain/tactics/tactical-domain.ts";

interface TacticalBoardControlsProps {
  phases: TacticalPhase[];
  activePhaseIndex: number;
  onSelectPhase: (index: number) => void;
  onAddPhase: () => void;
  onDuplicatePhase: () => void;
  onDeletePhase: (index: number) => void;
  onAddEquipment: (type: EquipmentType) => void;
  selectedCount?: number;
  onClearSelection?: () => void;
}

export const TacticalBoardControls: React.FC<TacticalBoardControlsProps> = ({
  phases,
  activePhaseIndex,
  onSelectPhase,
  onAddPhase,
  onDuplicatePhase,
  onDeletePhase,
  onAddEquipment,
  selectedCount = 0,
  onClearSelection,
}) => {
  return (
    <div
      id="tactical-apparatus-deployment-bar"
      className="flex flex-wrap items-center justify-between gap-2.5 w-full bg-[#0D1826]/90 backdrop-blur-md border border-[#1E3249] rounded-xl p-3 shadow-md text-white text-xs"
    >
      {/* Left: Phase Management */}
      <div className="flex flex-wrap items-center gap-2">
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

      {/* Right: Field Apparatus & Equipment */}
      <div className="flex flex-wrap items-center gap-1.5 ml-auto">
        <span className="text-[10px] text-gray-400 font-semibold mr-1">Equipment:</span>

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
              <span>More Apparatus</span>
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
