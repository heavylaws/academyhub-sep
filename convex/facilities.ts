import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import type { MutationCtx, QueryCtx } from "./_generated/server.js";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import {
  requireAcademyMember,
  requireRole,
  requireUser,
} from "./lib/auth.ts";
import {
  sanitizeOptionalString,
  sanitizeOptionalText,
  sanitizeString,
} from "./lib/sanitize.ts";
import {
  facilityTypeValidator,
  facilityStatusValidator,
} from "./schema.ts";

/** Roles permitted to create, update, or manage facility configurations. */
const FACILITY_ADMIN_ROLES = [
  "platform_admin",
  "academy_admin",
  "sporting_director",
] as const;

/** Shared helper for checking facility availability and preventing overlapping bookings. */
export async function assertFacilityAvailable(
  ctx: MutationCtx | QueryCtx,
  args: {
    academyId: Id<"academies">;
    facilityId?: Id<"facilities">;
    startsAt: string;
    durationMinutes: number;
    excludeSessionId?: Id<"trainingSessions">;
  },
) {
  if (!args.facilityId) return;

  const facility = await ctx.db.get("facilities", args.facilityId);
  if (!facility || facility.academyId !== args.academyId) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Facility not found in your academy",
    });
  }

  if (facility.status === "maintenance") {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `Facility conflict: ${facility.name} is currently under maintenance and cannot be booked.`,
    });
  }

  if (facility.status === "closed") {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: `Facility conflict: ${facility.name} is currently closed and cannot be booked.`,
    });
  }

  const targetStart = new Date(args.startsAt).getTime();
  const targetEnd = targetStart + args.durationMinutes * 60 * 1000;

  if (isNaN(targetStart) || args.durationMinutes <= 0) {
    throw new ConvexError({
      code: "BAD_REQUEST",
      message: "Invalid session start time or duration",
    });
  }

  const bookedSessions = await ctx.db
    .query("trainingSessions")
    .withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId))
    .collect();

  for (const s of bookedSessions) {
    if (s.deletedAt) continue;
    if (args.excludeSessionId && s._id === args.excludeSessionId) continue;

    const sStart = new Date(s.startsAt).getTime();
    const sEnd = sStart + s.durationMinutes * 60 * 1000;

    // Overlap interval check: startA < endB && endA > startB
    if (targetStart < sEnd && targetEnd > sStart) {
      throw new ConvexError({
        code: "CONFLICT",
        message: `Facility conflict: ${facility.name} is already booked by another session during this time window.`,
      });
    }
  }
}

/** Lists all facilities for the user's academy. Accessible to all academy roles. */
export const listFacilities = query({
  args: {
    academyId: v.optional(v.id("academies")),
    status: v.optional(facilityStatusValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const targetAcademyId =
      user.role === "platform_admin" && args.academyId
        ? args.academyId
        : user.academyId;

    if (!targetAcademyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not associated with an academy",
      });
    }
    await requireAcademyMember(ctx, targetAcademyId);

    let facilitiesQuery = ctx.db
      .query("facilities")
      .withIndex("by_academy", (q) => q.eq("academyId", targetAcademyId));

    if (args.status) {
      facilitiesQuery = ctx.db
        .query("facilities")
        .withIndex("by_academy_and_status", (q) =>
          q.eq("academyId", targetAcademyId).eq("status", args.status!),
        );
    }

    const list = await facilitiesQuery.collect();
    return list.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Creates a new pitch, court, gym, or facility. */
export const createFacility = mutation({
  args: {
    academyId: v.optional(v.id("academies")),
    name: v.string(),
    type: facilityTypeValidator,
    surfaceType: v.optional(v.string()),
    capacity: v.optional(v.number()),
    status: facilityStatusValidator,
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, [...FACILITY_ADMIN_ROLES]);
    const targetAcademyId =
      user.role === "platform_admin" && args.academyId
        ? args.academyId
        : user.academyId;

    if (!targetAcademyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not associated with an academy",
      });
    }
    await requireAcademyMember(ctx, targetAcademyId);

    const cleanName = sanitizeString(args.name, 100, "Facility name");
    if (!cleanName) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Facility name is required",
      });
    }

    if (args.capacity !== undefined && args.capacity < 0) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Capacity cannot be negative",
      });
    }

    const now = Date.now();
    return await ctx.db.insert("facilities", {
      academyId: targetAcademyId,
      name: cleanName,
      type: args.type,
      surfaceType: sanitizeOptionalString(args.surfaceType, 80, "Surface type"),
      capacity: args.capacity,
      status: args.status,
      notes: sanitizeOptionalText(args.notes, 2000, "Notes"),
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Updates facility details, status, or capacity. */
export const updateFacility = mutation({
  args: {
    facilityId: v.id("facilities"),
    name: v.optional(v.string()),
    type: v.optional(facilityTypeValidator),
    surfaceType: v.optional(v.string()),
    capacity: v.optional(v.number()),
    status: v.optional(facilityStatusValidator),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, [...FACILITY_ADMIN_ROLES]);
    const facility = await ctx.db.get("facilities", args.facilityId);
    if (!facility) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Facility not found",
      });
    }
    await requireAcademyMember(ctx, facility.academyId);

    const updates: Partial<Doc<"facilities">> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      const cleanName = sanitizeString(args.name, 100, "Facility name");
      if (!cleanName) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Facility name cannot be empty",
        });
      }
      updates.name = cleanName;
    }

    if (args.type !== undefined) {
      updates.type = args.type;
    }

    if (args.surfaceType !== undefined) {
      updates.surfaceType = sanitizeOptionalString(
        args.surfaceType,
        80,
        "Surface type",
      );
    }

    if (args.capacity !== undefined) {
      if (args.capacity < 0) {
        throw new ConvexError({
          code: "BAD_REQUEST",
          message: "Capacity cannot be negative",
        });
      }
      updates.capacity = args.capacity;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    if (args.notes !== undefined) {
      updates.notes = sanitizeOptionalText(args.notes, 2000, "Notes");
    }

    await ctx.db.patch("facilities", args.facilityId, updates);
    return null;
  },
});

/** Query to verify facility availability for a given time window. */
export const checkFacilityAvailability = query({
  args: {
    facilityId: v.id("facilities"),
    startsAt: v.string(),
    durationMinutes: v.number(),
    excludeSessionId: v.optional(v.id("trainingSessions")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const facility = await ctx.db.get("facilities", args.facilityId);
    if (!facility) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Facility not found",
      });
    }
    await requireAcademyMember(ctx, facility.academyId);

    if (facility.status === "maintenance") {
      return {
        available: false,
        reason: `Facility '${facility.name}' is currently under maintenance.`,
        conflictingSessions: [],
      };
    }

    if (facility.status === "closed") {
      return {
        available: false,
        reason: `Facility '${facility.name}' is currently closed.`,
        conflictingSessions: [],
      };
    }

    const targetStart = new Date(args.startsAt).getTime();
    const targetEnd = targetStart + args.durationMinutes * 60 * 1000;

    const bookedSessions = await ctx.db
      .query("trainingSessions")
      .withIndex("by_facility", (q) => q.eq("facilityId", args.facilityId))
      .collect();

    const conflictingSessions: Array<{
      _id: Id<"trainingSessions">;
      title: string;
      startsAt: string;
      durationMinutes: number;
    }> = [];

    for (const s of bookedSessions) {
      if (s.deletedAt) continue;
      if (args.excludeSessionId && s._id === args.excludeSessionId) continue;

      const sStart = new Date(s.startsAt).getTime();
      const sEnd = sStart + s.durationMinutes * 60 * 1000;

      if (targetStart < sEnd && targetEnd > sStart) {
        conflictingSessions.push({
          _id: s._id,
          title: s.title,
          startsAt: s.startsAt,
          durationMinutes: s.durationMinutes,
        });
      }
    }

    return {
      available: conflictingSessions.length === 0,
      reason:
        conflictingSessions.length > 0
          ? `Facility '${facility.name}' is booked by ${conflictingSessions.length} other session(s) in this time range.`
          : undefined,
      conflictingSessions,
    };
  },
});
