import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  type TacticalPlan,
  type TacticalPhase,
  type PlayerNode,
  type BallNode,
  type EquipmentNode,
  type TacticalAnnotation,
  type PitchType,
  interpolateTacticalPositions,
  validateTacticalPlan,
  createDefaultTacticalPlan,
} from "@/domain/tactics/tactical-domain.ts";
import {
  TacticalBoardCanvas,
  type BoardInteractionMode,
} from "./tactical-board-canvas.tsx";
import { TacticalBoardControls } from "./tactical-board-controls.tsx";
import { PlayerInspectorDrawer } from "./player-inspector-drawer.tsx";
import {
  Maximize2,
  Minimize2,
  Share2,
  Download,
  AlertCircle,
  FileText,
  Save,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";

interface TacticalBoardProps {
  initialPlan?: TacticalPlan;
  onSavePlan?: (plan: TacticalPlan) => void;
  readOnly?: boolean;
}

export const TacticalBoard: React.FC<TacticalBoardProps> = ({
  initialPlan,
  onSavePlan,
  readOnly = false,
}) => {
  // Current tactical plan state
  const [plan, setPlan] = useState<TacticalPlan>(() => {
    return initialPlan || createDefaultTacticalPlan();
  });

  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [mode, setMode] = useState<BoardInteractionMode>("select");
  const [activeColor, setActiveColor] = useState("#FFFFFF");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerNode | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Playback animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0.0 to 1.0 within current phase
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const boardWrapperRef = useRef<HTMLDivElement>(null);

  // Ensure active phase index is within bounds
  const currentPhase: TacticalPhase = useMemo(() => {
    return plan.phases[activePhaseIndex] || plan.phases[0];
  }, [plan.phases, activePhaseIndex]);

  // Animated interpolated positions when isPlaying is true
  const interpolatedState = useMemo(() => {
    if (!isPlaying) return null;
    const nextIdx = (activePhaseIndex + 1) % plan.phases.length;
    const fromPhase = currentPhase;
    const toPhase = plan.phases[nextIdx] || currentPhase;
    return interpolateTacticalPositions(fromPhase, toPhase, playbackProgress);
  }, [isPlaying, activePhaseIndex, plan.phases, currentPhase, playbackProgress]);

  // Effective displayed players and ball
  const displayPlayers: PlayerNode[] = useMemo(() => {
    if (interpolatedState) {
      return currentPhase.players.map((p) => {
        const interpolated = interpolatedState.players.find((ip) => ip.id === p.id);
        return interpolated
          ? { ...p, position: { x: interpolated.x, y: interpolated.y } }
          : p;
      });
    }
    return currentPhase.players;
  }, [interpolatedState, currentPhase.players]);

  const displayBall: BallNode = useMemo(() => {
    if (interpolatedState) {
      return {
        ...currentPhase.ball,
        x: interpolatedState.ball.x,
        y: interpolatedState.ball.y,
      };
    }
    return currentPhase.ball;
  }, [interpolatedState, currentPhase.ball]);

  // Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTimeRef.current = null;
    let frameId: number;

    const tick = (timestamp: number) => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
      }
      const deltaSeconds = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const phaseDuration = currentPhase.durationSeconds || 4;
      setPlaybackProgress((prev) => {
        const nextProgress = prev + deltaSeconds / phaseDuration;
        if (nextProgress >= 1) {
          setActivePhaseIndex((idx) => (idx + 1) % plan.phases.length);
          return 0;
        }
        return nextProgress;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying, currentPhase.durationSeconds, plan.phases.length]);

  // Phase Mutation Helpers
  const updateCurrentPhase = useCallback((updater: (prev: TacticalPhase) => TacticalPhase) => {
    setPlan((prev) => {
      const updatedPhases = [...prev.phases];
      updatedPhases[activePhaseIndex] = updater(updatedPhases[activePhaseIndex]);
      return { ...prev, phases: updatedPhases, updatedAt: new Date().toISOString() };
    });
  }, [activePhaseIndex]);

  const handleUpdatePlayers = useCallback((newPlayers: PlayerNode[]) => {
    updateCurrentPhase((p) => ({ ...p, players: newPlayers }));
  }, [updateCurrentPhase]);

  const handleUpdateBall = useCallback((newBall: BallNode) => {
    updateCurrentPhase((p) => ({ ...p, ball: newBall }));
  }, [updateCurrentPhase]);

  const handleUpdateEquipment = useCallback((newEquipment: EquipmentNode[]) => {
    updateCurrentPhase((p) => ({ ...p, equipment: newEquipment }));
  }, [updateCurrentPhase]);

  const handleAddAnnotation = useCallback((ann: TacticalAnnotation) => {
    updateCurrentPhase((p) => ({ ...p, annotations: [...p.annotations, ann] }));
  }, [updateCurrentPhase]);

  const handleRemoveAnnotation = useCallback((annId: string) => {
    updateCurrentPhase((p) => ({
      ...p,
      annotations: p.annotations.filter((a) => a.id !== annId),
    }));
  }, [updateCurrentPhase]);

  const handleClearAnnotations = useCallback(() => {
    updateCurrentPhase((p) => ({ ...p, annotations: [] }));
    toast.success("Annotations cleared for this phase");
  }, [updateCurrentPhase]);

  // Add Players
  const handleAddPlayer = useCallback((team: "home" | "away" | "neutral" | "gk_home") => {
    const newId = `p_${team}_${Date.now()}`;
    const nextNumber = currentPhase.players.filter((p) => p.team === team).length + 1;
    const defaultX = team === "home" ? 35 : team === "away" ? 65 : 50;
    const defaultY = 40 + (nextNumber * 6) % 40;

    const newPlayer: PlayerNode = {
      id: newId,
      team,
      number: nextNumber,
      role: team === "gk_home" ? "GK" : team === "neutral" ? "Wall" : "PL",
      label: `Player ${nextNumber}`,
      position: { x: defaultX, y: defaultY },
    };

    updateCurrentPhase((p) => ({ ...p, players: [...p.players, newPlayer] }));
    setSelectedPlayer(newPlayer);
    toast.success(`Added ${team} player #${nextNumber}`);
  }, [currentPhase.players, updateCurrentPhase]);

  // Add Equipment
  const handleAddEquipment = useCallback((type: "cone" | "mannequin" | "mini_goal") => {
    const newEq: EquipmentNode = {
      id: `eq_${type}_${Date.now()}`,
      type,
      position: { x: 50, y: 50 },
    };
    updateCurrentPhase((p) => ({ ...p, equipment: [...p.equipment, newEq] }));
    toast.success(`Added ${type} to center pitch`);
  }, [updateCurrentPhase]);

  // Phase Management
  const handleAddPhase = useCallback(() => {
    const newPhaseNumber = plan.phases.length + 1;
    // Clone players and ball from previous phase as a starting point
    const newPhase: TacticalPhase = {
      id: `phase_${Date.now()}`,
      phaseNumber: newPhaseNumber,
      title: `Phase ${newPhaseNumber}: Progression`,
      durationSeconds: 4,
      players: currentPhase.players.map((pl) => ({
        ...pl,
        position: pl.targetPosition || pl.position,
        targetPosition: undefined,
      })),
      ball: { ...currentPhase.ball },
      equipment: [...currentPhase.equipment],
      annotations: [],
    };

    setPlan((prev) => ({
      ...prev,
      phases: [...prev.phases, newPhase],
      updatedAt: new Date().toISOString(),
    }));
    setActivePhaseIndex(plan.phases.length);
    toast.success(`Created Phase ${newPhaseNumber}`);
  }, [plan.phases.length, currentPhase]);

  const handleDuplicatePhase = useCallback(() => {
    const dupPhase: TacticalPhase = {
      ...currentPhase,
      id: `phase_${Date.now()}`,
      phaseNumber: plan.phases.length + 1,
      title: `${currentPhase.title} (Copy)`,
    };
    setPlan((prev) => ({
      ...prev,
      phases: [...prev.phases, dupPhase],
      updatedAt: new Date().toISOString(),
    }));
    setActivePhaseIndex(plan.phases.length);
    toast.success("Phase duplicated");
  }, [currentPhase, plan.phases.length]);

  const handleDeletePhase = useCallback((idx: number) => {
    if (plan.phases.length <= 1) return;
    setPlan((prev) => {
      const remaining = prev.phases.filter((_, i) => i !== idx);
      const renumbered = remaining.map((p, i) => ({ ...p, phaseNumber: i + 1 }));
      return { ...prev, phases: renumbered, updatedAt: new Date().toISOString() };
    });
    setActivePhaseIndex((prev) => Math.max(0, prev - 1));
    toast.info("Phase removed");
  }, [plan.phases.length]);

  // Save / Export
  const handleSave = () => {
    const valResult = validateTacticalPlan(plan);
    if (!valResult.valid) {
      toast.error(`Validation error: ${valResult.errors[0]}`);
      return;
    }
    const finalPlan = valResult.normalizedPlan || plan;
    onSavePlan?.(finalPlan);
    setSavedSuccess(true);
    toast.success("Tactical board plan saved successfully!");
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(plan, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${plan.title.replace(/\s+/g, "_").toLowerCase()}_tactical_plan.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tactical plan exported as JSON");
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!boardWrapperRef.current) return;
    if (!isFullscreen) {
      if (boardWrapperRef.current.requestFullscreen) {
        boardWrapperRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Ball possession toggle
  const handleToggleBallPossession = (playerId: string) => {
    const targetPlayer = currentPhase.players.find((p) => p.id === playerId);
    if (!targetPlayer) return;
    const isAlreadyAttached = currentPhase.ball.attachedPlayerId === playerId;

    if (isAlreadyAttached) {
      updateCurrentPhase((p) => ({
        ...p,
        ball: { ...p.ball, attachedPlayerId: undefined },
        players: p.players.map((pl) => ({ ...pl, hasBall: false })),
      }));
    } else {
      updateCurrentPhase((p) => ({
        ...p,
        ball: {
          ...p.ball,
          x: targetPlayer.position.x,
          y: targetPlayer.position.y,
          attachedPlayerId: playerId,
        },
        players: p.players.map((pl) => ({
          ...pl,
          hasBall: pl.id === playerId,
        })),
      }));
    }
  };

  return (
    <div
      ref={boardWrapperRef}
      className={`flex flex-col gap-3 w-full max-w-6xl mx-auto ${
        isFullscreen ? "p-4 bg-background h-screen overflow-y-auto" : ""
      }`}
    >
      {/* Tactical Board Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-card/60 backdrop-blur-sm border rounded-xl px-4 py-2.5 shadow-xs">
        <div className="flex items-center gap-2.5">
          <Badge variant="default" className="text-xs font-bold uppercase tracking-wider">
            CoachTactics
          </Badge>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-foreground leading-tight">
              {plan.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>{plan.gridDimensions || "Full Pitch"}</span>
              <span>•</span>
              <span>{plan.phases.length} Phases</span>
              <span>•</span>
              <span className="text-emerald-500 font-medium">Domain Validated</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
            className="h-8 text-xs gap-1.5"
            title="Coaching Notes & Key Instructions"
          >
            <FileText className="size-3.5 text-primary" />
            <span className="hidden sm:inline">Notes</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="h-8 text-xs gap-1.5"
            title="Export Tactical Formation JSON"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="size-8"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>

          {!readOnly && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="h-8 px-3 text-xs font-bold gap-1.5"
            >
              {savedSuccess ? <Check className="size-3.5 text-green-300" /> : <Save className="size-3.5" />}
              <span>{savedSuccess ? "Saved" : "Save Plan"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Coaching Notes Panel (Collapsible) */}
      {showNotes && (
        <div className="bg-muted/40 border rounded-xl p-3.5 space-y-2 text-xs animate-in fade-in duration-200">
          <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="size-3.5 text-primary" /> Tactical Coaching Instructions
          </h4>
          <Textarea
            value={currentPhase.coachingNotes || ""}
            onChange={(e) =>
              updateCurrentPhase((p) => ({ ...p, coachingNotes: e.target.value }))
            }
            placeholder="Add key coaching points for this phase (e.g. body orientation, tempo, passing lanes)..."
            className="text-xs resize-none h-18 bg-background"
          />
        </div>
      )}

      {/* Main Interactive Pitch Board with Floating Drawers */}
      <div className="relative w-full">
        <TacticalBoardCanvas
          pitchType={plan.pitchType}
          players={displayPlayers}
          ball={displayBall}
          equipment={currentPhase.equipment}
          annotations={currentPhase.annotations}
          mode={mode}
          activeColor={activeColor}
          showHeatmap={showHeatmap}
          onUpdatePlayers={handleUpdatePlayers}
          onUpdateBall={handleUpdateBall}
          onUpdateEquipment={handleUpdateEquipment}
          onAddAnnotation={handleAddAnnotation}
          onRemoveAnnotation={handleRemoveAnnotation}
          onSelectPlayer={(p) => setSelectedPlayer(p)}
          selectedPlayerId={selectedPlayer?.id}
          isReadOnly={readOnly || isPlaying}
        />

        {/* Player Inspector Side Drawer */}
        <PlayerInspectorDrawer
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onUpdatePlayer={(upd) => {
            handleUpdatePlayers(
              currentPhase.players.map((pl) => (pl.id === upd.id ? upd : pl)),
            );
            setSelectedPlayer(upd);
          }}
          onDeletePlayer={(pid) => {
            handleUpdatePlayers(currentPhase.players.filter((pl) => pl.id !== pid));
            setSelectedPlayer(null);
          }}
          onToggleBallPossession={handleToggleBallPossession}
          hasBall={Boolean(currentPhase.ball.attachedPlayerId === selectedPlayer?.id)}
        />
      </div>

      {/* Tactical Board Controls Toolbar */}
      {!readOnly && (
        <TacticalBoardControls
          mode={mode}
          onSetMode={setMode}
          activeColor={activeColor}
          onSetColor={setActiveColor}
          pitchType={plan.pitchType}
          onSetPitchType={(type) => setPlan((p) => ({ ...p, pitchType: type }))}
          phases={plan.phases}
          activePhaseIndex={activePhaseIndex}
          onSelectPhase={(idx) => {
            setIsPlaying(false);
            setActivePhaseIndex(idx);
          }}
          onAddPhase={handleAddPhase}
          onDuplicatePhase={handleDuplicatePhase}
          onDeletePhase={handleDeletePhase}
          isPlaying={isPlaying}
          onTogglePlay={() => {
            if (isPlaying) {
              setIsPlaying(false);
              setPlaybackProgress(0);
            } else {
              setIsPlaying(true);
            }
          }}
          onResetPlayback={() => {
            setIsPlaying(false);
            setActivePhaseIndex(0);
            setPlaybackProgress(0);
          }}
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
          onClearAnnotations={handleClearAnnotations}
          onAddPlayer={handleAddPlayer}
          onAddEquipment={handleAddEquipment}
        />
      )}
    </div>
  );
};
