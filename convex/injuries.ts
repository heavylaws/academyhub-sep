import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import {
  hasPermission,
  requireAthleteAccess,
  requireGranularPermission,
  requireRole,
  resolveTargetAcademyId,
  ACADEMY_STAFF_ROLES,
} from "./lib/permissions.ts";
import {
  sanitizeOptionalString,
  sanitizeOptionalText,
  sanitizeString,
} from "./lib/sanitize.ts";
import {
  availabilityStatusValidator,
  lateralityValidator,
  injuryMechanismValidator,
  injurySeverityValidator,
} from "./schema/injuries.ts";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

/** Log a new medical / injury record for an athlete. Requires edit_medical_records permission. */
export const logInjuryRecord = mutation({
  args: {
    athleteId: v.id("athletes"),
    availabilityStatus: availabilityStatusValidator,
    bodyPart: v.string(),
    laterality: v.optional(lateralityValidator),
    mechanism: injuryMechanismValidator,
    severity: injurySeverityValidator,
    injuryDate: v.number(),
    expectedReturnDate: v.optional(v.number()),
    coachingRestrictions: v.optional(v.string()),
    clinicalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const athlete = await ctx.db.get("athletes", args.athleteId);
    if (!athlete || athlete.deletedAt) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Athlete not found" });
    }

    const user = await requireGranularPermission(
      ctx,
      "edit_medical_records",
      athlete.academyId,
    );

    const cleanBodyPart = sanitizeString(args.bodyPart, 100, "Body part");
    if (!cleanBodyPart) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Body part is required",
      });
    }

    const injuryId = await ctx.db.insert("injuries", {
      academyId: athlete.academyId,
      athleteId: athlete._id,
      availabilityStatus: args.availabilityStatus,
      bodyPart: cleanBodyPart,
      laterality: args.laterality,
      mechanism: args.mechanism,
      severity: args.severity,
      injuryDate: args.injuryDate,
      expectedReturnDate: args.expectedReturnDate,
      actualReturnDate: undefined,
      isResolved: args.availabilityStatus === "fit",
      coachingRestrictions: sanitizeOptionalText(
        args.coachingRestrictions,
        2000,
        "Coaching restrictions",
      ),
      clinicalNotes: sanitizeOptionalText(
        args.clinicalNotes,
        5000,
        "Clinical notes",
      ),
      recordedByUserId: user._id,
      updatedAt: Date.now(),
    });

    return injuryId;
  },
});

/** Update status, RTP dates, or coaching guidance for an existing injury record. */
export const updateInjuryStatus = mutation({
  args: {
    injuryId: v.id("injuries"),
    availabilityStatus: v.optional(availabilityStatusValidator),
    expectedReturnDate: v.optional(v.number()),
    actualReturnDate: v.optional(v.number()),
    isResolved: v.optional(v.boolean()),
    coachingRestrictions: v.optional(v.string()),
    clinicalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const injury = await ctx.db.get("injuries", args.injuryId);
    if (!injury) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Injury record not found" });
    }

    await requireGranularPermission(ctx, "edit_medical_records", injury.academyId);

    const updates: Partial<Doc<"injuries">> = {
      updatedAt: Date.now(),
    };

    if (args.availabilityStatus !== undefined) {
      updates.availabilityStatus = args.availabilityStatus;
      if (args.availabilityStatus === "fit" && args.isResolved === undefined) {
        updates.isResolved = true;
      }
    }

    if (args.isResolved !== undefined) {
      updates.isResolved = args.isResolved;
      if (args.isResolved && args.actualReturnDate === undefined && !injury.actualReturnDate) {
        updates.actualReturnDate = Date.now();
      }
      if (args.isResolved && args.availabilityStatus === undefined && injury.availabilityStatus !== "fit") {
        updates.availabilityStatus = "fit";
      }
    }

    if (args.expectedReturnDate !== undefined) {
      updates.expectedReturnDate = args.expectedReturnDate;
    }
    if (args.actualReturnDate !== undefined) {
      updates.actualReturnDate = args.actualReturnDate;
    }
    if (args.coachingRestrictions !== undefined) {
      updates.coachingRestrictions = sanitizeOptionalText(
        args.coachingRestrictions,
        2000,
        "Coaching restrictions",
      );
    }
    if (args.clinicalNotes !== undefined) {
      updates.clinicalNotes = sanitizeOptionalText(
        args.clinicalNotes,
        5000,
        "Clinical notes",
      );
    }

    await ctx.db.patch("injuries", args.injuryId, updates);
    return null;
  },
});

/**
 * Returns all injury and availability records for an athlete.
 * CRITICAL PRIVACY RULE: Strips clinicalNotes unless caller has view_clinical_medical_notes.
 */
export const getAthleteInjuries = query({
  args: {
    athleteId: v.id("athletes"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAthleteAccess(ctx, args.athleteId);

    const canViewClinical = hasPermission(user.role, "view_clinical_medical_notes");

    const records = await ctx.db
      .query("injuries")
      .withIndex("by_athlete", (q) => q.eq("athleteId", args.athleteId))
      .collect();

    // Sort descending by injuryDate
    records.sort((a, b) => b.injuryDate - a.injuryDate);

    return records.map((rec) => {
      if (canViewClinical) {
        return rec;
      }
      // Strip clinicalNotes for coaching, admin, athlete, and guardian roles
      const { clinicalNotes: _stripped, ...safeRecord } = rec;
      return {
        ...safeRecord,
        clinicalNotes: undefined,
      };
    });
  },
});

/**
 * Academy Medical Room Summary: active unresolved injuries across the academy.
 * Accessible to academy staff. clinicalNotes is projected strictly based on permissions.
 */
export const getAcademyMedicalRoomSummary = query({
  args: {
    academyId: v.optional(v.id("academies")),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ACADEMY_STAFF_ROLES);
    const targetAcademyId = resolveTargetAcademyId(user, args.academyId);

    const canViewClinical = hasPermission(user.role, "view_clinical_medical_notes");

    const activeInjuries = await ctx.db
      .query("injuries")
      .withIndex("by_academy_and_status", (q) =>
        q.eq("academyId", targetAcademyId).eq("isResolved", false),
      )
      .collect();

    // Fetch athlete details for each active injury
    const athleteIds = Array.from(new Set(activeInjuries.map((i) => i.athleteId)));
    const athleteMap = new Map<Id<"athletes">, Doc<"athletes">>();
    await Promise.all(
      athleteIds.map(async (id) => {
        const a = await ctx.db.get("athletes", id);
        if (a) athleteMap.set(id, a);
      }),
    );

    // Fetch team memberships for these athletes
    const teamMemberships = (
      await Promise.all(
        athleteIds.map((id) =>
          ctx.db
            .query("teamMembers")
            .withIndex("by_athlete", (q) => q.eq("athleteId", id))
            .collect(),
        ),
      )
    ).flat();

    const teams = await ctx.db
      .query("teams")
      .withIndex("by_academy", (q) => q.eq("academyId", targetAcademyId))
      .collect();
    const teamMap = new Map(teams.map((t) => [t._id, t.name]));

    const athleteTeamNamesMap = new Map<string, string[]>();
    for (const tm of teamMemberships) {
      const athleteKey = String(tm.athleteId);
      const teamName = teamMap.get(tm.teamId) ?? "Unknown Team";
      const existing = athleteTeamNamesMap.get(athleteKey) ?? [];
      existing.push(teamName);
      athleteTeamNamesMap.set(athleteKey, existing);
    }

    return activeInjuries.map((injury) => {
      const athlete = athleteMap.get(injury.athleteId);
      const teamNames = athleteTeamNamesMap.get(String(injury.athleteId)) ?? [];

      return {
        _id: injury._id,
        academyId: injury.academyId,
        athleteId: injury.athleteId,
        athleteName: `${athlete?.firstName ?? "Unknown"} ${athlete?.lastName ?? "Athlete"}`.trim(),
        athleteFirstName: athlete?.firstName ?? "Unknown",
        athleteLastName: athlete?.lastName ?? "Athlete",
        teams: teamNames,
        availabilityStatus: injury.availabilityStatus,
        bodyPart: injury.bodyPart,
        laterality: injury.laterality,
        mechanism: injury.mechanism,
        severity: injury.severity,
        injuryDate: injury.injuryDate,
        expectedReturnDate: injury.expectedReturnDate,
        isResolved: injury.isResolved,
        coachingRestrictions: injury.coachingRestrictions,
        clinicalNotes: canViewClinical ? injury.clinicalNotes : undefined,
        updatedAt: injury.updatedAt,
      };
    });
  },
});
