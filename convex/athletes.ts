import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server.js";
import type { Id } from "./_generated/dataModel.d.ts";
import {
  listOwnAthletes,
  requireAcademyMember,
  requireAthleteAccess,
  requireRole,
  requireUser,
} from "./lib/auth.ts";
import { linkGuardianByEmail } from "./lib/onboarding.ts";
import { athleteGenderValidator } from "./schema.ts";

const athleteFields = {
  firstName: v.string(),
  lastName: v.string(),
  dateOfBirth: v.optional(v.string()),
  gender: v.optional(athleteGenderValidator),
  sport: v.optional(v.string()),
  heightCm: v.optional(v.number()),
  weightKg: v.optional(v.number()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  guardianName: v.optional(v.string()),
  guardianPhone: v.optional(v.string()),
  guardianEmail: v.optional(v.string()),
  notes: v.optional(v.string()),
};

/** Lower-cases emails (links are matched by exact email) and drops blanks. */
function normalizeEmails<T extends { email?: string; guardianEmail?: string }>(
  fields: T,
): T {
  const clean = (e?: string) => e?.trim().toLowerCase() || undefined;
  return {
    ...fields,
    email: clean(fields.email),
    guardianEmail: clean(fields.guardianEmail),
  };
}

/** Academy admin/coach: create a new athlete record in their academy. */
export const createAthlete = mutation({
  args: athleteFields,
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    if (!user.academyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not part of an academy",
      });
    }
    if (!args.firstName.trim() || !args.lastName.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "First and last name are required",
      });
    }
    const athleteId = await ctx.db.insert("athletes", {
      ...normalizeEmails(args),
      academyId: user.academyId,
      status: "active",
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });
    await linkGuardianByEmail(ctx, athleteId);
    return athleteId;
  },
});

/** Academy admin/coach: update an existing athlete record. */
export const updateAthlete = mutation({
  args: { athleteId: v.id("athletes"), ...athleteFields },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const { athleteId, ...updates } = args;
    const athlete = await ctx.db.get("athletes", athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }
    await requireAcademyMember(ctx, athlete.academyId);
    if (!updates.firstName.trim() || !updates.lastName.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "First and last name are required",
      });
    }
    const normalized = normalizeEmails(updates);
    const guardianChanged = normalized.guardianEmail !== athlete.guardianEmail;
    await ctx.db.patch("athletes", athleteId, {
      ...normalized,
      ...(guardianChanged ? { guardianUserId: undefined } : {}),
    });
    if (guardianChanged) {
      await linkGuardianByEmail(ctx, athleteId);
    }
    return null;
  },
});

/** Academy admin/coach: set an athlete's active/inactive status. */
export const setAthleteStatus = mutation({
  args: {
    athleteId: v.id("athletes"),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }
    await requireAcademyMember(ctx, athlete.academyId);
    await ctx.db.patch("athletes", args.athleteId, { status: args.status });
    return null;
  },
});

/** Lists athletes in the current user's academy. Staff see everyone; athletes see only themselves; guardians see their children. */
export const listAthletes = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.academyId) {
      return [];
    }
    const all = await ctx.db
      .query("athletes")
      .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
      .order("desc")
      .collect();

    const visible =
      user.role === "athlete"
        ? all.filter((a) => a.userId === user._id)
        : user.role === "guardian"
          ? all.filter((a) => a.guardianUserId === user._id)
          : user.role
            ? all
            : [];

    const search = args.search?.trim().toLowerCase();
    if (!search) {
      return visible;
    }
    return visible.filter((a) =>
      `${a.firstName} ${a.lastName}`.toLowerCase().includes(search),
    );
  },
});

/** Academy admin/coach: bulk-import athletes from a parsed CSV. */
export const bulkImportAthletes = mutation({
  args: {
    athletes: v.array(
      v.object({
        firstName: v.string(),
        lastName: v.string(),
        dateOfBirth: v.optional(v.string()),
        sport: v.optional(v.string()),
        gender: v.optional(athleteGenderValidator),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    if (!user.academyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not part of an academy",
      });
    }

    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const a of args.athletes) {
      try {
        if (!a.firstName.trim() || !a.lastName.trim()) {
          skipped++;
          errors.push(`Skipped row: first_name and last_name are required`);
          continue;
        }
        await ctx.db.insert("athletes", {
          ...normalizeEmails(a),
          academyId: user.academyId,
          status: "active",
          createdBy: user._id,
          createdAt: new Date().toISOString(),
        });
        added++;
      } catch (err) {
        skipped++;
        errors.push(
          `Failed to import ${a.firstName} ${a.lastName}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    return { added, skipped, errors };
  },
});

/** Get the athlete record linked to the current logged-in user. */
export const getAthleteByUserId = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("athletes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

/** Athlete records belonging to the caller: their own, or their children for guardians. */
export const listMyAthletes = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await listOwnAthletes(ctx, user);
  },
});

/** Fetches a single athlete's detail record, if the caller may see it. */
export const getAthlete = query({
  args: { athleteId: v.id("athletes") },
  handler: async (ctx, args) => {
    const { athlete } = await requireAthleteAccess(ctx, args.athleteId);
    return athlete;
  },
});

/** Academy admin/coach: manually link an athlete record to a registered user account by email. */
export const linkAthleteToUser = mutation({
  args: {
    athleteId: v.id("athletes"),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }
    await requireAcademyMember(ctx, athlete.academyId);

    const email = args.email.trim().toLowerCase();
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "No registered user found with that email address",
      });
    }

    if (user.emailVerificationTime === undefined) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "That user has not verified their email address yet",
      });
    }

    if (user.academyId && user.academyId !== athlete.academyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "User belongs to a different academy",
      });
    }

    if (!user.academyId) {
      await ctx.db.patch("users", user._id, {
        academyId: athlete.academyId,
        role: "athlete",
      });
    }

    await ctx.db.patch("athletes", args.athleteId, {
      userId: user._id,
      email,
    });

    return null;
  },
});

/** Academy admin/coach: unlink an athlete from their registered user account. */
export const unlinkAthleteUser = mutation({
  args: {
    athleteId: v.id("athletes"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Athlete not found",
      });
    }
    await requireAcademyMember(ctx, athlete.academyId);

    await ctx.db.patch("athletes", args.athleteId, {
      userId: undefined,
    });

    return null;
  },
});

const PIN_LENGTH = 4;

/** Random PIN not used by any other athlete in the academy. */
async function generateUniquePin(
  ctx: MutationCtx,
  academyId: Id<"academies">,
): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const [n] = crypto.getRandomValues(new Uint32Array(1));
    const pin = String(n % 10 ** PIN_LENGTH).padStart(PIN_LENGTH, "0");
    const taken = await ctx.db
      .query("athletes")
      .withIndex("by_academy_and_pin", (q) =>
        q.eq("academyId", academyId).eq("checkInPin", pin),
      )
      .first();
    if (!taken) return pin;
  }
  throw new ConvexError({
    code: "CONFLICT",
    message: "Could not find a free PIN, please try again",
  });
}

/** Academy admin/coach: give an athlete a new random kiosk check-in PIN. */
export const regenerateCheckInPin = mutation({
  args: { athleteId: v.id("athletes") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Athlete not found" });
    }
    await requireAcademyMember(ctx, athlete.academyId);
    const checkInPin = await generateUniquePin(ctx, athlete.academyId);
    await ctx.db.patch("athletes", athlete._id, { checkInPin });
    return checkInPin;
  },
});

/** Academy admin/coach: give every active athlete without a PIN one. Returns how many were assigned. */
export const generateMissingCheckInPins = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    if (!user.academyId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You are not part of an academy",
      });
    }
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_academy_and_status", (q) =>
        q.eq("academyId", user.academyId!).eq("status", "active"),
      )
      .collect();
    let assigned = 0;
    for (const athlete of athletes) {
      if (athlete.checkInPin) continue;
      const checkInPin = await generateUniquePin(ctx, user.academyId);
      await ctx.db.patch("athletes", athlete._id, { checkInPin });
      assigned++;
    }
    return assigned;
  },
});

/**
 * Real summary of the caller's own athletes (themselves, or their children
 * for guardians): teams, next session, attendance and assessments.
 */
export const listMyAthletesOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const athletes = await listOwnAthletes(ctx, user);
    const now = new Date().toISOString();

    return await Promise.all(
      athletes.map(async (athlete) => {
        const memberships = await ctx.db
          .query("teamMembers")
          .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
          .collect();
        const teams = (
          await Promise.all(memberships.map((m) => ctx.db.get("teams", m.teamId)))
        ).filter((t) => t !== null);

        const upcoming = (
          await Promise.all(
            teams.map((team) =>
              ctx.db
                .query("trainingSessions")
                .withIndex("by_team_and_startsAt", (q) =>
                  q.eq("teamId", team._id).gte("startsAt", now),
                )
                .first(),
            ),
          )
        ).filter((s) => s !== null);
        upcoming.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        const next = upcoming[0];

        const records = await ctx.db
          .query("attendanceRecords")
          .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
          .collect();
        const attended = records.filter(
          (r) => r.status === "present" || r.status === "late",
        ).length;

        const assessments = await ctx.db
          .query("assessments")
          .withIndex("by_athlete", (q) => q.eq("athleteId", athlete._id))
          .collect();

        return {
          athlete,
          teams: teams.map((t) => ({ _id: t._id, name: t.name })),
          nextSession: next
            ? {
                title: next.title,
                startsAt: next.startsAt,
                teamName: teams.find((t) => t._id === next.teamId)?.name,
              }
            : null,
          recordedSessions: records.length,
          attendanceRate:
            records.length > 0
              ? Math.round((attended / records.length) * 100)
              : null,
          metricsTracked: new Set(assessments.map((a) => a.metric)).size,
        };
      }),
    );
  },
});
