/**
 * CoachTactics — Tactical Domain Model & Data Validation Engine
 * 
 * Defines standard normalized pitch coordinate system (0..100% on X and Y)
 * and enforces strict validation and safe normalization on player, ball,
 * equipment, phase, trajectory, and annotation tactical structures.
 */

export interface PitchCoordinate {
  x: number; // 0..100% (0 = left touchline/goal line, 100 = right touchline/goal line)
  y: number; // 0..100% (0 = top touchline, 100 = bottom touchline)
}

export type PlayerTeam = "home" | "away" | "neutral" | "gk_home" | "gk_away";

export interface PlayerNode {
  id: string;
  team: PlayerTeam;
  number: number | string;
  role: string; // e.g. "ST", "CM", "CB", "LB", "RB", "GK", "WNG"
  label: string;
  position: PitchCoordinate;
  targetPosition?: PitchCoordinate; // Where the player is moving in this phase
  movementType?: "straight_run" | "curve_run" | "press" | "hold" | "overlap";
  hasBall?: boolean;
}

export interface BallNode {
  x: number; // 0..100
  y: number; // 0..100
  attachedPlayerId?: string; // If possessed by a player
  trajectory?: PitchCoordinate[]; // Pass or shot waypoint trajectory
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
  rotation?: number; // 0..360 degrees
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
  phaseNumber: number; // 1, 2, 3...
  title: string;
  durationSeconds: number; // 1..300
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

export interface TacticalValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedPlan?: TacticalPlan;
}

/**
 * Clamps coordinate to [0, 100] with 2 decimal precision
 */
export function clampCoordinate(coord: number): number {
  if (isNaN(coord)) return 50;
  const clamped = Math.max(0, Math.min(100, coord));
  return Math.round(clamped * 100) / 100;
}

/**
 * Validates and normalizes pitch coordinate
 */
export function normalizeCoordinate(p: unknown): PitchCoordinate {
  if (typeof p !== "object" || p === null) {
    return { x: 50, y: 50 };
  }
  const raw = p as Record<string, unknown>;
  const rawX = typeof raw.x === "number" ? raw.x : 50;
  const rawY = typeof raw.y === "number" ? raw.y : 50;
  return {
    x: clampCoordinate(rawX),
    y: clampCoordinate(rawY),
  };
}

/**
 * Validates a Tactical Plan according to strict UEFA / CoachTactics domain rules:
 * - Unique player identifiers per phase
 * - Valid coordinates bounded in [0, 100]
 * - Phase ordering (1, 2, 3...)
 * - Phase duration (1..300 seconds)
 * - Safe normalization of slightly out-of-bounds or missing coordinates
 */
export function validateTacticalPlan(raw: unknown): TacticalValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof raw !== "object" || raw === null) {
    return {
      valid: false,
      errors: ["Invalid tactical plan format: expected an object"],
      warnings: [],
    };
  }

  const input = raw as Record<string, unknown>;

  if (!input.title || typeof input.title !== "string" || !input.title.trim()) {
    errors.push("Tactical plan missing required title");
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

    // Validate phase ordering
    const phaseNumber =
      typeof phase.phaseNumber === "number" && phase.phaseNumber > 0
        ? phase.phaseNumber
        : phaseIndex;

    if (phaseNumber !== phaseIndex) {
      warnings.push(
        `Phase index mismatch: expected ${phaseIndex}, received ${phaseNumber}. Normalizing.`,
      );
    }

    // Validate phase duration
    let durationSeconds =
      typeof phase.durationSeconds === "number" ? phase.durationSeconds : 5;
    if (durationSeconds <= 0 || durationSeconds > 300) {
      warnings.push(
        `Phase #${phaseIndex} duration (${durationSeconds}s) out of bounds [1..300]. Normalizing to 5s.`,
      );
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
        pid = `${pid}_dup_${pIdx}`;
      }
      playerIds.add(pid);

      const validTeams: PlayerTeam[] = ["home", "away", "neutral", "gk_home", "gk_away"];
      const team: PlayerTeam = validTeams.includes(pl.team as PlayerTeam)
        ? (pl.team as PlayerTeam)
        : "home";

      const pos = normalizeCoordinate(pl.position);
      const targetPos = pl.targetPosition ? normalizeCoordinate(pl.targetPosition) : undefined;

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
      const bPos = normalizeCoordinate({ x: b.x, y: b.y });
      const rawTrajectory = Array.isArray(b.trajectory) ? b.trajectory : [];
      const normalizedTrajectory = rawTrajectory.map((pt) => normalizeCoordinate(pt));

      normalizedBall = {
        x: bPos.x,
        y: bPos.y,
        attachedPlayerId:
          typeof b.attachedPlayerId === "string" ? b.attachedPlayerId : undefined,
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
        eqId = `${eqId}_${eqIdx}`;
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
        position: normalizeCoordinate(eq.position),
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
      const normalizedPoints = rawPoints.map((pt) => normalizeCoordinate(pt));

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
    title: String(input.title || "Tactical Drill").trim(),
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

/**
 * Calculates linearly interpolated positions between Phase A and Phase B
 * for animation playback (progress t from 0.0 to 1.0)
 */
export function interpolateTacticalPositions(
  fromPhase: TacticalPhase,
  toPhase: TacticalPhase,
  t: number,
): {
  players: Array<{ id: string; team: PlayerTeam; number: string | number; role: string; x: number; y: number }>;
  ball: { x: number; y: number };
} {
  const clampedT = Math.max(0, Math.min(1, t));

  // Map toPhase players by id for lookup
  const toMap = new Map(toPhase.players.map((p) => [p.id, p]));

  const players = fromPhase.players.map((p) => {
    const nextPlayer = toMap.get(p.id) || p;
    // If player has explicit targetPosition in current phase, interpolate toward that
    const targetX = p.targetPosition?.x ?? nextPlayer.position.x;
    const targetY = p.targetPosition?.y ?? nextPlayer.position.y;

    const curX = p.position.x + (targetX - p.position.x) * clampedT;
    const curY = p.position.y + (targetY - p.position.y) * clampedT;

    return {
      id: p.id,
      team: p.team,
      number: p.number,
      role: p.role,
      x: Math.round(curX * 100) / 100,
      y: Math.round(curY * 100) / 100,
    };
  });

  // Interpolate ball
  const ballTargetX = toPhase.ball.x;
  const ballTargetY = toPhase.ball.y;
  const ballCurX = fromPhase.ball.x + (ballTargetX - fromPhase.ball.x) * clampedT;
  const ballCurY = fromPhase.ball.y + (ballTargetY - fromPhase.ball.y) * clampedT;

  return {
    players,
    ball: {
      x: Math.round(ballCurX * 100) / 100,
      y: Math.round(ballCurY * 100) / 100,
    },
  };
}

/**
 * Generates a default initial tactical drill setup for soccer scenarios
 */
export function createDefaultTacticalPlan(drillTitle = "Tactical Possession & Transition"): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_${Date.now()}`,
    title: drillTitle,
    category: "Tactical Possession",
    pitchType: "full",
    gridDimensions: "Full Pitch (105m × 68m)",
    phases: [
      {
        id: "phase_1",
        phaseNumber: 1,
        title: "Phase 1: Build-up Structure",
        durationSeconds: 4,
        coachingNotes: "Center-backs split wide; #6 drops between them to form a passing triangle.",
        players: [
          // Home team (Blue) 4-3-3 build-up
          { id: "h_gk", team: "gk_home", number: 1, role: "GK", label: "Goalkeeper", position: { x: 8, y: 50 }, targetPosition: { x: 12, y: 50 } },
          { id: "h_cb1", team: "home", number: 4, role: "CB", label: "Left CB", position: { x: 22, y: 32 }, targetPosition: { x: 26, y: 28 } },
          { id: "h_cb2", team: "home", number: 5, role: "CB", label: "Right CB", position: { x: 22, y: 68 }, targetPosition: { x: 26, y: 72 } },
          { id: "h_lb", team: "home", number: 3, role: "LB", label: "Left Back", position: { x: 34, y: 15 }, targetPosition: { x: 44, y: 12 } },
          { id: "h_rb", team: "home", number: 2, role: "RB", label: "Right Back", position: { x: 34, y: 85 }, targetPosition: { x: 44, y: 88 } },
          { id: "h_dm", team: "home", number: 6, role: "DM", label: "Pivot", position: { x: 32, y: 50 }, targetPosition: { x: 28, y: 50 } },
          { id: "h_cm", team: "home", number: 8, role: "CM", label: "Box-to-Box", position: { x: 46, y: 38 }, targetPosition: { x: 55, y: 35 } },
          { id: "h_am", team: "home", number: 10, role: "AM", label: "Playmaker", position: { x: 48, y: 62 }, targetPosition: { x: 58, y: 60 } },
          { id: "h_lw", team: "home", number: 11, role: "LW", label: "Left Wing", position: { x: 62, y: 18 }, targetPosition: { x: 74, y: 22 } },
          { id: "h_rw", team: "home", number: 7, role: "RW", label: "Right Wing", position: { x: 62, y: 82 }, targetPosition: { x: 74, y: 78 } },
          { id: "h_st", team: "home", number: 9, role: "ST", label: "Striker", position: { x: 68, y: 50 }, targetPosition: { x: 78, y: 50 } },

          // Away opposition (Red) pressing block
          { id: "a_st1", team: "away", number: 9, role: "ST", label: "Opp. Presser 1", position: { x: 38, y: 44 }, targetPosition: { x: 30, y: 38 } },
          { id: "a_st2", team: "away", number: 11, role: "ST", label: "Opp. Presser 2", position: { x: 38, y: 56 }, targetPosition: { x: 30, y: 62 } },
          { id: "a_cm1", team: "away", number: 8, role: "CM", label: "Opp. Mid 1", position: { x: 52, y: 40 }, targetPosition: { x: 48, y: 42 } },
          { id: "a_cm2", team: "away", number: 10, role: "CM", label: "Opp. Mid 2", position: { x: 52, y: 60 }, targetPosition: { x: 48, y: 58 } },
          { id: "a_gk", team: "gk_away", number: 1, role: "GK", label: "Opp. GK", position: { x: 92, y: 50 } },
        ],
        ball: {
          x: 22,
          y: 32,
          attachedPlayerId: "h_cb1",
          speed: "ground",
          trajectory: [{ x: 22, y: 32 }, { x: 32, y: 50 }],
        },
        equipment: [
          { id: "eq_cone1", type: "cone", position: { x: 50, y: 25 } },
          { id: "eq_cone2", type: "cone", position: { x: 50, y: 75 } },
          { id: "eq_mannequin1", type: "mannequin", position: { x: 70, y: 35 } },
          { id: "eq_mannequin2", type: "mannequin", position: { x: 70, y: 65 } },
        ],
        annotations: [
          {
            id: "ann_1",
            type: "pass_line",
            points: [{ x: 22, y: 32 }, { x: 32, y: 50 }],
            color: "#60A5FA",
            width: 2.5,
            label: "1st Line Pass",
          },
          {
            id: "ann_2",
            type: "run_arrow",
            points: [{ x: 34, y: 15 }, { x: 44, y: 12 }],
            color: "#34D399",
            width: 2,
            label: "Overlapping run",
          },
        ],
      },
      {
        id: "phase_2",
        phaseNumber: 2,
        title: "Phase 2: Progressive Breakout",
        durationSeconds: 4,
        coachingNotes: "Pivot turns and delivers progressive through-ball into half-space for attacking midfielder.",
        players: [
          { id: "h_gk", team: "gk_home", number: 1, role: "GK", label: "Goalkeeper", position: { x: 14, y: 50 } },
          { id: "h_cb1", team: "home", number: 4, role: "CB", label: "Left CB", position: { x: 26, y: 28 } },
          { id: "h_cb2", team: "home", number: 5, role: "CB", label: "Right CB", position: { x: 26, y: 72 } },
          { id: "h_lb", team: "home", number: 3, role: "LB", label: "Left Back", position: { x: 48, y: 10 } },
          { id: "h_rb", team: "home", number: 2, role: "RB", label: "Right Back", position: { x: 48, y: 90 } },
          { id: "h_dm", team: "home", number: 6, role: "DM", label: "Pivot", position: { x: 36, y: 48 } },
          { id: "h_cm", team: "home", number: 8, role: "CM", label: "Box-to-Box", position: { x: 58, y: 32 } },
          { id: "h_am", team: "home", number: 10, role: "AM", label: "Playmaker", position: { x: 62, y: 58 } },
          { id: "h_lw", team: "home", number: 11, role: "LW", label: "Left Wing", position: { x: 76, y: 20 } },
          { id: "h_rw", team: "home", number: 7, role: "RW", label: "Right Wing", position: { x: 76, y: 80 } },
          { id: "h_st", team: "home", number: 9, role: "ST", label: "Striker", position: { x: 80, y: 50 } },

          { id: "a_st1", team: "away", number: 9, role: "ST", label: "Opp. Presser 1", position: { x: 32, y: 35 } },
          { id: "a_st2", team: "away", number: 11, role: "ST", label: "Opp. Presser 2", position: { x: 34, y: 60 } },
          { id: "a_cm1", team: "away", number: 8, role: "CM", label: "Opp. Mid 1", position: { x: 48, y: 42 } },
          { id: "a_cm2", team: "away", number: 10, role: "CM", label: "Opp. Mid 2", position: { x: 50, y: 56 } },
          { id: "a_gk", team: "gk_away", number: 1, role: "GK", label: "Opp. GK", position: { x: 92, y: 50 } },
        ],
        ball: {
          x: 62,
          y: 58,
          attachedPlayerId: "h_am",
          speed: "driven",
          trajectory: [{ x: 36, y: 48 }, { x: 62, y: 58 }],
        },
        equipment: [
          { id: "eq_cone1", type: "cone", position: { x: 50, y: 25 } },
          { id: "eq_cone2", type: "cone", position: { x: 50, y: 75 } },
          { id: "eq_mannequin1", type: "mannequin", position: { x: 70, y: 35 } },
          { id: "eq_mannequin2", type: "mannequin", position: { x: 70, y: 65 } },
        ],
        annotations: [
          {
            id: "ann_3",
            type: "pass_line",
            points: [{ x: 36, y: 48 }, { x: 62, y: 58 }],
            color: "#FBBF24",
            width: 2.5,
            label: "Key Penetrating Pass",
          },
        ],
      },
    ],
    coachingPoints: [
      "Body shape open to receive on back foot.",
      "Play the pass with appropriate weight into the runner's stride.",
      "Immediate transition mindset upon ball turnover.",
    ],
    createdAt: now,
    updatedAt: now,
  };
}
