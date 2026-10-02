import { mutation } from "./_generated/server.js";
import { Scrypt } from "lucia";

const TABLES_TO_CLEAR = [
  "announcementReads",
  "announcements",
  "assessments",
  "athleteFees",
  "athletes",
  "attendanceRecords",
  "conversations",
  "drills",
  "feePayments",
  "feeSchedules",
  "invites",
  "invoices",
  "messages",
  "planItems",
  "teamMembers",
  "teams",
  "trainingPlans",
  "trainingSessions",
  "videoAnalyses",
  "academies",
  "authSessions",
  "authVerificationCodes",
  "authVerifiers",
  "authRateLimits",
  "authRefreshTokens",
  "authAccounts",
  "users",
] as const;

export const resetAndCreateSuperuser = mutation({
  args: {},
  handler: async (ctx) => {
    const deletedCounts: Record<string, number> = {};

    // 1. Wipe all existing records from all application and auth tables
    for (const table of TABLES_TO_CLEAR) {
      const records = await ctx.db.query(table as any).collect();
      for (const record of records) {
        await ctx.db.delete(record._id);
      }
      deletedCounts[table] = records.length;
    }

    // 2. Hash password with Lucia's Scrypt
    const scrypt = new Scrypt();
    const secret = await scrypt.hash("A!t3r3g0");

    // 3. Create single superuser account in users
    const email = "ah.baalbaki@gmail.com";
    const name = "heavylaws";
    const now = Date.now();

    const userId = await ctx.db.insert("users", {
      name,
      email,
      role: "platform_admin",
      emailVerificationTime: now,
    });

    // 4. Create auth account credentials for email + password sign-in
    const accountId = await ctx.db.insert("authAccounts", {
      userId,
      provider: "password",
      providerAccountId: email,
      secret,
      emailVerified: email,
    });

    return {
      status: "database_reset_and_superuser_created",
      deletedCounts,
      superuser: {
        userId,
        accountId,
        name,
        email,
        role: "platform_admin",
        passwordConfigured: true,
      },
    };
  },
});
