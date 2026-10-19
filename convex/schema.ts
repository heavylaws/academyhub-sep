import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { academies } from "./schema/academies.ts";
import { invites, userRoleValidator } from "./schema/invites.ts";
import { athletes, athleteGenderValidator } from "./schema/athletes.ts";
import { teams, teamMembers } from "./schema/teams.ts";
import {
  trainingSessions,
  attendanceRecords,
  attendanceStatusValidator,
  sessionTypeValidator,
  microcycleDayValidator,
  matchDetailsValidator,
  matchStatsValidator,
} from "./schema/trainingSessions.ts";
import {
  trainingPlans,
  planItems,
  planStatusValidator,
  periodizationPhaseValidator,
} from "./schema/trainingPlans.ts";
import { assessments } from "./schema/assessments.ts";
import {
  videoAnalyses,
  videoAnalysisStatusValidator,
  structuredTelemetryValidator,
} from "./schema/videoAnalyses.ts";
import { drills } from "./schema/drills.ts";
import { tacticalPlans } from "./schema/tacticalPlans.ts";
import { tacticalCache } from "./schema/tacticalCache.ts";
import {
  athleteFees,
  feePayments,
  feeSchedules,
  feeStatusValidator,
} from "./schema/fees.ts";
import { invoices, invoiceStatusValidator } from "./schema/invoices.ts";
import {
  announcements,
  announcementReads,
  announcementCategoryValidator,
  announcementPriorityValidator,
} from "./schema/announcements.ts";
import {
  conversations,
  messages,
  conversationContextValidator,
} from "./schema/messages.ts";
import { loginAttempts } from "./schema/loginAttempts.ts";
import { academySettings } from "./schema/academySettings.ts";
import {
  guardianLinks,
  guardianRelationshipValidator,
} from "./schema/guardianLinks.ts";
import {
  injuries,
  availabilityStatusValidator,
  lateralityValidator,
  injuryMechanismValidator,
  injurySeverityValidator,
} from "./schema/injuries.ts";
import { workoutLogs } from "./schema/workoutLogs.ts";
import {
  facilities,
  facilityTypeValidator,
  facilityStatusValidator,
} from "./schema/facilities.ts";
import {
  athleteGoals,
  goalCornerValidator,
  goalStatusValidator,
  goalOptimizationDirectionValidator,
} from "./schema/athleteGoals.ts";

export default defineSchema({
  ...authTables,
  // Convex Auth's users table (fields name..isAnonymous and the "email" index
  // are required by the library), extended with app role + academy.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    role: v.optional(userRoleValidator),
    academyId: v.optional(v.id("academies")),
    staffCompliance: v.optional(
      v.object({
        coachingLicenseLevel: v.optional(v.string()),
        licenseExpiryDate: v.optional(v.number()),
        safeguardingVerified: v.boolean(),
        safeguardingExpiryDate: v.optional(v.number()),
        medicalCertification: v.optional(v.string()),
      }),
    ),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_academy", ["academyId"]),

  academies,
  invites,
  athletes,
  guardianLinks,
  teams,
  teamMembers,
  facilities,
  trainingSessions,
  attendanceRecords,
  trainingPlans,
  planItems,
  drills,
  tacticalPlans,
  tacticalCache,
  assessments,
  videoAnalyses,
  athleteFees,
  feePayments,
  feeSchedules,
  invoices,
  announcements,
  announcementReads,
  conversations,
  messages,
  loginAttempts,
  academySettings,
  injuries,
  workoutLogs,
  athleteGoals,
});

export {
  userRoleValidator,
  athleteGenderValidator,
  attendanceStatusValidator,
  planStatusValidator,
  feeStatusValidator,
  invoiceStatusValidator,
  announcementCategoryValidator,
  announcementPriorityValidator,
  guardianRelationshipValidator,
  availabilityStatusValidator,
  lateralityValidator,
  injuryMechanismValidator,
  injurySeverityValidator,
  facilityTypeValidator,
  facilityStatusValidator,
  sessionTypeValidator,
  microcycleDayValidator,
  matchDetailsValidator,
  matchStatsValidator,
  periodizationPhaseValidator,
  goalCornerValidator,
  goalStatusValidator,
  goalOptimizationDirectionValidator,
  videoAnalysisStatusValidator,
  structuredTelemetryValidator,
};
