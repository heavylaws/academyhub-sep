import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Tracks login attempts per email for rate limiting.
 * Records are periodically cleaned up by the daily cron.
 */
export const loginAttempts = defineTable({
  email: v.string(),
  attemptedAt: v.string(),
  success: v.boolean(),
})
  .index("by_email", ["email"])
  .index("by_email_and_time", ["email", "attemptedAt"]);

