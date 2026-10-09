import React, { useState } from "react";
import {
  ShieldAlert,
  Zap,
  ArrowUpRight,
  Target,
  Grid,
  RotateCw,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

interface FastChangesBarProps {
  onFastChange: (changeType: string) => void;
  isLoading?: boolean;
}

export const FastChangesBar: React.FC<FastChangesBarProps> = ({
  onFastChange,
  isLoading = false,
}) => {
  const [customChange, setCustomChange] = useState("");

  const presets = [
    { label: "+1 Defender Press", icon: ShieldAlert, color: "text-[#FF6E40]" },
    { label: "High Tempo 1-Touch", icon: Zap, color: "text-[#FFD600]" },
    { label: "Fullback Overlap", icon: ArrowUpRight, color: "text-[#00E5FF]" },
    { label: "Add 2 Mini-Goals", icon: Target, color: "text-[#69F0AE]" },
    { label: "Add Cones & Grid", icon: Grid, color: "text-[#FF9E80]" },
    { label: "Flip Pitch View", icon: RotateCw, color: "text-gray-300" },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customChange.trim()) return;
    onFastChange(customChange.trim());
    setCustomChange("");
  };

  return (
    <div
      id="fast-tactical-changes-bar"
      className="w-full bg-[#0D1826] border border-[#1E3147] rounded-xl p-2.5 shadow-md flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-white"
    >
      {/* Label */}
      <div className="flex items-center gap-1.5 px-2 text-xs font-semibold text-gray-400 whitespace-nowrap">
        <SlidersHorizontal className="w-3.5 h-3.5 text-[#00E5FF]" />
        <span>Fast Adjustments:</span>
      </div>

      {/* Preset Action Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {presets.map((preset) => {
          const Icon = preset.icon;
          return (
            <button
              key={preset.label}
              id={`fast-change-btn-${preset.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              onClick={() => onFastChange(preset.label)}
              disabled={isLoading}
              className="px-2.5 py-1.5 bg-[#132338] hover:bg-[#1C324E] border border-[#223953] hover:border-[#00E5FF]/40 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
            >
              <Icon className={`w-3.5 h-3.5 ${preset.color}`} />
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>

      {/* Custom Tactical Adjustment Input */}
      <form
        onSubmit={handleCustomSubmit}
        className="flex items-center gap-1.5 flex-1 min-w-[200px]"
      >
        <input
          id="custom-fast-change-input"
          type="text"
          value={customChange}
          onChange={(e) => setCustomChange(e.target.value)}
          placeholder="Custom tweak (e.g. 'Cut inside and curl')..."
          className="flex-1 bg-[#132338] border border-[#223953] focus:border-[#00E5FF] rounded-lg px-2.5 py-1 text-xs text-white placeholder-gray-500 focus:outline-none transition-colors"
        />
        <Button
          id="custom-fast-change-submit-btn"
          type="submit"
          size="sm"
          disabled={!customChange.trim() || isLoading}
          className="h-7 px-2.5 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold text-xs disabled:opacity-40 rounded-lg transition-colors gap-1"
          title="Apply Tactical Adjustment"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </form>
    </div>
  );
};
