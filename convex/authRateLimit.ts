import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server.js";
import {
  assertLoginRateLimit,
  recordLoginAttempt as recordAttempt,
  cleanupOldLoginAttempts as cleanupOldAttempts,
} from "./lib/rateLimit.ts";

export const checkLoginRateLimit = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await assertLoginRateLimit(ctx, args.email);
    return { ok: true };
  },
});

export const recordLoginAttempt = mutation({
  args: {
    email: v.string(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    await recordAttempt(ctx, args.email, args.success);
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
