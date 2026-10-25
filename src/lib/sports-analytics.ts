import { BUILTIN_DRILL_BENCHMARKS } from "../data/soccer-drills";

export interface AssessmentPoint {
  _id: string;
  assessedOn: string;
  value: number;
  notes?: string;
}

export interface MetricGroup {
  metric: string;
  unit?: string;
  points: AssessmentPoint[];
}

export interface PersonalBest {
  metric: string;
  value: number;
  unit?: string;
  assessedOn: string;
  benchmark: number;
  isLowerBetter: boolean;
  scorePct: number; // 0 - 100 score relative to benchmark
}

export interface RadarAttribute {
  attribute: string;
  athleteScore: number;
  academyAvg: number;
  eliteBenchmark: number;
  fullMark: number;
}

export type AthleticRadarPoint = RadarAttribute;

/** Determines whether a lower numeric value represents a better athletic result (e.g. race times). */
export function isLowerBetterMetric(metricName: string): boolean {
  const lower = metricName.toLowerCase();
  return (
    lower.includes("sprint") ||
    lower.includes("time") ||
    lower.includes("dash") ||
    lower.includes("shuttle") ||
    lower.includes("run 40") ||
    lower.includes("100m") ||
    lower.includes("split") ||
    lower.includes("(s)")
  );
}

/** Academy benchmark targets for common assessment metrics */
export const ACADEMY_BENCHMARKS: Record<
  string,
  { benchmark: number; unit: string; lowerBetter: boolean }
> = {
  "Sprint 40m (s)": { benchmark: 4.6, unit: "s", lowerBetter: true },
  "Sprint 100m (s)": { benchmark: 11.2, unit: "s", lowerBetter: true },
  "Flying 30m Laser Velocity Sprint": { benchmark: 4.85, unit: "s", lowerBetter: true },
  "Vertical Jump (cm)": { benchmark: 65, unit: "cm", lowerBetter: false },
  "Countermovement Jump (CMJ) Jump Mat": { benchmark: 56.0, unit: "cm", lowerBetter: false },
  "Broad Jump (m)": { benchmark: 2.8, unit: "m", lowerBetter: false },
  "1RM Back Squat (kg)": { benchmark: 140, unit: "kg", lowerBetter: false },
  "1RM Bench Press (kg)": { benchmark: 100, unit: "kg", lowerBetter: false },
  "Deadlift 1RM (kg)": { benchmark: 140, unit: "kg", lowerBetter: false },
  "Pro Agility 5-10-5 (s)": { benchmark: 4.25, unit: "s", lowerBetter: true },
  "Pro Agility 5-10-5 Shuttle Run": { benchmark: 4.65, unit: "s", lowerBetter: true },
  "Agility T-Test (s)": { benchmark: 9.8, unit: "s", lowerBetter: true },
  "Yo-Yo Test Level": { benchmark: 19.5, unit: "lvl", lowerBetter: false },
  "Yo-Yo Intermittent Recovery Level 1": { benchmark: 55.0, unit: "ml/kg/min", lowerBetter: false },
  "VO2 Max (ml/kg/min)": { benchmark: 52.0, unit: "ml/kg/min", lowerBetter: false },
  "Beep Test (Level)": { benchmark: 12.0, unit: "lvl", lowerBetter: false },
  "Endurance 1.5 Mile (min)": { benchmark: 9.5, unit: "min", lowerBetter: true },
  "Toe-Tap & Foundation Castle": { benchmark: 35, unit: "touches", lowerBetter: false },
  "Sharks & Minnows Dribble Escape": { benchmark: 45, unit: "s", lowerBetter: false },
  "Pirate Treasure Gate Dribbling": { benchmark: 8, unit: "gates", lowerBetter: false },
  "Red Light, Green Light Braking & Acceleration": { benchmark: 1.2, unit: "s", lowerBetter: true },
  "Cruyff Turn & Step-Over 1v1 Escape": { benchmark: 12, unit: "moves", lowerBetter: false },
  "3v1 Triangle Rondo with Scanning": { benchmark: 15, unit: "passes", lowerBetter: false },
  "Cone Slalom Dribble & Laces Strike": { benchmark: 4, unit: "pts", lowerBetter: false },
  "Four-Corner Back-Foot Receiving Box": { benchmark: 22.0, unit: "s", lowerBetter: true },
  "4v2 Transition Breakout Rondo": { benchmark: 20, unit: "passes", lowerBetter: false },
  "Winger Overlap & Box Finishing Waves": { benchmark: 70, unit: "%", lowerBetter: false },
  "Aerial First Touch & Volley Control": { benchmark: 8, unit: "made", lowerBetter: false },
  "Illinois Soccer Agility & Dribble Test": { benchmark: 16.5, unit: "s", lowerBetter: true },
  "5v5+2 Positional Possession with Bumpers": { benchmark: 65, unit: "%", lowerBetter: false },
  "High Pressing & Compact Block Triggers": { benchmark: 5, unit: "turnovers", lowerBetter: false },
  "Midfield Diagonal Switch & Cutback Finish": { benchmark: 6, unit: "goals", lowerBetter: false },
  "Rapid Counter-Press (5-Second Swarm)": { benchmark: 4.2, unit: "s", lowerBetter: true },
  "7v7+3 Juego de Posición (Positional Mastery)": { benchmark: 75, unit: "%", lowerBetter: false },
  "Gegenpress Wave & Rapid Vertical Counter": { benchmark: 6.8, unit: "s", lowerBetter: true },
  "High-Speed Deceleration & COD Biomechanics Course": { benchmark: 4.8, unit: "s", lowerBetter: true },
  "Goalkeeper Distribution & Sweeper-Keeper Action": { benchmark: 80, unit: "%", lowerBetter: false },
};

// Merge soccer drill benchmarks dynamically
for (const entry of Object.values(BUILTIN_DRILL_BENCHMARKS)) {
  if (!ACADEMY_BENCHMARKS[entry.metric]) {
    ACADEMY_BENCHMARKS[entry.metric] = {
      benchmark: entry.benchmark,
      unit: entry.unit,
      lowerBetter: entry.lowerBetter,
    };
  }
}

/**
 * Maps metric names to their athletic competency pillar.
 * Integrates predefined soccer drill benchmarks, custom tests, and athletic keywords.
 */
export function resolveMetricPillar(
  metricName: string,
): "Speed" | "Power" | "Agility" | "Strength" | "Endurance" | "Mobility" {
  const name = metricName.toLowerCase().trim();

  // 1. Direct Playbook & Drill Benchmark Lookup
  const drillLookup: Record<string, "Speed" | "Power" | "Agility" | "Strength" | "Endurance" | "Mobility"> = {
    // Speed
    "sprint 40m (s)": "Speed",
    "sprint 100m (s)": "Speed",
    "flying 30m laser velocity sprint": "Speed",
    "rapid counter-press (5-second swarm)": "Speed",
    "gegenpress wave & rapid vertical counter": "Speed",
    "gegenpress vertical transition (s)": "Speed",
    "5-second counter-press recovery (s)": "Speed",

    // Power
    "cone slalom dribble & laces strike": "Power",
    "slalom & strike precision (pts / 5)": "Power",
    "midfield diagonal switch & cutback finish": "Power",
    "switch & cutback conversion (goals / 10)": "Power",
    "countermovement jump (cmj) jump mat": "Power",
    "vertical jump (cm)": "Power",
    "broad jump (m)": "Power",
    "winger overlap & box finishing waves": "Power",
    "cross delivery accuracy (%)": "Power",

    // Agility
    "illinois soccer agility & dribble test": "Agility",
    "illinois soccer agility test": "Agility",
    "high-speed deceleration & cod biomechanics course": "Agility",
    "change of direction decel (s)": "Agility",
    "pro agility 5-10-5 shuttle run": "Agility",
    "pro agility 5-10-5 (s)": "Agility",
    "agility t-test (s)": "Agility",
    "sharks & minnows dribble escape": "Agility",
    "evasion agility (survival sec)": "Agility",
    "red light, green light braking & acceleration": "Agility",
    "stop-go reaction (s)": "Agility",

    // Strength
    "deadlift 1rm (kg)": "Strength",
    "1rm back squat (kg)": "Strength",
    "1rm bench press (kg)": "Strength",
    "high pressing & compact block triggers": "Strength",
    "pressing turnover rate (turnovers / 5m)": "Strength",

    // Endurance
    "yo-yo intermittent recovery level 1": "Endurance",
    "yo-yo test level": "Endurance",
    "vo2 max (ml/kg/min)": "Endurance",
    "beep test (level)": "Endurance",
    "endurance 1.5 mile (min)": "Endurance",
    "7v7+3 juego de posición (positional mastery)": "Endurance",
    "7v7 positional third entry (%)": "Endurance",
    "5v5+2 positional possession with bumpers": "Endurance",
    "5v5 possession retention (%)": "Endurance",
    "4v2 transition breakout rondo": "Endurance",
    "4v2 rondo pass streak": "Endurance",

    // Mobility / Coordination
    "toe-tap & foundation castle": "Mobility",
    "toe-tap speed (touches / 30s)": "Mobility",
    "pirate treasure gate dribbling": "Mobility",
    "gate dribbles (gates / 60s)": "Mobility",
    "cruyff turn & step-over 1v1 escape": "Mobility",
    "1v1 move execution (moves / min)": "Mobility",
    "four-corner back-foot receiving box": "Mobility",
    "back-foot receive speed (s)": "Mobility",
    "aerial first touch & volley control": "Mobility",
    "aerial first touch box (made / 10)": "Mobility",
    "goalkeeper distribution & sweeper-keeper action": "Mobility",
    "gk sweeper distribution accuracy (%)": "Mobility",
    "3v1 triangle rondo with scanning": "Mobility",
    "3v1 rondo pass streak": "Mobility",
  };

  if (drillLookup[name]) {
    return drillLookup[name];
  }

  // 2. Exact match in BUILTIN_DRILL_BENCHMARKS
  for (const entry of Object.values(BUILTIN_DRILL_BENCHMARKS)) {
    if (entry.metric.toLowerCase() === name) {
      if (entry.attr === "Technical" || entry.attr === "Tactical") {
        return "Mobility";
      }
      return entry.attr;
    }
  }

  // 3. Heuristic keyword fallbacks
  if (
    name.includes("sprint") ||
    name.includes("dash") ||
    name.includes("100m") ||
    name.includes("speed") ||
    name.includes("laser") ||
    name.includes("velocity") ||
    name.includes("counter-press")
  ) {
    return "Speed";
  }
  if (
    name.includes("jump") ||
    name.includes("power") ||
    name.includes("watt") ||
    name.includes("strike") ||
    name.includes("finish") ||
    name.includes("shot")
  ) {
    return "Power";
  }
  if (
    name.includes("agility") ||
    name.includes("shuttle") ||
    name.includes("t-test") ||
    name.includes("decel") ||
    name.includes("evasion") ||
    name.includes("reaction") ||
    name.includes("turn")
  ) {
    return "Agility";
  }
  if (
    name.includes("squat") ||
    name.includes("bench") ||
    name.includes("1rm") ||
    name.includes("deadlift") ||
    name.includes("press") ||
    name.includes("strength") ||
    name.includes("weight")
  ) {
    return "Strength";
  }
  if (
    name.includes("yo-yo") ||
    name.includes("mile") ||
    name.includes("endurance") ||
    name.includes("run") ||
    name.includes("vo2") ||
    name.includes("beep") ||
    name.includes("possession") ||
    name.includes("stamina")
  ) {
    return "Endurance";
  }
  return "Mobility";
}

/** Computes the personal best (PB) record for a given assessment group. */
export function computePersonalBest(group: MetricGroup): PersonalBest | null {
  if (!group.points || group.points.length === 0) return null;

  const lowerBetter = isLowerBetterMetric(group.metric);
  const sorted = [...group.points].sort((a, b) => {
    return lowerBetter ? a.value - b.value : b.value - a.value;
  });

  const best = sorted[0];
  const knownBenchmark = ACADEMY_BENCHMARKS[group.metric];
  const targetBenchmark = knownBenchmark ? knownBenchmark.benchmark : best.value;

  // Calculate score pct relative to benchmark (100 = matched benchmark)
  let scorePct = 100;
  if (targetBenchmark > 0) {
    if (lowerBetter) {
      scorePct = Math.round((targetBenchmark / best.value) * 100);
    } else {
      scorePct = Math.round((best.value / targetBenchmark) * 100);
    }
  }

  return {
    metric: group.metric,
    value: best.value,
    unit: group.unit || knownBenchmark?.unit,
    assessedOn: best.assessedOn,
    benchmark: targetBenchmark,
    isLowerBetter: lowerBetter,
    scorePct: Math.min(120, Math.max(30, scorePct)),
  };
}

/** Computes percentage change and direction between two assessment data points. */
export function computeTrend(points: AssessmentPoint[], lowerBetter = false) {
  if (!points || points.length < 2) return null;

  const prev = points[points.length - 2].value;
  const curr = points[points.length - 1].value;
  const diff = curr - prev;

  if (Math.abs(diff) < 0.001) {
    return { diff: 0, pct: "0.0", isPositiveImprovement: false, isNoChange: true };
  }

  const pct = Math.abs((diff / prev) * 100).toFixed(1);
  // For race times, a negative diff (faster time) is an improvement
  const isPositiveImprovement = lowerBetter ? diff < 0 : diff > 0;

  return {
    diff,
    pct,
    isPositiveImprovement,
    isNoChange: false,
  };
}

/**
 * Athletic radar profile across up to 6 pillars. Only pillars with at least
 * one recorded assessment are returned; scores are never invented.
 */
export function generateAthleticRadarProfile(
  groups: MetricGroup[],
  customAverages?: Record<string, number>,
): RadarAttribute[] {
  // Base athletic competencies with configurable/computed academy averages
  const attributes: Record<
    string,
    { athleteScores: number[]; avg: number; elite: number }
  > = {
    Speed: { athleteScores: [], avg: customAverages?.Speed ?? 72, elite: 92 },
    Power: { athleteScores: [], avg: customAverages?.Power ?? 68, elite: 90 },
    Agility: { athleteScores: [], avg: customAverages?.Agility ?? 70, elite: 88 },
    Strength: { athleteScores: [], avg: customAverages?.Strength ?? 65, elite: 86 },
    Endurance: { athleteScores: [], avg: customAverages?.Endurance ?? 75, elite: 94 },
    Mobility: { athleteScores: [], avg: customAverages?.Mobility ?? 78, elite: 90 },
  };

  for (const g of groups) {
    const pb = computePersonalBest(g);
    if (!pb) continue;

    const pillar = resolveMetricPillar(g.metric);
    if (attributes[pillar]) {
      attributes[pillar].athleteScores.push(pb.scorePct);
    }
  }

  const measured = Object.entries(attributes).filter(
    ([, data]) => data.athleteScores.length > 0,
  );
  return measured.map(([attribute, data]) => {
    const athleteScore = Math.round(
      data.athleteScores.reduce((a, b) => a + b, 0) / data.athleteScores.length,
    );

    return {
      attribute,
      athleteScore: Math.min(100, Math.max(40, athleteScore)),
      academyAvg: data.avg,
      eliteBenchmark: data.elite,
      fullMark: 100,
    };
  });
}
