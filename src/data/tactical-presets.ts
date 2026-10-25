import {
  type TacticalPlan,
  createDefaultTacticalPlan,
  createBasketballTacticalPlan,
  createFutsalTacticalPlan,
  createHandballTacticalPlan,
  createVolleyballTacticalPlan,
  createRugbyTacticalPlan,
} from "@/domain/tactics/tactical-domain.ts";

export interface TacticalPresetItem {
  id: string;
  title: string;
  category: string;
  plan: TacticalPlan;
}

export function getTacticalPresets(): TacticalPresetItem[] {
  const now = new Date().toISOString();
  return [
    {
      id: "preset_433_buildup",
      title: "4-3-3 Build-up vs 4-4-2 High Press Block",
      category: "Positional Play",
      plan: createDefaultTacticalPlan("4-3-3 Build-up vs 4-4-2 High Press Block"),
    },
    {
      id: "preset_rondo_4v4_3",
      title: "4v4 + 3 Neutral Jokers Directional Rondo",
      category: "Passing & Rondos",
      plan: {
        id: "plan_rondo",
        title: "4v4 + 3 Directional Possession Rondo",
        pitchType: "rondo_grid",
        gridDimensions: "30m × 30m Grid",
        coachingPoints: [
          "Play through the central #6 neutral player whenever possible.",
          "Wide neutrals create maximum width on the boundary touchlines.",
          "Defenders press in pairs to close the central passing lane.",
        ],
        createdAt: now,
        updatedAt: now,
        phases: [
          {
            id: "p1",
            phaseNumber: 1,
            title: "Possession Circulation",
            durationSeconds: 3,
            coachingNotes: "Blue retains ball with central joker.",
            players: [
              // Blue possession
              { id: "b1", team: "home", number: 4, role: "CB", label: "Blue 4", position: { x: 25, y: 30 } },
              { id: "b2", team: "home", number: 5, role: "CB", label: "Blue 5", position: { x: 25, y: 70 } },
              { id: "b3", team: "home", number: 8, role: "CM", label: "Blue 8", position: { x: 75, y: 30 } },
              { id: "b4", team: "home", number: 10, role: "AM", label: "Blue 10", position: { x: 75, y: 70 } },
              // Red pressing
              { id: "r1", team: "away", number: 6, role: "DM", label: "Red 6", position: { x: 42, y: 44 } },
              { id: "r2", team: "away", number: 8, role: "CM", label: "Red 8", position: { x: 42, y: 56 } },
              { id: "r3", team: "away", number: 9, role: "ST", label: "Red 9", position: { x: 58, y: 44 } },
              { id: "r4", team: "away", number: 11, role: "ST", label: "Red 11", position: { x: 58, y: 56 } },
              // Orange jokers
              { id: "j_mid", team: "neutral", number: "J", role: "Pivot", label: "Central Joker", position: { x: 50, y: 50 }, hasBall: true },
              { id: "j_top", team: "neutral", number: "J", role: "Width", label: "Top Joker", position: { x: 50, y: 18 } },
              { id: "j_bot", team: "neutral", number: "J", role: "Width", label: "Bottom Joker", position: { x: 50, y: 82 } },
            ],
            ball: { x: 50, y: 50, attachedPlayerId: "j_mid" },
            equipment: [
              { id: "c1", type: "cone", position: { x: 20, y: 15 } },
              { id: "c2", type: "cone", position: { x: 80, y: 15 } },
              { id: "c3", type: "cone", position: { x: 20, y: 85 } },
              { id: "c4", type: "cone", position: { x: 80, y: 85 } },
            ],
            annotations: [
              {
                id: "a1",
                type: "pass_line",
                points: [{ x: 50, y: 50 }, { x: 75, y: 30 }],
                color: "#60A5FA",
                width: 2.5,
                label: "Quick switch",
              },
            ],
          },
        ],
      },
    },
    {
      id: "preset_overlap_cross",
      title: "Overlapping Fullback & Wide Channel Cross",
      category: "Wide Play & Crossing",
      plan: {
        id: "plan_overlap",
        title: "Overlapping Fullback & Near-Post Box Attack",
        pitchType: "attacking_half",
        gridDimensions: "Half Pitch",
        coachingPoints: [
          "Winger cuts inside to drag opposition full-back.",
          "Overlapping full-back delivers low driven cross between penalty spot and 6-yard box.",
          "Striker attacks front post; opposite winger crashes back post.",
        ],
        createdAt: now,
        updatedAt: now,
        phases: [
          {
            id: "p1",
            phaseNumber: 1,
            title: "Underlap & Overlap Trigger",
            durationSeconds: 3.5,
            coachingNotes: "Winger #7 commits defender, #2 makes blind-side overlapping sprint.",
            players: [
              { id: "wng", team: "home", number: 7, role: "RW", label: "Right Wing", position: { x: 65, y: 72 }, targetPosition: { x: 74, y: 62 }, hasBall: true },
              { id: "fb", team: "home", number: 2, role: "RB", label: "Right Back", position: { x: 55, y: 85 }, targetPosition: { x: 86, y: 84 } },
              { id: "st", team: "home", number: 9, role: "ST", label: "Striker", position: { x: 70, y: 48 }, targetPosition: { x: 88, y: 45 } },
              { id: "am", team: "home", number: 10, role: "AM", label: "Midfielder", position: { x: 60, y: 50 }, targetPosition: { x: 78, y: 52 } },
              { id: "lw", team: "home", number: 11, role: "LW", label: "Left Wing", position: { x: 68, y: 22 }, targetPosition: { x: 85, y: 30 } },
              // Defenders
              { id: "df_lb", team: "away", number: 3, role: "LB", label: "Opp. Left Back", position: { x: 72, y: 70 } },
              { id: "df_cb1", team: "away", number: 4, role: "CB", label: "Opp. Left CB", position: { x: 80, y: 45 } },
              { id: "df_cb2", team: "away", number: 5, role: "CB", label: "Opp. Right CB", position: { x: 80, y: 32 } },
              { id: "gk", team: "gk_away", number: 1, role: "GK", label: "Goalkeeper", position: { x: 95, y: 50 } },
            ],
            ball: { x: 65, y: 72, attachedPlayerId: "wng" },
            equipment: [
              { id: "m1", type: "mannequin", position: { x: 75, y: 50 } },
              { id: "m2", type: "mannequin", position: { x: 82, y: 40 } },
            ],
            annotations: [
              {
                id: "an1",
                type: "run_arrow",
                points: [{ x: 55, y: 85 }, { x: 86, y: 84 }],
                color: "#34D399",
                width: 2.5,
                label: "Overlapping sprint",
              },
            ],
          },
        ],
      },
    },
    {
      id: "preset_bball_pnr",
      title: "🏀 Basketball: 5-Out Pick & Roll Motion",
      category: "Basketball",
      plan: createBasketballTacticalPlan(),
    },
    {
      id: "preset_futsal_31",
      title: "⚡ Futsal: 3-1 Diamond Pivot Rotation",
      category: "Futsal",
      plan: createFutsalTacticalPlan(),
    },
    {
      id: "preset_handball_60",
      title: "🤾 Handball: 6:0 Defense vs Crossing Attack",
      category: "Handball",
      plan: createHandballTacticalPlan(),
    },
    {
      id: "preset_vball_51",
      title: "🏐 Volleyball: 5-1 Serve Receive & Middle Attack",
      category: "Volleyball",
      plan: createVolleyballTacticalPlan(),
    },
    {
      id: "preset_rugby_pods",
      title: "🏉 Rugby: 3-Man Forward Pod & Backline Spread",
      category: "Rugby",
      plan: createRugbyTacticalPlan(),
    },
  ];
}

export const TACTICAL_PRESETS: TacticalPresetItem[] = getTacticalPresets();

/**
 * Creates a blank canvas plan with a chosen pitch type and sport
 */
export function createBlankTacticalPlan(
  title = "New Tactical Drill",
  pitchType: PitchType = "full",
  sport: SportType = "soccer",
): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_${Date.now()}`,
    title: title.trim() || "New Tactical Drill",
    category: "Custom Tactics",
    sport,
    pitchType,
    gridDimensions: pitchType === "attacking_half" ? "Half Pitch" : "Full Pitch (105m × 68m)",
    phases: [
      {
        id: `phase_${Date.now()}`,
        phaseNumber: 1,
        title: "Phase 1: Initial Setup",
        durationSeconds: 4,
        players: [],
        ball: { x: 50, y: 50 },
        equipment: [],
        annotations: [],
        coachingNotes: "Drag players and equipment onto the pitch to begin.",
      },
    ],
    coachingPoints: ["Set high intensity and clean body shape.", "Communicate passing triggers."],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a 3v2 counter-attack overload starter drill
 */
export function create3v2OverloadTacticalPlan(title = "3v2 Counter-Attack Transition"): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_${Date.now()}`,
    title: title.trim() || "3v2 Counter-Attack Transition",
    category: "Attacking Overload",
    sport: "soccer",
    pitchType: "attacking_half",
    gridDimensions: "Attacking Half Pitch",
    phases: [
      {
        id: `phase_1_${Date.now()}`,
        phaseNumber: 1,
        title: "Phase 1: Counter-Attack Breakout",
        durationSeconds: 3.5,
        coachingNotes: "Playmaker drives through central gate, wingers make divergent runs to stretch defenders.",
        players: [
          // 3 Blue Attackers
          { id: "h_cm", team: "home", number: 8, role: "CM", label: "Playmaker", position: { x: 45, y: 50 }, targetPosition: { x: 62, y: 50 }, hasBall: true },
          { id: "h_rw", team: "home", number: 7, role: "RW", label: "Right Wing", position: { x: 48, y: 75 }, targetPosition: { x: 74, y: 80 } },
          { id: "h_lw", team: "home", number: 11, role: "LW", label: "Left Wing", position: { x: 48, y: 25 }, targetPosition: { x: 74, y: 20 } },
          // 2 Red Defenders
          { id: "a_cb1", team: "away", number: 4, role: "CB", label: "Left CB", position: { x: 72, y: 38 }, targetPosition: { x: 68, y: 44 } },
          { id: "a_cb2", team: "away", number: 5, role: "CB", label: "Right CB", position: { x: 72, y: 62 }, targetPosition: { x: 68, y: 56 } },
          // 1 Red GK
          { id: "a_gk", team: "gk_away", number: 1, role: "GK", label: "Goalkeeper", position: { x: 95, y: 50 } },
        ],
        ball: { x: 45, y: 50, attachedPlayerId: "h_cm" },
        equipment: [
          { id: `c1_${Date.now()}`, type: "cone", position: { x: 42, y: 35 } },
          { id: `c2_${Date.now()}`, type: "cone", position: { x: 42, y: 65 } },
        ],
        annotations: [
          {
            id: `ann_run_rw`,
            type: "run_arrow",
            points: [{ x: 48, y: 75 }, { x: 74, y: 80 }],
            color: "#00E5FF",
            width: 2.5,
            label: "Wide wing run",
          },
          {
            id: `ann_run_lw`,
            type: "run_arrow",
            points: [{ x: 48, y: 25 }, { x: 74, y: 20 }],
            color: "#00E5FF",
            width: 2.5,
            label: "Wide wing run",
          },
        ],
      },
    ],
    coachingPoints: [
      "Playmaker commits the central defender before releasing pass.",
      "Wingers stay wide to maximize defending gap before cutting inside.",
      "Finish within 6 seconds of transition trigger.",
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a 5v5 Mini Pitch starter drill
 */
export function create5v5StarterPlan(title = "5v5 Small Sided Game"): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_${Date.now()}`,
    title: title.trim() || "5v5 Small Sided Game",
    category: "Small Sided Games",
    sport: "soccer",
    pitchType: "full",
    gridDimensions: "Compact Pitch",
    phases: [
      {
        id: `phase_1_${Date.now()}`,
        phaseNumber: 1,
        title: "Phase 1: Diamond 1-2-1 Structure",
        durationSeconds: 4,
        coachingNotes: "Both teams organized in 1-2-1 diamond shape.",
        players: [
          // Home Blue (GK, CB, LM, RM, ST)
          { id: "h_gk", team: "gk_home", number: 1, role: "GK", label: "Blue GK", position: { x: 10, y: 50 } },
          { id: "h_cb", team: "home", number: 4, role: "CB", label: "Blue 4", position: { x: 25, y: 50 } },
          { id: "h_lm", team: "home", number: 8, role: "LM", label: "Blue 8", position: { x: 38, y: 28 } },
          { id: "h_rm", team: "home", number: 7, role: "RM", label: "Blue 7", position: { x: 38, y: 72 } },
          { id: "h_st", team: "home", number: 9, role: "ST", label: "Blue 9", position: { x: 48, y: 50 }, hasBall: true },
          // Away Red (GK, CB, LM, RM, ST)
          { id: "a_gk", team: "gk_away", number: 1, role: "GK", label: "Red GK", position: { x: 90, y: 50 } },
          { id: "a_cb", team: "away", number: 5, role: "CB", label: "Red 5", position: { x: 75, y: 50 } },
          { id: "a_lm", team: "away", number: 6, role: "LM", label: "Red 6", position: { x: 62, y: 72 } },
          { id: "a_rm", team: "away", number: 10, role: "RM", label: "Red 10", position: { x: 62, y: 28 } },
          { id: "a_st", team: "away", number: 11, role: "ST", label: "Red 11", position: { x: 54, y: 50 } },
        ],
        ball: { x: 48, y: 50, attachedPlayerId: "h_st" },
        equipment: [],
        annotations: [],
      },
    ],
    coachingPoints: ["Create diamond angles for continuous passing support.", "Quick transition on turnovers."],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a 7v7 Youth Match starter drill
 */
export function create7v7StarterPlan(title = "7v7 Tactical Match"): TacticalPlan {
  const now = new Date().toISOString();
  return {
    id: `plan_${Date.now()}`,
    title: title.trim() || "7v7 Tactical Match",
    category: "Match Practice",
    sport: "soccer",
    pitchType: "full",
    gridDimensions: "7v7 Pitch",
    phases: [
      {
        id: `phase_1_${Date.now()}`,
        phaseNumber: 1,
        title: "Phase 1: 1-2-3-1 Formation",
        durationSeconds: 4,
        coachingNotes: "Standard 7v7 youth structure: 1 GK, 2 CBs, 3 Midfielders, 1 ST.",
        players: [
          // Home (7)
          { id: "h_gk", team: "gk_home", number: 1, role: "GK", label: "GK", position: { x: 12, y: 50 } },
          { id: "h_cb1", team: "home", number: 4, role: "CB", label: "Left CB", position: { x: 25, y: 32 } },
          { id: "h_cb2", team: "home", number: 5, role: "CB", label: "Right CB", position: { x: 25, y: 68 } },
          { id: "h_lm", team: "home", number: 11, role: "LM", label: "Left Mid", position: { x: 40, y: 20 } },
          { id: "h_cm", team: "home", number: 8, role: "CM", label: "Central Mid", position: { x: 40, y: 50 }, hasBall: true },
          { id: "h_rm", team: "home", number: 7, role: "RM", label: "Right Mid", position: { x: 40, y: 80 } },
          { id: "h_st", team: "home", number: 9, role: "ST", label: "Striker", position: { x: 55, y: 50 } },
          // Away (7)
          { id: "a_gk", team: "gk_away", number: 1, role: "GK", label: "GK", position: { x: 88, y: 50 } },
          { id: "a_cb1", team: "away", number: 2, role: "CB", label: "Right CB", position: { x: 75, y: 68 } },
          { id: "a_cb2", team: "away", number: 3, role: "CB", label: "Left CB", position: { x: 75, y: 32 } },
          { id: "a_rm", team: "away", number: 6, role: "RM", label: "Right Mid", position: { x: 60, y: 80 } },
          { id: "a_cm", team: "away", number: 10, role: "CM", label: "Central Mid", position: { x: 60, y: 50 } },
          { id: "a_lm", team: "away", number: 12, role: "LM", label: "Left Mid", position: { x: 60, y: 20 } },
          { id: "a_st", team: "away", number: 14, role: "ST", label: "Striker", position: { x: 48, y: 50 } },
        ],
        ball: { x: 40, y: 50, attachedPlayerId: "h_cm" },
        equipment: [],
        annotations: [],
      },
    ],
    coachingPoints: ["Wide midfielders provide width on attack and tuck in on defense.", "Quick switches of play."],
    createdAt: now,
    updatedAt: now,
  };
}
