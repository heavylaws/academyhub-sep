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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records = await ctx.db.query(table as any).collect();
      for (const record of records) {
        // eslint-disable-next-line @convex-dev/explicit-table-ids
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

export const ensureAdminCredentials = mutation({
  args: {},
  handler: async (ctx) => {
    const scrypt = new Scrypt();
    const secret = await scrypt.hash("A!t3r3g0");
    const emails = ["ah.baalbaki@gmail.com", "ahbaalbaki@gmail.com", "heavylaws@gmail.com"];

    const results = [];
    for (const email of emails) {
      // Find or create user
      let user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();

      if (!user) {
        const userId = await ctx.db.insert("users", {
          name: email.split("@")[0],
          email,
          role: "platform_admin",
          emailVerificationTime: Date.now(),
        });
        user = (await ctx.db.get(userId))!;
      } else {
        await ctx.db.patch(user._id, {
          role: "platform_admin",
          emailVerificationTime: user.emailVerificationTime ?? Date.now(),
        });
      }

      // Find or create auth account
      const existingAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", email),
        )
        .first();

      if (existingAccount) {
        await ctx.db.patch(existingAccount._id, {
          secret,
          emailVerified: email,
          userId: user._id,
        });
        results.push({ email, action: "updated", accountId: existingAccount._id });
      } else {
        const accountId = await ctx.db.insert("authAccounts", {
          userId: user._id,
          provider: "password",
          providerAccountId: email,
          secret,
          emailVerified: email,
        });
        results.push({ email, action: "created", accountId });
      }
    }

    return { success: true, accounts: results };
  },
});

