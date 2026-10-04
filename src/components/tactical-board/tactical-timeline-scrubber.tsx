import React from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Repeat,
  Gauge,
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

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    onScrubGlobal(val);
  };

  const SPEED_OPTIONS = [0.5, 1.0, 1.5, 2.0];

  return (
    <div className="flex flex-col gap-2 w-full bg-card/90 backdrop-blur-md border border-border/80 rounded-xl p-3 shadow-xs text-xs">
      {/* Top Row: Phase Indicator & Elapsed Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5 bg-primary/10 border-primary/30 text-primary">
            Phase {activePhaseIndex + 1} of {phases.length}
          </Badge>
          <span className="font-bold text-foreground truncate max-w-[200px] sm:max-w-xs">
            {currentPhase.title || `Phase ${activePhaseIndex + 1}`}
          </span>
        </div>

        <div className="flex items-center gap-1 font-mono text-xs font-semibold text-muted-foreground">
          <span className="text-foreground">{currentElapsed.toFixed(1)}s</span>
          <span>/</span>
          <span>{totalDuration.toFixed(1)}s</span>
        </div>
      </div>

      {/* Middle Row: Global Multi-Phase Scrubber Bar */}
      <div className="relative flex items-center w-full py-1">
        <input
          type="range"
          min="0"
          max="1"
          step="0.005"
          value={globalProgress}
          onChange={handleSliderChange}
          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none"
        />

        {/* Phase divider markers */}
        {phases.length > 1 && (
          <div className="absolute inset-x-0 top-0 h-2 pointer-events-none flex justify-between px-1">
            {phases.map((p, idx) => {
              if (idx === 0) return null;
              let accumulated = 0;
              for (let i = 0; i < idx; i++) {
                accumulated += phases[i].durationSeconds || 4;
              }
              const leftPercent = (accumulated / totalDuration) * 100;
              return (
                <div
                  key={p.id}
                  style={{ left: `${leftPercent}%` }}
                  className="absolute top-0 bottom-0 w-0.5 bg-background/80"
                  title={`Start of Phase ${idx + 1}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Row: Transport Controls & Speed Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-border/50">
        {/* Playback Buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onReset}
            className="size-8 rounded-lg"
            title="Rewind to Phase 1"
          >
            <RotateCcw className="size-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStepPhase(false)}
            disabled={activePhaseIndex === 0}
            className="size-8 rounded-lg"
            title="Step to Previous Phase"
          >
            <SkipBack className="size-3.5" />
          </Button>

          <Button
            variant={isPlaying ? "secondary" : "default"}
            size="sm"
            onClick={onTogglePlay}
            className="h-8 px-3 font-bold gap-1.5 rounded-lg"
          >
            {isPlaying ? (
              <>
                <Pause className="size-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 fill-current" />
                <span>Play Animation</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onStepPhase(true)}
            disabled={activePhaseIndex === phases.length - 1}
            className="size-8 rounded-lg"
            title="Step to Next Phase"
          >
            <SkipForward className="size-3.5" />
          </Button>

          <Button
            variant={isLooping ? "secondary" : "ghost"}
            size="icon"
            onClick={onToggleLoop}
            className={`size-8 rounded-lg ${isLooping ? "text-primary" : "text-muted-foreground"}`}
            title={isLooping ? "Loop Enabled" : "Loop Disabled"}
          >
            <Repeat className="size-3.5" />
          </Button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border">
          <span className="text-[10px] font-bold text-muted-foreground uppercase px-1 flex items-center gap-1">
            <Gauge className="size-3" />
            <span>Tempo:</span>
          </span>
          {SPEED_OPTIONS.map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => onSetSpeed(speed)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                playbackSpeed === speed
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
