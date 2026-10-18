import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;
const MAX_STORED_ATTEMPTS_PER_WINDOW = 10;

/**
 * Checks if the given email is currently rate-limited due to repeated failed login attempts.
 * Throws a ConvexError if rate-limited.
 */
export async function assertLoginRateLimit(
  ctx: QueryCtx | MutationCtx,
  email: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 255) {
    throw new ConvexError("Invalid email address.");
  }
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  // Retrieve attempts in the sliding window bounded to prevent memory exhaustion
  const recentAttempts = await ctx.db
    .query("loginAttempts")
    .withIndex("by_email_and_time", (q) =>
      q.eq("email", normalized).gte("attemptedAt", windowStart),
    )
    .take(MAX_STORED_ATTEMPTS_PER_WINDOW + 1);

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
 * Checks if invite token redemption or validation is rate-limited against enumeration attacks.
 */
export async function assertInviteRateLimit(
  ctx: QueryCtx | MutationCtx,
  identifier: string,
): Promise<void> {
  const rateLimitKey = `invite:${identifier.trim().toLowerCase()}`;
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const recentAttempts = await ctx.db
    .query("loginAttempts")
    .withIndex("by_email_and_time", (q) =>
      q.eq("email", rateLimitKey).gte("attemptedAt", windowStart),
    )
    .take(15);

  const failedAttempts = recentAttempts.filter((a) => !a.success);
  if (failedAttempts.length >= 10) {
    throw new ConvexError("Too many invite validation attempts. Please try again in 15 minutes.");
  }
}

/**
 * Records an invite redemption or lookup attempt to guard against enumeration.
 */
export async function recordInviteAttempt(
  ctx: MutationCtx,
  identifier: string,
  success: boolean,
): Promise<void> {
  const rateLimitKey = `invite:${identifier.trim().toLowerCase()}`;
  const now = new Date().toISOString();
  if (success) {
    const prior = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", rateLimitKey))
      .take(50);
    for (const a of prior) {
      await ctx.db.delete("loginAttempts", a._id);
    }
  } else {
    // Bound stored failures per identifier
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const existingRecent = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email_and_time", (q) =>
        q.eq("email", rateLimitKey).gte("attemptedAt", windowStart),
      )
      .take(15);

    if (existingRecent.length < 15) {
      await ctx.db.insert("loginAttempts", {
        email: rateLimitKey,
        attemptedAt: now,
        success: false,
      });
    }
  }
}

/**
 * Records a login attempt. If successful, clears past failed attempts for this email.
 * Includes bounding against spam insertions when already locked out.
 */
export async function recordLoginAttempt(
  ctx: MutationCtx,
  email: string,
  success: boolean,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || normalized.length > 255) {
    return;
  }
  const now = new Date().toISOString();

  if (success) {
    // Clear failed attempts upon successful login
    const priorAttempts = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email", (q) => q.eq("email", normalized))
      .take(50);

    for (const attempt of priorAttempts) {
      await ctx.db.delete("loginAttempts", attempt._id);
    }
  } else {
    // Anti-spam bounding: Do not insert infinite records if already locked out
    const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
    const existingRecent = await ctx.db
      .query("loginAttempts")
      .withIndex("by_email_and_time", (q) =>
        q.eq("email", normalized).gte("attemptedAt", windowStart),
      )
      .take(MAX_STORED_ATTEMPTS_PER_WINDOW);

    if (existingRecent.length < MAX_STORED_ATTEMPTS_PER_WINDOW) {
      await ctx.db.insert("loginAttempts", {
        email: normalized,
        attemptedAt: now,
        success: false,
      });
    }
  }
}

/**
 * Cleans up login attempts older than 24 hours.
 */
export async function cleanupOldLoginAttempts(ctx: MutationCtx): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const oldAttempts = await ctx.db
    .query("loginAttempts")
    // eslint-disable-next-line @convex-dev/no-filter-in-query
    .filter((q) => q.lt(q.field("attemptedAt"), cutoff))
    .take(200);

  for (const attempt of oldAttempts) {
    await ctx.db.delete("loginAttempts", attempt._id);
  }
  return oldAttempts.length;
}
