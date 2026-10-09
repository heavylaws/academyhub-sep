import React from "react";
import {
  Layers,
  Eye,
  EyeOff,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

export type TacticalLayerType = "OFFENSE" | "DEFENSE" | "NEUTRAL" | "BALL_CORRIDORS";

export interface TacticalLayerConfig {
  id: TacticalLayerType;
  name: string;
  visible: boolean;
  color: string;
  pathColor: string;
  showTrajectories: boolean;
}

export const DEFAULT_TACTICAL_LAYERS: Record<TacticalLayerType, TacticalLayerConfig> = {
  OFFENSE: {
    id: "OFFENSE",
    name: "Offensive Phase",
    visible: true,
    color: "#00E5FF",
    pathColor: "#00E5FF",
    showTrajectories: true,
  },
  DEFENSE: {
    id: "DEFENSE",
    name: "Defensive Block",
    visible: true,
    color: "#FF6E40",
    pathColor: "#FF6E40",
    showTrajectories: true,
  },
  NEUTRAL: {
    id: "NEUTRAL",
    name: "Goalkeepers & Neutrals",
    visible: true,
    color: "#69F0AE",
    pathColor: "#69F0AE",
    showTrajectories: true,
  },
  BALL_CORRIDORS: {
    id: "BALL_CORRIDORS",
    name: "Ball & Passing Corridors",
    visible: true,
    color: "#FFD600",
    pathColor: "#FFD600",
    showTrajectories: true,
  },
};

const PRESET_PATH_COLORS = [
  { name: "Electric Cyan", hex: "#00E5FF" },
  { name: "Neon Coral", hex: "#FF6E40" },
  { name: "Acid Yellow", hex: "#FFD600" },
  { name: "Mint Green", hex: "#00E676" },
  { name: "Hot Pink", hex: "#FF4081" },
  { name: "Ice White", hex: "#FFFFFF" },
];

interface TacticalLayersPanelProps {
  layers: Record<TacticalLayerType, TacticalLayerConfig>;
  isOpen: boolean;
  onClose: () => void;
  onToggleLayer: (layerId: TacticalLayerType) => void;
  onUpdateLayerPathColor: (layerId: TacticalLayerType, pathColor: string) => void;
  onToggleTrajectories: (layerId: TacticalLayerType) => void;
  onResetLayers: () => void;
}

export const TacticalLayersPanel: React.FC<TacticalLayersPanelProps> = ({
  layers,
  isOpen,
  onClose,
  onToggleLayer,
  onUpdateLayerPathColor,
  onToggleTrajectories,
  onResetLayers,
}) => {
  if (!isOpen) return null;

  const layerList = Object.values(layers);

  return (
    <div
      id="tactical-layers-overlay"
      className="absolute top-16 right-4 z-40 w-80 sm:w-92 bg-[#0D1826]/98 backdrop-blur-md border border-[#1E3550] rounded-2xl shadow-2xl p-4 text-white flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-[#1A2C42]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/40">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wide">Tactical Animation Layers</h3>
            <p className="text-[11px] text-gray-400">
              Stack & isolate simultaneous movement paths
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            id="tactical-layers-reset-btn"
            onClick={onResetLayers}
            className="p-1.5 text-gray-400 hover:text-white rounded hover:bg-[#16273B] transition-colors"
            title="Reset All Layers to Default"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            id="tactical-layers-close-btn"
            onClick={onClose}
            className="text-gray-400 hover:text-white px-2 py-0.5 rounded text-xs hover:bg-[#16273B] transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Stacked Layers List */}
      <div className="flex flex-col gap-2.5 max-h-[360px] overflow-y-auto pr-1">
        {layerList.map((layer) => {
          return (
            <div
              key={layer.id}
              id={`tactical-layer-item-${layer.id.toLowerCase()}`}
              className={`p-2.5 rounded-xl border transition-all ${
                layer.visible
                  ? "bg-[#132236] border-[#203752]"
                  : "bg-[#0E1724] border-[#182638] opacity-60"
              }`}
            >
              {/* Top row: Name, visibility toggle & path toggle */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    id={`toggle-visibility-${layer.id.toLowerCase()}`}
                    onClick={() => onToggleLayer(layer.id)}
                    className={`p-1.5 rounded-lg transition-colors border ${
                      layer.visible
                        ? "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40"
                        : "bg-[#18283B] text-gray-400 border-transparent hover:text-white"
                    }`}
                    title={layer.visible ? "Hide Layer" : "Show Layer"}
                  >
                    {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full shadow-xs"
                        style={{ backgroundColor: layer.color }}
                      />
                      <span className="text-xs font-bold text-gray-200">{layer.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {layer.id === "OFFENSE" && "Attacking runs & cutbacks"}
                      {layer.id === "DEFENSE" && "Defensive press & shift"}
                      {layer.id === "NEUTRAL" && "Goalkeepers & neutrals"}
                      {layer.id === "BALL_CORRIDORS" && "Passing channels & trajectories"}
                    </span>
                  </div>
                </div>

                {/* Show/Hide Trajectory Lines */}
                <button
                  id={`toggle-paths-${layer.id.toLowerCase()}`}
                  onClick={() => onToggleTrajectories(layer.id)}
                  disabled={!layer.visible}
                  className={`px-2 py-1 rounded text-[10px] font-semibold transition-all border ${
                    layer.showTrajectories
                      ? "bg-[#1E3A5A] text-[#00E5FF] border-[#00E5FF]/50"
                      : "bg-[#162537] text-gray-400 border-transparent"
                  }`}
                  title="Toggle Vector Movement Lines"
                >
                  Paths {layer.showTrajectories ? "ON" : "OFF"}
                </button>
              </div>

              {/* Sub-row: Colored Path Swatches */}
              {layer.visible && (
                <div className="mt-2.5 pt-2 border-t border-[#1B2F46] flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400 font-medium">Path Color:</span>
                  <div className="flex items-center gap-1">
                    {PRESET_PATH_COLORS.map((pc) => {
                      const isSelected = layer.pathColor === pc.hex;
                      return (
                        <button
                          key={pc.hex}
                          onClick={() => onUpdateLayerPathColor(layer.id, pc.hex)}
                          className={`size-4.5 rounded-full transition-transform ${
                            isSelected ? "ring-2 ring-white scale-110" : "hover:scale-105 opacity-80 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: pc.hex }}
                          title={pc.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
