import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Gauge,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import type { TacticalPhase } from "@/domain/tactics/tactical-domain.ts";

interface TacticalTimelineScrubberProps {
  phases: TacticalPhase[];
  activePhaseIndex: number;
  localProgress: number; // 0..1 within active phase
  globalProgress: number; // 0..1 across all phases
  isPlaying: boolean;
  playbackSpeed: number; // 0.5, 1.0, 1.5, 2.0
  isLooping: boolean;
  onTogglePlay: () => void;
  onReset: () => void;
  onStepPhase: (forward: boolean) => void;
  onSelectPhase?: (index: number) => void;
  onScrubGlobal: (progress: number) => void;
  onSetSpeed: (speed: number) => void;
  onToggleLoop: () => void;
}

export const TacticalTimelineScrubber: React.FC<TacticalTimelineScrubberProps> = ({
  phases,
  activePhaseIndex,
  localProgress,
  globalProgress,
  isPlaying,
  playbackSpeed,
  isLooping,
  onTogglePlay,
  onReset,
  onStepPhase,
  onSelectPhase,
  onScrubGlobal,
  onSetSpeed,
  onToggleLoop,
}) => {
  const totalDuration = phases.reduce((acc, p) => acc + (p.durationSeconds || 4), 0);
  const currentPhase = phases[activePhaseIndex] || phases[0];

  // Calculate elapsed seconds across phases
  let elapsedBefore = 0;
  for (let i = 0; i < activePhaseIndex; i++) {
    elapsedBefore += phases[i].durationSeconds || 4;
  }
  const currentElapsed = elapsedBefore + localProgress * (currentPhase.durationSeconds || 4);

  const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0];

  return (
    <div
      id="tactical-timeline-scrubber"
      className="flex flex-col gap-2.5 w-full bg-[#0D1826]/95 backdrop-blur-md border border-[#1E3249] rounded-xl p-3 shadow-xl text-white text-xs"
    >
      {/* Top Row: Phase Indicator & Navigation Chips */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
          {phases.map((p, idx) => {
            const isActive = idx === activePhaseIndex;
            return (
              <button
                key={p.id}
                id={`timeline-phase-chip-${idx}`}
                onClick={() => onSelectPhase?.(idx)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? "bg-[#00E5FF] text-[#0A131F] border-[#00E5FF] shadow-[0_0_12px_rgba(0,229,255,0.4)]"
                    : "bg-[#142337] text-gray-300 border-[#1E334A] hover:bg-[#1B2F48] hover:text-white"
                }`}
              >
                <span>Phase {idx + 1}</span>
                {isActive && (
                  <span className="size-1.5 rounded-full bg-[#0A131F] animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-[#00E5FF] font-bold">{currentElapsed.toFixed(1)}s</span>
          <span className="text-gray-500">/</span>
          <span className="text-gray-400">{totalDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Middle Row: Speed Gradient Track (CoachTactics style) */}
      <div className="flex flex-col gap-1">
        <div
          id="timeline-speed-gradient-track"
          className="relative w-full h-3.5 bg-[#0A131F] rounded-full overflow-hidden border border-[#1E3249] shadow-inner select-none cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onScrubGlobal(clickFraction);
          }}
          title="Interactive timeline track. Click anywhere to scrub."
        >
          {/* Phase Segments */}
          <div className="absolute inset-0 flex w-full h-full">
            {phases.map((p, idx) => {
              const isActive = idx === activePhaseIndex;
              const widthPct = ((p.durationSeconds || 4) / totalDuration) * 100;
              // Color according to speed/tempo
              let segmentBg = "linear-gradient(90deg, #16364D 0%, #1A4462 100%)";
              if (playbackSpeed >= 2.0) {
                segmentBg = "linear-gradient(90deg, #FF6E40 0%, #FF1744 100%)";
              } else if (playbackSpeed >= 1.5) {
                segmentBg = "linear-gradient(90deg, #FFB300 0%, #FF7043 100%)";
              }

              return (
                <div
                  key={p.id}
                  style={{ width: `${widthPct}%`, background: segmentBg }}
                  className={`h-full border-r border-[#0D1826]/70 last:border-r-0 transition-opacity ${
                    isActive ? "opacity-90" : "opacity-45 hover:opacity-75"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectPhase?.(idx);
                  }}
                  title={`Phase ${idx + 1}: ${(p.durationSeconds || 4)}s. Click to select.`}
                />
              );
            })}
          </div>

          {/* Active Progress fill bar with glow */}
          <div
            id="timeline-progress-indicator"
            className="absolute top-0 left-0 bottom-0 bg-[#00E5FF]/70 border-r-2 border-white shadow-[0_0_10px_#00E5FF] transition-all duration-75 pointer-events-none"
            style={{ width: `${globalProgress * 100}%` }}
          />

          {/* Scrubber Playhead Thumb */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_6px_#fff] pointer-events-none -ml-0.5"
            style={{ left: `${globalProgress * 100}%` }}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono px-1">
          <span className="truncate max-w-[240px]">
            {currentPhase.title || `Phase ${activePhaseIndex + 1}`}
          </span>
          <span className="text-gray-500 hidden sm:inline">
            Click segment or scrub track to navigate
          </span>
        </div>
      </div>

      {/* Bottom Row: Transport Controls & Speed Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1A2C40]">
        {/* Playback Buttons */}
        <div className="flex items-center gap-1">
          <button
            id="timeline-btn-reset"
            onClick={onReset}
            className="p-1.5 bg-[#142337] hover:bg-[#1B2F48] text-gray-300 hover:text-white rounded-lg transition-colors"
            title="Rewind to start"
          >
            <RotateCcw className="size-3.5" />
          </button>

          <button
            id="timeline-btn-prev"
            onClick={() => onStepPhase(false)}
            disabled={activePhaseIndex === 0}
            className="p-1.5 bg-[#142337] hover:bg-[#1B2F48] text-gray-300 hover:text-white rounded-lg transition-colors disabled:opacity-40"
            title="Step to Previous Phase"
          >
            <SkipBack className="size-3.5" />
          </button>

          <button
            id="timeline-btn-play"
            onClick={onTogglePlay}
            className={`px-3.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all ${
              isPlaying
                ? "bg-amber-400 text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                : "bg-[#00E5FF] text-[#0A131F] shadow-[0_0_12px_rgba(0,229,255,0.4)]"
            }`}
          >
            {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current" />}
            <span>{isPlaying ? "Pause" : "Play"}</span>
          </button>

          <button
            id="timeline-btn-next"
            onClick={() => onStepPhase(true)}
            disabled={activePhaseIndex === phases.length - 1}
            className="p-1.5 bg-[#142337] hover:bg-[#1B2F48] text-gray-300 hover:text-white rounded-lg transition-colors disabled:opacity-40"
            title="Step to Next Phase"
          >
            <SkipForward className="size-3.5" />
          </button>

          <button
            id="timeline-btn-loop"
            onClick={onToggleLoop}
            className={`p-1.5 rounded-lg transition-colors border ${
              isLooping
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/40"
                : "bg-[#142337] text-gray-400 border-transparent hover:text-white"
            }`}
            title={isLooping ? "Loop Playback ON" : "Loop Playback OFF"}
          >
            <Repeat className="size-3.5" />
          </button>
        </div>

        {/* Speed Selector Buttons */}
        <div className="flex items-center gap-1 bg-[#142337] p-1 rounded-lg border border-[#1E334A]">
          <Gauge className="size-3.5 text-gray-400 mr-1" />
          {SPEED_OPTIONS.map((speed) => {
            const isSelected = playbackSpeed === speed;
            return (
              <button
                key={speed}
                id={`timeline-speed-btn-${speed}`}
                onClick={() => onSetSpeed(speed)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all ${
                  isSelected
                    ? "bg-[#00E5FF] text-[#0A131F]"
                    : "text-gray-300 hover:text-white hover:bg-[#1B2F48]"
                }`}
              >
                {speed}x
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
