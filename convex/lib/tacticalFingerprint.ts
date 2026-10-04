/**
 * CoachTactics — Deterministic, Versioned Tactical Cache Fingerprinting Engine
 * 
 * Implements Rule 10:
 * "drill-cache:v2:<fingerprint>"
 * 
 * Computes deterministic, collision-resistant canonical fingerprints for
 * tactical requests based on canonicalized tactical parameters:
 * - ageGroup
 * - category
 * - difficulty
 * - pitchType
 * - targetAttribute
 * - playerCount
 * - promptNotes (normalized whitespace & case)
 */

export interface TacticalFingerprintInput {
  ageGroup: string;
  category: string;
  difficulty?: string;
  pitchType?: string;
  targetAttribute?: string;
  playerCount?: number;
  promptNotes?: string;
}

/**
 * Normalizes text to canonical form: lowercased, trimmed, collapses multiple spaces
 */
export function canonicalizeText(str: string | undefined): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Deterministic 64-bit hash combining FNV-1a and SDBM algorithms.
 * Fast, pure JavaScript, zero external dependencies, consistent across all runtimes.
 */
export function computeDeterministicHash(input: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h1 ^= input.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }

  let h2 = 0;
  for (let i = 0; i < input.length; i++) {
    h2 = input.charCodeAt(i) + (h2 << 6) + (h2 << 16) - h2;
  }

  const hex1 = (h1 >>> 0).toString(16).padStart(8, "0");
  const hex2 = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${hex1}${hex2}`;
}

/**
 * Builds the canonical request string from structured inputs
 */
export function buildCanonicalTacticalKey(input: TacticalFingerprintInput): string {
  const ageGroup = canonicalizeText(input.ageGroup);
  const category = canonicalizeText(input.category);
  const difficulty = canonicalizeText(input.difficulty || "intermediate");
  const pitchType = canonicalizeText(input.pitchType || "full");
  const targetAttribute = canonicalizeText(input.targetAttribute || "tactical");
  const playerCount = typeof input.playerCount === "number" && input.playerCount > 0
    ? input.playerCount
    : 0;
  const promptNotes = canonicalizeText(input.promptNotes);

  return [
    `cat=${category}`,
    `age=${ageGroup}`,
    `diff=${difficulty}`,
    `pitch=${pitchType}`,
    `attr=${targetAttribute}`,
    `count=${playerCount}`,
    `notes=${promptNotes}`,
  ].join("&");
}

/**
 * Generates the deterministic, versioned cache key: drill-cache:v2:<fingerprint>
 */
export function generateTacticalCacheKey(input: TacticalFingerprintInput): {
  cacheKey: string;
  fingerprint: string;
  canonicalKey: string;
} {
  const canonicalKey = buildCanonicalTacticalKey(input);
  const fingerprint = computeDeterministicHash(canonicalKey);
  const cacheKey = `drill-cache:v2:${fingerprint}`;

  return {
    cacheKey,
    fingerprint,
    canonicalKey,
  };
}
