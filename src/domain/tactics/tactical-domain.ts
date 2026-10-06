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
  | "hurdle"
  | "speed_ladder"
  | "passing_gate"
  | "rebounder_board"
  | "ball_cart";

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
  | "cover_shadow"
  | "defensive_block"
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
  | "rondo_grid"
  | "basketball_full"
  | "basketball_half"
  | "futsal_court"
  | "handball_court"
  | "volleyball_court"
  | "rugby_pitch";

export type SportType =
  | "soccer"
  | "basketball"
  | "futsal"
  | "handball"
  | "volleyball"
  | "rugby";

export interface TacticalPlan {
  id: string;
  drillId?: string;
  title: string;
  category?: string;
  sport?: SportType;
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
    "basketball_full",
    "basketball_half",
    "futsal_court",
    "handball_court",
    "volleyball_court",
    "rugby_pitch",
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
        "speed_ladder",
        "passing_gate",
        "rebounder_board",
        "ball_cart",
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
        "cover_shadow",
        "defensive_block",
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

/**
 * Creates a default Basketball tactical plan (5-Out Pick & Roll Offense)
 */
export function createBasketballTacticalPlan(title = "5-Out Pick & Roll Motion"): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_bball_${Date.now()}`,
    title,
    category: "Basketball Offense",
    sport: "basketball",
    pitchType: "basketball_half",
    gridDimensions: "Half Court (14m × 15m)",
    phases: [
      {
        id: "phase_bball_1",
        phaseNumber: 1,
        title: "High Pick & Roll Initiation",
        durationSeconds: 4,
        coachingNotes: "Point Guard calls high ball screen from Center; wings space to the corners for 3-point kickout.",
        players: [
          { id: "bb_pg", team: "home", number: 1, role: "PG", label: "Point Guard", position: { x: 55, y: 50 }, hasBall: true },
          { id: "bb_c", team: "home", number: 15, role: "C", label: "Center", position: { x: 65, y: 48 }, targetPosition: { x: 58, y: 52 } },
          { id: "bb_sg", team: "home", number: 2, role: "SG", label: "Shooting Guard", position: { x: 68, y: 15 } },
          { id: "bb_sf", team: "home", number: 3, role: "SF", label: "Small Forward", position: { x: 68, y: 85 } },
          { id: "bb_pf", team: "home", number: 4, role: "PF", label: "Power Forward", position: { x: 85, y: 20 } },
          // Defenders
          { id: "bb_d1", team: "away", number: 1, role: "D", label: "On-Ball Def.", position: { x: 60, y: 50 } },
          { id: "bb_d5", team: "away", number: 15, role: "D", label: "Drop Big Def.", position: { x: 74, y: 50 } },
          { id: "bb_d2", team: "away", number: 2, role: "D", label: "Wing Def.", position: { x: 72, y: 22 } },
        ],
        ball: { x: 55, y: 50, attachedPlayerId: "bb_pg" },
        equipment: [{ id: "bb_cone1", type: "cone", position: { x: 50, y: 50 } }],
        annotations: [
          {
            id: "ann_screen",
            type: "run_arrow",
            points: [{ x: 65, y: 48 }, { x: 58, y: 52 }],
            color: "#F97316",
            width: 2.5,
            label: "Ball Screen",
          },
        ],
      },
    ],
    coachingPoints: [
      "Point Guard rubs shoulder-to-shoulder on the screen.",
      "Center sets solid base before rolling with target hand raised.",
      "Corner shooters remain stationary in passing vision.",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a default Futsal tactical plan (3-1 Diamond Pivot Rotation)
 */
export function createFutsalTacticalPlan(title = "3-1 Diamond Rotation & Pivot Set"): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_futsal_${Date.now()}`,
    title,
    category: "Futsal Tactics",
    sport: "futsal",
    pitchType: "futsal_court",
    gridDimensions: "40m × 20m Court",
    phases: [
      {
        id: "phase_futsal_1",
        phaseNumber: 1,
        title: "Pivot Hold-up & Parallel Run",
        durationSeconds: 3,
        coachingNotes: "Fixo plays into the feet of the Pivô, Ala Right performs blindside parallel diagonal cut.",
        players: [
          { id: "fut_gk", team: "gk_home", number: 1, role: "GKP", label: "Goalkeeper", position: { x: 10, y: 50 } },
          { id: "fut_fixo", team: "home", number: 4, role: "Fixo", label: "Fixo (Def)", position: { x: 30, y: 50 }, hasBall: true },
          { id: "fut_ala_l", team: "home", number: 7, role: "Ala E", label: "Ala Left", position: { x: 50, y: 15 } },
          { id: "fut_ala_r", team: "home", number: 10, role: "Ala D", label: "Ala Right", position: { x: 50, y: 85 } },
          { id: "fut_pivo", team: "home", number: 9, role: "Pivô", label: "Pivô (Target)", position: { x: 75, y: 50 } },
          // Opposition
          { id: "fut_def1", team: "away", number: 3, role: "Def", label: "Opp. Presser", position: { x: 42, y: 50 } },
          { id: "fut_def2", team: "away", number: 5, role: "Def", label: "Opp. Stopper", position: { x: 70, y: 50 } },
          { id: "fut_ogk", team: "gk_away", number: 1, role: "GKP", label: "Opp. GK", position: { x: 92, y: 50 } },
        ],
        ball: { x: 30, y: 50, attachedPlayerId: "fut_fixo" },
        equipment: [],
        annotations: [
          {
            id: "fut_pass",
            type: "pass_line",
            points: [{ x: 30, y: 50 }, { x: 75, y: 50 }],
            color: "#EAB308",
            width: 2.5,
            label: "Direct Pivot Entry Pass",
          },
        ],
      },
    ],
    coachingPoints: [
      "Pivô shields ball with low center of gravity using arms for body contact.",
      "Ala makes sharp change of pace on the diagonal parallel sprint.",
      "Immediate support run behind the ball in case of back pass.",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a default Handball tactical plan (6:0 Defense vs Crossing Attack)
 */
export function createHandballTacticalPlan(title = "Handball 6:0 Defense vs Crossing Attack"): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_handball_${Date.now()}`,
    title,
    category: "Handball System",
    sport: "handball",
    pitchType: "handball_court",
    gridDimensions: "40m × 20m Handball Court",
    phases: [
      {
        id: "phase_hb_1",
        phaseNumber: 1,
        title: "Center Back & Left Back Piston Crossing",
        durationSeconds: 3.5,
        coachingNotes: "Center Back attacks 9m line and executes crossing scissors with Left Back.",
        players: [
          { id: "hb_gk", team: "gk_home", number: 1, role: "GK", label: "Handball GK", position: { x: 92, y: 50 } },
          { id: "hb_cb", team: "home", number: 24, role: "CB", label: "Playmaker", position: { x: 55, y: 50 }, hasBall: true },
          { id: "hb_lb", team: "home", number: 13, role: "LB", label: "Left Back Shooter", position: { x: 58, y: 30 } },
          { id: "hb_rb", team: "home", number: 18, role: "RB", label: "Right Back", position: { x: 58, y: 70 } },
          { id: "hb_lw", team: "home", number: 7, role: "LW", label: "Left Wing", position: { x: 75, y: 12 } },
          { id: "hb_rw", team: "home", number: 9, role: "RW", label: "Right Wing", position: { x: 75, y: 88 } },
          { id: "hb_piv", team: "home", number: 21, role: "P", label: "Line Player (Pivot)", position: { x: 82, y: 55 } },
          // 6:0 Defensive Wall
          { id: "hb_d1", team: "away", number: 2, role: "D", label: "Left Def 1", position: { x: 80, y: 25 } },
          { id: "hb_d2", team: "away", number: 4, role: "D", label: "Blocker 2", position: { x: 82, y: 40 } },
          { id: "hb_d3", team: "away", number: 5, role: "D", label: "Blocker 3", position: { x: 82, y: 60 } },
          { id: "hb_d4", team: "away", number: 6, role: "D", label: "Right Def 4", position: { x: 80, y: 75 } },
        ],
        ball: { x: 55, y: 50, attachedPlayerId: "hb_cb" },
        equipment: [],
        annotations: [],
      },
    ],
    coachingPoints: [
      "Attacker must commit the defender past the 9m line before releasing pass.",
      "Pivot seals the central defender to open shooting lane.",
      "Quick wrist release with maximum hip rotation.",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a default Volleyball tactical plan (5-1 Serve Receive & Middle Quick)
 */
export function createVolleyballTacticalPlan(title = "5-1 System Serve Receive & Middle Attack"): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_vball_${Date.now()}`,
    title,
    category: "Volleyball Tactics",
    sport: "volleyball",
    pitchType: "volleyball_court",
    gridDimensions: "18m × 9m Court",
    phases: [
      {
        id: "phase_vb_1",
        phaseNumber: 1,
        title: "Serve Reception W-Formation & Setter Penetration",
        durationSeconds: 3,
        coachingNotes: "Libero and Outside Hitter form 3-passer line; Setter runs from back-row position 1 to target spot.",
        players: [
          { id: "vb_s", team: "home", number: 1, role: "S", label: "Setter", position: { x: 38, y: 65 } },
          { id: "vb_l", team: "home", number: 10, role: "L", label: "Libero", position: { x: 22, y: 50 } },
          { id: "vb_oh1", team: "home", number: 7, role: "OH", label: "Passer/Hitter 1", position: { x: 20, y: 25 } },
          { id: "vb_oh2", team: "home", number: 11, role: "OH", label: "Passer/Hitter 2", position: { x: 20, y: 75 } },
          { id: "vb_mb", team: "home", number: 5, role: "MB", label: "Middle Blocker", position: { x: 40, y: 45 } },
          { id: "vb_opp", team: "home", number: 9, role: "OPP", label: "Opposite", position: { x: 42, y: 15 } },
          // Opposition Server
          { id: "vb_srv", team: "away", number: 8, role: "Server", label: "Opp. Server", position: { x: 92, y: 70 }, hasBall: true },
        ],
        ball: { x: 92, y: 70, attachedPlayerId: "vb_srv" },
        equipment: [],
        annotations: [
          {
            id: "ann_serve",
            type: "pass_line",
            points: [{ x: 92, y: 70 }, { x: 22, y: 50 }],
            color: "#60A5FA",
            width: 2.5,
            label: "Floating Deep Serve",
          },
        ],
      },
    ],
    coachingPoints: [
      "Platform angle oriented towards target position #2.5.",
      "Middle attacker approaches with high arm velocity for quick 1-tempo ball.",
      "Setter penetrates on the server's arm swing contact.",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a default Rugby tactical plan (Phase Play Pods & Wide Overload)
 */
export function createRugbyTacticalPlan(title = "Rugby 3-Man Forward Pod & Backline Spread"): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_rugby_${Date.now()}`,
    title,
    category: "Rugby Tactics",
    sport: "rugby",
    pitchType: "rugby_pitch",
    gridDimensions: "100m × 70m Pitch",
    phases: [
      {
        id: "phase_rugby_1",
        phaseNumber: 1,
        title: "Ruck Exit to Forward Crash Pod",
        durationSeconds: 3.5,
        coachingNotes: "Scrum-half passes off the deck to 3-man forward pod; fly-half sets depth behind the pod for out-the-back sweep.",
        players: [
          { id: "rug_9", team: "home", number: 9, role: "SH", label: "Scrum-half", position: { x: 35, y: 40 }, hasBall: true },
          { id: "rug_p1", team: "home", number: 1, role: "Prop", label: "Forward 1 (Tip)", position: { x: 42, y: 48 } },
          { id: "rug_p2", team: "home", number: 4, role: "Lock", label: "Forward 2 (Carrier)", position: { x: 45, y: 52 } },
          { id: "rug_p3", team: "home", number: 6, role: "Flanker", label: "Forward 3 (Support)", position: { x: 43, y: 56 } },
          { id: "rug_10", team: "home", number: 10, role: "FH", label: "Fly-half (Playmaker)", position: { x: 38, y: 70 } },
          { id: "rug_12", team: "home", number: 12, role: "Center", label: "Inside Center", position: { x: 44, y: 80 } },
          { id: "rug_15", team: "home", number: 15, role: "FB", label: "Fullback", position: { x: 38, y: 90 } },
          // Opposition Defensive Line
          { id: "rug_d1", team: "away", number: 7, role: "Def", label: "A-Defender", position: { x: 50, y: 45 } },
          { id: "rug_d2", team: "away", number: 8, role: "Def", label: "B-Defender", position: { x: 52, y: 55 } },
          { id: "rug_d3", team: "away", number: 10, role: "Def", label: "C-Defender", position: { x: 52, y: 68 } },
        ],
        ball: { x: 35, y: 40, attachedPlayerId: "rug_9" },
        equipment: [],
        annotations: [
          {
            id: "rug_pass",
            type: "pass_line",
            points: [{ x: 35, y: 40 }, { x: 45, y: 52 }],
            color: "#34D399",
            width: 2.5,
            label: "Crisp Service to Pod Carrier",
          },
        ],
      },
    ],
    coachingPoints: [
      "Scrum-half clears ball in under 2.5 seconds to maintain momentum.",
      "Carrier attacks inside shoulder of defender to gain post-contact meters.",
      "Support latchers lock in immediately to prevent turnover at breakdown.",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Canonical Soccer Squad Tactical Taxonomies, Formations & Positioning Models
// ---------------------------------------------------------------------------

export type PositionCategory = "GK" | "DEF" | "MID" | "FWD" | "OTHER";

export interface SoccerPositionDefinition {
  value: string;
  label: string;
  category: PositionCategory;
}

export const SOCCER_POSITIONS: SoccerPositionDefinition[] = [
  { value: "GK", label: "GK — Goalkeeper", category: "GK" },
  { value: "CB", label: "CB — Center Back", category: "DEF" },
  { value: "LB", label: "LB — Left Back", category: "DEF" },
  { value: "RB", label: "RB — Right Back", category: "DEF" },
  { value: "LWB", label: "LWB — Left Wing Back", category: "DEF" },
  { value: "RWB", label: "RWB — Right Wing Back", category: "DEF" },
  { value: "SW", label: "SW — Sweeper", category: "DEF" },
  { value: "DM", label: "DM — Defensive Midfielder", category: "MID" },
  { value: "CM", label: "CM — Central Midfielder", category: "MID" },
  { value: "AM", label: "AM — Attacking Midfielder", category: "MID" },
  { value: "LM", label: "LM — Left Midfielder", category: "MID" },
  { value: "RM", label: "RM — Right Midfielder", category: "MID" },
  { value: "LW", label: "LW — Left Winger", category: "FWD" },
  { value: "RW", label: "RW — Right Winger", category: "FWD" },
  { value: "ST", label: "ST — Striker / Center Forward", category: "FWD" },
  { value: "CF", label: "CF — Center Forward", category: "FWD" },
  { value: "SS", label: "SS — Second Striker", category: "FWD" },
];

export const SOCCER_ROLES = [
  "Sweeper Keeper",
  "Ball-Playing Defender",
  "Traditional Stopper",
  "Inverted Fullback",
  "Attacking Wingback",
  "Deep-Lying Playmaker (Regista)",
  "Box-to-Box Midfielder (Mezzala)",
  "Central Anchor (Pivot)",
  "Advanced Playmaker (Trequartista)",
  "Inverted Winger / Inside Forward",
  "Touchline Winger",
  "Target Man",
  "Poacher",
  "False Nine",
  "Pressing Forward",
];

export interface FormationPreset {
  value: string;
  label: string;
  category: "11v11" | "9v9" | "7v7";
  slots: Array<{ role: string; x: number; y: number }>;
}

export const FORMATIONS: FormationPreset[] = [
  {
    value: "4-3-3",
    label: "4-3-3 (Positional & High Press)",
    category: "11v11",
    slots: [
      { role: "GK", x: 8, y: 50 },
      { role: "LB", x: 24, y: 18 },
      { role: "CB", x: 22, y: 38 },
      { role: "CB", x: 22, y: 62 },
      { role: "RB", x: 24, y: 82 },
      { role: "DM", x: 36, y: 50 },
      { role: "CM", x: 48, y: 34 },
      { role: "CM", x: 48, y: 66 },
      { role: "LW", x: 68, y: 18 },
      { role: "ST", x: 80, y: 50 },
      { role: "RW", x: 68, y: 82 },
    ],
  },
  {
    value: "4-2-3-1",
    label: "4-2-3-1 (Double Pivot & Playmaker)",
    category: "11v11",
    slots: [
      { role: "GK", x: 8, y: 50 },
      { role: "LB", x: 24, y: 18 },
      { role: "CB", x: 22, y: 38 },
      { role: "CB", x: 22, y: 62 },
      { role: "RB", x: 24, y: 82 },
      { role: "DM", x: 36, y: 38 },
      { role: "DM", x: 36, y: 62 },
      { role: "AM", x: 55, y: 50 },
      { role: "LW", x: 62, y: 18 },
      { role: "RW", x: 62, y: 82 },
      { role: "ST", x: 80, y: 50 },
    ],
  },
  {
    value: "3-5-2",
    label: "3-5-2 (Wingbacks & Twin Strikers)",
    category: "11v11",
    slots: [
      { role: "GK", x: 8, y: 50 },
      { role: "CB", x: 22, y: 28 },
      { role: "CB", x: 20, y: 50 },
      { role: "CB", x: 22, y: 72 },
      { role: "LWB", x: 40, y: 14 },
      { role: "DM", x: 36, y: 50 },
      { role: "CM", x: 48, y: 36 },
      { role: "CM", x: 48, y: 64 },
      { role: "RWB", x: 40, y: 86 },
      { role: "ST", x: 78, y: 40 },
      { role: "ST", x: 78, y: 60 },
    ],
  },
  {
    value: "4-4-2",
    label: "4-4-2 (Compact Medium Block)",
    category: "11v11",
    slots: [
      { role: "GK", x: 8, y: 50 },
      { role: "LB", x: 24, y: 18 },
      { role: "CB", x: 22, y: 38 },
      { role: "CB", x: 22, y: 62 },
      { role: "RB", x: 24, y: 82 },
      { role: "LM", x: 46, y: 18 },
      { role: "CM", x: 46, y: 38 },
      { role: "CM", x: 46, y: 62 },
      { role: "RM", x: 46, y: 82 },
      { role: "ST", x: 78, y: 40 },
      { role: "ST", x: 78, y: 60 },
    ],
  },
  {
    value: "3-4-3",
    label: "3-4-3 (Diamond Overload & High Lines)",
    category: "11v11",
    slots: [
      { role: "GK", x: 8, y: 50 },
      { role: "CB", x: 22, y: 28 },
      { role: "CB", x: 20, y: 50 },
      { role: "CB", x: 22, y: 72 },
      { role: "LM", x: 44, y: 16 },
      { role: "CM", x: 44, y: 40 },
      { role: "CM", x: 44, y: 60 },
      { role: "RM", x: 44, y: 84 },
      { role: "LW", x: 70, y: 20 },
      { role: "ST", x: 80, y: 50 },
      { role: "RW", x: 70, y: 80 },
    ],
  },
  {
    value: "4-1-4-1",
    label: "4-1-4-1 (Defensive Anchor & Counter)",
    category: "11v11",
    slots: [
      { role: "GK", x: 8, y: 50 },
      { role: "LB", x: 24, y: 18 },
      { role: "CB", x: 22, y: 38 },
      { role: "CB", x: 22, y: 62 },
      { role: "RB", x: 24, y: 82 },
      { role: "DM", x: 34, y: 50 },
      { role: "LM", x: 50, y: 18 },
      { role: "CM", x: 50, y: 38 },
      { role: "CM", x: 50, y: 62 },
      { role: "RM", x: 50, y: 82 },
      { role: "ST", x: 80, y: 50 },
    ],
  },
  {
    value: "5-3-2",
    label: "5-3-2 (Solid Low Block & Quick Breaks)",
    category: "11v11",
    slots: [
      { role: "GK", x: 8, y: 50 },
      { role: "LWB", x: 26, y: 14 },
      { role: "CB", x: 20, y: 30 },
      { role: "CB", x: 18, y: 50 },
      { role: "CB", x: 20, y: 70 },
      { role: "RWB", x: 26, y: 86 },
      { role: "CM", x: 44, y: 32 },
      { role: "DM", x: 40, y: 50 },
      { role: "CM", x: 44, y: 68 },
      { role: "ST", x: 76, y: 40 },
      { role: "ST", x: 76, y: 60 },
    ],
  },
  {
    value: "2-3-1",
    label: "2-3-1 (Youth 7v7 Standard)",
    category: "7v7",
    slots: [
      { role: "GK", x: 10, y: 50 },
      { role: "CB", x: 28, y: 35 },
      { role: "CB", x: 28, y: 65 },
      { role: "LM", x: 52, y: 22 },
      { role: "CM", x: 50, y: 50 },
      { role: "RM", x: 52, y: 78 },
      { role: "ST", x: 78, y: 50 },
    ],
  },
  {
    value: "3-3-2",
    label: "3-3-2 (Youth 9v9 Balanced)",
    category: "9v9",
    slots: [
      { role: "GK", x: 9, y: 50 },
      { role: "LB", x: 26, y: 22 },
      { role: "CB", x: 24, y: 50 },
      { role: "RB", x: 26, y: 78 },
      { role: "LM", x: 50, y: 24 },
      { role: "CM", x: 48, y: 50 },
      { role: "RM", x: 50, y: 76 },
      { role: "ST", x: 76, y: 38 },
      { role: "ST", x: 76, y: 62 },
    ],
  },
];

export const POSITION_COORDINATES: Record<string, { x: number; y: number }> = {
  GK: { x: 8, y: 50 },
  LB: { x: 24, y: 18 },
  CB: { x: 22, y: 40 },
  RB: { x: 24, y: 82 },
  LWB: { x: 38, y: 15 },
  RWB: { x: 38, y: 85 },
  SW: { x: 16, y: 50 },
  DM: { x: 36, y: 50 },
  CM: { x: 48, y: 36 },
  LM: { x: 48, y: 18 },
  RM: { x: 48, y: 82 },
  AM: { x: 62, y: 50 },
  LW: { x: 70, y: 18 },
  RW: { x: 70, y: 82 },
  ST: { x: 82, y: 50 },
  CF: { x: 80, y: 50 },
  SS: { x: 74, y: 50 },
};

/**
 * Returns the position category for a given position code.
 */
export function getPositionCategory(position?: string): PositionCategory {
  if (!position) return "OTHER";
  const upper = position.toUpperCase().trim();
  const match = SOCCER_POSITIONS.find((p) => p.value === upper);
  if (match) return match.category;
  if (upper.includes("GK") || upper.includes("GOAL")) return "GK";
  if (upper.includes("B") || upper.includes("DEF") || upper.includes("BACK")) return "DEF";
  if (upper.includes("M") || upper.includes("MID")) return "MID";
  if (upper.includes("W") || upper.includes("ST") || upper.includes("FWD") || upper.includes("ATT")) return "FWD";
  return "OTHER";
}

export interface SquadPositionalDepth {
  gk: number;
  def: number;
  mid: number;
  fwd: number;
  other: number;
  total: number;
}

/**
 * Calculates squad positional breakdown counts (GK, DEF, MID, FWD, OTHER).
 */
export function calculateSquadPositionalDepth(
  roster: Array<{ tacticalPosition?: string }>,
): SquadPositionalDepth {
  const depth: SquadPositionalDepth = {
    gk: 0,
    def: 0,
    mid: 0,
    fwd: 0,
    other: 0,
    total: roster.length,
  };

  for (const athlete of roster) {
    const cat = getPositionCategory(athlete.tacticalPosition);
    if (cat === "GK") depth.gk++;
    else if (cat === "DEF") depth.def++;
    else if (cat === "MID") depth.mid++;
    else if (cat === "FWD") depth.fwd++;
    else depth.other++;
  }

  return depth;
}

/**
 * Builds normalized tactical PlayerNodes for a squad roster according to base formation
 */
export function buildSquadPlayerNodes(
  _teamName: string,
  formation: string,
  roster: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
    tacticalPosition?: string;
    tacticalRole?: string;
  }>,
  pitchType: PitchType = "full",
): PlayerNode[] {
  const foundFormation = FORMATIONS.find((f) => f.value === formation) || FORMATIONS[0];
  const slots = foundFormation.slots;

  let defaultX = 25;
  let defaultY = 20;

  return roster.map((athlete, idx) => {
    const posCode = athlete.tacticalPosition?.toUpperCase() || "";
    
    // Check if there's a slot in the formation that matches this athlete's role
    let baseCoord: { x: number; y: number } | undefined;
    if (idx < slots.length) {
      baseCoord = slots[idx];
    } else if (posCode && POSITION_COORDINATES[posCode]) {
      baseCoord = POSITION_COORDINATES[posCode];
    } else {
      baseCoord = {
        x: defaultX + (idx % 4) * 15,
        y: defaultY + Math.floor(idx / 4) * 20,
      };
    }

    const finalX =
      pitchType === "attacking_half"
        ? 50 + baseCoord.x / 2
        : pitchType === "defending_half"
        ? baseCoord.x / 2
        : baseCoord.x;

    return {
      id: `ath_${athlete._id}`,
      team: athlete.tacticalPosition?.toUpperCase() === "GK" ? "gk_home" : "home",
      number: athlete.jerseyNumber ?? idx + 1,
      role: athlete.tacticalPosition || slots[idx]?.role || "CM",
      label: `${athlete.firstName} ${athlete.lastName[0] ? athlete.lastName[0] + "." : ""}`,
      position: {
        x: Math.min(95, Math.max(5, finalX)),
        y: Math.min(95, Math.max(5, baseCoord.y)),
      },
    };
  });
}
