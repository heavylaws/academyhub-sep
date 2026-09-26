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
} from "./schema/trainingSessions.ts";
import {
  trainingPlans,
  planItems,
  planStatusValidator,
} from "./schema/trainingPlans.ts";
import { assessments } from "./schema/assessments.ts";
import { videoAnalyses } from "./schema/videoAnalyses.ts";
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
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_academy", ["academyId"]),

  academies,
  invites,
  athletes,
  teams,
  teamMembers,
  trainingSessions,
  attendanceRecords,
  trainingPlans,
  planItems,
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
};
