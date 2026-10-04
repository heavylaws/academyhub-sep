/**
 * CoachTactics — Server-Side Tactical Domain Model & Data Validation Engine
 * 
 * Enforces strict tactical domain invariants on the server (Convex V8 environment)
 * before persisting tactical plans into the database.
 * 
 * Guarantees:
 * - Coordinates normalized and clamped to [0, 100]
 * - Unique player identifiers per phase
 * - Sequential phase ordering (1, 2, 3...)
 * - Bounded phase durations (1..300 seconds)
 * - Required title and at least one tactical phase
 * - Sanitized player, ball, equipment, and annotation nodes
 */

export interface PitchCoordinate {
  x: number; // 0..100%
  y: number; // 0..100%
}

export type PlayerTeam = "home" | "away" | "neutral" | "gk_home" | "gk_away";

export interface PlayerNode {
  id: string;
  team: PlayerTeam;
  number: number | string;
  role: string;
  label: string;
  position: PitchCoordinate;
  targetPosition?: PitchCoordinate;
  movementType?: "straight_run" | "curve_run" | "press" | "hold" | "overlap";
  hasBall?: boolean;
}

export interface BallNode {
  x: number;
  y: number;
  attachedPlayerId?: string;
  trajectory?: PitchCoordinate[];
  speed?: "ground" | "lofted" | "driven";
}

export type EquipmentType =
  | "cone"
  | "mannequin"
  | "mini_goal"
  | "agility_pole"
  | "hurdle";

export interface EquipmentNode {
  id: string;
  type: EquipmentType;
  position: PitchCoordinate;
  label?: string;
  rotation?: number;
}

export type AnnotationType =
  | "pass_line"
  | "run_arrow"
  | "dribble_wave"
  | "press_zone"
  | "freehand"
  | "text";

export interface TacticalAnnotation {
  id: string;
  type: AnnotationType;
  points: PitchCoordinate[];
  color: string;
  width: number;
  label?: string;
}

export interface TacticalPhase {
  id: string;
  phaseNumber: number;
  title: string;
  durationSeconds: number;
  players: PlayerNode[];
  ball: BallNode;
  equipment: EquipmentNode[];
  annotations: TacticalAnnotation[];
  coachingNotes?: string;
}

export type PitchType =
  | "full"
  | "attacking_half"
  | "defending_half"
  | "penalty_box"
  | "rondo_grid";

export interface TacticalPlan {
  id: string;
  drillId?: string;
  title: string;
  category?: string;
  pitchType: PitchType;
  gridDimensions?: string;
  phases: TacticalPhase[];
  coachingPoints: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ServerTacticalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedPlan?: TacticalPlan;
}

export function clampCoord(coord: number): number {
  if (isNaN(coord)) return 50;
  const clamped = Math.max(0, Math.min(100, coord));
  return Math.round(clamped * 100) / 100;
}

export function normalizeCoord(p: unknown): PitchCoordinate {
  if (typeof p !== "object" || p === null) {
    return { x: 50, y: 50 };
  }
  const raw = p as Record<string, unknown>;
  const rawX = typeof raw.x === "number" ? raw.x : 50;
  const rawY = typeof raw.y === "number" ? raw.y : 50;
  return {
    x: clampCoord(rawX),
    y: clampCoord(rawY),
  };
}

/**
 * Validates and normalizes raw tactical plan data on the server
 */
export function validateServerTacticalPlan(raw: unknown): ServerTacticalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof raw !== "object" || raw === null) {
    return {
      valid: false,
      errors: ["Invalid tactical plan format: expected a JSON object"],
      warnings: [],
    };
  }

  const input = raw as Record<string, unknown>;

  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    errors.push("Tactical plan missing required non-empty title");
  }

  const validPitchTypes: PitchType[] = [
    "full",
    "attacking_half",
    "defending_half",
    "penalty_box",
    "rondo_grid",
  ];
  const pitchType: PitchType = validPitchTypes.includes(input.pitchType as PitchType)
    ? (input.pitchType as PitchType)
    : "full";

  if (!Array.isArray(input.phases) || input.phases.length === 0) {
    errors.push("Tactical plan must contain at least one tactical phase");
  }

  const rawPhases = Array.isArray(input.phases) ? input.phases : [];
  const normalizedPhases: TacticalPhase[] = [];

  rawPhases.forEach((p, index) => {
    const phaseIndex = index + 1;
    if (typeof p !== "object" || p === null) {
      errors.push(`Phase #${phaseIndex} is not a valid object`);
      return;
    }

    const phase = p as Record<string, unknown>;
    const phaseTitle =
      typeof phase.title === "string" && phase.title.trim()
        ? phase.title.trim()
        : `Phase ${phaseIndex}`;

    const phaseNumber =
      typeof phase.phaseNumber === "number" && phase.phaseNumber > 0
        ? phase.phaseNumber
        : phaseIndex;

    if (phaseNumber !== phaseIndex) {
      warnings.push(`Phase numbering mismatch: expected ${phaseIndex}, received ${phaseNumber}`);
    }

    let durationSeconds =
      typeof phase.durationSeconds === "number" ? phase.durationSeconds : 5;
    if (durationSeconds < 1 || durationSeconds > 300) {
      warnings.push(`Phase #${phaseIndex} duration (${durationSeconds}s) out of bounds [1..300]. Clamped.`);
      durationSeconds = Math.max(1, Math.min(300, durationSeconds || 5));
    }

    // Validate players
    const rawPlayers = Array.isArray(phase.players) ? phase.players : [];
    const playerIds = new Set<string>();
    const normalizedPlayers: PlayerNode[] = [];

    rawPlayers.forEach((playerRaw, pIdx) => {
      if (typeof playerRaw !== "object" || playerRaw === null) return;
      const pl = playerRaw as Record<string, unknown>;

      let pid = typeof pl.id === "string" && pl.id.trim() ? pl.id.trim() : `p_${phaseIndex}_${pIdx + 1}`;
      if (playerIds.has(pid)) {
        errors.push(`Duplicate player ID '${pid}' in phase #${phaseIndex}`);
        pid = `${pid}_dup_${pIdx + 1}`;
      }
      playerIds.add(pid);

      const validTeams: PlayerTeam[] = ["home", "away", "neutral", "gk_home", "gk_away"];
      const team: PlayerTeam = validTeams.includes(pl.team as PlayerTeam)
        ? (pl.team as PlayerTeam)
        : "home";

      const pos = normalizeCoord(pl.position);
      const targetPos = pl.targetPosition ? normalizeCoord(pl.targetPosition) : undefined;

      normalizedPlayers.push({
        id: pid,
        team,
        number: pl.number !== undefined ? String(pl.number) : pIdx + 1,
        role: typeof pl.role === "string" && pl.role ? pl.role : "PL",
        label: typeof pl.label === "string" && pl.label ? pl.label : `Player ${pIdx + 1}`,
        position: pos,
        targetPosition: targetPos,
        movementType: pl.movementType as PlayerNode["movementType"],
        hasBall: Boolean(pl.hasBall),
      });
    });

    // Validate Ball
    let normalizedBall: BallNode;
    if (typeof phase.ball === "object" && phase.ball !== null) {
      const b = phase.ball as Record<string, unknown>;
      const bPos = normalizeCoord({ x: b.x, y: b.y });
      const rawTrajectory = Array.isArray(b.trajectory) ? b.trajectory : [];
      const normalizedTrajectory = rawTrajectory.map((pt) => normalizeCoord(pt));

      normalizedBall = {
        x: bPos.x,
        y: bPos.y,
        attachedPlayerId: typeof b.attachedPlayerId === "string" ? b.attachedPlayerId : undefined,
        trajectory: normalizedTrajectory.length > 0 ? normalizedTrajectory : undefined,
        speed: (["ground", "lofted", "driven"].includes(b.speed as string)
          ? b.speed
          : "ground") as BallNode["speed"],
      };
    } else {
      normalizedBall = { x: 50, y: 50 };
    }

    // Validate Equipment
    const rawEquipment = Array.isArray(phase.equipment) ? phase.equipment : [];
    const eqIds = new Set<string>();
    const normalizedEquipment: EquipmentNode[] = [];

    rawEquipment.forEach((eqRaw, eqIdx) => {
      if (typeof eqRaw !== "object" || eqRaw === null) return;
      const eq = eqRaw as Record<string, unknown>;
      let eqId = typeof eq.id === "string" && eq.id ? eq.id : `eq_${phaseIndex}_${eqIdx + 1}`;
      if (eqIds.has(eqId)) {
        eqId = `${eqId}_${eqIdx + 1}`;
      }
      eqIds.add(eqId);

      const validTypes: EquipmentType[] = [
        "cone",
        "mannequin",
        "mini_goal",
        "agility_pole",
        "hurdle",
      ];
      const type: EquipmentType = validTypes.includes(eq.type as EquipmentType)
        ? (eq.type as EquipmentType)
        : "cone";

      normalizedEquipment.push({
        id: eqId,
        type,
        position: normalizeCoord(eq.position),
        label: typeof eq.label === "string" ? eq.label : undefined,
        rotation: typeof eq.rotation === "number" ? eq.rotation : 0,
      });
    });

    // Validate Annotations
    const rawAnnotations = Array.isArray(phase.annotations) ? phase.annotations : [];
    const normalizedAnnotations: TacticalAnnotation[] = [];

    rawAnnotations.forEach((annRaw, annIdx) => {
      if (typeof annRaw !== "object" || annRaw === null) return;
      const ann = annRaw as Record<string, unknown>;
      const annId = typeof ann.id === "string" && ann.id ? ann.id : `ann_${phaseIndex}_${annIdx + 1}`;

      const rawPoints = Array.isArray(ann.points) ? ann.points : [];
      const normalizedPoints = rawPoints.map((pt) => normalizeCoord(pt));

      const validTypes: AnnotationType[] = [
        "pass_line",
        "run_arrow",
        "dribble_wave",
        "press_zone",
        "freehand",
        "text",
      ];
      const type: AnnotationType = validTypes.includes(ann.type as AnnotationType)
        ? (ann.type as AnnotationType)
        : "run_arrow";

      normalizedAnnotations.push({
        id: annId,
        type,
        points: normalizedPoints,
        color: typeof ann.color === "string" ? ann.color : "#FFFFFF",
        width: typeof ann.width === "number" ? ann.width : 2,
        label: typeof ann.label === "string" ? ann.label : undefined,
      });
    });

    normalizedPhases.push({
      id: typeof phase.id === "string" && phase.id ? phase.id : `phase_${phaseIndex}`,
      phaseNumber: phaseIndex,
      title: phaseTitle,
      durationSeconds,
      players: normalizedPlayers,
      ball: normalizedBall,
      equipment: normalizedEquipment,
      annotations: normalizedAnnotations,
      coachingNotes: typeof phase.coachingNotes === "string" ? phase.coachingNotes : undefined,
    });
  });

  const now = new Date().toISOString();
  const normalizedPlan: TacticalPlan = {
    id: typeof input.id === "string" && input.id ? input.id : `plan_${Date.now()}`,
    drillId: typeof input.drillId === "string" ? input.drillId : undefined,
    title,
    category: typeof input.category === "string" ? input.category : "Tactical",
    pitchType,
    gridDimensions: typeof input.gridDimensions === "string" ? input.gridDimensions : undefined,
    phases: normalizedPhases,
    coachingPoints: Array.isArray(input.coachingPoints)
      ? input.coachingPoints.map(String)
      : [],
    createdAt: typeof input.createdAt === "string" ? input.createdAt : now,
    updatedAt: now,
  };

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalizedPlan,
  };
}
