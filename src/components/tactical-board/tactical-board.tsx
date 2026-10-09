import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  type TacticalPlan,
  type TacticalPhase,
  type PlayerNode,
  type BallNode,
  type EquipmentNode,
  type EquipmentType,
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
import {
  TelestratorToolbar,
  type TelestratorToolType,
} from "./telestrator-toolbar.tsx";
import { FastChangesBar } from "./fast-changes-bar.tsx";
import {
  TacticalLayersPanel,
  DEFAULT_TACTICAL_LAYERS,
  type TacticalLayerConfig,
  type TacticalLayerType,
} from "./tactical-layers-panel.tsx";
import { TacticalBoardControls } from "./tactical-board-controls.tsx";
import { PlayerInspectorDrawer } from "./player-inspector-drawer.tsx";
import { SquadStepperToolbar } from "./squad-stepper-toolbar.tsx";
import { TacticalSheetExportModal } from "./tactical-sheet-export-modal.tsx";
import { TacticalTimelineScrubber } from "./tactical-timeline-scrubber.tsx";
import {
  smoothInterpolatePhase,
  resolveGlobalTime,
} from "@/domain/tactics/tactical-interpolator.ts";
import { SOCCER_DRILLS } from "@/data/soccer-drills.ts";
import {
  Maximize2,
  Minimize2,
  Share2,
  Download,
  AlertCircle,
  FileText,
  Save,
  Check,
  Printer,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";

interface TacticalBoardProps {
  initialPlan?: TacticalPlan;
  onSavePlan?: (plan: TacticalPlan) => void;
  onPlanChange?: (plan: TacticalPlan) => void;
  readOnly?: boolean;
}

export const TacticalBoard: React.FC<TacticalBoardProps> = ({
  initialPlan,
  onSavePlan,
  onPlanChange,
  readOnly = false,
}) => {
  // Current tactical plan state
  const [plan, setPlan] = useState<TacticalPlan>(() => {
    return initialPlan || createDefaultTacticalPlan();
  });

  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [mode, setMode] = useState<BoardInteractionMode>("MOVE");
  const [activeTool, setActiveTool] = useState<TelestratorToolType>("MOVE");
  const [activeColor, setActiveColor] = useState("#00E5FF");
  const [isDashed, setIsDashed] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerNode | null>(null);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [printSheetOpen, setPrintSheetOpen] = useState(false);

  // Tactical Layers & Fast Changes Panels
  const [layers, setLayers] = useState<Record<TacticalLayerType, TacticalLayerConfig>>(
    DEFAULT_TACTICAL_LAYERS,
  );
  const [isLayersOpen, setIsLayersOpen] = useState(false);
  const [isFastChangesOpen, setIsFastChangesOpen] = useState(true);

  // Playback animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0.0 to 1.0 within current phase
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const boardWrapperRef = useRef<HTMLDivElement>(null);

  // Ensure active phase index is within bounds
  const currentPhase: TacticalPhase = useMemo(() => {
    return plan.phases[activePhaseIndex] || plan.phases[0];
  }, [plan.phases, activePhaseIndex]);

  // Smooth Bezier/Catmull interpolated positions when isPlaying is true or scrubbing
  const interpolatedState = useMemo(() => {
    if (!isPlaying && playbackProgress === 0) return null;
    const nextIdx = (activePhaseIndex + 1) % plan.phases.length;
    const fromPhase = currentPhase;
    const toPhase = plan.phases[nextIdx] || currentPhase;
    return smoothInterpolatePhase(fromPhase, toPhase, playbackProgress, {
      useEasing: true,
      includeBallArc: true,
    });
  }, [isPlaying, playbackProgress, activePhaseIndex, plan.phases, currentPhase]);

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

  // Animation Loop with Speed Control and Loop Support
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
      const deltaSec = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      const phaseDuration = currentPhase.durationSeconds || 4;
      const progressIncrement = (deltaSec / phaseDuration) * playbackSpeed;

      setPlaybackProgress((prev) => {
        const next = prev + progressIncrement;
        if (next >= 1.0) {
          // Transition to next phase
          if (activePhaseIndex < plan.phases.length - 1) {
            setActivePhaseIndex((cur) => cur + 1);
            return 0;
          } else {
            // End of plan
            if (isLooping) {
              setActivePhaseIndex(0);
              return 0;
            } else {
              setIsPlaying(false);
              return 1.0;
            }
          }
        }
        return next;
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    animationFrameRef.current = frameId;

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [
    isPlaying,
    playbackSpeed,
    isLooping,
    activePhaseIndex,
    plan.phases.length,
    currentPhase.durationSeconds,
  ]);

  // Global Scrubber calculation
  const globalProgress = useMemo(() => {
    const totalSec = plan.phases.reduce((acc, p) => acc + (p.durationSeconds || 4), 0);
    if (totalSec <= 0) return 0;
    let elapsedBefore = 0;
    for (let i = 0; i < activePhaseIndex; i++) {
      elapsedBefore += plan.phases[i].durationSeconds || 4;
    }
    const currentElapsed =
      elapsedBefore + playbackProgress * (currentPhase.durationSeconds || 4);
    return Math.min(1, Math.max(0, currentElapsed / totalSec));
  }, [plan.phases, activePhaseIndex, playbackProgress, currentPhase.durationSeconds]);

  // Global scrub handler
  const handleScrubGlobal = useCallback(
    (fraction: number) => {
      setIsPlaying(false);
      const totalSec = plan.phases.reduce((acc, p) => acc + (p.durationSeconds || 4), 0);
      const targetSec = fraction * totalSec;
      const resolved = resolveGlobalTime(plan.phases, targetSec);
      setActivePhaseIndex(resolved.activePhaseIndex);
      setPlaybackProgress(resolved.localT);
    },
    [plan.phases],
  );

  // Stepping forward / backward by phase
  const handleStepPhase = useCallback(
    (forward: boolean) => {
      setIsPlaying(false);
      setPlaybackProgress(0);
      if (forward) {
        setActivePhaseIndex((cur) => Math.min(plan.phases.length - 1, cur + 1));
      } else {
        setActivePhaseIndex((cur) => Math.max(0, cur - 1));
      }
    },
    [plan.phases.length],
  );

  // Sync plan modifications upstream
  const updateCurrentPhase = useCallback(
    (updater: (phase: TacticalPhase) => TacticalPhase) => {
      setPlan((prevPlan) => {
        const nextPhases = [...prevPlan.phases];
        nextPhases[activePhaseIndex] = updater(nextPhases[activePhaseIndex]);
        const updated = {
          ...prevPlan,
          phases: nextPhases,
          updatedAt: new Date().toISOString(),
        };
        onPlanChange?.(updated);
        return updated;
      });
    },
    [activePhaseIndex, onPlanChange],
  );

  const handleUpdatePlayers = useCallback(
    (newPlayers: PlayerNode[]) => {
      updateCurrentPhase((phase) => ({ ...phase, players: newPlayers }));
    },
    [updateCurrentPhase],
  );

  const handleUpdateBall = useCallback(
    (newBall: BallNode) => {
      updateCurrentPhase((phase) => ({ ...phase, ball: newBall }));
    },
    [updateCurrentPhase],
  );

  const handleUpdateEquipment = useCallback(
    (newEquipment: EquipmentNode[]) => {
      updateCurrentPhase((phase) => ({ ...phase, equipment: newEquipment }));
    },
    [updateCurrentPhase],
  );

  const handleAddAnnotation = useCallback(
    (annotation: TacticalAnnotation) => {
      updateCurrentPhase((phase) => ({
        ...phase,
        annotations: [...phase.annotations, annotation],
      }));
    },
    [updateCurrentPhase],
  );

  const handleRemoveAnnotation = useCallback(
    (annotationId: string) => {
      updateCurrentPhase((phase) => ({
        ...phase,
        annotations: phase.annotations.filter((a) => a.id !== annotationId),
      }));
    },
    [updateCurrentPhase],
  );

  const handleUndoAnnotation = useCallback(() => {
    if (currentPhase.annotations.length === 0) return;
    updateCurrentPhase((phase) => ({
      ...phase,
      annotations: phase.annotations.slice(0, -1),
    }));
    toast.info("Last annotation undone");
  }, [currentPhase.annotations.length, updateCurrentPhase]);

  const handleClearAnnotations = useCallback(() => {
    updateCurrentPhase((phase) => ({ ...phase, annotations: [] }));
    toast.info("All annotations cleared");
  }, [updateCurrentPhase]);

  // Add entity helpers
  const handleAddPlayer = useCallback(
    (team: "home" | "away" | "neutral" | "gk_home") => {
      const nextNumber = currentPhase.players.length + 1;
      const newPlayer: PlayerNode = {
        id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        team,
        number: nextNumber,
        role: team === "gk_home" ? "GK" : team === "home" ? "ST" : "CB",
        label: `Player ${nextNumber}`,
        position: { x: 50, y: 50 },
      };
      updateCurrentPhase((phase) => ({
        ...phase,
        players: [...phase.players, newPlayer],
      }));
      toast.success(`Added ${newPlayer.role} #${newPlayer.number}`);
    },
    [currentPhase.players.length, updateCurrentPhase],
  );

  const handleAddEquipment = useCallback(
    (type: EquipmentType) => {
      const newEq: EquipmentNode = {
        id: `eq_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type,
        position: { x: 50, y: 50 },
      };
      updateCurrentPhase((phase) => ({
        ...phase,
        equipment: [...phase.equipment, newEq],
      }));
      toast.success(`Added ${type.replace(/_/g, " ")}`);
    },
    [updateCurrentPhase],
  );

  // Fast Tactical Adjustments (CoachTactics Engine)
  const handleFastChange = useCallback(
    (changeType: string) => {
      if (changeType === "+1 Defender Press") {
        const newDefender: PlayerNode = {
          id: `def_press_${Date.now()}`,
          team: "away",
          number: 4,
          role: "CB",
          label: "Pressing CB",
          position: { x: 55, y: 45 },
          targetPosition: { x: 48, y: 50 },
          movementType: "press",
          tacticalRole: "Pressing Forward",
          tacticalDuty: "High press trigger, closes down half-space lane",
        };
        updateCurrentPhase((p) => ({
          ...p,
          players: [...p.players, newDefender],
          annotations: [
            ...p.annotations,
            {
              id: `ann_press_${Date.now()}`,
              type: "run_arrow",
              points: [{ x: 55, y: 45 }, { x: 48, y: 50 }],
              color: "#FF6E40",
              width: 2.5,
              label: "Press trigger",
            },
          ],
        }));
        toast.success("+1 Defender Press deployed with press corridor");
      } else if (changeType === "High Tempo 1-Touch") {
        setPlaybackSpeed(1.5);
        toast.success("Tempo accelerated to 1.5x (High Tempo 1-Touch)");
      } else if (changeType === "Fullback Overlap") {
        updateCurrentPhase((p) => {
          const lb = p.players.find((pl) => pl.role === "LB" || pl.role === "LWB") || p.players[1];
          if (lb) {
            return {
              ...p,
              players: p.players.map((pl) =>
                pl.id === lb.id
                  ? {
                      ...pl,
                      position: { x: 30, y: 15 },
                      targetPosition: { x: 65, y: 10 },
                      tacticalRole: "Attacking Fullback",
                      tacticalDuty: "Sprints touchline on outside overlap, whips crosses from byline",
                    }
                  : pl,
              ),
              annotations: [
                ...p.annotations,
                {
                  id: `ann_overlap_${Date.now()}`,
                  type: "run_arrow",
                  points: [{ x: 30, y: 15 }, { x: 65, y: 10 }],
                  color: "#00E5FF",
                  width: 2.5,
                  label: "Overlap run",
                },
              ],
            };
          }
          return p;
        });
        toast.success("Fullback Overlap corridor generated");
      } else if (changeType === "Add 2 Mini-Goals") {
        const g1: EquipmentNode = {
          id: `eq_goal_1_${Date.now()}`,
          type: "mini_goal",
          position: { x: 15, y: 20 },
        };
        const g2: EquipmentNode = {
          id: `eq_goal_2_${Date.now()}`,
          type: "mini_goal",
          position: { x: 15, y: 80 },
        };
        updateCurrentPhase((p) => ({
          ...p,
          equipment: [...p.equipment, g1, g2],
        }));
        toast.success("2 Mini-Goals added at counter-attack target gates");
      } else if (changeType === "Add Cones & Grid") {
        const cones: EquipmentNode[] = [
          { id: `c1_${Date.now()}`, type: "cone", position: { x: 35, y: 25 } },
          { id: `c2_${Date.now()}`, type: "cone", position: { x: 65, y: 25 } },
          { id: `c3_${Date.now()}`, type: "cone", position: { x: 35, y: 75 } },
          { id: `c4_${Date.now()}`, type: "cone", position: { x: 65, y: 75 } },
        ];
        updateCurrentPhase((p) => ({
          ...p,
          equipment: [...p.equipment, ...cones],
        }));
        toast.success("Tactical Cones & Grid boundaries placed");
      } else if (changeType === "Flip Pitch View") {
        const nextType: PitchType = plan.pitchType === "full" ? "attacking_half" : "full";
        setPlan((p) => ({ ...p, pitchType: nextType }));
        toast.info(`Switched to ${nextType === "full" ? "Full Pitch" : "Attacking Half"}`);
      } else {
        // Custom coach tweak text
        updateCurrentPhase((p) => ({
          ...p,
          coachingNotes: (p.coachingNotes ? `${p.coachingNotes}\n• ` : "• ") + changeType,
        }));
        toast.success(`Applied tactical tweak: "${changeType}"`);
      }
    },
    [plan.pitchType, updateCurrentPhase],
  );

  // Phase Management
  const handleAddPhase = useCallback(() => {
    const newPhase: TacticalPhase = {
      id: `phase_${Date.now()}`,
      phaseNumber: plan.phases.length + 1,
      title: `Phase ${plan.phases.length + 1}`,
      durationSeconds: 4,
      players: currentPhase.players.map((p) => ({
        ...p,
        // Promote targetPosition to new starting position if set
        position: p.targetPosition ? { ...p.targetPosition } : { ...p.position },
        targetPosition: undefined,
      })),
      ball: {
        ...currentPhase.ball,
        x: currentPhase.ball.targetPosition ? currentPhase.ball.targetPosition.x : currentPhase.ball.x,
        y: currentPhase.ball.targetPosition ? currentPhase.ball.targetPosition.y : currentPhase.ball.y,
        targetPosition: undefined,
      },
      equipment: currentPhase.equipment.map((eq) => ({ ...eq })),
      annotations: [],
    };
    setPlan((prev) => ({
      ...prev,
      phases: [...prev.phases, newPhase],
      updatedAt: new Date().toISOString(),
    }));
    setActivePhaseIndex(plan.phases.length);
    toast.success(`Added Phase ${plan.phases.length + 1}`);
  }, [currentPhase, plan.phases.length]);

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

  const handleDeletePhase = useCallback(
    (idx: number) => {
      if (plan.phases.length <= 1) return;
      setPlan((prev) => {
        const remaining = prev.phases.filter((_, i) => i !== idx);
        const renumbered = remaining.map((p, i) => ({ ...p, phaseNumber: i + 1 }));
        return { ...prev, phases: renumbered, updatedAt: new Date().toISOString() };
      });
      setActivePhaseIndex((prev) => Math.max(0, prev - 1));
      toast.info("Phase removed");
    },
    [plan.phases.length],
  );

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
        isFullscreen ? "p-4 bg-[#0A131F] h-screen overflow-y-auto" : ""
      }`}
    >
      {/* Tactical Board Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0D1826]/90 backdrop-blur-md border border-[#1E3249] rounded-xl px-4 py-2.5 shadow-xl text-white">
        <div className="flex items-center gap-2.5">
          <Badge
            variant="default"
            className="text-xs font-bold uppercase tracking-wider bg-[#00E5FF] text-[#0A131F] border-none shadow-[0_0_10px_rgba(0,229,255,0.4)]"
          >
            CoachTactics Pro
          </Badge>
          <div>
            <h2 className="font-display text-base sm:text-lg font-bold text-white leading-tight">
              {plan.title}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <span>{plan.gridDimensions || (plan.pitchType === "full" ? "Full Pitch (105m × 68m)" : "Attacking Half")}</span>
              <span>•</span>
              <span>{plan.phases.length} Phases</span>
              <span>•</span>
              <span className="text-[#00E5FF] font-medium">Domain Validated</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
            className="h-8 text-xs gap-1.5 bg-[#142337] border-[#1E334A] text-gray-300 hover:text-white hover:bg-[#1B2F48]"
            title="Coaching Notes & Instructions"
          >
            <FileText className="size-3.5 text-[#00E5FF]" />
            <span className="hidden sm:inline">Notes</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportJSON}
            className="h-8 text-xs gap-1.5 bg-[#142337] border-[#1E334A] text-gray-300 hover:text-white hover:bg-[#1B2F48]"
            title="Export Tactical Plan JSON"
          >
            <Download className="size-3.5" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrintSheetOpen(true)}
            className="h-8 text-xs gap-1.5 font-medium bg-[#142337] border-[#1E334A] text-gray-300 hover:text-white hover:bg-[#1B2F48]"
            title="Print Tactical Clipboard Sheet"
          >
            <Printer className="size-3.5 text-[#00E5FF]" />
            <span className="hidden sm:inline">Print Sheet</span>
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="size-8 bg-[#142337] border-[#1E334A] text-gray-300 hover:text-white hover:bg-[#1B2F48]"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </Button>

          {!readOnly && (
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              className="h-8 px-3.5 text-xs font-bold gap-1.5 bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] shadow-[0_0_12px_rgba(0,229,255,0.4)]"
            >
              {savedSuccess ? <Check className="size-3.5" /> : <Save className="size-3.5" />}
              <span>{savedSuccess ? "Saved" : "Save Plan"}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Coaching Notes Panel (Collapsible) */}
      {showNotes && (
        <div className="bg-[#0D1826]/95 border border-[#1E3249] rounded-xl p-3.5 space-y-2 text-xs text-white animate-in fade-in duration-200">
          <h4 className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 text-[#00E5FF]">
            <FileText className="size-3.5" /> Tactical Coaching Instructions
          </h4>
          <Textarea
            value={currentPhase.coachingNotes || ""}
            onChange={(e) =>
              updateCurrentPhase((p) => ({ ...p, coachingNotes: e.target.value }))
            }
            placeholder="Add key coaching points for this phase (e.g. body orientation, tempo, passing lanes)..."
            className="text-xs resize-none h-18 bg-[#132338] border-[#1E334A] text-white placeholder-gray-500"
          />
        </div>
      )}

      {/* Fast Tactical Adjustments Bar */}
      {isFastChangesOpen && !readOnly && (
        <FastChangesBar onFastChange={handleFastChange} />
      )}

      {/* Telestrator Floating Toolbar */}
      {!readOnly && (
        <TelestratorToolbar
          activeTool={activeTool}
          activeColor={activeColor}
          isDashed={isDashed}
          canUndo={currentPhase.annotations.length > 0}
          showHeatmap={showHeatmap}
          isLayersOpen={isLayersOpen}
          isFastChangesOpen={isFastChangesOpen}
          onSelectTool={(tool) => {
            setActiveTool(tool);
            setMode(tool);
          }}
          onSelectColor={setActiveColor}
          onToggleDashed={() => setIsDashed(!isDashed)}
          onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
          onToggleLayers={() => setIsLayersOpen(!isLayersOpen)}
          onToggleFastChanges={() => setIsFastChangesOpen(!isFastChangesOpen)}
          onUndo={handleUndoAnnotation}
          onClearAll={handleClearAnnotations}
        />
      )}

      {/* Main Interactive Pitch Board */}
      <div className="relative w-full">
        <TacticalBoardCanvas
          pitchType={plan.pitchType}
          players={displayPlayers}
          ball={displayBall}
          equipment={currentPhase.equipment}
          annotations={currentPhase.annotations}
          mode={mode}
          activeColor={activeColor}
          isDashed={isDashed}
          showHeatmap={showHeatmap}
          layers={layers}
          onUpdatePlayers={handleUpdatePlayers}
          onUpdateBall={handleUpdateBall}
          onUpdateEquipment={handleUpdateEquipment}
          onAddAnnotation={handleAddAnnotation}
          onRemoveAnnotation={handleRemoveAnnotation}
          onSelectPlayer={(p) => setSelectedPlayer(p)}
          selectedPlayerId={selectedPlayer?.id}
          onSetMode={setMode}
          selectedPlayerIds={selectedPlayerIds}
          onSelectPlayerIds={setSelectedPlayerIds}
          onToggleBallPossession={handleToggleBallPossession}
          onDeletePlayer={(pid) => {
            handleUpdatePlayers(currentPhase.players.filter((pl) => pl.id !== pid));
            setSelectedPlayer(null);
            setSelectedPlayerIds((prev) => prev.filter((id) => id !== pid));
          }}
          isReadOnly={readOnly || isPlaying}
        />

        {/* Tactical Layers Overlay Panel */}
        <TacticalLayersPanel
          layers={layers}
          isOpen={isLayersOpen}
          onClose={() => setIsLayersOpen(false)}
          onToggleLayer={(layerId) =>
            setLayers((prev) => ({
              ...prev,
              [layerId]: { ...prev[layerId], visible: !prev[layerId].visible },
            }))
          }
          onUpdateLayerPathColor={(layerId, pathColor) =>
            setLayers((prev) => ({
              ...prev,
              [layerId]: { ...prev[layerId], pathColor },
            }))
          }
          onToggleTrajectories={(layerId) =>
            setLayers((prev) => ({
              ...prev,
              [layerId]: {
                ...prev[layerId],
                showTrajectories: !prev[layerId].showTrajectories,
              },
            }))
          }
          onResetLayers={() => setLayers(DEFAULT_TACTICAL_LAYERS)}
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
            setSelectedPlayerIds((prev) => prev.filter((id) => id !== pid));
          }}
          onToggleBallPossession={handleToggleBallPossession}
          hasBall={Boolean(currentPhase.ball.attachedPlayerId === selectedPlayer?.id)}
        />
      </div>

      {/* Multi-Phase Timeline Scrubber & Speed Gradient Controls */}
      <TacticalTimelineScrubber
        phases={plan.phases}
        activePhaseIndex={activePhaseIndex}
        localProgress={playbackProgress}
        globalProgress={globalProgress}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        isLooping={isLooping}
        onTogglePlay={() => {
          if (isPlaying) {
            setIsPlaying(false);
          } else {
            setIsPlaying(true);
          }
        }}
        onReset={() => {
          setIsPlaying(false);
          setActivePhaseIndex(0);
          setPlaybackProgress(0);
        }}
        onStepPhase={handleStepPhase}
        onSelectPhase={(idx) => {
          setIsPlaying(false);
          setActivePhaseIndex(idx);
          setPlaybackProgress(0);
        }}
        onScrubGlobal={handleScrubGlobal}
        onSetSpeed={setPlaybackSpeed}
        onToggleLoop={() => setIsLooping(!isLooping)}
      />

      {/* Squad Formations & Player Steppers Toolbar */}
      {!readOnly && (
        <SquadStepperToolbar
          players={currentPhase.players}
          pitchType={plan.pitchType}
          onUpdatePlayers={handleUpdatePlayers}
          onSetGridDimensions={(dim) => setPlan((p) => ({ ...p, gridDimensions: dim }))}
          onSetTitle={(title) => setPlan((p) => ({ ...p, title }))}
          disabled={isPlaying}
        />
      )}

      {/* Tactical Board Controls Toolbar */}
      {!readOnly && (
        <TacticalBoardControls
          mode={mode}
          onSetMode={setMode}
          activeColor={activeColor}
          onSetColor={setActiveColor}
          pitchType={plan.pitchType}
          onSetPitchType={(type) => {
            setPlan((p) => {
              const updated = { ...p, pitchType: type, updatedAt: new Date().toISOString() };
              onPlanChange?.(updated);
              return updated;
            });
            toast.info(`Pitch mode switched to ${type.replace(/_/g, " ")}`);
          }}
          phases={plan.phases}
          activePhaseIndex={activePhaseIndex}
          onSelectPhase={(idx) => {
            setIsPlaying(false);
            setActivePhaseIndex(idx);
          }}
          onAddPhase={handleAddPhase}
          onDuplicatePhase={handleDuplicatePhase}
          onDeletePhase={handleDeletePhase}
          selectedCount={selectedPlayerIds.length}
          onClearSelection={() => setSelectedPlayerIds([])}
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

      {/* High-Contrast Print / Clipboard Sheet Modal */}
      <TacticalSheetExportModal
        open={printSheetOpen}
        onOpenChange={setPrintSheetOpen}
        drill={SOCCER_DRILLS[0] || null}
        tacticalPlan={plan}
      />
    </div>
  );
};
