/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as academies from "../academies.js";
import type * as academySettings from "../academySettings.js";
import type * as announcements from "../announcements.js";
import type * as assessments from "../assessments.js";
import type * as athletes from "../athletes.js";
import type * as auth from "../auth.js";
import type * as authRateLimit from "../authRateLimit.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as devSeed from "../devSeed.js";
import type * as drills from "../drills.js";
import type * as emails from "../emails.js";
import type * as feeAutomation from "../feeAutomation.js";
import type * as fees from "../fees.js";
import type * as http from "../http.js";
import type * as invites from "../invites.js";
import type * as invoices from "../invoices.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_logger from "../lib/logger.js";
import type * as lib_onboarding from "../lib/onboarding.js";
import type * as lib_rateLimit from "../lib/rateLimit.js";
import type * as lib_sanitize from "../lib/sanitize.js";
import type * as lib_tacticalFingerprint from "../lib/tacticalFingerprint.js";
import type * as lib_tacticalValidation from "../lib/tacticalValidation.js";
import type * as messages from "../messages.js";
import type * as resetAndSeedSuperuser from "../resetAndSeedSuperuser.js";
import type * as schema_academies from "../schema/academies.js";
import type * as schema_academySettings from "../schema/academySettings.js";
import type * as schema_announcements from "../schema/announcements.js";
import type * as schema_assessments from "../schema/assessments.js";
import type * as schema_athletes from "../schema/athletes.js";
import type * as schema_drills from "../schema/drills.js";
import type * as schema_fees from "../schema/fees.js";
import type * as schema_invites from "../schema/invites.js";
import type * as schema_invoices from "../schema/invoices.js";
import type * as schema_loginAttempts from "../schema/loginAttempts.js";
import type * as schema_messages from "../schema/messages.js";
import type * as schema_tacticalCache from "../schema/tacticalCache.js";
import type * as schema_tacticalPlans from "../schema/tacticalPlans.js";
import type * as schema_teams from "../schema/teams.js";
import type * as schema_trainingPlans from "../schema/trainingPlans.js";
import type * as schema_trainingSessions from "../schema/trainingSessions.js";
import type * as schema_videoAnalyses from "../schema/videoAnalyses.js";
import type * as seed from "../seed.js";
import type * as seedAthleteDrillHistory from "../seedAthleteDrillHistory.js";
import type * as seedHercules from "../seedHercules.js";
import type * as seedRealAccounts from "../seedRealAccounts.js";
import type * as tacticalAi from "../tacticalAi.js";
import type * as tacticalPlans from "../tacticalPlans.js";
import type * as teams from "../teams.js";
import type * as trainingPlans from "../trainingPlans.js";
import type * as trainingSessions from "../trainingSessions.js";
import type * as users from "../users.js";
import type * as videoAnalyses from "../videoAnalyses.js";
import type * as videoAnalysis from "../videoAnalysis.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  academies: typeof academies;
  academySettings: typeof academySettings;
  announcements: typeof announcements;
  assessments: typeof assessments;
  athletes: typeof athletes;
  auth: typeof auth;
  authRateLimit: typeof authRateLimit;
  crons: typeof crons;
  dashboard: typeof dashboard;
  devSeed: typeof devSeed;
  drills: typeof drills;
  emails: typeof emails;
  feeAutomation: typeof feeAutomation;
  fees: typeof fees;
  http: typeof http;
  invites: typeof invites;
  invoices: typeof invoices;
  "lib/auth": typeof lib_auth;
  "lib/email": typeof lib_email;
  "lib/logger": typeof lib_logger;
  "lib/onboarding": typeof lib_onboarding;
  "lib/rateLimit": typeof lib_rateLimit;
  "lib/sanitize": typeof lib_sanitize;
  "lib/tacticalFingerprint": typeof lib_tacticalFingerprint;
  "lib/tacticalValidation": typeof lib_tacticalValidation;
  messages: typeof messages;
  resetAndSeedSuperuser: typeof resetAndSeedSuperuser;
  "schema/academies": typeof schema_academies;
  "schema/academySettings": typeof schema_academySettings;
  "schema/announcements": typeof schema_announcements;
  "schema/assessments": typeof schema_assessments;
  "schema/athletes": typeof schema_athletes;
  "schema/drills": typeof schema_drills;
  "schema/fees": typeof schema_fees;
  "schema/invites": typeof schema_invites;
  "schema/invoices": typeof schema_invoices;
  "schema/loginAttempts": typeof schema_loginAttempts;
  "schema/messages": typeof schema_messages;
  "schema/tacticalCache": typeof schema_tacticalCache;
  "schema/tacticalPlans": typeof schema_tacticalPlans;
  "schema/teams": typeof schema_teams;
  "schema/trainingPlans": typeof schema_trainingPlans;
  "schema/trainingSessions": typeof schema_trainingSessions;
  "schema/videoAnalyses": typeof schema_videoAnalyses;
  seed: typeof seed;
  seedAthleteDrillHistory: typeof seedAthleteDrillHistory;
  seedHercules: typeof seedHercules;
  seedRealAccounts: typeof seedRealAccounts;
  tacticalAi: typeof tacticalAi;
  tacticalPlans: typeof tacticalPlans;
  teams: typeof teams;
  trainingPlans: typeof trainingPlans;
  trainingSessions: typeof trainingSessions;
  users: typeof users;
  videoAnalyses: typeof videoAnalyses;
  videoAnalysis: typeof videoAnalysis;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
