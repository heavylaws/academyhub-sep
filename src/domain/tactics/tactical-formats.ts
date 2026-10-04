import type { PitchType, PlayerNode, PlayerTeam } from "./tactical-domain.ts";

export type SoccerFormation =
  | "4-3-3"
  | "4-2-3-1"
  | "3-5-2"
  | "4-4-2"
  | "3-4-3"
  | "4-4-2-low-block"
  | "5-3-2-mid-block"
  | "high-press";

export type SoccerFormat =
  | "11v11"
  | "10v8"
  | "9v9"
  | "7v7"
  | "5v5"
  | "4v4+3"
  | "3v2"
  | "2v1"
  | "1v1";

interface FormationSlot {
  number: number;
  role: string;
  label: string;
  fullX: number; // 0..100 percentage
  fullY: number; // 0..100 percentage
  halfX?: number; // when on attacking half (50..100 scaled)
  halfY?: number;
}

export const SOCCER_FORMATIONS: Record<SoccerFormation, { name: string; isDefensive?: boolean; slots: FormationSlot[] }> = {
  "4-3-3": {
    name: "4-3-3 Attacking",
    slots: [
      { number: 1, role: "GK", label: "Goalkeeper", fullX: 10, fullY: 50, halfX: 52, halfY: 50 },
      { number: 2, role: "RB", label: "Right Back", fullX: 28, fullY: 86, halfX: 62, halfY: 88 },
      { number: 4, role: "CB", label: "Right CB", fullX: 24, fullY: 62, halfX: 58, halfY: 65 },
      { number: 5, role: "CB", label: "Left CB", fullX: 24, fullY: 38, halfX: 58, halfY: 35 },
      { number: 3, role: "LB", label: "Left Back", fullX: 28, fullY: 14, halfX: 62, halfY: 12 },
      { number: 6, role: "DM", label: "Holding Pivot", fullX: 38, fullY: 50, halfX: 68, halfY: 50 },
      { number: 8, role: "CM", label: "Right 8", fullX: 48, fullY: 68, halfX: 74, halfY: 70 },
      { number: 10, role: "CM", label: "Left 10", fullX: 48, fullY: 32, halfX: 74, halfY: 30 },
      { number: 7, role: "RW", label: "Right Wing", fullX: 68, fullY: 84, halfX: 84, halfY: 85 },
      { number: 9, role: "ST", label: "Striker", fullX: 70, fullY: 50, halfX: 86, halfY: 50 },
      { number: 11, role: "LW", label: "Left Wing", fullX: 68, fullY: 16, halfX: 84, halfY: 15 },
    ],
  },
  "4-2-3-1": {
    name: "4-2-3-1 Double Pivot",
    slots: [
      { number: 1, role: "GK", label: "Goalkeeper", fullX: 10, fullY: 50, halfX: 52, halfY: 50 },
      { number: 2, role: "RB", label: "Right Back", fullX: 28, fullY: 86, halfX: 62, halfY: 88 },
      { number: 4, role: "CB", label: "Right CB", fullX: 24, fullY: 62, halfX: 58, halfY: 65 },
      { number: 5, role: "CB", label: "Left CB", fullX: 24, fullY: 38, halfX: 58, halfY: 35 },
      { number: 3, role: "LB", label: "Left Back", fullX: 28, fullY: 14, halfX: 62, halfY: 12 },
      { number: 6, role: "DM", label: "Right DM", fullX: 38, fullY: 62, halfX: 68, halfY: 65 },
      { number: 8, role: "DM", label: "Left DM", fullX: 38, fullY: 38, halfX: 68, halfY: 35 },
      { number: 10, role: "AM", label: "Playmaker", fullX: 54, fullY: 50, halfX: 78, halfY: 50 },
      { number: 7, role: "RW", label: "Right Wing", fullX: 62, fullY: 84, halfX: 82, halfY: 85 },
      { number: 9, role: "ST", label: "Striker", fullX: 72, fullY: 50, halfX: 88, halfY: 50 },
      { number: 11, role: "LW", label: "Left Wing", fullX: 62, fullY: 16, halfX: 82, halfY: 15 },
    ],
  },
  "3-5-2": {
    name: "3-5-2 Wingbacks",
    slots: [
      { number: 1, role: "GK", label: "Goalkeeper", fullX: 10, fullY: 50, halfX: 52, halfY: 50 },
      { number: 4, role: "CB", label: "Right CB", fullX: 24, fullY: 70, halfX: 58, halfY: 72 },
      { number: 5, role: "CB", label: "Central CB", fullX: 22, fullY: 50, halfX: 56, halfY: 50 },
      { number: 3, role: "CB", label: "Left CB", fullX: 24, fullY: 30, halfX: 58, halfY: 28 },
      { number: 2, role: "RWB", label: "Right Wingback", fullX: 42, fullY: 90, halfX: 70, halfY: 90 },
      { number: 7, role: "LWB", label: "Left Wingback", fullX: 42, fullY: 10, halfX: 70, halfY: 10 },
      { number: 6, role: "DM", label: "Deep Pivot", fullX: 36, fullY: 50, halfX: 66, halfY: 50 },
      { number: 8, role: "CM", label: "Right CM", fullX: 48, fullY: 66, halfX: 75, halfY: 68 },
      { number: 10, role: "CM", label: "Left CM", fullX: 48, fullY: 34, halfX: 75, halfY: 32 },
      { number: 9, role: "ST", label: "Target Forward", fullX: 68, fullY: 60, halfX: 86, halfY: 62 },
      { number: 11, role: "ST", label: "Second Striker", fullX: 66, fullY: 40, halfX: 84, halfY: 38 },
    ],
  },
  "4-4-2": {
    name: "4-4-2 Classic Flat",
    slots: [
      { number: 1, role: "GK", label: "Goalkeeper", fullX: 10, fullY: 50, halfX: 52, halfY: 50 },
      { number: 2, role: "RB", label: "Right Back", fullX: 28, fullY: 86, halfX: 62, halfY: 88 },
      { number: 4, role: "CB", label: "Right CB", fullX: 24, fullY: 62, halfX: 58, halfY: 65 },
      { number: 5, role: "CB", label: "Left CB", fullX: 24, fullY: 38, halfX: 58, halfY: 35 },
      { number: 3, role: "LB", label: "Left Back", fullX: 28, fullY: 14, halfX: 62, halfY: 12 },
      { number: 7, role: "RM", label: "Right Mid", fullX: 46, fullY: 84, halfX: 72, halfY: 85 },
      { number: 8, role: "CM", label: "Right CM", fullX: 44, fullY: 60, halfX: 70, halfY: 62 },
      { number: 6, role: "CM", label: "Left CM", fullX: 44, fullY: 40, halfX: 70, halfY: 38 },
      { number: 11, role: "LM", label: "Left Mid", fullX: 46, fullY: 16, halfX: 72, halfY: 15 },
      { number: 9, role: "ST", label: "Striker 1", fullX: 68, fullY: 58, halfX: 85, halfY: 60 },
      { number: 10, role: "ST", label: "Striker 2", fullX: 68, fullY: 42, halfX: 85, halfY: 40 },
    ],
  },
  "3-4-3": {
    name: "3-4-3 Wide Front",
    slots: [
      { number: 1, role: "GK", label: "Goalkeeper", fullX: 10, fullY: 50, halfX: 52, halfY: 50 },
      { number: 4, role: "CB", label: "Right CB", fullX: 24, fullY: 70, halfX: 58, halfY: 72 },
      { number: 5, role: "CB", label: "Central CB", fullX: 22, fullY: 50, halfX: 56, halfY: 50 },
      { number: 3, role: "CB", label: "Left CB", fullX: 24, fullY: 30, halfX: 58, halfY: 28 },
      { number: 2, role: "RM", label: "Right Wide Mid", fullX: 44, fullY: 88, halfX: 70, halfY: 88 },
      { number: 8, role: "CM", label: "Right CM", fullX: 42, fullY: 62, halfX: 68, halfY: 64 },
      { number: 6, role: "CM", label: "Left CM", fullX: 42, fullY: 38, halfX: 68, halfY: 36 },
      { number: 7, role: "LM", label: "Left Wide Mid", fullX: 44, fullY: 12, halfX: 70, halfY: 12 },
      { number: 10, role: "RW", label: "Right Wing", fullX: 66, fullY: 80, halfX: 84, halfY: 82 },
      { number: 9, role: "ST", label: "Central Forward", fullX: 70, fullY: 50, halfX: 88, halfY: 50 },
      { number: 11, role: "LW", label: "Left Wing", fullX: 66, fullY: 20, halfX: 84, halfY: 18 },
    ],
  },
  "4-4-2-low-block": {
    name: "4-4-2 Compact Low Block",
    isDefensive: true,
    slots: [
      { number: 1, role: "GK", label: "Goalkeeper", fullX: 92, fullY: 50, halfX: 92, halfY: 50 },
      { number: 2, role: "LB", label: "Def. Left Back", fullX: 80, fullY: 80, halfX: 80, halfY: 80 },
      { number: 4, role: "CB", label: "Def. Left CB", fullX: 82, fullY: 60, halfX: 82, halfY: 60 },
      { number: 5, role: "CB", label: "Def. Right CB", fullX: 82, fullY: 40, halfX: 82, halfY: 40 },
      { number: 3, role: "RB", label: "Def. Right Back", fullX: 80, fullY: 20, halfX: 80, halfY: 20 },
      { number: 7, role: "LM", label: "Def. Left Mid", fullX: 70, fullY: 76, halfX: 70, halfY: 76 },
      { number: 8, role: "CM", label: "Def. Left CM", fullX: 72, fullY: 56, halfX: 72, halfY: 56 },
      { number: 6, role: "CM", label: "Def. Right CM", fullX: 72, fullY: 44, halfX: 72, halfY: 44 },
      { number: 11, role: "RM", label: "Def. Right Mid", fullX: 70, fullY: 24, halfX: 70, halfY: 24 },
      { number: 9, role: "ST", label: "Block Presser 1", fullX: 60, fullY: 55, halfX: 60, halfY: 55 },
      { number: 10, role: "ST", label: "Block Presser 2", fullX: 60, fullY: 45, halfX: 60, halfY: 45 },
    ],
  },
  "5-3-2-mid-block": {
    name: "5-3-2 Mid Block",
    isDefensive: true,
    slots: [
      { number: 1, role: "GK", label: "Goalkeeper", fullX: 92, fullY: 50, halfX: 92, halfY: 50 },
      { number: 2, role: "LWB", label: "Def. Left WB", fullX: 76, fullY: 85, halfX: 76, halfY: 85 },
      { number: 4, role: "LCB", label: "Def. Left CB", fullX: 80, fullY: 68, halfX: 80, halfY: 68 },
      { number: 5, role: "CCB", label: "Def. Central CB", fullX: 81, fullY: 50, halfX: 81, halfY: 50 },
      { number: 6, role: "RCB", label: "Def. Right CB", fullX: 80, fullY: 32, halfX: 80, halfY: 32 },
      { number: 3, role: "RWB", label: "Def. Right WB", fullX: 76, fullY: 15, halfX: 76, halfY: 15 },
      { number: 8, role: "CM", label: "Def. Left CM", fullX: 68, fullY: 65, halfX: 68, halfY: 65 },
      { number: 10, role: "CM", label: "Def. Central Mid", fullX: 67, fullY: 50, halfX: 67, halfY: 50 },
      { number: 7, role: "CM", label: "Def. Right CM", fullX: 68, fullY: 35, halfX: 68, halfY: 35 },
      { number: 9, role: "ST", label: "Front Presser 1", fullX: 56, fullY: 58, halfX: 56, halfY: 58 },
      { number: 11, role: "ST", label: "Front Presser 2", fullX: 56, fullY: 42, halfX: 56, halfY: 42 },
    ],
  },
  "high-press": {
    name: "4-3-3 High Press",
    isDefensive: true,
    slots: [
      { number: 1, role: "GK", label: "Goalkeeper", fullX: 88, fullY: 50, halfX: 88, halfY: 50 },
      { number: 2, role: "LB", label: "Def. LB", fullX: 68, fullY: 82, halfX: 68, halfY: 82 },
      { number: 4, role: "CB", label: "Def. LCB", fullX: 65, fullY: 62, halfX: 65, halfY: 62 },
      { number: 5, role: "CB", label: "Def. RCB", fullX: 65, fullY: 38, halfX: 65, halfY: 38 },
      { number: 3, role: "RB", label: "Def. RB", fullX: 68, fullY: 18, halfX: 68, halfY: 18 },
      { number: 6, role: "DM", label: "Def. Pivot", fullX: 55, fullY: 50, halfX: 55, halfY: 50 },
      { number: 8, role: "CM", label: "Pressing Mid 1", fullX: 46, fullY: 65, halfX: 46, halfY: 65 },
      { number: 10, role: "CM", label: "Pressing Mid 2", fullX: 46, fullY: 35, halfX: 46, halfY: 35 },
      { number: 11, role: "LW", label: "Pressing Wing Left", fullX: 38, fullY: 76, halfX: 38, halfY: 76 },
      { number: 9, role: "ST", label: "Lead Presser ST", fullX: 34, fullY: 50, halfX: 34, halfY: 50 },
      { number: 7, role: "RW", label: "Pressing Wing Right", fullX: 38, fullY: 24, halfX: 38, halfY: 24 },
    ],
  },
};

/**
 * Snaps existing players of a team to a given tactical formation shape,
 * preserving player IDs, numbers, and custom names while updating positions.
 */
export function snapToFormation(
  players: PlayerNode[],
  formationKey: SoccerFormation,
  targetTeam: PlayerTeam = "home",
  pitchType: PitchType = "full",
): PlayerNode[] {
  const formation = SOCCER_FORMATIONS[formationKey];
  if (!formation) return players;

  const isHalfPitch = pitchType === "attacking_half";
  const isTarget = (p: PlayerNode) =>
    p.team === targetTeam ||
    (targetTeam === "home" && p.team === "gk_home") ||
    (targetTeam === "away" && p.team === "gk_away");

  let targetIndex = 0;
  return players.map((player) => {
    if (!isTarget(player)) return player;

    const slot = formation.slots[targetIndex] || formation.slots[formation.slots.length - 1];
    targetIndex++;

    const xCoord = isHalfPitch && slot.halfX !== undefined ? slot.halfX : slot.fullX;
    const yCoord = isHalfPitch && slot.halfY !== undefined ? slot.halfY : slot.fullY;

    // For away team on a full pitch, flip X if formation is standard home
    const isAway = targetTeam === "away" || player.team === "away" || player.team === "gk_away";
    const finalX = !isHalfPitch && isAway && !formation.isDefensive ? 100 - xCoord : xCoord;
    const finalY = !isHalfPitch && isAway && !formation.isDefensive ? 100 - yCoord : yCoord;

    return {
      ...player,
      role: player.role || slot.role,
      position: { x: finalX, y: finalY },
      targetPosition: undefined,
    };
  });
}

/**
 * Generates an instant soccer training format with proper numbers and placements
 */
export function generateSoccerFormat(
  format: SoccerFormat,
  pitchType: PitchType = "full",
): {
  players: PlayerNode[];
  title: string;
  gridDimensions: string;
} {
  const isHalf = pitchType === "attacking_half";

  switch (format) {
    case "11v11": {
      const home11 = SOCCER_FORMATIONS["4-3-3"].slots.map((s) => ({
        id: `h_${s.number}`,
        team: (s.role === "GK" ? "gk_home" : "home") as PlayerTeam,
        number: s.number,
        role: s.role,
        label: s.label,
        position: { x: s.fullX, y: s.fullY },
      }));
      const away11 = SOCCER_FORMATIONS["4-4-2-low-block"].slots.map((s) => ({
        id: `a_${s.number}`,
        team: (s.role === "GK" ? "gk_away" : "away") as PlayerTeam,
        number: s.number,
        role: s.role,
        label: s.label,
        position: { x: s.fullX, y: s.fullY },
      }));
      return {
        players: [...home11, ...away11],
        title: "11v11 Full Pitch Match Application",
        gridDimensions: "105m × 68m Full Pitch",
      };
    }

    case "10v8": {
      // Attacking team (Home) 10 players vs Defending team (Away) 8 players
      const homeSlots = SOCCER_FORMATIONS["4-3-3"].slots.slice(1); // 10 outfield attackers
      const awaySlots = SOCCER_FORMATIONS["4-4-2-low-block"].slots.slice(0, 8); // GK + Back 4 + 3 Mids

      const homePlayers: PlayerNode[] = homeSlots.map((s) => ({
        id: `h_${s.number}`,
        team: "home",
        number: s.number,
        role: s.role,
        label: s.label,
        position: { x: isHalf ? (s.halfX ?? s.fullX) : s.fullX, y: isHalf ? (s.halfY ?? s.fullY) : s.fullY },
      }));

      const awayPlayers: PlayerNode[] = awaySlots.map((s) => ({
        id: `a_${s.number}`,
        team: (s.role === "GK" ? "gk_away" : "away") as PlayerTeam,
        number: s.number,
        role: s.role,
        label: s.label,
        position: { x: isHalf ? (s.halfX ?? s.fullX) : s.fullX, y: isHalf ? (s.halfY ?? s.fullY) : s.fullY },
      }));

      return {
        players: [...homePlayers, ...awayPlayers],
        title: "10v8 Attack vs Compact Defense Overload",
        gridDimensions: isHalf ? "Attacking Final Third (60m × 68m)" : "Full Pitch",
      };
    }

    case "9v9": {
      // 9v9 (GK + 8 outfield each)
      const home9 = SOCCER_FORMATIONS["4-3-3"].slots.slice(0, 9).map((s) => ({
        id: `h_${s.number}`,
        team: (s.role === "GK" ? "gk_home" : "home") as PlayerTeam,
        number: s.number,
        role: s.role,
        label: s.label,
        position: { x: s.fullX, y: s.fullY },
      }));
      const away9 = SOCCER_FORMATIONS["4-4-2-low-block"].slots.slice(0, 9).map((s) => ({
        id: `a_${s.number}`,
        team: (s.role === "GK" ? "gk_away" : "away") as PlayerTeam,
        number: s.number,
        role: s.role,
        label: s.label,
        position: { x: s.fullX, y: s.fullY },
      }));
      return {
        players: [...home9, ...away9],
        title: "9v9 Small-Sided Tactical Game",
        gridDimensions: "Penalty Box to Penalty Box (75m × 55m)",
      };
    }

    case "7v7": {
      // 7v7 (GK + 2-3-1 shape)
      const home7: PlayerNode[] = [
        { id: "h_1", team: "gk_home", number: 1, role: "GK", label: "GK", position: { x: 12, y: 50 } },
        { id: "h_2", team: "home", number: 4, role: "CB", label: "Right CB", position: { x: 28, y: 65 } },
        { id: "h_3", team: "home", number: 5, role: "CB", label: "Left CB", position: { x: 28, y: 35 } },
        { id: "h_4", team: "home", number: 6, role: "CM", label: "Center Mid", position: { x: 42, y: 50 } },
        { id: "h_5", team: "home", number: 7, role: "RW", label: "Right Wing", position: { x: 50, y: 75 } },
        { id: "h_6", team: "home", number: 11, role: "LW", label: "Left Wing", position: { x: 50, y: 25 } },
        { id: "h_7", team: "home", number: 9, role: "ST", label: "Forward", position: { x: 62, y: 50 } },
      ];
      const away7: PlayerNode[] = [
        { id: "a_1", team: "gk_away", number: 1, role: "GK", label: "GK", position: { x: 88, y: 50 } },
        { id: "a_2", team: "away", number: 4, role: "CB", label: "Def. CB", position: { x: 72, y: 35 } },
        { id: "a_3", team: "away", number: 5, role: "CB", label: "Def. CB", position: { x: 72, y: 65 } },
        { id: "a_4", team: "away", number: 6, role: "CM", label: "Def. CM", position: { x: 58, y: 50 } },
        { id: "a_5", team: "away", number: 7, role: "RW", label: "Def. Wing", position: { x: 50, y: 25 } },
        { id: "a_6", team: "away", number: 11, role: "LW", label: "Def. Wing", position: { x: 50, y: 75 } },
        { id: "a_7", team: "away", number: 9, role: "ST", label: "Def. ST", position: { x: 38, y: 50 } },
      ];
      return {
        players: [...home7, ...away7],
        title: "7v7 Developmental Match Format",
        gridDimensions: "60m × 40m Field",
      };
    }

    case "4v4+3": {
      // 4v4 + 3 Neutrals Rondo
      const home4: PlayerNode[] = [
        { id: "h_1", team: "home", number: 4, role: "POS", label: "Possession 1", position: { x: 32, y: 25 } },
        { id: "h_2", team: "home", number: 6, role: "POS", label: "Possession 2", position: { x: 68, y: 25 } },
        { id: "h_3", team: "home", number: 8, role: "POS", label: "Possession 3", position: { x: 68, y: 75 } },
        { id: "h_4", team: "home", number: 10, role: "POS", label: "Possession 4", position: { x: 32, y: 75 } },
      ];
      const away4: PlayerNode[] = [
        { id: "a_1", team: "away", number: 2, role: "PRS", label: "Presser 1", position: { x: 42, y: 40 } },
        { id: "a_2", team: "away", number: 5, role: "PRS", label: "Presser 2", position: { x: 58, y: 40 } },
        { id: "a_3", team: "away", number: 7, role: "PRS", label: "Presser 3", position: { x: 58, y: 60 } },
        { id: "a_4", team: "away", number: 9, role: "PRS", label: "Presser 4", position: { x: 42, y: 60 } },
      ];
      const neutrals3: PlayerNode[] = [
        { id: "neu_1", team: "neutral", number: "N1", role: "WALL", label: "Left Wall Neutral", position: { x: 18, y: 50 } },
        { id: "neu_2", team: "neutral", number: "N2", role: "PIVOT", label: "Central Pivot Neutral", position: { x: 50, y: 50 } },
        { id: "neu_3", team: "neutral", number: "N3", role: "WALL", label: "Right Wall Neutral", position: { x: 82, y: 50 } },
      ];
      return {
        players: [...home4, ...away4, ...neutrals3],
        title: "4v4 + 3 Neutrals Positional Rondo",
        gridDimensions: "30m × 30m Grid",
      };
    }

    case "3v2": {
      // 3 Attackers vs 2 Defenders + GK
      const home3: PlayerNode[] = [
        { id: "h_1", team: "home", number: 8, role: "CM", label: "Ball Carrier", position: { x: isHalf ? 60 : 42, y: 50 } },
        { id: "h_2", team: "home", number: 7, role: "RW", label: "Right Runner", position: { x: isHalf ? 68 : 50, y: 78 } },
        { id: "h_3", team: "home", number: 11, role: "LW", label: "Left Runner", position: { x: isHalf ? 68 : 50, y: 22 } },
      ];
      const away3: PlayerNode[] = [
        { id: "a_1", team: "gk_away", number: 1, role: "GK", label: "GK", position: { x: isHalf ? 94 : 90, y: 50 } },
        { id: "a_2", team: "away", number: 4, role: "CB", label: "First Defender", position: { x: isHalf ? 76 : 68, y: 56 } },
        { id: "a_3", team: "away", number: 5, role: "CB", label: "Cover Defender", position: { x: isHalf ? 76 : 68, y: 44 } },
      ];
      return {
        players: [...home3, ...away3],
        title: "3v2 Counter-Attack & Overload Finishing",
        gridDimensions: "Final Third to Goal (40m × 50m)",
      };
    }

    case "2v1": {
      // 2 Attackers vs 1 Defender + GK
      const home2: PlayerNode[] = [
        { id: "h_1", team: "home", number: 9, role: "ST", label: "Lead Striker", position: { x: isHalf ? 65 : 55, y: 44 } },
        { id: "h_2", team: "home", number: 10, role: "AM", label: "Support Runner", position: { x: isHalf ? 62 : 52, y: 62 } },
      ];
      const away2: PlayerNode[] = [
        { id: "a_1", team: "gk_away", number: 1, role: "GK", label: "GK", position: { x: isHalf ? 94 : 90, y: 50 } },
        { id: "a_2", team: "away", number: 4, role: "CB", label: "Lone Center Back", position: { x: isHalf ? 76 : 70, y: 50 } },
      ];
      return {
        players: [...home2, ...away2],
        title: "2v1 Breakaway & Commitment Duel",
        gridDimensions: "Penalty Box Entry (30m × 35m)",
      };
    }

    case "1v1": {
      // 1v1 Box Duel vs GK
      const home1: PlayerNode[] = [
        { id: "h_1", team: "home", number: 9, role: "ST", label: "Attacker", position: { x: isHalf ? 65 : 60, y: 50 } },
      ];
      const away2: PlayerNode[] = [
        { id: "a_1", team: "gk_away", number: 1, role: "GK", label: "GK", position: { x: isHalf ? 94 : 90, y: 50 } },
        { id: "a_2", team: "away", number: 4, role: "CB", label: "Defender", position: { x: isHalf ? 76 : 72, y: 50 } },
      ];
      return {
        players: [...home1, ...away2],
        title: "1v1 Isolation & 18-Yard Finishing",
        gridDimensions: "Penalty Box Corridor (20m × 25m)",
      };
    }

    default: // 5v5
      return {
        players: [
          { id: "h_1", team: "gk_home", number: 1, role: "GK", label: "GK", position: { x: 14, y: 50 } },
          { id: "h_2", team: "home", number: 4, role: "FIXO", label: "Defender", position: { x: 30, y: 50 } },
          { id: "h_3", team: "home", number: 7, role: "ALA", label: "Right Wing", position: { x: 45, y: 80 } },
          { id: "h_4", team: "home", number: 11, role: "ALA", label: "Left Wing", position: { x: 45, y: 20 } },
          { id: "h_5", team: "home", number: 9, role: "PIVO", label: "Striker", position: { x: 62, y: 50 } },
          { id: "a_1", team: "gk_away", number: 1, role: "GK", label: "GK", position: { x: 86, y: 50 } },
          { id: "a_2", team: "away", number: 4, role: "FIXO", label: "Opp. Def", position: { x: 70, y: 50 } },
          { id: "a_3", team: "away", number: 7, role: "ALA", label: "Opp. RW", position: { x: 55, y: 20 } },
          { id: "a_4", team: "away", number: 11, role: "ALA", label: "Opp. LW", position: { x: 55, y: 80 } },
          { id: "a_5", team: "away", number: 9, role: "PIVO", label: "Opp. ST", position: { x: 38, y: 50 } },
        ],
        title: "5v5 High-Intensity Small-Sided Game",
        gridDimensions: "40m × 25m Mini Pitch",
      };
  }
}

/**
 * Sequential renumbering of players on a team from 1 to N,
 * with GK always assigned #1.
 */
export function renumberTeam(players: PlayerNode[], targetTeam: PlayerTeam): PlayerNode[] {
  const isTarget = (p: PlayerNode) => p.team === targetTeam || (targetTeam === "home" && p.team === "gk_home") || (targetTeam === "away" && p.team === "gk_away");
  const teamPlayers = players.filter(isTarget);
  const otherPlayers = players.filter((p) => !isTarget(p));

  // Sort GKs first, then by role or previous number
  const gks = teamPlayers.filter((p) => p.team === "gk_home" || p.team === "gk_away" || p.role === "GK");
  const outfield = teamPlayers.filter((p) => !gks.some((gk) => gk.id === p.id));

  let currentNum = 1;
  const renumberedGks = gks.map((gk) => ({ ...gk, number: currentNum++ }));
  const renumberedOutfield = outfield.map((of) => ({ ...of, number: currentNum++ }));

  return [...otherPlayers, ...renumberedGks, ...renumberedOutfield];
}
