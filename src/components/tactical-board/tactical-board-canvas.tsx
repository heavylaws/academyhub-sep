import React, { useRef, useState, useCallback, useMemo } from "react";
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

export type BoardInteractionMode =
  | "select"
  | "pass_line"
  | "run_arrow"
  | "dribble_wave"
  | "press_zone"
  | "freehand"
  | "eraser";

interface TacticalBoardCanvasProps {
  pitchType: PitchType;
  players: PlayerNode[];
  ball: BallNode;
  equipment: EquipmentNode[];
  annotations: TacticalAnnotation[];
  mode: BoardInteractionMode;
  activeColor: string;
  showHeatmap: boolean;
  onUpdatePlayers: (players: PlayerNode[]) => void;
  onUpdateBall: (ball: BallNode) => void;
  onUpdateEquipment: (equipment: EquipmentNode[]) => void;
  onAddAnnotation: (annotation: TacticalAnnotation) => void;
  onRemoveAnnotation: (id: string) => void;
  onSelectPlayer?: (player: PlayerNode | null) => void;
  selectedPlayerId?: string | null;
  isReadOnly?: boolean;
}

export const TacticalBoardCanvas: React.FC<TacticalBoardCanvasProps> = ({
  pitchType,
  players,
  ball,
  equipment,
  annotations,
  mode,
  activeColor,
  showHeatmap,
  onUpdatePlayers,
  onUpdateBall,
  onUpdateEquipment,
  onAddAnnotation,
  onRemoveAnnotation,
  onSelectPlayer,
  selectedPlayerId,
  isReadOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging state
  const [draggingEntity, setDraggingEntity] = useState<{
    type: "player" | "ball" | "equipment";
    id: string;
  } | null>(null);

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

    if (mode === "select") {
      // Background click: deselect
      if (e.target === containerRef.current || (e.target as HTMLElement).tagName === "svg") {
        onSelectPlayer?.(null);
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

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isReadOnly) return;
    const coords = getPitchCoords(e);

    // Entity dragging
    if (draggingEntity) {
      if (draggingEntity.type === "player") {
        const updated = players.map((p) =>
          p.id === draggingEntity.id ? { ...p, position: coords } : p,
        );
        onUpdatePlayers(updated);
      } else if (draggingEntity.type === "ball") {
        onUpdateBall({ ...ball, x: coords.x, y: coords.y, attachedPlayerId: undefined });
      } else if (draggingEntity.type === "equipment") {
        const updated = equipment.map((eq) =>
          eq.id === draggingEntity.id ? { ...eq, position: coords } : eq,
        );
        onUpdateEquipment(updated);
      }
      return;
    }

    // Active drawing
    if (currentStroke.length > 0) {
      if (mode === "freehand") {
        setCurrentStroke((prev) => [...prev, coords]);
      } else {
        // Line/Arrow preview: 2 points [start, current]
        setCurrentStroke([currentStroke[0], coords]);
      }
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent) => {
    if (isReadOnly) return;

    if (draggingEntity) {
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
      intensity: p.team === "home" ? 1.0 : 0.8,
    }));
  }, [players]);

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        setDraggingEntity(null);
        setCurrentStroke([]);
      }}
      className={`relative w-full aspect-[16/10.5] sm:aspect-[16/10] max-h-[70vh] rounded-xl overflow-hidden shadow-md select-none touch-none bg-emerald-950 ${
        mode !== "select" ? "cursor-crosshair" : "cursor-default"
      }`}
    >
      {/* Background SVG Pitch */}
      <TacticalPitchSvg
        pitchType={pitchType}
        showHeatmap={showHeatmap}
        heatmapData={heatmapData}
      />

      {/* SVG Layer for Tactical Annotations */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
      >
        {/* Render Saved Annotations */}
        {annotations.map((ann) => {
          if (ann.points.length < 2) return null;

          if (ann.type === "freehand") {
            const pathData = ann.points.reduce((acc, pt, i) => {
              return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
            }, "");
            return (
              <path
                key={ann.id}
                d={pathData}
                fill="none"
                stroke={ann.color}
                strokeWidth={ann.width * 0.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                className={mode === "eraser" ? "pointer-events-auto cursor-pointer hover:opacity-50" : ""}
                onClick={() => mode === "eraser" && onRemoveAnnotation(ann.id)}
              />
            );
          }

          if (ann.type === "press_zone") {
            // Semi-transparent shaded tactical press zone
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
              <div className="size-4 sm:size-5 bg-amber-500 clip-triangle shadow-sm border border-amber-600/80 rounded-xs" />
            )}
            {eq.type === "mannequin" && (
              <div className="w-2.5 h-6 sm:w-3 sm:h-7 bg-amber-400 border border-amber-600 rounded-sm shadow-md flex items-center justify-center">
                <span className="text-[8px] font-bold text-amber-900 leading-none">M</span>
              </div>
            )}
            {eq.type === "mini_goal" && (
              <div className="w-6 h-3 sm:w-8 sm:h-4 border-2 border-red-500 bg-red-500/20 rounded-xs shadow-md" />
            )}
            {eq.type === "agility_pole" && (
              <div className="w-1.5 h-6 bg-yellow-300 border border-yellow-500 rounded-full shadow-sm" />
            )}
            {eq.type === "hurdle" && (
              <div className="w-5 h-2 border-t-2 border-orange-400 bg-transparent" />
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
        {/* Realistic soccer ball pentagon pattern */}
        <div className="size-2 sm:size-2.5 bg-black clip-polygon rounded-full" />
      </div>

      {/* Player Tokens */}
      {players.map((p) => {
        const isSelected = selectedPlayerId === p.id;
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
            style={{
              left: `${p.position.x}%`,
              top: `${p.position.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            className={`absolute z-10 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-[box-shadow] ${
              isReadOnly ? "pointer-events-none" : "touch-none"
            }`}
          >
            {/* Player Circular Token (Touch target minimum 34px-40px with ring) */}
            <div
              className={`relative size-7 sm:size-8 rounded-full border-2 shadow-lg flex items-center justify-center font-bold text-xs font-mono transition-transform ${bgColor} ${
                isSelected
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
    </div>
  );
};
