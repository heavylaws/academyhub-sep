import React from "react";
import {
  MousePointer,
  Pen,
  MoveRight,
  GitCommit,
  Activity,
  Circle,
  Zap,
  StickyNote,
  Eraser,
  Undo2,
  Trash2,
  Flame,
  Layers,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

export type TelestratorToolType =
  | "MOVE"
  | "PEN"
  | "ARROW"
  | "PASS"
  | "DRIBBLE"
  | "ZONE"
  | "LASER"
  | "NOTE"
  | "ERASER";

export const TELESTRATOR_COLORS = [
  { hex: "#FFD600", name: "Tactical Yellow" },
  { hex: "#00E5FF", name: "Attack Cyan" },
  { hex: "#FF6E40", name: "Defense Orange" },
  { hex: "#00E676", name: "Emerald Green" },
  { hex: "#FFFFFF", name: "Pure White" },
];

interface TelestratorToolbarProps {
  activeTool: TelestratorToolType;
  activeColor: string;
  isDashed: boolean;
  canUndo: boolean;
  showHeatmap?: boolean;
  isLayersOpen?: boolean;
  isFastChangesOpen?: boolean;
  onSelectTool: (tool: TelestratorToolType) => void;
  onSelectColor: (color: string) => void;
  onToggleDashed: () => void;
  onToggleHeatmap?: () => void;
  onToggleLayers?: () => void;
  onToggleFastChanges?: () => void;
  onUndo: () => void;
  onClearAll: () => void;
}

export const TelestratorToolbar: React.FC<TelestratorToolbarProps> = ({
  activeTool,
  activeColor,
  isDashed,
  canUndo,
  showHeatmap = false,
  isLayersOpen = false,
  isFastChangesOpen = false,
  onSelectTool,
  onSelectColor,
  onToggleDashed,
  onToggleHeatmap,
  onToggleLayers,
  onToggleFastChanges,
  onUndo,
  onClearAll,
}) => {
  const tools = [
    {
      id: "MOVE" as TelestratorToolType,
      label: "Move",
      tooltip: "Move Player & Targets: Drag player marker or destination handle",
      icon: MousePointer,
    },
    {
      id: "PEN" as TelestratorToolType,
      label: "Pen",
      tooltip: "Tactical Pen: Freehand drawing on the pitch",
      icon: Pen,
    },
    {
      id: "ARROW" as TelestratorToolType,
      label: "Arrow",
      tooltip: "Movement Arrow: Drag from player to set destination run",
      icon: MoveRight,
    },
    {
      id: "PASS" as TelestratorToolType,
      label: "Pass",
      tooltip: "Passing Vector: Drag from ball to set pass corridor",
      icon: GitCommit,
    },
    {
      id: "DRIBBLE" as TelestratorToolType,
      label: "Dribble",
      tooltip: "Dribble Path: Squiggly ball carrier line",
      icon: Activity,
    },
    {
      id: "ZONE" as TelestratorToolType,
      label: "Zone",
      tooltip: "Pressing Zone: Mark tactical space or pressing trap",
      icon: Circle,
    },
    {
      id: "LASER" as TelestratorToolType,
      label: "Laser",
      tooltip: "Laser Pointer: Live pointer without leaving marks",
      icon: Zap,
    },
    {
      id: "NOTE" as TelestratorToolType,
      label: "Note",
      tooltip: "Sticky Note: Tap pitch to pin coaching instruction",
      icon: StickyNote,
    },
    {
      id: "ERASER" as TelestratorToolType,
      label: "Eraser",
      tooltip: "Eraser: Remove nearby drawings",
      icon: Eraser,
    },
  ];

  return (
    <div
      id="telestrator-toolbar"
      className="bg-[#0D1826]/95 backdrop-blur-md border border-[#1E3249] rounded-xl p-2 shadow-xl flex flex-wrap items-center justify-between gap-2 text-white"
    >
      {/* Drawing tools */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              id={`telestrator-tool-${t.id.toLowerCase()}`}
              onClick={() => onSelectTool(t.id)}
              className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold ${
                isActive
                  ? "bg-[#00E5FF] text-[#0A131F] shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                  : "bg-[#142337] text-gray-300 hover:text-white hover:bg-[#1B2F48]"
              }`}
              title={t.tooltip || t.label}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden md:inline text-[11px]">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Colors, Heatmap toggle, Layers & Actions */}
      <div className="flex items-center gap-2">
        {/* Color swatches */}
        <div className="flex items-center gap-1 bg-[#142337] p-1 rounded-lg border border-[#1F334A]">
          {TELESTRATOR_COLORS.map((c) => {
            const isSelected = activeColor === c.hex;
            return (
              <button
                key={c.hex}
                id={`telestrator-color-${c.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                onClick={() => onSelectColor(c.hex)}
                className={`size-4.5 rounded-full transition-transform ${
                  isSelected ? "ring-2 ring-white scale-110" : "hover:scale-105 opacity-80 hover:opacity-100"
                }`}
                style={{ backgroundColor: c.hex }}
                title={c.name}
              />
            );
          })}
        </div>

        {/* Dashed toggle */}
        <button
          id="telestrator-btn-dashed"
          onClick={onToggleDashed}
          className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-colors border ${
            isDashed
              ? "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40"
              : "bg-[#142337] text-gray-400 border-transparent hover:text-white"
          }`}
          title="Toggle dashed vector line"
        >
          {isDashed ? "- - -" : "———"}
        </button>

        {/* Tactical Layers Toggle */}
        {onToggleLayers && (
          <button
            id="telestrator-btn-layers-toggle"
            onClick={onToggleLayers}
            className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold border ${
              isLayersOpen
                ? "bg-[#00E5FF] text-[#0A131F] border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                : "bg-[#142337] text-gray-300 hover:text-white hover:bg-[#1B2F48] border-[#21354D]"
            }`}
            title="Tactical Layer Stacking & Colored Movement Paths"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">Layers</span>
          </button>
        )}

        {/* Fast Adjustments Bar Toggle */}
        {onToggleFastChanges && (
          <button
            id="telestrator-btn-fast-changes-toggle"
            onClick={onToggleFastChanges}
            className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold border ${
              isFastChangesOpen
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40"
                : "bg-[#142337] text-gray-300 hover:text-white hover:bg-[#1B2F48] border-[#21354D]"
            }`}
            title="Toggle Fast Tactical Adjustments Bar"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden sm:inline text-[11px]">Adjust</span>
          </button>
        )}

        {/* Heatmap Toggle */}
        {onToggleHeatmap && (
          <button
            id="telestrator-btn-heatmap"
            onClick={onToggleHeatmap}
            className={`p-2 rounded-lg transition-colors border ${
              showHeatmap
                ? "bg-[#FF5722]/20 text-[#FF5722] border-[#FF5722]/40"
                : "bg-[#142337] text-gray-300 hover:text-white border-[#21354D]"
            }`}
            title="Toggle Intensity Heatmap"
          >
            <Flame className="w-4 h-4" />
          </button>
        )}

        {/* Undo button */}
        <button
          id="telestrator-btn-undo"
          onClick={onUndo}
          disabled={!canUndo}
          className="p-2 bg-[#142337] hover:bg-[#1B2F48] text-gray-300 hover:text-white rounded-lg transition-colors disabled:opacity-40"
          title="Undo last drawing"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Clear All drawings */}
        <button
          id="telestrator-btn-clear"
          onClick={onClearAll}
          className="p-2 bg-[#142337] hover:bg-red-950/60 text-red-400 hover:text-red-300 rounded-lg transition-colors"
          title="Clear all drawings and notes"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
