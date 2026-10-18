/**
 * Generates a unique, deterministic or UUID-based idempotency key for financial mutations.
 * Prevents double-submission on slow network connections or rapid double clicks.
 */
export function generateIdempotencyKey(prefix: "pay" | "inv" | "fee"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
