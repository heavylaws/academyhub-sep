import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

/**
 * Checks if the given email is currently rate-limited due to repeated failed login attempts.
 * Throws a ConvexError if rate-limited.
 */
export async function assertLoginRateLimit(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  // Retrieve attempts in the sliding window
  const recentAttempts = await ctx.db
    .query("loginAttempts")
    .withIndex("by_email_and_time", (q) =>
      q.eq("email", normalized).gte("attemptedAt", windowStart),
    )
    .collect();

  const failedAttempts = recentAttempts.filter((a) => !a.success);

  if (failedAttempts.length >= MAX_FAILED_ATTEMPTS) {
    // Find the latest attempt to estimate remaining wait time
    const sorted = [...failedAttempts].sort(
      (a, b) => new Date(b.attemptedAt).getTime() - new Date(a.attemptedAt).getTime(),
    );
    const newestAttempt = sorted[0];
    const lockExpiry = new Date(newestAttempt.attemptedAt).getTime() + WINDOW_MINUTES * 60 * 1000;
    const remainingMs = Math.max(0, lockExpiry - Date.now());
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)));

    throw new ConvexError(
      `Too many failed login attempts. Please try again in ${remainingMinutes} minute${
        remainingMinutes === 1 ? "" : "s"
      }.`,
    );
  }
}

/**
 * Records a login attempt. If successful, clears past failed attempts for this email.
 */
export async function recordLoginAttempt(
  ctx: MutationCtx,
  email: string,
  success: boolean,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const now = new Date().toISOString();

  if (success) {
    // Clear failed attempts upon successful login
    const priorAttempts = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .collect();

    for (const attempt of priorAttempts) {
      await ctx.db.delete(attempt._id);
    }
  } else {
    await ctx.db.insert("loginAttempts", {
      email: normalized,
      attemptedAt: now,
      success: false,
    });
  }
}

/**
 * Cleans up login attempts older than 24 hours.
 */
export async function cleanupOldLoginAttempts(ctx: MutationCtx): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oldAttempts = await ctx.db
    .query("loginAttempts")
    .filter((q) => q.lt(q.field("attemptedAt"), cutoff))
    .take(200);

  for (const attempt of oldAttempts) {
    await ctx.db.delete(attempt._id);
  }
  return oldAttempts.length;
}
