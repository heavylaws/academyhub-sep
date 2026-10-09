import React, { useRef, useState, useCallback, useMemo, useEffect } from "react";
import {
  type PlayerNode,
  type BallNode,
  type EquipmentNode,
  type TacticalAnnotation,
  type PitchCoordinate,
  type PitchType,
  clampCoordinate,
} from "@/domain/tactics/tactical-domain.ts";
import { TacticalPitchSvg } from "./tactical-pitch-svg.tsx";
import { PlayerQuickPopover } from "./player-quick-popover.tsx";
import { TacticalRoleModal } from "./tactical-role-modal.tsx";
import { QuickNoteDialog } from "./quick-note-dialog.tsx";
import type { TacticalLayerConfig, TacticalLayerType } from "./tactical-layers-panel.tsx";
import { toast } from "sonner";
import { Sparkles, StickyNote } from "lucide-react";

export type BoardInteractionMode =
  | "select"
  | "MOVE"
  | "PEN"
  | "ARROW"
  | "PASS"
  | "DRIBBLE"
  | "ZONE"
  | "LASER"
  | "NOTE"
  | "ERASER"
  | "lasso"
  | "pass_line"
  | "run_arrow"
  | "dribble_wave"
  | "press_zone"
  | "cover_shadow"
  | "defensive_block"
  | "freehand"
  | "eraser";

interface LaserPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface TacticalBoardCanvasProps {
  pitchType: PitchType;
  players: PlayerNode[];
  ball: BallNode;
  equipment: EquipmentNode[];
  annotations: TacticalAnnotation[];
  mode: BoardInteractionMode;
  onSetMode?: (mode: BoardInteractionMode) => void;
  activeColor: string;
  isDashed?: boolean;
  showHeatmap: boolean;
  layers?: Record<TacticalLayerType, TacticalLayerConfig>;
  onUpdatePlayers: (players: PlayerNode[]) => void;
  onUpdateBall: (ball: BallNode) => void;
  onUpdateEquipment: (equipment: EquipmentNode[]) => void;
  onAddAnnotation: (annotation: TacticalAnnotation) => void;
  onRemoveAnnotation: (id: string) => void;
  onSelectPlayer?: (player: PlayerNode | null) => void;
  selectedPlayerId?: string | null;
  selectedPlayerIds?: string[];
  onSelectPlayerIds?: (ids: string[]) => void;
  onToggleBallPossession?: (playerId: string) => void;
  onDeletePlayer?: (playerId: string) => void;
  isReadOnly?: boolean;
}

export const TacticalBoardCanvas: React.FC<TacticalBoardCanvasProps> = ({
  pitchType,
  players,
  ball,
  equipment,
  annotations,
  mode,
  onSetMode,
  activeColor,
  isDashed = false,
  showHeatmap,
  layers,
  onUpdatePlayers,
  onUpdateBall,
  onUpdateEquipment,
  onAddAnnotation,
  onRemoveAnnotation,
  onSelectPlayer,
  selectedPlayerId,
  selectedPlayerIds = [],
  onSelectPlayerIds,
  onToggleBallPossession,
  onDeletePlayer,
  isReadOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [draggingEntity, setDraggingEntity] = useState<{
    type: "player" | "player_target" | "ball" | "ball_target" | "equipment";
    id: string;
  } | null>(null);

  const lastPlayerPosRef = useRef<PitchCoordinate | null>(null);

  // Lasso multi-select state
  const [lassoBox, setLassoBox] = useState<{ start: PitchCoordinate; current: PitchCoordinate } | null>(null);

  // Touch quick-edit popover state
  const [quickEditPlayer, setQuickEditPlayer] = useState<PlayerNode | null>(null);

  // Tactical Role Modal state
  const [roleModalPlayer, setRoleModalPlayer] = useState<PlayerNode | null>(null);

  // Hovered player for tactical callouts
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);

  // Quick note dialog state
  const [noteDialogCoords, setNoteDialogCoords] = useState<PitchCoordinate | null>(null);

  // Laser points trail state
  const [laserPoints, setLaserPoints] = useState<LaserPoint[]>([]);

  // RAF optimization refs for smooth 60fps dragging
  const rafIdRef = useRef<number | null>(null);
  const pendingCoordsRef = useRef<PitchCoordinate | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Periodic cleanup of decaying laser points
  useEffect(() => {
    if (laserPoints.length === 0) return;
    const interval = setInterval(() => {
      const now = Date.now();
      setLaserPoints((prev) => prev.filter((lp) => now - lp.timestamp < 1200));
    }, 100);
    return () => clearInterval(interval);
  }, [laserPoints.length]);

  // Drawing in-progress state
  const [currentStroke, setCurrentStroke] = useState<PitchCoordinate[]>([]);

  // Normalized mode mapping
  const isMoveMode = mode === "select" || mode === "MOVE";
  const isPenMode = mode === "PEN" || mode === "freehand";
  const isArrowMode = mode === "ARROW" || mode === "run_arrow";
  const isPassMode = mode === "PASS" || mode === "pass_line";
  const isDribbleMode = mode === "DRIBBLE" || mode === "dribble_wave";
  const isZoneMode = mode === "ZONE" || mode === "press_zone";
  const isLaserMode = mode === "LASER";
  const isNoteMode = mode === "NOTE";
  const isEraserMode = mode === "ERASER" || mode === "eraser";

  // Convert client pointer event into pitch coordinate (0..100)
  const getPitchCoords = useCallback((e: React.PointerEvent): PitchCoordinate => {
    if (!containerRef.current) return { x: 50, y: 50 };
    const rect = containerRef.current.getBoundingClientRect();
    const rawX = ((e.clientX - rect.left) / rect.width) * 100;
    const rawY = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: clampCoordinate(rawX),
      y: clampCoordinate(rawY),
    };
  }, []);

  // Helper to determine layer visibility for a role/team
  const isPlayerLayerVisible = useCallback(
    (team: string) => {
      if (!layers) return true;
      if (team === "home" || team === "gk_home") return layers.OFFENSE.visible;
      if (team === "away" || team === "gk_away") return layers.DEFENSE.visible;
      return layers.NEUTRAL.visible;
    },
    [layers],
  );

  const getPlayerPathColor = useCallback(
    (team: string, defaultColor: string) => {
      if (!layers) return defaultColor;
      if (team === "home" || team === "gk_home") return layers.OFFENSE.pathColor || defaultColor;
      if (team === "away" || team === "gk_away") return layers.DEFENSE.pathColor || defaultColor;
      return layers.NEUTRAL.pathColor || defaultColor;
    },
    [layers],
  );

  const isPlayerPathVisible = useCallback(
    (team: string) => {
      if (!layers) return true;
      if (team === "home" || team === "gk_home") return layers.OFFENSE.showTrajectories;
      if (team === "away" || team === "gk_away") return layers.DEFENSE.showTrajectories;
      return layers.NEUTRAL.showTrajectories;
    },
    [layers],
  );

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isReadOnly) return;
    const coords = getPitchCoords(e);

    if (mode === "lasso") {
      containerRef.current?.setPointerCapture(e.pointerId);
      setLassoBox({ start: coords, current: coords });
      return;
    }

    if (isLaserMode) {
      containerRef.current?.setPointerCapture(e.pointerId);
      setLaserPoints((prev) => [...prev, { x: coords.x, y: coords.y, timestamp: Date.now() }]);
      return;
    }

    if (isNoteMode) {
      setNoteDialogCoords(coords);
      return;
    }

    if (isEraserMode) {
      // Find nearest annotation to erase
      const clickedAnn = annotations.find((ann) => {
        return ann.points.some((pt) => Math.hypot(pt.x - coords.x, pt.y - coords.y) < 6);
      });
      if (clickedAnn) {
        onRemoveAnnotation(clickedAnn.id);
        toast.info("Tactical mark erased");
      }
      return;
    }

    if (isMoveMode) {
      // Background click: deselect
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
        onSelectPlayer?.(null);
        onSelectPlayerIds?.([]);
        setQuickEditPlayer(null);
      }
      return;
    }

    // Drawing mode initiated
    containerRef.current?.setPointerCapture(e.pointerId);
    setCurrentStroke([coords]);
  };

  // Pointer Move with RAF Batching
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isReadOnly) return;
    const coords = getPitchCoords(e);

    if (isLaserMode && (e.buttons & 1) === 1) {
      setLaserPoints((prev) => [...prev, { x: coords.x, y: coords.y, timestamp: Date.now() }]);
      return;
    }

    if (lassoBox) {
      setLassoBox((prev) => (prev ? { ...prev, current: coords } : null));
      return;
    }

    // Entity dragging via RAF batching
    if (draggingEntity) {
      pendingCoordsRef.current = coords;
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const targetCoords = pendingCoordsRef.current;
          if (!targetCoords || !draggingEntity) return;

          if (draggingEntity.type === "player") {
            const activePlayer = players.find((p) => p.id === draggingEntity.id);
            if (!activePlayer) return;

            const isMulti = selectedPlayerIds.length > 1 && selectedPlayerIds.includes(activePlayer.id);

            if (isMulti) {
              const prev = lastPlayerPosRef.current || activePlayer.position;
              const deltaX = targetCoords.x - prev.x;
              const deltaY = targetCoords.y - prev.y;
              lastPlayerPosRef.current = targetCoords;

              const updated = players.map((p) => {
                if (selectedPlayerIds.includes(p.id)) {
                  return {
                    ...p,
                    position: {
                      x: clampCoordinate(p.position.x + deltaX),
                      y: clampCoordinate(p.position.y + deltaY),
                    },
                  };
                }
                return p;
              });
              onUpdatePlayers(updated);
            } else {
              const updated = players.map((p) =>
                p.id === draggingEntity.id ? { ...p, position: targetCoords } : p,
              );
              onUpdatePlayers(updated);
            }
          } else if (draggingEntity.type === "player_target") {
            const updated = players.map((p) =>
              p.id === draggingEntity.id ? { ...p, targetPosition: targetCoords } : p,
            );
            onUpdatePlayers(updated);
          } else if (draggingEntity.type === "ball") {
            onUpdateBall({ ...ball, x: targetCoords.x, y: targetCoords.y, attachedPlayerId: undefined });
          } else if (draggingEntity.type === "ball_target") {
            onUpdateBall({ ...ball, targetPosition: targetCoords });
          } else if (draggingEntity.type === "equipment") {
            const updated = equipment.map((eq) =>
              eq.id === draggingEntity.id ? { ...eq, position: targetCoords } : eq,
            );
            onUpdateEquipment(updated);
          }
        });
      }
      return;
    }

    // Drawing in-progress stroke
    if (currentStroke.length > 0) {
      if (isPenMode) {
        setCurrentStroke((prev) => [...prev, coords]);
      } else {
        // Line or Zone preview: keep start point and update current end point
        setCurrentStroke([currentStroke[0], coords]);
      }
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    if (isReadOnly) return;
    try {
      containerRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if capture wasn't held
    }

    if (lassoBox) {
      const minX = Math.min(lassoBox.start.x, lassoBox.current.x);
      const maxX = Math.max(lassoBox.start.x, lassoBox.current.x);
      const minY = Math.min(lassoBox.start.y, lassoBox.current.y);
      const maxY = Math.max(lassoBox.start.y, lassoBox.current.y);

      const captured = players.filter(
        (p) => p.position.x >= minX && p.position.x <= maxX && p.position.y >= minY && p.position.y <= maxY,
      );
      const capturedIds = captured.map((p) => p.id);
      onSelectPlayerIds?.(capturedIds);
      setLassoBox(null);
      onSetMode?.("select");
      if (capturedIds.length > 0) {
        toast.success(`Selected unit of ${capturedIds.length} players. Drag any player to move as a block!`);
      }
      return;
    }

    if (draggingEntity) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      lastPlayerPosRef.current = null;
      setDraggingEntity(null);
      return;
    }

    if (currentStroke.length > 1) {
      const startPt = currentStroke[0];
      const endPt = currentStroke[currentStroke.length - 1];
      const dist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);

      // Smart arrow connection: if arrow starts near player, set destination run
      if (isArrowMode && dist > 3) {
        const sourcePlayer = players.find(
          (p) => Math.hypot(p.position.x - startPt.x, p.position.y - startPt.y) < 8,
        );
        if (sourcePlayer) {
          const updated = players.map((p) =>
            p.id === sourcePlayer.id ? { ...p, targetPosition: endPt } : p,
          );
          onUpdatePlayers(updated);
          toast.success(`Set run trajectory for #${sourcePlayer.number}`);
          setCurrentStroke([]);
          return;
        }
      }

      // Smart pass connection: if pass starts near ball, set ball target destination
      if (isPassMode && dist > 3) {
        const isNearBall = Math.hypot(ball.x - startPt.x, ball.y - startPt.y) < 8;
        if (isNearBall) {
          onUpdateBall({ ...ball, targetPosition: endPt });
          toast.success("Set ball passing destination");
          setCurrentStroke([]);
          return;
        }
      }

      let annType: TacticalAnnotation["type"] = "run_arrow";
      if (isPenMode) annType = "freehand";
      else if (isPassMode) annType = "pass_line";
      else if (isDribbleMode) annType = "dribble_wave";
      else if (isZoneMode) annType = "press_zone";

      const newAnnotation: TacticalAnnotation = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: annType,
        points: currentStroke,
        color: activeColor,
        width: isZoneMode ? 20 : 2.5,
      };
      onAddAnnotation(newAnnotation);
    }
    setCurrentStroke([]);
  };

  // Drag start helpers
  const startDragPlayer = (e: React.PointerEvent, playerId: string) => {
    if (isReadOnly || !isMoveMode) return;
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    setDraggingEntity({ type: "player", id: playerId });
    const p = players.find((pl) => pl.id === playerId) || null;
    lastPlayerPosRef.current = p ? { ...p.position } : null;
    onSelectPlayer?.(p);
  };

  const startDragPlayerTarget = (e: React.PointerEvent, playerId: string) => {
    if (isReadOnly || !isMoveMode) return;
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    setDraggingEntity({ type: "player_target", id: playerId });
    const p = players.find((pl) => pl.id === playerId) || null;
    onSelectPlayer?.(p);
  };

  const startDragBall = (e: React.PointerEvent) => {
    if (isReadOnly || !isMoveMode) return;
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    setDraggingEntity({ type: "ball", id: "ball" });
  };

  const startDragBallTarget = (e: React.PointerEvent) => {
    if (isReadOnly || !isMoveMode) return;
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    setDraggingEntity({ type: "ball_target", id: "ball" });
  };

  const startDragEquipment = (e: React.PointerEvent, eqId: string) => {
    if (isReadOnly || !isMoveMode) return;
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    setDraggingEntity({ type: "equipment", id: eqId });
  };

  // Generate heatmap intensity dots based on player clusters
  const heatmapData = useMemo(() => {
    return players.map((p) => ({
      x: p.position.x,
      y: p.position.y,
      intensity: 1.0,
    }));
  }, [players]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`relative w-full aspect-[1000/650] select-none rounded-xl overflow-hidden shadow-2xl border border-[#1E3249] bg-[#0A131F] ${
        isMoveMode
          ? "cursor-default"
          : mode === "lasso"
          ? "cursor-crosshair"
          : isEraserMode
          ? "cursor-not-allowed"
          : isNoteMode
          ? "cursor-cell"
          : "cursor-crosshair"
      }`}
    >
      {/* Underlying Pitch Geometry Canvas */}
      <TacticalPitchSvg
        pitchType={pitchType}
        showHeatmap={showHeatmap}
        heatmapData={heatmapData}
      />

      {/* SVG Overlay for Vector Drawing, Trajectories & Annotations */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        <defs>
          <marker
            id="arrow-white"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FFFFFF" />
          </marker>
          <marker
            id="arrow-cyan"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#00E5FF" />
          </marker>
          <marker
            id="arrow-coral"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FF6E40" />
          </marker>
          <marker
            id="arrow-yellow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FFD600" />
          </marker>
        </defs>

        {/* Existing Annotations */}
        {annotations.map((ann) => {
          if (!ann.points || ann.points.length === 0) return null;

          if (ann.type === "press_zone" && ann.points.length >= 2) {
            const p1 = ann.points[0];
            const p2 = ann.points[ann.points.length - 1];
            const cx = (p1.x + p2.x) / 2;
            const cy = (p1.y + p2.y) / 2;
            const rx = Math.max(4, Math.abs(p2.x - p1.x) / 2);
            const ry = Math.max(4, Math.abs(p2.y - p1.y) / 2);

            return (
              <ellipse
                key={ann.id}
                cx={cx}
                cy={cy}
                rx={rx}
                ry={ry}
                fill={ann.color}
                fillOpacity={0.22}
                stroke={ann.color}
                strokeWidth={0.8}
                strokeDasharray="2 2"
                className={isEraserMode ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
                onClick={() => isEraserMode && onRemoveAnnotation(ann.id)}
              />
            );
          }

          if (ann.type === "cover_shadow" && ann.points.length >= 2) {
            const p1 = ann.points[0];
            const p2 = ann.points[ann.points.length - 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const angle = Math.atan2(dy, dx);
            const spread = Math.PI / 5;
            const length = Math.max(8, Math.sqrt(dx * dx + dy * dy));
            const leftX = p1.x + Math.cos(angle - spread) * length;
            const leftY = p1.y + Math.sin(angle - spread) * length;
            const rightX = p1.x + Math.cos(angle + spread) * length;
            const rightY = p1.y + Math.sin(angle + spread) * length;
            const pathData = `M ${p1.x} ${p1.y} L ${leftX} ${leftY} A ${length} ${length} 0 0 1 ${rightX} ${rightY} Z`;

            return (
              <g
                key={ann.id}
                className={isEraserMode ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
                onClick={() => isEraserMode && onRemoveAnnotation(ann.id)}
              >
                <path
                  d={pathData}
                  fill={ann.color}
                  fillOpacity={0.25}
                  stroke={ann.color}
                  strokeWidth={0.6}
                  strokeDasharray="1.5 1.5"
                />
                <circle cx={p1.x} cy={p1.y} r={1.5} fill={ann.color} />
              </g>
            );
          }

          if (ann.type === "dribble_wave" && ann.points.length >= 2) {
            const p1 = ann.points[0];
            const p2 = ann.points[ann.points.length - 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dist = Math.hypot(dx, dy);
            const steps = Math.max(3, Math.floor(dist / 3));
            let pathD = `M ${p1.x} ${p1.y}`;
            for (let i = 1; i <= steps; i++) {
              const t = i / steps;
              const midX = p1.x + dx * t;
              const midY = p1.y + dy * t;
              const normalX = -dy / dist;
              const normalY = dx / dist;
              const waveAmp = (i % 2 === 0 ? 1 : -1) * 2;
              pathD += ` Q ${midX + normalX * waveAmp} ${midY + normalY * waveAmp} ${midX} ${midY}`;
            }

            return (
              <path
                key={ann.id}
                d={pathD}
                fill="none"
                stroke={ann.color}
                strokeWidth={1}
                strokeLinecap="round"
                className={isEraserMode ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
                onClick={() => isEraserMode && onRemoveAnnotation(ann.id)}
              />
            );
          }

          if (ann.type === "freehand") {
            const pathD = ann.points.reduce(
              (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
              "",
            );
            return (
              <path
                key={ann.id}
                d={pathD}
                fill="none"
                stroke={ann.color}
                strokeWidth={1}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={isEraserMode ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
                onClick={() => isEraserMode && onRemoveAnnotation(ann.id)}
              />
            );
          }

          const start = ann.points[0];
          const end = ann.points[ann.points.length - 1];
          const isDashedLine = ann.type === "pass_line" || isDashed;

          return (
            <g
              key={ann.id}
              className={isEraserMode ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
              onClick={() => isEraserMode && onRemoveAnnotation(ann.id)}
            >
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={ann.color}
                strokeWidth={ann.width * 0.4}
                strokeDasharray={isDashedLine ? "2.5 1.5" : undefined}
                strokeLinecap="round"
                markerEnd="url(#arrow-cyan)"
              />
              {ann.label && (
                <text
                  x={(start.x + end.x) / 2}
                  y={(start.y + end.y) / 2 - 1.0}
                  fill="#94A3B8"
                  fontSize="0.8"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="font-mono drop-shadow-xs select-none"
                >
                  {ann.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Player Movement Trajectories (Authoritative model connecting player to targetPosition) */}
        {players.map((p) => {
          if (!p.targetPosition) return null;
          if (!isPlayerLayerVisible(p.team) || !isPlayerPathVisible(p.team)) return null;

          const pathColor = getPlayerPathColor(p.team, p.team === "home" ? "#00E5FF" : "#FF6E40");
          const dist = Math.hypot(p.targetPosition.x - p.position.x, p.targetPosition.y - p.position.y);
          if (dist < 1.5) return null;

          const isSelected = selectedPlayerId === p.id || hoveredPlayerId === p.id;

          return (
            <g key={`traj_${p.id}`}>
              <line
                x1={p.position.x}
                y1={p.position.y}
                x2={p.targetPosition.x}
                y2={p.targetPosition.y}
                stroke={pathColor}
                strokeWidth={isSelected ? 1.2 : 0.8}
                strokeDasharray="2 1.5"
                markerEnd={p.team === "home" ? "url(#arrow-cyan)" : "url(#arrow-coral)"}
              />
            </g>
          );
        })}

        {/* Ball Trajectory Corridors */}
        {ball.targetPosition && (!layers || layers.BALL_CORRIDORS.visible) && (
          <g key="ball_trajectory">
            <line
              x1={ball.x}
              y1={ball.y}
              x2={ball.targetPosition.x}
              y2={ball.targetPosition.y}
              stroke={layers?.BALL_CORRIDORS.pathColor || "#FFD600"}
              strokeWidth={1}
              strokeDasharray="2 1.5"
              markerEnd="url(#arrow-yellow)"
            />
          </g>
        )}

        {/* Current In-progress Drawing Stroke */}
        {currentStroke.length > 1 && (
          <g>
            {isPenMode ? (
              <path
                d={currentStroke.reduce(
                  (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
                  "",
                )}
                fill="none"
                stroke={activeColor}
                strokeWidth={1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : isZoneMode ? (
              <ellipse
                cx={(currentStroke[0].x + currentStroke[1].x) / 2}
                cy={(currentStroke[0].y + currentStroke[1].y) / 2}
                rx={Math.max(4, Math.abs(currentStroke[1].x - currentStroke[0].x) / 2)}
                ry={Math.max(4, Math.abs(currentStroke[1].y - currentStroke[0].y) / 2)}
                fill={activeColor}
                fillOpacity={0.22}
                stroke={activeColor}
                strokeWidth={0.8}
                strokeDasharray="2 2"
              />
            ) : isDribbleMode ? (
              <path
                d={`M ${currentStroke[0].x} ${currentStroke[0].y} Q ${(currentStroke[0].x + currentStroke[1].x) / 2 + 2} ${
                  (currentStroke[0].y + currentStroke[1].y) / 2 - 2
                } ${currentStroke[1].x} ${currentStroke[1].y}`}
                fill="none"
                stroke={activeColor}
                strokeWidth={1}
                strokeLinecap="round"
              />
            ) : (
              <line
                x1={currentStroke[0].x}
                y1={currentStroke[0].y}
                x2={currentStroke[1].x}
                y2={currentStroke[1].y}
                stroke={activeColor}
                strokeWidth={1}
                strokeDasharray={isPassMode || isDashed ? "2.5 1.5" : undefined}
                strokeLinecap="round"
                markerEnd="url(#arrow-white)"
              />
            )}
          </g>
        )}

        {/* Lasso Selection Marquee */}
        {lassoBox && (
          <rect
            x={Math.min(lassoBox.start.x, lassoBox.current.x)}
            y={Math.min(lassoBox.start.y, lassoBox.current.y)}
            width={Math.abs(lassoBox.current.x - lassoBox.start.x)}
            height={Math.abs(lassoBox.current.y - lassoBox.start.y)}
            fill="#00E5FF"
            fillOpacity={0.15}
            stroke="#00E5FF"
            strokeWidth={0.8}
            strokeDasharray="2 2"
          />
        )}
      </svg>

      {/* Laser Pointer Trail Effect */}
      {laserPoints.map((lp, idx) => {
        const age = Date.now() - lp.timestamp;
        const alpha = Math.max(0, 1 - age / 1200);
        return (
          <div
            key={idx}
            style={{
              left: `${lp.x}%`,
              top: `${lp.y}%`,
              opacity: alpha,
              transform: "translate(-50%, -50%)",
            }}
            className="absolute size-3 rounded-full bg-red-500 shadow-[0_0_12px_#FF1744] pointer-events-none transition-opacity duration-75"
          />
        );
      })}

      {/* Interactive Destination Target Handles for Players */}
      {players.map((p) => {
        if (!isPlayerLayerVisible(p.team)) return null;
        const isSelected = selectedPlayerId === p.id || hoveredPlayerId === p.id;
        if (!isMoveMode && !isSelected) return null;

        const targetPos = p.targetPosition || p.position;
        const dist = Math.hypot(targetPos.x - p.position.x, targetPos.y - p.position.y);
        const pathColor = getPlayerPathColor(p.team, p.team === "home" ? "#00E5FF" : "#FF6E40");

        return (
          <div
            key={`handle_${p.id}`}
            onPointerDown={(e) => startDragPlayerTarget(e, p.id)}
            style={{
              left: `${targetPos.x}%`,
              top: `${targetPos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            className={`absolute z-15 size-5 sm:size-6 rounded-full flex items-center justify-center cursor-crosshair transition-transform ${
              isReadOnly ? "pointer-events-none" : "touch-none"
            } ${isSelected ? "scale-115" : "opacity-80 hover:opacity-100"}`}
            title={`Drag to set destination run for #${p.number}`}
          >
            {/* Target Ring with Crosshair */}
            <div
              className="size-4 sm:size-5 rounded-full border border-dashed flex items-center justify-center shadow-xs"
              style={{
                borderColor: pathColor,
                backgroundColor: isSelected ? "rgba(0, 229, 255, 0.25)" : "rgba(255, 255, 255, 0.15)",
              }}
            >
              {dist > 1.5 && (
                <div className="size-1 rounded-full" style={{ backgroundColor: pathColor }} />
              )}
            </div>
          </div>
        );
      })}

      {/* Interactive Destination Target Handle for Ball */}
      {(!layers || layers.BALL_CORRIDORS.visible) && (isMoveMode || ball.targetPosition) && (
        <div
          onPointerDown={startDragBallTarget}
          style={{
            left: `${(ball.targetPosition || ball).x}%`,
            top: `${(ball.targetPosition || ball).y}%`,
            transform: "translate(-50%, -50%)",
          }}
          className={`absolute z-15 size-5 sm:size-6 rounded-full flex items-center justify-center cursor-crosshair ${
            isReadOnly ? "pointer-events-none" : "touch-none"
          }`}
          title="Drag to set ball passing destination"
        >
          <div className="size-4 sm:size-5 rounded-full border border-dashed border-[#FFD600] bg-[#FFD600]/25 flex items-center justify-center">
            <div className="size-1 rounded-full bg-[#FFD600]" />
          </div>
        </div>
      )}

      {/* Equipment Tokens */}
      {equipment.map((eq) => {
        return (
          <div
            key={eq.id}
            onPointerDown={(e) => startDragEquipment(e, eq.id)}
            style={{
              left: `${eq.position.x}%`,
              top: `${eq.position.y}%`,
              transform: `translate(-50%, -50%) rotate(${eq.rotation || 0}deg)`,
            }}
            className={`absolute z-10 flex items-center justify-center p-1 cursor-grab active:cursor-grabbing transition-transform ${
              isReadOnly ? "pointer-events-none" : "touch-none"
            }`}
          >
            {eq.type === "cone" && (
              <div
                className="w-3.5 h-4 sm:w-4 sm:h-5 bg-gradient-to-t from-orange-600 to-orange-400 clip-triangle shadow-md border-b-2 border-white/60"
                title="Training Cone"
              />
            )}
            {eq.type === "mannequin" && (
              <div
                className="w-3 h-7 sm:w-3.5 sm:h-8 bg-amber-400/90 border border-amber-600 rounded-sm shadow-lg flex flex-col items-center justify-between py-0.5"
                title="Free-Kick Dummy"
              >
                <div className="size-1.5 rounded-full bg-amber-600" />
                <span className="text-[7px] font-black text-amber-950">M</span>
                <div className="w-2.5 h-0.5 bg-amber-600" />
              </div>
            )}
            {eq.type === "mini_goal" && (
              <div
                className="w-7 h-3.5 sm:w-8 sm:h-4 border-2 border-emerald-400 bg-emerald-500/20 rounded-xs shadow-md flex items-center justify-center"
                title="Target Mini Goal"
              >
                <span className="text-[7px] font-black text-emerald-300">GOAL</span>
              </div>
            )}
            {eq.type === "agility_pole" && (
              <div className="w-1.5 h-8 bg-yellow-400 border border-black shadow-md rounded-full" title="Agility Pole" />
            )}
            {eq.type === "hurdle" && (
              <div className="w-6 h-2 border-t-2 border-x-2 border-red-500 shadow-xs" title="Speed Hurdle" />
            )}
            {eq.type === "speed_ladder" && (
              <div className="w-4 h-12 border-x-2 border-yellow-400 flex flex-col justify-between py-0.5 bg-black/40 rounded-xs" title="Speed Ladder">
                <div className="h-0.5 w-full bg-yellow-400" />
                <div className="h-0.5 w-full bg-yellow-400" />
                <div className="h-0.5 w-full bg-yellow-400" />
                <div className="h-0.5 w-full bg-yellow-400" />
              </div>
            )}
            {eq.type === "passing_gate" && (
              <div className="flex items-center gap-1.5" title="Cone Passing Gate">
                <div className="size-2.5 bg-orange-500 rounded-full border border-white" />
                <div className="w-5 h-0.5 border-t border-dashed border-yellow-300" />
                <div className="size-2.5 bg-orange-500 rounded-full border border-white" />
              </div>
            )}
            {eq.type === "rebounder_board" && (
              <div className="w-7 h-2.5 bg-zinc-800 border-2 border-amber-400 rounded-xs shadow-md flex items-center justify-center" title="Wall Rebounder">
                <span className="text-[7px] text-amber-400 font-bold tracking-tighter">WALL</span>
              </div>
            )}
            {eq.type === "ball_cart" && (
              <div className="size-5 rounded-full border border-white bg-blue-600/80 shadow-md flex items-center justify-center" title="Ball Cart">
                <div className="size-2 rounded-full bg-white border border-black" />
              </div>
            )}
          </div>
        );
      })}

      {/* Pinned Quick Coaching Notes */}
      {annotations
        .filter((ann) => ann.type === "note" || ann.type === "text")
        .map((note) => {
          const pt = note.points[0];
          if (!pt) return null;
          return (
            <div
              key={note.id}
              style={{
                left: `${pt.x}%`,
                top: `${pt.y}%`,
                transform: "translate(-50%, -100%)",
              }}
              className="absolute z-25 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFE082] border border-[#FFB300] text-[#1E293B] shadow-lg cursor-pointer group"
              onClick={() => {
                if (isEraserMode) {
                  onRemoveAnnotation(note.id);
                  toast.info("Note removed");
                }
              }}
            >
              <StickyNote className="w-3 h-3 text-[#E65100]" />
              <span className="text-[10px] font-bold truncate max-w-[120px]">{note.label || "Tactical Note"}</span>
              {isEraserMode && (
                <span className="text-[9px] text-red-600 font-bold ml-1">✕</span>
              )}
            </div>
          );
        })}

      {/* Ball Token */}
      {(!layers || layers.BALL_CORRIDORS.visible) && (
        <div
          onPointerDown={startDragBall}
          style={{
            left: `${ball.x}%`,
            top: `${ball.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          className={`absolute z-20 flex items-center justify-center size-5 sm:size-6 rounded-full bg-white border border-slate-700 shadow-md cursor-grab active:cursor-grabbing ${
            isReadOnly ? "pointer-events-none" : "touch-none"
          }`}
          title="Soccer Ball"
        >
          <div className="size-2 sm:size-2.5 bg-[#1E293B] rounded-full" />
        </div>
      )}

      {/* Player Tokens */}
      {players.map((p) => {
        if (!isPlayerLayerVisible(p.team)) return null;

        const isSelected = selectedPlayerId === p.id;
        const isMultiSelected = selectedPlayerIds.includes(p.id);
        const isHovered = hoveredPlayerId === p.id;
        const isFocused = isSelected || isHovered;
        const isGK = p.team === "gk_home" || p.team === "gk_away";
        const isHome = p.team === "home" || p.team === "gk_home";
        const isNeutral = p.team === "neutral";

        let teamColor = isHome ? "#00E5FF" : isNeutral ? "#69F0AE" : "#FF6E40";
        if (p.team === "gk_home") teamColor = "#FFD600";
        if (p.team === "gk_away") teamColor = "#FFB300";

        let bgColor = "bg-[#00E5FF] text-[#0A131F]";
        if (p.team === "away") bgColor = "bg-[#FF6E40] text-white";
        if (p.team === "gk_home") bgColor = "bg-[#FFD600] text-[#0A131F]";
        if (p.team === "gk_away") bgColor = "bg-[#FFA726] text-[#0A131F]";
        if (isNeutral) bgColor = "bg-[#69F0AE] text-[#0A131F]";

        return (
          <div
            key={p.id}
            onPointerDown={(e) => startDragPlayer(e, p.id)}
            onPointerEnter={() => setHoveredPlayerId(p.id)}
            onPointerLeave={() => setHoveredPlayerId(null)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setQuickEditPlayer(p);
            }}
            style={{
              left: `${p.position.x}%`,
              top: `${p.position.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            className={`absolute z-20 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
              isReadOnly ? "pointer-events-none" : "touch-none"
            }`}
          >
            {/* TACTICAL ROLE CALLOUT BADGE (CoachTactics style) */}
            {(p.tacticalRole || isFocused) && (
              <div
                className={`absolute -top-7 px-2 py-0.5 rounded-full flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider shadow-lg transition-all border whitespace-nowrap cursor-pointer ${
                  isFocused
                    ? "opacity-100 scale-105 z-30 bg-[#0E1A2B] text-white border-[#00E5FF]"
                    : "opacity-80 bg-[#0B1524]/90 text-gray-200 border-white/20"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setRoleModalPlayer(p);
                }}
                title={p.tacticalDuty ? `${p.tacticalRole}: ${p.tacticalDuty}` : "Click to assign tactical role"}
              >
                <span className="size-1.5 rounded-full" style={{ backgroundColor: teamColor }} />
                <span>{p.tacticalRole || p.role || "Role"}</span>
              </div>
            )}

            {/* Player Circular Token */}
            <div
              className={`relative size-7 sm:size-8 rounded-full border-2 border-white shadow-xl flex items-center justify-center font-bold text-xs font-mono transition-transform ${bgColor} ${
                isMultiSelected
                  ? "ring-4 ring-primary ring-offset-2 ring-offset-background scale-110"
                  : isSelected
                  ? "ring-4 ring-yellow-400 ring-offset-1 scale-110"
                  : "hover:scale-105"
              }`}
            >
              {isGK ? "GK" : p.number}

              {/* Has ball indicator */}
              {p.hasBall && (
                <span className="absolute -top-1 -right-1 size-2.5 bg-white border border-black rounded-full" />
              )}
            </div>

            {/* Base Caption pill underneath */}
            <span
              className="mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-sm leading-tight shadow-sm bg-[#0A131F]/90 text-white border border-white/20"
            >
              {p.label || p.role}
            </span>
          </div>
        );
      })}

      {/* Inline Touch Quick-Edit Popover */}
      {quickEditPlayer && (
        <PlayerQuickPopover
          player={quickEditPlayer}
          hasBall={Boolean(ball.attachedPlayerId === quickEditPlayer.id)}
          onClose={() => setQuickEditPlayer(null)}
          onUpdatePlayer={(upd) => {
            onUpdatePlayers(players.map((pl) => (pl.id === upd.id ? upd : pl)));
            setQuickEditPlayer(upd);
          }}
          onDeletePlayer={(pid) => {
            if (onDeletePlayer) {
              onDeletePlayer(pid);
            } else {
              onUpdatePlayers(players.filter((pl) => pl.id !== pid));
            }
            setQuickEditPlayer(null);
          }}
          onToggleBallPossession={(pid) => {
            onToggleBallPossession?.(pid);
          }}
        />
      )}

      {/* Tactical Role Assignment Modal */}
      {roleModalPlayer && (
        <TacticalRoleModal
          player={roleModalPlayer}
          isOpen={Boolean(roleModalPlayer)}
          onClose={() => setRoleModalPlayer(null)}
          onSelectRole={(role, duty) => {
            const updated = players.map((p) =>
              p.id === roleModalPlayer.id ? { ...p, tacticalRole: role, tacticalDuty: duty } : p,
            );
            onUpdatePlayers(updated);
            toast.success(`Assigned #${roleModalPlayer.number} to ${role}`);
            setRoleModalPlayer(null);
          }}
        />
      )}

      {/* Quick Coaching Note Pin Dialog */}
      {noteDialogCoords && (
        <QuickNoteDialog
          isOpen={Boolean(noteDialogCoords)}
          coords={noteDialogCoords}
          authorName="Coach"
          onClose={() => setNoteDialogCoords(null)}
          onSave={(text) => {
            const newAnnotation: TacticalAnnotation = {
              id: `note_${Date.now()}`,
              type: "note",
              points: [noteDialogCoords],
              color: "#FFD600",
              width: 1,
              label: text,
            };
            onAddAnnotation(newAnnotation);
            toast.success("Coaching note pinned to pitch");
            setNoteDialogCoords(null);
          }}
        />
      )}
    </div>
  );
};
