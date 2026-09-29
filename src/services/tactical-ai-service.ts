/**
 * CoachTactics — Tactical AI & Synthesis Service
 * 
 * Provides structured tactical drill generation conforming to the CoachTactics
 * domain model. AI output is strictly validated and normalized through
 * validateTacticalPlan before reaching the Tactical Board.
 * 
 * Includes the offline deterministic CoachTactics Tactical Synthesis Engine
 * for instant, resilient pitch-side generation without cloud dependencies.
 */

import {
  type TacticalPlan,
  type TacticalPhase,
  type PlayerNode,
  type BallNode,
  type EquipmentNode,
  type TacticalAnnotation,
  type PitchType,
  type TacticalValidationResult,
  validateTacticalPlan,
  clampCoordinate,
} from "@/domain/tactics/tactical-domain.ts";

export type AgeGroup =
  | "U6-U8"
  | "U9-U10"
  | "U11-U12"
  | "U13-U14"
  | "U15-U16";

export type TacticalCategory =
  | "ball_mastery"
  | "passing_rondos"
  | "tactical_possession"
  | "finishing_crossing"
  | "agility_transitions"
  | "counter_attack";

export interface TacticalGenerationRequest {
  ageGroup: AgeGroup;
  category: TacticalCategory;
  pitchType?: PitchType;
  difficulty?: "Beginner" | "Intermediate" | "Advanced" | "Elite";
  targetAttribute?:
    | "Speed"
    | "Power"
    | "Agility"
    | "Strength"
    | "Endurance"
    | "Mobility"
    | "Technical"
    | "Tactical";
  playerCount?: number;
  promptNotes?: string;
}

export interface TacticalDrillMetadata {
  title: string;
  ageGroup: string;
  birthYears: string;
  category: string;
  categoryLabel: string;
  difficulty: string;
  durationMinutes: number;
  durationSeconds: number;
  recommendedSets: number;
  recommendedReps: number;
  gridDimensions: string;
  equipment: string[];
  summary: string;
  setup: string;
  instructions: string[];
  coachingPoints: string[];
  variations: string[];
  metricName: string;
  metricUnit: string;
  benchmark: number;
  isLowerBetter: boolean;
  targetAttribute: string;
}

export interface TacticalGenerationResponse {
  drill: TacticalDrillMetadata;
  tacticalPlan: TacticalPlan;
  validationResult: TacticalValidationResult;
  engineUsed: "CoachTactics Cloud AI" | "CoachTactics Tactical Synthesis Engine";
}

const BIRTH_YEARS_MAP: Record<AgeGroup, string> = {
  "U6-U8": "2018–2020",
  "U9-U10": "2016–2017",
  "U11-U12": "2014–2015",
  "U13-U14": "2012–2013",
  "U15-U16": "2011",
};

const CATEGORY_LABEL_MAP: Record<TacticalCategory, string> = {
  ball_mastery: "Ball Mastery & 1v1",
  passing_rondos: "Passing & Rondos",
  tactical_possession: "Positional Play & Tactical",
  finishing_crossing: "Finishing & Wide Play",
  agility_transitions: "Agility & Transitions",
  counter_attack: "Counter-Attacking & Direct Play",
};

/**
 * CoachTactics Tactical Synthesis Engine:
 * Generates verified, authentic soccer coaching drills and multi-phase tactical plans
 * aligned with modern European coaching methodologies.
 */
export function synthesizeTacticalDrill(
  request: TacticalGenerationRequest,
): TacticalGenerationResponse {
  const { ageGroup, category, promptNotes, difficulty = "Intermediate" } = request;
  const birthYears = BIRTH_YEARS_MAP[ageGroup] || "2014–2015";
  const categoryLabel = CATEGORY_LABEL_MAP[category] || "Positional Play";

  // Derive scenario based on category
  switch (category) {
    case "passing_rondos":
      return buildRondoScenario(request, birthYears, categoryLabel, promptNotes);
    case "finishing_crossing":
      return buildFinishingCrossingScenario(request, birthYears, categoryLabel, promptNotes);
    case "counter_attack":
      return buildCounterAttackScenario(request, birthYears, categoryLabel, promptNotes);
    case "agility_transitions":
      return buildAgilityTransitionScenario(request, birthYears, categoryLabel, promptNotes);
    case "ball_mastery":
      return buildBallMasteryScenario(request, birthYears, categoryLabel, promptNotes);
    case "tactical_possession":
    default:
      return buildPositionalBuildUpScenario(request, birthYears, categoryLabel, promptNotes);
  }
}

/**
 * Scenario 1: Positional Build-Up & Pressing Resistance
 */
function buildPositionalBuildUpScenario(
  req: TacticalGenerationRequest,
  birthYears: string,
  categoryLabel: string,
  promptNotes?: string,
): TacticalGenerationResponse {
  const title = promptNotes
    ? `${promptNotes.slice(0, 32)}: Positional Build-Up`
    : `Positional 4-3-3 Build-Up vs Midfield Block (${req.ageGroup})`;

  const drill: TacticalDrillMetadata = {
    title,
    ageGroup: req.ageGroup,
    birthYears,
    category: req.category,
    categoryLabel,
    difficulty: req.difficulty || "Intermediate",
    durationMinutes: 20,
    durationSeconds: 1200,
    recommendedSets: 4,
    recommendedReps: 6,
    gridDimensions: "Half Pitch to 18-Yard Line (60m × 50m)",
    equipment: ["10 Cones", "4 Mannequins", "1 Regulation Goal", "2 Mini Goals", "6 Soccer Balls"],
    summary:
      "A structured positional build-up drill training center-backs to split wide, the defensive pivot (#6) to drop and receive between lines, and progressive vertical passes into attacking half-spaces.",
    setup:
      "Play starts from goalkeeper and central defenders. Defending opposition team presses in a 4-4-2 compact shape. Attacking team aims to break two pressing lines into mini-goals or target runners.",
    instructions: [
      "Center-backs #4 and #5 split wide on the edge of the 18-yard box upon goalkeeper possession.",
      "Defensive pivot #6 drops between opposition strikers to create a numerical 3v2 overload.",
      "Fullbacks #2 and #3 push high and wide to stretch opposition wide midfielders.",
      "If ball is played to #6, midfield #8 and #10 make diagonal blind-side runs into the half-spaces.",
      "Upon turnover, defending team has 8 seconds to finish on the full-size regulation goal.",
    ],
    coachingPoints: [
      "Body shape open to receive on back foot facing forward pitch.",
      "Pass weight must be crisp and along the grass into runner stride.",
      "Head check / shoulder scan twice before receiving to observe opposition pressure.",
      "Immediate 5-second counter-press trigger on loss of possession.",
    ],
    variations: [
      "Limit attacking players to 2 touches maximum.",
      "Add an extra opposition pressing midfielder for high-intensity pressure.",
    ],
    metricName: "Successful Vertical Line Breaks",
    metricUnit: "passes",
    benchmark: 8,
    isLowerBetter: false,
    targetAttribute: req.targetAttribute || "Tactical",
  };

  const phases: TacticalPhase[] = [
    {
      id: "phase_1",
      phaseNumber: 1,
      title: "Phase 1: Shape Split & Overload Trigger",
      durationSeconds: 4,
      coachingNotes: "Center-backs split wide to open passing lane for dropping pivot #6.",
      players: [
        { id: "h_gk", team: "gk_home", number: 1, role: "GK", label: "GK", position: { x: 10, y: 50 }, targetPosition: { x: 14, y: 50 } },
        { id: "h_cb1", team: "home", number: 4, role: "CB", label: "CB Left", position: { x: 22, y: 30 }, targetPosition: { x: 28, y: 24 } },
        { id: "h_cb2", team: "home", number: 5, role: "CB", label: "CB Right", position: { x: 22, y: 70 }, targetPosition: { x: 28, y: 76 } },
        { id: "h_lb", team: "home", number: 3, role: "LB", label: "Left Back", position: { x: 36, y: 15 }, targetPosition: { x: 50, y: 12 } },
        { id: "h_rb", team: "home", number: 2, role: "RB", label: "Right Back", position: { x: 36, y: 85 }, targetPosition: { x: 50, y: 88 } },
        { id: "h_dm", team: "home", number: 6, role: "DM", label: "Pivot #6", position: { x: 32, y: 50 }, targetPosition: { x: 26, y: 50 }, hasBall: true },
        { id: "h_cm", team: "home", number: 8, role: "CM", label: "Mid #8", position: { x: 48, y: 38 }, targetPosition: { x: 60, y: 32 } },
        { id: "h_am", team: "home", number: 10, role: "AM", label: "Mid #10", position: { x: 48, y: 62 }, targetPosition: { x: 60, y: 68 } },
        // Opponents
        { id: "a_st1", team: "away", number: 9, role: "ST", label: "Opp. Presser 1", position: { x: 36, y: 42 }, targetPosition: { x: 30, y: 38 } },
        { id: "a_st2", team: "away", number: 11, role: "ST", label: "Opp. Presser 2", position: { x: 36, y: 58 }, targetPosition: { x: 30, y: 62 } },
        { id: "a_cm1", team: "away", number: 8, role: "CM", label: "Opp. Mid 1", position: { x: 52, y: 40 }, targetPosition: { x: 46, y: 42 } },
        { id: "a_cm2", team: "away", number: 10, role: "CM", label: "Opp. Mid 2", position: { x: 52, y: 60 }, targetPosition: { x: 46, y: 58 } },
      ],
      ball: { x: 32, y: 50, attachedPlayerId: "h_dm", speed: "ground" },
      equipment: [
        { id: "c1", type: "cone", position: { x: 45, y: 20 } },
        { id: "c2", type: "cone", position: { x: 45, y: 80 } },
        { id: "m1", type: "mannequin", position: { x: 65, y: 35 } },
        { id: "m2", type: "mannequin", position: { x: 65, y: 65 } },
      ],
      annotations: [
        {
          id: "ann_pass1",
          type: "pass_line",
          points: [{ x: 32, y: 50 }, { x: 28, y: 24 }],
          color: "#60A5FA",
          width: 2.5,
          label: "Wall Pass Option",
        },
      ],
    },
    {
      id: "phase_2",
      phaseNumber: 2,
      title: "Phase 2: Half-Space Penetration",
      durationSeconds: 4,
      coachingNotes: "Pivot turns forward and punches line-breaking pass into advancing #8.",
      players: [
        { id: "h_gk", team: "gk_home", number: 1, role: "GK", label: "GK", position: { x: 14, y: 50 } },
        { id: "h_cb1", team: "home", number: 4, role: "CB", label: "CB Left", position: { x: 28, y: 24 } },
        { id: "h_cb2", team: "home", number: 5, role: "CB", label: "CB Right", position: { x: 28, y: 76 } },
        { id: "h_lb", team: "home", number: 3, role: "LB", label: "Left Back", position: { x: 50, y: 12 } },
        { id: "h_rb", team: "home", number: 2, role: "RB", label: "Right Back", position: { x: 50, y: 88 } },
        { id: "h_dm", team: "home", number: 6, role: "DM", label: "Pivot #6", position: { x: 36, y: 48 } },
        { id: "h_cm", team: "home", number: 8, role: "CM", label: "Mid #8", position: { x: 60, y: 32 }, hasBall: true },
        { id: "h_am", team: "home", number: 10, role: "AM", label: "Mid #10", position: { x: 60, y: 68 } },
        { id: "a_st1", team: "away", number: 9, role: "ST", label: "Opp. Presser 1", position: { x: 30, y: 38 } },
        { id: "a_st2", team: "away", number: 11, role: "ST", label: "Opp. Presser 2", position: { x: 30, y: 62 } },
        { id: "a_cm1", team: "away", number: 8, role: "CM", label: "Opp. Mid 1", position: { x: 46, y: 42 } },
        { id: "a_cm2", team: "away", number: 10, role: "CM", label: "Opp. Mid 2", position: { x: 46, y: 58 } },
      ],
      ball: { x: 60, y: 32, attachedPlayerId: "h_cm", speed: "driven" },
      equipment: [
        { id: "c1", type: "cone", position: { x: 45, y: 20 } },
        { id: "c2", type: "cone", position: { x: 45, y: 80 } },
        { id: "m1", type: "mannequin", position: { x: 65, y: 35 } },
        { id: "m2", type: "mannequin", position: { x: 65, y: 65 } },
      ],
      annotations: [
        {
          id: "ann_pass2",
          type: "pass_line",
          points: [{ x: 36, y: 48 }, { x: 60, y: 32 }],
          color: "#FBBF24",
          width: 3,
          label: "Vertical Penetration",
        },
      ],
    },
  ];

  const now = new Date().toISOString();
  const tacticalPlan: TacticalPlan = {
    id: `plan_synth_${Date.now()}`,
    title: drill.title,
    pitchType: req.pitchType || "full",
    gridDimensions: drill.gridDimensions,
    phases,
    coachingPoints: drill.coachingPoints,
    createdAt: now,
    updatedAt: now,
  };

  const validationResult = validateTacticalPlan(tacticalPlan);

  return {
    drill,
    tacticalPlan: validationResult.normalizedPlan || tacticalPlan,
    validationResult,
    engineUsed: "CoachTactics Tactical Synthesis Engine",
  };
}

/**
 * Scenario 2: Directional Rondo 4v4 + 3 Jokers
 */
function buildRondoScenario(
  req: TacticalGenerationRequest,
  birthYears: string,
  categoryLabel: string,
  promptNotes?: string,
): TacticalGenerationResponse {
  const title = promptNotes
    ? `${promptNotes.slice(0, 32)}: Directional Rondo`
    : `4v4 + 3 Directional Possession Rondo (${req.ageGroup})`;

  const drill: TacticalDrillMetadata = {
    title,
    ageGroup: req.ageGroup,
    birthYears,
    category: req.category,
    categoryLabel,
    difficulty: req.difficulty || "Intermediate",
    durationMinutes: 15,
    durationSeconds: 900,
    recommendedSets: 4,
    recommendedReps: 5,
    gridDimensions: "25m × 25m Quadrant Grid",
    equipment: ["8 Disc Cones", "12 Bibs (3 Colors)", "4 Match Balls"],
    summary:
      "A fast-paced possession rondo focusing on circulation through central and wide neutral jokers, body angle to switch play, and quick counter-pressing on turnover.",
    setup: "Mark a 25m x 25m square. 4 Blue possessors and 4 Red defenders inside, with 1 central Joker (#6) and 2 boundary Jokers on opposing end lines.",
    instructions: [
      "Blue team retains possession with assistance from all 3 Orange Jokers.",
      "Red defenders press in pairs trying to force errors or win the ball.",
      "On winning possession, Red team must transition the ball to the opposite boundary Joker within 3 passes.",
      "10 consecutive passes equals 1 point for the possession team.",
    ],
    coachingPoints: [
      "Firm ground passing with the inside of the foot.",
      "Third-man combination runs off the central joker.",
      "Anticipate the next passing option before receiving.",
    ],
    variations: [
      "Limit boundary jokers to 1 touch.",
      "Defenders can score in mini-goals positioned on touchlines.",
    ],
    metricName: "Max Consecutive Passes",
    metricUnit: "passes",
    benchmark: 12,
    isLowerBetter: false,
    targetAttribute: "Technical",
  };

  const phases: TacticalPhase[] = [
    {
      id: "rondo_p1",
      phaseNumber: 1,
      title: "Phase 1: Central Overload & Circulation",
      durationSeconds: 3,
      coachingNotes: "Blue recirculates through central joker under pressure.",
      players: [
        { id: "b1", team: "home", number: 4, role: "CB", label: "Blue 4", position: { x: 25, y: 32 }, targetPosition: { x: 22, y: 40 } },
        { id: "b2", team: "home", number: 5, role: "CB", label: "Blue 5", position: { x: 25, y: 68 }, targetPosition: { x: 22, y: 60 } },
        { id: "b3", team: "home", number: 8, role: "CM", label: "Blue 8", position: { x: 75, y: 32 } },
        { id: "b4", team: "home", number: 10, role: "AM", label: "Blue 10", position: { x: 75, y: 68 } },
        { id: "r1", team: "away", number: 6, role: "DM", label: "Red 6", position: { x: 42, y: 44 }, targetPosition: { x: 46, y: 48 } },
        { id: "r2", team: "away", number: 8, role: "CM", label: "Red 8", position: { x: 42, y: 56 }, targetPosition: { x: 46, y: 52 } },
        { id: "r3", team: "away", number: 9, role: "ST", label: "Red 9", position: { x: 58, y: 44 } },
        { id: "r4", team: "away", number: 11, role: "ST", label: "Red 11", position: { x: 58, y: 56 } },
        { id: "j_cen", team: "neutral", number: "J", role: "Pivot", label: "Joker Center", position: { x: 50, y: 50 }, hasBall: true },
        { id: "j_top", team: "neutral", number: "J", role: "Wide", label: "Joker Top", position: { x: 50, y: 16 } },
        { id: "j_bot", team: "neutral", number: "J", role: "Wide", label: "Joker Bottom", position: { x: 50, y: 84 } },
      ],
      ball: { x: 50, y: 50, attachedPlayerId: "j_cen", speed: "ground" },
      equipment: [
        { id: "rc1", type: "cone", position: { x: 18, y: 15 } },
        { id: "rc2", type: "cone", position: { x: 82, y: 15 } },
        { id: "rc3", type: "cone", position: { x: 18, y: 85 } },
        { id: "rc4", type: "cone", position: { x: 82, y: 85 } },
      ],
      annotations: [
        {
          id: "r_ann1",
          type: "pass_line",
          points: [{ x: 50, y: 50 }, { x: 75, y: 32 }],
          color: "#60A5FA",
          width: 2.5,
          label: "Switch out of pressure",
        },
      ],
    },
  ];

  const now = new Date().toISOString();
  const tacticalPlan: TacticalPlan = {
    id: `plan_rondo_${Date.now()}`,
    title: drill.title,
    pitchType: "rondo_grid",
    gridDimensions: drill.gridDimensions,
    phases,
    coachingPoints: drill.coachingPoints,
    createdAt: now,
    updatedAt: now,
  };

  const validationResult = validateTacticalPlan(tacticalPlan);

  return {
    drill,
    tacticalPlan: validationResult.normalizedPlan || tacticalPlan,
    validationResult,
    engineUsed: "CoachTactics Tactical Synthesis Engine",
  };
}

/**
 * Scenario 3: Overlapping Fullbacks & Wide Channel Crosses
 */
function buildFinishingCrossingScenario(
  req: TacticalGenerationRequest,
  birthYears: string,
  categoryLabel: string,
  promptNotes?: string,
): TacticalGenerationResponse {
  const title = promptNotes
    ? `${promptNotes.slice(0, 32)}: Wide Overlap & Box Entry`
    : `Overlapping Fullback & Timed Box Finishing (${req.ageGroup})`;

  const drill: TacticalDrillMetadata = {
    title,
    ageGroup: req.ageGroup,
    birthYears,
    category: req.category,
    categoryLabel,
    difficulty: req.difficulty || "Advanced",
    durationMinutes: 20,
    durationSeconds: 1200,
    recommendedSets: 4,
    recommendedReps: 8,
    gridDimensions: "Attacking Half Pitch (50m × 68m)",
    equipment: ["1 Regulation Goal", "2 Defender Mannequins", "8 Cones", "10 Soccer Balls"],
    summary:
      "Wide combination attack training the right winger to commit the opposition full-back inside while the attacking fullback overlaps at sprint speed to deliver low driven crosses into prioritized penalty box zones.",
    setup: "Half pitch setup with goalkeeper, 2 recovery center-backs, and 1 defending full-back. Attacking unit consists of midfield playmaker, winger, overlapping fullback, and striker.",
    instructions: [
      "Midfielder #10 plays into winger #7's feet in the wide channel.",
      "Winger #7 dribbles inside across the defender to open the touchline corridor.",
      "Fullback #2 executes a high-speed blindside overlapping sprint behind the defense.",
      "Winger slips weighted through-ball into fullback's run.",
      "Fullback crosses first-time along the ground between the penalty spot and 6-yard area.",
      "Striker #9 attacks near post; weak-side winger #11 attacks far post; #10 supports at top of 18-yard box.",
    ],
    coachingPoints: [
      "Timing of the overlapping run: do not arrive too early or run into offside position.",
      "Cross trajectory: keep low and driven away from the goalkeeper's reach.",
      "Striker stagger runs: avoid arriving on the same line as the opposite winger.",
    ],
    variations: [
      "Allow underlapping run through the half-space instead of wide overlap.",
      "Add a recovery defensive midfielder to increase box pressure.",
    ],
    metricName: "Box Cross Conversion Rate",
    metricUnit: "%",
    benchmark: 40,
    isLowerBetter: false,
    targetAttribute: "Tactical",
  };

  const phases: TacticalPhase[] = [
    {
      id: "finish_p1",
      phaseNumber: 1,
      title: "Phase 1: Overlap Trigger & Delivery",
      durationSeconds: 3.5,
      coachingNotes: "Winger cuts inside, fullback overlaps into crossing zone.",
      players: [
        { id: "wng", team: "home", number: 7, role: "RW", label: "Right Wing", position: { x: 64, y: 74 }, targetPosition: { x: 74, y: 62 }, hasBall: true },
        { id: "fb", team: "home", number: 2, role: "RB", label: "Right Back", position: { x: 54, y: 86 }, targetPosition: { x: 86, y: 84 } },
        { id: "st", team: "home", number: 9, role: "ST", label: "Striker", position: { x: 68, y: 48 }, targetPosition: { x: 88, y: 44 } },
        { id: "am", team: "home", number: 10, role: "AM", label: "Midfielder", position: { x: 58, y: 50 }, targetPosition: { x: 76, y: 52 } },
        { id: "lw", team: "home", number: 11, role: "LW", label: "Left Wing", position: { x: 66, y: 22 }, targetPosition: { x: 86, y: 30 } },
        { id: "df_lb", team: "away", number: 3, role: "LB", label: "Opp. LB", position: { x: 72, y: 70 } },
        { id: "df_cb1", team: "away", number: 4, role: "CB", label: "Opp. CB1", position: { x: 80, y: 45 } },
        { id: "df_cb2", team: "away", number: 5, role: "CB", label: "Opp. CB2", position: { x: 80, y: 32 } },
        { id: "gk", team: "gk_away", number: 1, role: "GK", label: "Goalkeeper", position: { x: 95, y: 50 } },
      ],
      ball: { x: 64, y: 74, attachedPlayerId: "wng", speed: "ground" },
      equipment: [
        { id: "m1", type: "mannequin", position: { x: 76, y: 50 } },
        { id: "m2", type: "mannequin", position: { x: 82, y: 38 } },
        { id: "c1", type: "cone", position: { x: 85, y: 88 } },
      ],
      annotations: [
        {
          id: "an_run",
          type: "run_arrow",
          points: [{ x: 54, y: 86 }, { x: 86, y: 84 }],
          color: "#34D399",
          width: 2.5,
          label: "Sprint Overlap",
        },
        {
          id: "an_cross",
          type: "pass_line",
          points: [{ x: 86, y: 84 }, { x: 88, y: 44 }],
          color: "#FBBF24",
          width: 2.5,
          label: "Driven Cross",
        },
      ],
    },
  ];

  const now = new Date().toISOString();
  const tacticalPlan: TacticalPlan = {
    id: `plan_crossing_${Date.now()}`,
    title: drill.title,
    pitchType: "attacking_half",
    gridDimensions: drill.gridDimensions,
    phases,
    coachingPoints: drill.coachingPoints,
    createdAt: now,
    updatedAt: now,
  };

  const validationResult = validateTacticalPlan(tacticalPlan);

  return {
    drill,
    tacticalPlan: validationResult.normalizedPlan || tacticalPlan,
    validationResult,
    engineUsed: "CoachTactics Tactical Synthesis Engine",
  };
}

/**
 * Scenario 4: Counter-Attacking 3v2 Transition Break
 */
function buildCounterAttackScenario(
  req: TacticalGenerationRequest,
  birthYears: string,
  categoryLabel: string,
  promptNotes?: string,
): TacticalGenerationResponse {
  const title = promptNotes
    ? `${promptNotes.slice(0, 32)}: Transition Counter`
    : `3v2 Fast Break Counter-Attack (${req.ageGroup})`;

  const drill: TacticalDrillMetadata = {
    title,
    ageGroup: req.ageGroup,
    birthYears,
    category: req.category,
    categoryLabel,
    difficulty: req.difficulty || "Intermediate",
    durationMinutes: 18,
    durationSeconds: 1080,
    recommendedSets: 4,
    recommendedReps: 6,
    gridDimensions: "Half Pitch (50m × 45m)",
    equipment: ["1 Regulation Goal", "2 Mini Goals", "6 Cones", "8 Balls"],
    summary:
      "High-tempo attacking transition training quick forward decision-making: whether to commit the defender with a direct drive or slip an early through-pass to the wide supporting runner.",
    setup: "Attacking trio starts on halfway line facing 2 defensive center-backs and a goalkeeper. Attackers have 10 seconds to score.",
    instructions: [
      "Ball carrier drives directly at the recovery center-back to fix their position.",
      "Wide runners make diagonal runs to widen the backline and create 2v1 isolations.",
      "Finish must occur within 10 seconds to simulate authentic counter-attack velocity.",
    ],
    coachingPoints: [
      "Accelerate immediately into open space upon transition.",
      "Commit the defender before releasing the ball.",
      "Follow in all shots for rebound tap-ins.",
    ],
    variations: ["Add a trailing recovery midfielder after 4 seconds."],
    metricName: "Goals Scored per 10 Counters",
    metricUnit: "goals",
    benchmark: 6,
    isLowerBetter: false,
    targetAttribute: "Speed",
  };

  const phases: TacticalPhase[] = [
    {
      id: "cnt_p1",
      phaseNumber: 1,
      title: "Phase 1: Commit & Slip",
      durationSeconds: 3.5,
      coachingNotes: "Attacker #10 drives center, slips #9 into box channel.",
      players: [
        { id: "at_10", team: "home", number: 10, role: "AM", label: "Carrier", position: { x: 50, y: 50 }, targetPosition: { x: 68, y: 50 }, hasBall: true },
        { id: "at_9", team: "home", number: 9, role: "ST", label: "Right Runner", position: { x: 52, y: 68 }, targetPosition: { x: 78, y: 62 } },
        { id: "at_11", team: "home", number: 11, role: "LW", label: "Left Runner", position: { x: 52, y: 32 }, targetPosition: { x: 78, y: 38 } },
        { id: "df_1", team: "away", number: 4, role: "CB", label: "CB Left", position: { x: 72, y: 44 } },
        { id: "df_2", team: "away", number: 5, role: "CB", label: "CB Right", position: { x: 72, y: 56 } },
        { id: "gk", team: "gk_away", number: 1, role: "GK", label: "GK", position: { x: 94, y: 50 } },
      ],
      ball: { x: 50, y: 50, attachedPlayerId: "at_10", speed: "driven" },
      equipment: [
        { id: "c1", type: "cone", position: { x: 50, y: 20 } },
        { id: "c2", type: "cone", position: { x: 50, y: 80 } },
      ],
      annotations: [
        {
          id: "an_drive",
          type: "dribble_wave",
          points: [{ x: 50, y: 50 }, { x: 68, y: 50 }],
          color: "#34D399",
          width: 2.5,
          label: "Drive to fix defender",
        },
        {
          id: "an_through",
          type: "pass_line",
          points: [{ x: 68, y: 50 }, { x: 78, y: 62 }],
          color: "#FBBF24",
          width: 2.5,
          label: "Through Ball",
        },
      ],
    },
  ];

  const now = new Date().toISOString();
  const tacticalPlan: TacticalPlan = {
    id: `plan_counter_${Date.now()}`,
    title: drill.title,
    pitchType: "attacking_half",
    gridDimensions: drill.gridDimensions,
    phases,
    coachingPoints: drill.coachingPoints,
    createdAt: now,
    updatedAt: now,
  };

  const validationResult = validateTacticalPlan(tacticalPlan);

  return {
    drill,
    tacticalPlan: validationResult.normalizedPlan || tacticalPlan,
    validationResult,
    engineUsed: "CoachTactics Tactical Synthesis Engine",
  };
}

/**
 * Scenario 5: Agility & Transition Reaction Grid
 */
function buildAgilityTransitionScenario(
  req: TacticalGenerationRequest,
  birthYears: string,
  categoryLabel: string,
  promptNotes?: string,
): TacticalGenerationResponse {
  const title = promptNotes
    ? `${promptNotes.slice(0, 32)}: Agility & Press Transition`
    : `Agility Slalom & Immediate 1v1 Recovery (${req.ageGroup})`;

  const drill: TacticalDrillMetadata = {
    title,
    ageGroup: req.ageGroup,
    birthYears,
    category: req.category,
    categoryLabel,
    difficulty: req.difficulty || "Intermediate",
    durationMinutes: 16,
    durationSeconds: 960,
    recommendedSets: 4,
    recommendedReps: 6,
    gridDimensions: "20m × 20m Channel Grid",
    equipment: ["6 Agility Poles", "4 Cones", "2 Mini Goals", "6 Balls"],
    summary:
      "Combines explosive multi-directional deceleration and footwork with an instant cognitive transition trigger into an active 1v1 duel defending mini-goals.",
    setup: "Players slalom through agility poles, receive coach pass on turn, and immediately engage in 1v1 duel to target mini-goals.",
    instructions: [
      "Slalom through 3 agility poles maintaining low center of mass.",
      "Coach calls out color or whistle trigger.",
      "First player to touch ball becomes attacker; second player reacts as recovery defender.",
    ],
    coachingPoints: [
      "Sharp hip swivel around agility poles.",
      "First touch out of feet in direction of goal.",
      "Defender angles body to force attacker toward sideline.",
    ],
    variations: ["Add a 5-second shot clock."],
    metricName: "Reaction Sprint Duel Wins",
    metricUnit: "wins",
    benchmark: 4,
    isLowerBetter: false,
    targetAttribute: "Agility",
  };

  const phases: TacticalPhase[] = [
    {
      id: "ag_p1",
      phaseNumber: 1,
      title: "Phase 1: Slalom & 1v1 Duel",
      durationSeconds: 3,
      coachingNotes: "Explosive cut around pole, accelerate onto coach pass.",
      players: [
        { id: "at_1", team: "home", number: 7, role: "WNG", label: "Attacker", position: { x: 30, y: 35 }, targetPosition: { x: 60, y: 40 }, hasBall: true },
        { id: "df_1", team: "away", number: 4, role: "CB", label: "Defender", position: { x: 30, y: 65 }, targetPosition: { x: 58, y: 46 } },
      ],
      ball: { x: 30, y: 35, attachedPlayerId: "at_1" },
      equipment: [
        { id: "p1", type: "agility_pole", position: { x: 25, y: 35 } },
        { id: "p2", type: "agility_pole", position: { x: 25, y: 65 } },
        { id: "mg1", type: "mini_goal", position: { x: 75, y: 35 } },
        { id: "mg2", type: "mini_goal", position: { x: 75, y: 65 } },
      ],
      annotations: [
        {
          id: "an_sprint",
          type: "run_arrow",
          points: [{ x: 30, y: 35 }, { x: 60, y: 40 }],
          color: "#34D399",
          width: 2.5,
          label: "Sprint to Goal",
        },
      ],
    },
  ];

  const now = new Date().toISOString();
  const tacticalPlan: TacticalPlan = {
    id: `plan_agility_${Date.now()}`,
    title: drill.title,
    pitchType: "rondo_grid",
    gridDimensions: drill.gridDimensions,
    phases,
    coachingPoints: drill.coachingPoints,
    createdAt: now,
    updatedAt: now,
  };

  const validationResult = validateTacticalPlan(tacticalPlan);

  return {
    drill,
    tacticalPlan: validationResult.normalizedPlan || tacticalPlan,
    validationResult,
    engineUsed: "CoachTactics Tactical Synthesis Engine",
  };
}

/**
 * Scenario 6: Ball Mastery & 1v1 Skill Channel
 */
function buildBallMasteryScenario(
  req: TacticalGenerationRequest,
  birthYears: string,
  categoryLabel: string,
  promptNotes?: string,
): TacticalGenerationResponse {
  const title = promptNotes
    ? `${promptNotes.slice(0, 32)}: 1v1 Ball Mastery`
    : `1v1 Ball Mastery & Change of Direction (${req.ageGroup})`;

  const drill: TacticalDrillMetadata = {
    title,
    ageGroup: req.ageGroup,
    birthYears,
    category: req.category,
    categoryLabel,
    difficulty: req.difficulty || "Beginner",
    durationMinutes: 15,
    durationSeconds: 900,
    recommendedSets: 4,
    recommendedReps: 6,
    gridDimensions: "15m × 15m Box",
    equipment: ["8 Disc Cones", "4 Hurdles", "6 Balls"],
    summary:
      "Focuses on deceptive body feints, step-overs, and explosive changes of direction to break past isolation defenders in tight phone-booth channels.",
    setup: "15m x 15m grid with end lines. Attacker receives and has 3 attempts to unbalance defender.",
    instructions: [
      "Attacker executes recognized feint (drop shoulder, scissors, or Matthews cut).",
      "Accelerate past defender's standing leg.",
      "Stop ball dead on opposite end line for point.",
    ],
    coachingPoints: [
      "Drop shoulder convincingly to unbalance defender.",
      "Explosive change of speed on the exit touch.",
      "Keep body between defender and ball.",
    ],
    variations: ["Defender starts 2 steps closer to reduce reaction time."],
    metricName: "Successful 1v1 Take-Ons",
    metricUnit: "take-ons",
    benchmark: 4,
    isLowerBetter: false,
    targetAttribute: "Technical",
  };

  const phases: TacticalPhase[] = [
    {
      id: "bm_p1",
      phaseNumber: 1,
      title: "Phase 1: Feint & Acceleration",
      durationSeconds: 3,
      coachingNotes: "Attacker drops shoulder, accelerates to end line.",
      players: [
        { id: "at", team: "home", number: 10, role: "PL", label: "Attacker", position: { x: 35, y: 50 }, targetPosition: { x: 65, y: 40 }, hasBall: true },
        { id: "df", team: "away", number: 4, role: "PL", label: "Defender", position: { x: 55, y: 50 }, targetPosition: { x: 58, y: 48 } },
      ],
      ball: { x: 35, y: 50, attachedPlayerId: "at" },
      equipment: [
        { id: "c1", type: "cone", position: { x: 25, y: 30 } },
        { id: "c2", type: "cone", position: { x: 75, y: 30 } },
        { id: "c3", type: "cone", position: { x: 25, y: 70 } },
        { id: "c4", type: "cone", position: { x: 75, y: 70 } },
      ],
      annotations: [
        {
          id: "an_feint",
          type: "dribble_wave",
          points: [{ x: 35, y: 50 }, { x: 65, y: 40 }],
          color: "#34D399",
          width: 2.5,
          label: "Body Feint & Burst",
        },
      ],
    },
  ];

  const now = new Date().toISOString();
  const tacticalPlan: TacticalPlan = {
    id: `plan_mastery_${Date.now()}`,
    title: drill.title,
    pitchType: "rondo_grid",
    gridDimensions: drill.gridDimensions,
    phases,
    coachingPoints: drill.coachingPoints,
    createdAt: now,
    updatedAt: now,
  };

  const validationResult = validateTacticalPlan(tacticalPlan);

  return {
    drill,
    tacticalPlan: validationResult.normalizedPlan || tacticalPlan,
    validationResult,
    engineUsed: "CoachTactics Tactical Synthesis Engine",
  };
}
