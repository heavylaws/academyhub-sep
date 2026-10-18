import { ConvexError, v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server.js";
import {
  assertLoginRateLimit,
  recordLoginAttempt as recordAttempt,
  cleanupOldLoginAttempts as cleanupOldAttempts,
} from "./lib/rateLimit.ts";

export const checkLoginRateLimit = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email || email.length > 255) {
      throw new ConvexError("Invalid email address.");
    }
    await assertLoginRateLimit(ctx, email);
    return { ok: true };
  },
});

export const recordLoginAttempt = mutation({
  args: {
    email: v.string(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email || email.length > 255) {
      return { ok: false };
    }

    // Security guard: Only authenticated sessions can record success: true to clear lockouts.
    // Unauthenticated callers cannot reset failed attempt records.
    if (args.success) {
      const identity = await ctx.auth.getUserIdentity();
      if (!identity) {
        return { ok: false };
      }
    }

    await recordAttempt(ctx, email, args.success);
    return { ok: true };
  },
});

export const cleanupExpiredAttempts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const deletedCount = await cleanupOldAttempts(ctx);
    return { deleted: deletedCount };
  },
});

