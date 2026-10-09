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
  "Vertical Jump (cm)": { benchmark: 65, unit: "cm", lowerBetter: false },
  "Broad Jump (m)": { benchmark: 2.8, unit: "m", lowerBetter: false },
  "1RM Back Squat (kg)": { benchmark: 140, unit: "kg", lowerBetter: false },
  "1RM Bench Press (kg)": { benchmark: 100, unit: "kg", lowerBetter: false },
  "Pro Agility 5-10-5 (s)": { benchmark: 4.25, unit: "s", lowerBetter: true },
  "Agility T-Test (s)": { benchmark: 9.8, unit: "s", lowerBetter: true },
  "Yo-Yo Test Level": { benchmark: 19.5, unit: "lvl", lowerBetter: false },
  "Endurance 1.5 Mile (min)": { benchmark: 9.5, unit: "min", lowerBetter: true },
};

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
    const name = g.metric.toLowerCase();

    if (name.includes("sprint") || name.includes("dash") || name.includes("100m")) {
      attributes.Speed.athleteScores.push(pb.scorePct);
    } else if (name.includes("jump") || name.includes("power") || name.includes("watt")) {
      attributes.Power.athleteScores.push(pb.scorePct);
    } else if (name.includes("agility") || name.includes("shuttle") || name.includes("t-test")) {
      attributes.Agility.athleteScores.push(pb.scorePct);
    } else if (name.includes("squat") || name.includes("bench") || name.includes("1rm") || name.includes("deadlift")) {
      attributes.Strength.athleteScores.push(pb.scorePct);
    } else if (name.includes("yo-yo") || name.includes("mile") || name.includes("endurance") || name.includes("run")) {
      attributes.Endurance.athleteScores.push(pb.scorePct);
    } else {
      attributes.Mobility.athleteScores.push(pb.scorePct);
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
