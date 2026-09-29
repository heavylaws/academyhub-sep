/**
 * CoachTactics — Playbook Domain Model & Versioning Engine
 * 
 * Provides domain models for drill versioning, revision history,
 * playbook custom tagging, thematic collections, and tactical sheet exports.
 */

import type { SoccerDrill } from "@/data/soccer-drills.ts";
import type { TacticalPlan } from "./tactical-domain.ts";

export interface DrillVersion {
  versionNumber: string; // e.g. "1.0", "1.1", "2.0"
  createdAt: string;
  authorName: string;
  changeSummary: string;
  drillSnapshot: Partial<SoccerDrill>;
  tacticalPlanSnapshot?: TacticalPlan;
}

export interface PlaybookTag {
  id: string;
  name: string;
  color: string; // Hex color code
}

export interface PlaybookCollection {
  id: string;
  academyId?: string;
  title: string;
  description: string;
  tagColor?: string;
  drillIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PLAYBOOK_TAGS: PlaybookTag[] = [
  { id: "tag_press_resist", name: "Press Resistance", color: "#3B82F6" },
  { id: "tag_counter_attack", name: "Counter-Attack", color: "#EF4444" },
  { id: "tag_overlapping", name: "Overlapping Runs", color: "#10B981" },
  { id: "tag_matchday_m2", name: "Matchday -2", color: "#F59E0B" },
  { id: "tag_warmup", name: "Tactical Warmup", color: "#8B5CF6" },
  { id: "tag_small_sided", name: "Small-Sided Game", color: "#EC4899" },
  { id: "tag_possession_3v2", name: "Numerical Overload", color: "#06B6D4" },
];

export const DEFAULT_COLLECTIONS: PlaybookCollection[] = [
  {
    id: "col_preseason_buildup",
    title: "Pre-Season Positional Build-Up",
    description: "Core progressions for breaking high pressing blocks from the defensive third.",
    tagColor: "#3B82F6",
    drillIds: ["drill_u13_possession", "drill_u15_tactical_tempo"],
    createdAt: "2026-08-01T10:00:00.000Z",
    updatedAt: "2026-08-15T10:00:00.000Z",
  },
  {
    id: "col_transitional_rondos",
    title: "Dynamic Transition Rondos",
    description: "High-intensity possession drills with instant transition triggers to mini-goals.",
    tagColor: "#10B981",
    drillIds: ["drill_u11_rondo", "drill_u9_rondo_1v1"],
    createdAt: "2026-08-05T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
  },
];

/**
 * Computes next semver version string for a drill
 */
export function incrementDrillVersion(currentVersion: string, bumpType: "major" | "minor" = "minor"): string {
  const parts = currentVersion.split(".").map((n) => parseInt(n, 10) || 0);
  const major = parts[0] || 1;
  const minor = parts[1] || 0;

  if (bumpType === "major") {
    return `${major + 1}.0`;
  }
  return `${major}.${minor + 1}`;
}

/**
 * Creates a new version record when a drill is modified
 */
export function createDrillVersionRecord(
  drill: SoccerDrill,
  changeSummary: string,
  authorName = "Coach",
  bumpType: "major" | "minor" = "minor",
  tacticalPlan?: TacticalPlan,
): DrillVersion {
  const currentVer = drill.version || "1.0";
  const newVer = incrementDrillVersion(currentVer, bumpType);

  return {
    versionNumber: newVer,
    createdAt: new Date().toISOString(),
    authorName,
    changeSummary: changeSummary.trim() || "Routine tactical adjustment",
    drillSnapshot: { ...drill, version: newVer },
    tacticalPlanSnapshot: tacticalPlan ? JSON.parse(JSON.stringify(tacticalPlan)) : undefined,
  };
}

/**
 * Clones and duplicates an existing drill as a new revision template
 */
export function duplicateDrillAsRevision(
  drill: SoccerDrill,
  newTitlePrefix = "Revision:",
  authorName = "Coach",
): SoccerDrill {
  const newId = `drill_custom_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  return {
    ...drill,
    id: newId,
    title: `${newTitlePrefix} ${drill.title}`,
    isCustom: true,
    version: "1.0",
    createdByName: authorName,
    tags: [...(drill.tags || []), "Custom Revision"],
  };
}
