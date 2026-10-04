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
import { toast } from "sonner";

export type BoardInteractionMode =
  | "select"
  | "lasso"
  | "pass_line"
  | "run_arrow"
  | "dribble_wave"
  | "press_zone"
  | "cover_shadow"
  | "defensive_block"
  | "freehand"
  | "eraser";

interface TacticalBoardCanvasProps {
  pitchType: PitchType;
  players: PlayerNode[];
  ball: BallNode;
  equipment: EquipmentNode[];
  annotations: TacticalAnnotation[];
  mode: BoardInteractionMode;
  onSetMode?: (mode: BoardInteractionMode) => void;
  activeColor: string;
  showHeatmap: boolean;
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
  showHeatmap,
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
    type: "player" | "ball" | "equipment";
    id: string;
  } | null>(null);

  const lastPlayerPosRef = useRef<PitchCoordinate | null>(null);

  // Lasso multi-select state
  const [lassoBox, setLassoBox] = useState<{ start: PitchCoordinate; current: PitchCoordinate } | null>(null);

  // Touch quick-edit popover state
  const [quickEditPlayer, setQuickEditPlayer] = useState<PlayerNode | null>(null);

  // RAF optimization refs for smooth 60fps dragging without React render thrashing
  const rafIdRef = useRef<number | null>(null);
  const pendingCoordsRef = useRef<PitchCoordinate | null>(null);

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Drawing state
  const [currentStroke, setCurrentStroke] = useState<PitchCoordinate[]>([]);

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

  // Pointer Down
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isReadOnly) return;
    const coords = getPitchCoords(e);

    if (mode === "lasso") {
      containerRef.current?.setPointerCapture(e.pointerId);
      setLassoBox({ start: coords, current: coords });
      return;
    }

    if (mode === "select") {
      // Background click: deselect
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
        onSelectPlayer?.(null);
        onSelectPlayerIds?.([]);
        setQuickEditPlayer(null);
      }
      return;
    }

    if (mode === "eraser") {
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
          } else if (draggingEntity.type === "ball") {
            onUpdateBall({ ...ball, x: targetCoords.x, y: targetCoords.y, attachedPlayerId: undefined });
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
      if (mode === "freehand") {
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
      const newAnnotation: TacticalAnnotation = {
        id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        type: mode === "freehand" ? "freehand" : (mode as TacticalAnnotation["type"]),
        points: currentStroke,
        color: activeColor,
        width: mode === "press_zone" ? 20 : 2.5,
      };
      onAddAnnotation(newAnnotation);
    }
    setCurrentStroke([]);
  };

  // Drag start helper for player
  const startDragPlayer = (e: React.PointerEvent, playerId: string) => {
    if (isReadOnly || mode !== "select") return;
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    setDraggingEntity({ type: "player", id: playerId });
    const p = players.find((pl) => pl.id === playerId) || null;
    lastPlayerPosRef.current = p ? { ...p.position } : null;
    onSelectPlayer?.(p);
  };

  // Drag start helper for ball
  const startDragBall = (e: React.PointerEvent) => {
    if (isReadOnly || mode !== "select") return;
    e.stopPropagation();
    containerRef.current?.setPointerCapture(e.pointerId);
    setDraggingEntity({ type: "ball", id: "ball" });
  };

  // Drag start helper for equipment
  const startDragEquipment = (e: React.PointerEvent, eqId: string) => {
    if (isReadOnly || mode !== "select") return;
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
      className={`relative w-full aspect-[1000/650] select-none rounded-xl overflow-hidden shadow-xl border border-border/80 bg-zinc-950 ${
        mode === "select"
          ? "cursor-default"
          : mode === "lasso"
          ? "cursor-crosshair"
          : mode === "eraser"
          ? "cursor-not-allowed"
          : "cursor-crosshair"
      }`}
    >
      {/* Underlying Pitch Geometry Canvas */}
      <TacticalPitchSvg
        pitchType={pitchType}
        showHeatmap={showHeatmap}
        heatmapData={heatmapData}
      />

      {/* SVG Overlay for Vector Drawing & Annotations */}
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
            id="arrow-yellow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#FBBF24" />
          </marker>
        </defs>

        {/* Existing Annotations */}
        {annotations.map((ann) => {
          if (ann.points.length === 0) return null;

          if (ann.type === "freehand") {
            const d = ann.points.reduce(
              (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
              "",
            );
            return (
              <path
                key={ann.id}
                d={d}
                fill="none"
                stroke={ann.color}
                strokeWidth={ann.width * 0.3}
                strokeLinecap="round"
                className={mode === "eraser" ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
                onClick={() => mode === "eraser" && onRemoveAnnotation(ann.id)}
              />
            );
          }

          if (ann.type === "press_zone") {
            const [p1, p2] = [ann.points[0], ann.points[ann.points.length - 1]];
            const minX = Math.min(p1.x, p2.x);
            const minY = Math.min(p1.y, p2.y);
            const w = Math.abs(p2.x - p1.x);
            const h = Math.abs(p2.y - p1.y);
            return (
              <rect
                key={ann.id}
                x={minX}
                y={minY}
                width={w}
                height={h}
                rx={2}
                fill={ann.color}
                fillOpacity={0.2}
                stroke={ann.color}
                strokeWidth={0.8}
                strokeDasharray="2 2"
                className={mode === "eraser" ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
                onClick={() => mode === "eraser" && onRemoveAnnotation(ann.id)}
              />
            );
          }

          if (ann.type === "cover_shadow") {
            const p1 = ann.points[0];
            const p2 = ann.points[ann.points.length - 1] || { x: p1.x + 10, y: p1.y };
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
                className={mode === "eraser" ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
                onClick={() => mode === "eraser" && onRemoveAnnotation(ann.id)}
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

          if (ann.type === "defensive_block") {
            const ptsString = ann.points.map((pt) => `${pt.x},${pt.y}`).join(" ");
            return (
              <polygon
                key={ann.id}
                points={ptsString}
                fill={ann.color}
                fillOpacity={0.2}
                stroke={ann.color}
                strokeWidth={1}
                strokeDasharray="2 2"
                className={mode === "eraser" ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
                onClick={() => mode === "eraser" && onRemoveAnnotation(ann.id)}
              />
            );
          }

          const start = ann.points[0];
          const end = ann.points[ann.points.length - 1];
          const isDashed = ann.type === "pass_line";
          const isWavy = ann.type === "dribble_wave";

          return (
            <g
              key={ann.id}
              className={mode === "eraser" ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
              onClick={() => mode === "eraser" && onRemoveAnnotation(ann.id)}
            >
              <line
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={ann.color}
                strokeWidth={ann.width * 0.4}
                strokeDasharray={isDashed ? "2.5 1.5" : isWavy ? "1 1" : undefined}
                strokeLinecap="round"
                markerEnd="url(#arrow-yellow)"
              />
              {ann.label && (
                <text
                  x={(start.x + end.x) / 2}
                  y={(start.y + end.y) / 2 - 1.5}
                  fill="#FFFFFF"
                  fontSize="2.5"
                  fontWeight="bold"
                  textAnchor="middle"
                  className="bg-black/60 px-1 rounded"
                >
                  {ann.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Lasso Selection Marquee */}
        {lassoBox && (
          <rect
            x={Math.min(lassoBox.start.x, lassoBox.current.x)}
            y={Math.min(lassoBox.start.y, lassoBox.current.y)}
            width={Math.abs(lassoBox.current.x - lassoBox.start.x)}
            height={Math.abs(lassoBox.current.y - lassoBox.start.y)}
            fill="#3B82F6"
            fillOpacity={0.15}
            stroke="#3B82F6"
            strokeWidth={1}
            strokeDasharray="2 2"
          />
        )}

        {/* Current In-progress Drawing Stroke */}
        {currentStroke.length > 1 && (
          <g>
            {mode === "freehand" ? (
              <path
                d={currentStroke.reduce((acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`), "")}
                fill="none"
                stroke={activeColor}
                strokeWidth={1}
                strokeLinecap="round"
              />
            ) : mode === "press_zone" ? (
              <rect
                x={Math.min(currentStroke[0].x, currentStroke[1].x)}
                y={Math.min(currentStroke[0].y, currentStroke[1].y)}
                width={Math.abs(currentStroke[1].x - currentStroke[0].x)}
                height={Math.abs(currentStroke[1].y - currentStroke[0].y)}
                rx={2}
                fill={activeColor}
                fillOpacity={0.25}
                stroke={activeColor}
                strokeWidth={0.8}
                strokeDasharray="2 2"
              />
            ) : (
              <line
                x1={currentStroke[0].x}
                y1={currentStroke[0].y}
                x2={currentStroke[1].x}
                y2={currentStroke[1].y}
                stroke={activeColor}
                strokeWidth={1}
                strokeDasharray={mode === "pass_line" ? "2 1.5" : undefined}
                strokeLinecap="round"
                markerEnd="url(#arrow-white)"
              />
            )}
          </g>
        )}

        {/* Player Movement Trajectory indicators if targetPosition set */}
        {players.map((p) => {
          if (!p.targetPosition) return null;
          return (
            <line
              key={`target_${p.id}`}
              x1={p.position.x}
              y1={p.position.y}
              x2={p.targetPosition.x}
              y2={p.targetPosition.y}
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth={0.8}
              strokeDasharray="1.5 1.5"
              markerEnd="url(#arrow-white)"
            />
          );
        })}
      </svg>

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
            className={`absolute flex items-center justify-center p-1 cursor-grab active:cursor-grabbing transition-transform ${
              isReadOnly ? "pointer-events-none" : "touch-none"
            }`}
          >
            {eq.type === "cone" && (
              <div className="size-4 sm:size-5 bg-amber-500 clip-triangle shadow-sm border border-amber-600/80 rounded-xs" title="Field Cone" />
            )}
            {eq.type === "mannequin" && (
              <div className="w-2.5 h-6 sm:w-3 sm:h-7 bg-amber-400 border border-amber-600 rounded-sm shadow-md flex items-center justify-center" title="Free-kick Mannequin">
                <span className="text-[8px] font-bold text-amber-900 leading-none">M</span>
              </div>
            )}
            {eq.type === "mini_goal" && (
              <div className="w-6 h-3 sm:w-8 sm:h-4 border-2 border-red-500 bg-red-500/20 rounded-xs shadow-md" title="Target Mini Goal" />
            )}
            {eq.type === "agility_pole" && (
              <div className="flex flex-col items-center" title="Slalom Agility Pole">
                <div className="w-2.5 h-2 bg-red-500 clip-triangle -mr-2" />
                <div className="w-1.5 h-6 bg-yellow-300 border border-yellow-500 rounded-full shadow-sm" />
              </div>
            )}
            {eq.type === "hurdle" && (
              <div className="w-5 h-2.5 border-t-2 border-x-2 border-orange-400 bg-transparent rounded-t-xs" title="Speed Hurdle" />
            )}
            {eq.type === "speed_ladder" && (
              <div className="w-4 h-12 border-x-2 border-yellow-400 flex flex-col justify-between py-0.5 bg-black/40 rounded-xs" title="Agility Speed Ladder">
                <div className="h-0.5 w-full bg-yellow-400" />
                <div className="h-0.5 w-full bg-yellow-400" />
                <div className="h-0.5 w-full bg-yellow-400" />
                <div className="h-0.5 w-full bg-yellow-400" />
              </div>
            )}
            {eq.type === "passing_gate" && (
              <div className="flex items-center gap-1.5" title="Cone Passing Gate">
                <div className="size-2.5 bg-red-500 rounded-full border border-white" />
                <div className="w-5 h-0.5 border-t border-dashed border-amber-300" />
                <div className="size-2.5 bg-red-500 rounded-full border border-white" />
              </div>
            )}
            {eq.type === "rebounder_board" && (
              <div className="w-7 h-2.5 bg-zinc-800 border-2 border-amber-400 rounded-xs shadow-md flex items-center justify-center" title="Wall Rebounder Board">
                <span className="text-[7px] text-amber-400 font-bold tracking-tighter">WALL</span>
              </div>
            )}
            {eq.type === "ball_cart" && (
              <div className="size-5 rounded-full border border-white bg-blue-600/80 shadow-md flex items-center justify-center" title="Ball Supply Cart">
                <div className="size-2 rounded-full bg-white border border-black" />
              </div>
            )}
          </div>
        );
      })}

      {/* Ball Token */}
      <div
        onPointerDown={startDragBall}
        style={{
          left: `${ball.x}%`,
          top: `${ball.y}%`,
          transform: "translate(-50%, -50%)",
        }}
        className={`absolute z-20 flex items-center justify-center size-5 sm:size-6 rounded-full bg-white border border-gray-400 shadow-md cursor-grab active:cursor-grabbing ${
          isReadOnly ? "pointer-events-none" : "touch-none"
        }`}
        title="Soccer Ball"
      >
        <div className="size-2 sm:size-2.5 bg-black clip-polygon rounded-full" />
      </div>

      {/* Player Tokens */}
      {players.map((p) => {
        const isSelected = selectedPlayerId === p.id;
        const isMultiSelected = selectedPlayerIds.includes(p.id);
        const isGK = p.team === "gk_home" || p.team === "gk_away";
        const isHome = p.team === "home" || p.team === "gk_home";
        const isNeutral = p.team === "neutral";

        let bgColor = "bg-blue-600 border-blue-400 text-white";
        if (p.team === "away") bgColor = "bg-red-600 border-red-400 text-white";
        if (p.team === "gk_home") bgColor = "bg-lime-500 border-lime-300 text-black";
        if (p.team === "gk_away") bgColor = "bg-amber-400 border-amber-300 text-black";
        if (isNeutral) bgColor = "bg-orange-500 border-orange-300 text-white";

        return (
          <div
            key={p.id}
            onPointerDown={(e) => startDragPlayer(e, p.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setQuickEditPlayer(p);
            }}
            style={{
              left: `${p.position.x}%`,
              top: `${p.position.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            className={`absolute z-10 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-[box-shadow,transform] ${
              isReadOnly ? "pointer-events-none" : "touch-none"
            }`}
          >
            {/* Player Circular Token (Touch target minimum 34px-40px with ring) */}
            <div
              className={`relative size-7 sm:size-8 rounded-full border-2 shadow-lg flex items-center justify-center font-bold text-xs font-mono transition-transform ${bgColor} ${
                isMultiSelected
                  ? "ring-4 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-primary/30"
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

            {/* Role / Name Caption */}
            <span
              className={`mt-0.5 text-[9px] sm:text-[10px] font-bold px-1 rounded-sm leading-tight shadow-xs ${
                isHome ? "bg-blue-950/80 text-blue-200" : isNeutral ? "bg-orange-950/80 text-orange-200" : "bg-red-950/80 text-red-200"
              }`}
            >
              {p.role}
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
    </div>
  );
};
