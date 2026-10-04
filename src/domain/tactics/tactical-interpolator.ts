import type {
  TacticalPhase,
  PlayerNode,
  BallNode,
  PitchCoordinate,
  PlayerTeam,
} from "./tactical-domain.ts";
import { clampCoordinate } from "./tactical-domain.ts";

export interface InterpolatedPlayer {
  id: string;
  team: PlayerTeam;
  number: string | number;
  role: string;
  x: number;
  y: number;
  rotation?: number;
}

export interface InterpolatedTacticalState {
  players: InterpolatedPlayer[];
  ball: {
    x: number;
    y: number;
    arcHeight?: number; // Visual Z-elevation for lofted passes
  };
}

/**
 * Natural organic ease-in-out function for realistic athletic acceleration and deceleration.
 */
export function easeNatural(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return clamped < 0.5
    ? 2 * clamped * clamped
    : 1 - Math.pow(-2 * clamped + 2, 2) / 2;
}

/**
 * Evaluates a Catmull-Rom or multi-waypoint spline at progress t (0..1)
 */
export function interpolateSpline(points: PitchCoordinate[], t: number): PitchCoordinate {
  if (points.length === 0) return { x: 50, y: 50 };
  if (points.length === 1) return points[0];
  if (points.length === 2) {
    const p0 = points[0];
    const p1 = points[1];
    return {
      x: clampCoordinate(p0.x + (p1.x - p0.x) * t),
      y: clampCoordinate(p0.y + (p1.y - p0.y) * t),
    };
  }

  // Segment index
  const numSegments = points.length - 1;
  const scaledT = Math.max(0, Math.min(1, t)) * numSegments;
  const segIdx = Math.min(Math.floor(scaledT), numSegments - 1);
  const localT = scaledT - segIdx;

  const pStart = points[segIdx];
  const pEnd = points[segIdx + 1];

  return {
    x: clampCoordinate(pStart.x + (pEnd.x - pStart.x) * localT),
    y: clampCoordinate(pStart.y + (pEnd.y - pStart.y) * localT),
  };
}

/**
 * Smooth multi-phase interpolator calculating continuous player and ball vectors
 */
export function smoothInterpolatePhase(
  fromPhase: TacticalPhase,
  toPhase: TacticalPhase,
  progress: number,
  options: {
    useEasing?: boolean;
    includeBallArc?: boolean;
  } = {},
): InterpolatedTacticalState {
  const { useEasing = true, includeBallArc = true } = options;
  const rawT = Math.max(0, Math.min(1, progress));
  const t = useEasing ? easeNatural(rawT) : rawT;

  const toMap = new Map<string, PlayerNode>(toPhase.players.map((p) => [p.id, p]));

  // Interpolate Players
  const players: InterpolatedPlayer[] = fromPhase.players.map((player) => {
    const nextPlayer = toMap.get(player.id) || player;
    const startCoord = player.position;

    // Check if player has defined trajectory waypoints
    let targetX = player.targetPosition?.x ?? nextPlayer.position.x;
    let targetY = player.targetPosition?.y ?? nextPlayer.position.y;

    let curX: number;
    let curY: number;

    if (player.targetPosition) {
      curX = startCoord.x + (targetX - startCoord.x) * t;
      curY = startCoord.y + (targetY - startCoord.y) * t;
    } else {
      curX = startCoord.x + (nextPlayer.position.x - startCoord.x) * t;
      curY = startCoord.y + (nextPlayer.position.y - startCoord.y) * t;
    }

    return {
      id: player.id,
      team: player.team,
      number: player.number,
      role: player.role,
      x: clampCoordinate(curX),
      y: clampCoordinate(curY),
    };
  });

  // Interpolate Ball
  const fromBall = fromPhase.ball;
  const toBall = toPhase.ball;

  let ballX = fromBall.x + (toBall.x - fromBall.x) * t;
  let ballY = fromBall.y + (toBall.y - fromBall.y) * t;

  // Ball flight physics: parabolic arc for lofted ball passes
  let arcHeight = 0;
  if (includeBallArc && (fromBall.speed === "lofted" || toBall.speed === "lofted")) {
    arcHeight = 12 * Math.sin(rawT * Math.PI); // Parabolic peak at t = 0.5
  }

  return {
    players,
    ball: {
      x: clampCoordinate(ballX),
      y: clampCoordinate(ballY),
      arcHeight,
    },
  };
}

/**
 * Resolves global scrubber timeline (0.0 to 1.0) into discrete phase index and local phase t
 */
export function resolveGlobalTime(
  phases: TacticalPhase[],
  globalT: number,
): {
  activePhaseIndex: number;
  localT: number;
  totalDurationSeconds: number;
  elapsedSeconds: number;
} {
  if (!phases || phases.length === 0) {
    return { activePhaseIndex: 0, localT: 0, totalDurationSeconds: 4, elapsedSeconds: 0 };
  }

  const totalDurationSeconds = phases.reduce((acc, p) => acc + (p.durationSeconds || 4), 0);
  const clampedGlobalT = Math.max(0, Math.min(1, globalT));
  const elapsedSeconds = clampedGlobalT * totalDurationSeconds;

  let accumulated = 0;
  for (let i = 0; i < phases.length; i++) {
    const dur = phases[i].durationSeconds || 4;
    if (elapsedSeconds <= accumulated + dur || i === phases.length - 1) {
      const localElapsed = elapsedSeconds - accumulated;
      const localT = dur > 0 ? Math.max(0, Math.min(1, localElapsed / dur)) : 0;
      return {
        activePhaseIndex: i,
        localT,
        totalDurationSeconds,
        elapsedSeconds,
      };
    }
    accumulated += dur;
  }

  return {
    activePhaseIndex: phases.length - 1,
    localT: 1,
    totalDurationSeconds,
    elapsedSeconds: totalDurationSeconds,
  };
}
