import { mutation } from "./_generated/server.js";
import { ConvexError, v } from "convex/values";
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

export const createSingleAcademyAdmin = mutation({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const scrypt = new Scrypt();
    const academy = await ctx.db
      .query("academies")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!academy) {
      return { success: false, error: `Academy with slug ${args.slug} not found` };
    }

    const academyConfigs: Record<
      string,
      {
        shortcut: string;
        username: string;
        password: string;
        aliases: string[];
      }
    > = {
      acad_0qbqv4w: {
        shortcut: "hajali",
        username: "AdminHajAli",
        password: "hajali2026!",
        aliases: [
          "adminhajali@academieshub.com",
          "admin.hajali@academieshub.com",
          "adminhajali@gmail.com",
          "admin.hajali@gmail.com",
          "adminhajali@academy.com",
          "admin@hajali.com",
          "adminhaj@gmail.com",
          "adminhajali",
        ],
      },
      acad_0xecsfc: {
        shortcut: "alhakkani",
        username: "AdminALHakkani",
        password: "alhakkani2026!",
        aliases: [
          "adminalhakkani@academieshub.com",
          "admin.alhakkani@academieshub.com",
          "adminhakkani@academieshub.com",
          "adminalhakkani@gmail.com",
          "admin.alhakkani@gmail.com",
          "adminhakkani@gmail.com",
          "admin@alhakkani.com",
          "adminalhakkani@academy.com",
          "adminalhakkani",
          "adminhakkani",
        ],
      },
      sportzona: {
        shortcut: "sportzona",
        username: "AdminSportZona",
        password: "sportzona2026!",
        aliases: [
          "adminsportzona@academieshub.com",
          "admin.sportzona@academieshub.com",
          "adminsportzona@gmail.com",
          "admin.sportzona@gmail.com",
          "admin@sportzona.com",
          "adminsportzona@academy.com",
          "adminsportzona",
        ],
      },
      "al-hakkani": {
        shortcut: "alhakkani2",
        username: "AdminALHakkani2",
        password: "alhakkani2026!",
        aliases: [
          "adminalhakkani2@academieshub.com",
          "admin.alhakkani2@academieshub.com",
          "adminalhakkani2@gmail.com",
          "admin.alhakkani2@gmail.com",
          "adminhakkani2@gmail.com",
          "admin@hakkani.com",
          "adminalhakkani2",
          "adminhakkani2",
        ],
      },
      eliteacademy: {
        shortcut: "eliteacademy",
        username: "AdminEliteAcademy",
        password: "eliteacademy2026!",
        aliases: [
          "admineliteacademy@academieshub.com",
          "admin.eliteacademy@academieshub.com",
          "adminelite@academieshub.com",
          "admineliteacademy@gmail.com",
          "adminelite@gmail.com",
          "admin@eliteacademy.com",
          "admineliteacademy@academy.com",
          "admineliteacademy",
          "adminelite",
        ],
      },
      "hercules-sports": {
        shortcut: "hercules",
        username: "AdminHercules",
        password: "hercules2026!",
        aliases: [
          "adminhercules@academieshub.com",
          "admin.hercules@academieshub.com",
          "adminhercules@gmail.com",
          "admin.hercules@gmail.com",
          "admin@hercules.com",
          "adminhercules@academy.com",
          "adminhercules",
        ],
      },
      "cedars-athletics": {
        shortcut: "cedars",
        username: "AdminCedars",
        password: "cedars2026!",
        aliases: [
          "admincedars@academieshub.com",
          "admin.cedars@academieshub.com",
          "admincedars@gmail.com",
          "admin.cedars@gmail.com",
          "admin@cedars.com",
          "admincedars@academy.com",
          "admincedars",
        ],
      },
    };

    const config = academyConfigs[academy.slug] || {
      shortcut: academy.slug.replace(/[^a-zA-Z0-9]/g, "").toLowerCase(),
      username: `Admin${academy.name.replace(/[^a-zA-Z0-9]/g, "")}`,
      password: `${academy.slug.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()}2026!`,
      aliases: [],
    };

    const primaryEmail = `${config.username.toLowerCase()}@academieshub.com`;
    const secret = await scrypt.hash(config.password);

    // 1. Find or create User document
    let user = await ctx.db
      .query("users")
      .withIndex("by_academy", (q) => q.eq("academyId", academy._id))
      .filter((q) => q.eq(q.field("role"), "academy_admin"))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        name: `${config.username} (${academy.name})`,
        email: primaryEmail,
        role: "academy_admin",
        academyId: academy._id,
        emailVerificationTime: Date.now(),
      });
      user = (await ctx.db.get(userId))!;
    } else {
      await ctx.db.patch(user._id, {
        name: `${config.username} (${academy.name})`,
        role: "academy_admin",
        academyId: academy._id,
        emailVerificationTime: user.emailVerificationTime ?? Date.now(),
      });
    }

    // 2. Provision authAccounts
    const allIdentifiers = Array.from(
      new Set([
        config.username.toLowerCase(),
        primaryEmail.toLowerCase(),
        ...(config.aliases || []).map((a) => a.toLowerCase()),
      ]),
    );

    for (const identifier of allIdentifiers) {
      const existingAuth = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", identifier),
        )
        .first();

      if (existingAuth) {
        await ctx.db.patch(existingAuth._id, {
          secret,
          userId: user._id,
          emailVerified: identifier,
        });
      } else {
        await ctx.db.insert("authAccounts", {
          userId: user._id,
          provider: "password",
          providerAccountId: identifier,
          secret,
          emailVerified: identifier,
        });
      }
    }

    return {
      success: true,
      academyName: academy.name,
      academySlug: academy.slug,
      username: config.username,
      lowercaseUsername: config.username.toLowerCase(),
      password: config.password,
      loginIdentifiers: allIdentifiers,
    };
  },
});

export const createCustomAcademyAdmin = mutation({
  args: {
    academySlug: v.string(),
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const scrypt = new Scrypt();
    const academy = await ctx.db
      .query("academies")
      .withIndex("by_slug", (q) => q.eq("slug", args.academySlug))
      .first();

    if (!academy) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: `Academy ${args.academySlug} not found`,
      });
    }

    const rawEmail = args.email.trim();
    const normalizedEmail = rawEmail.toLowerCase();
    const secret = await scrypt.hash(args.password);

    // 1. Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", normalizedEmail))
      .first();

    if (!user) {
      const userId = await ctx.db.insert("users", {
        name: args.name,
        email: normalizedEmail,
        role: "academy_admin",
        academyId: academy._id,
        emailVerificationTime: Date.now(),
      });
      user = (await ctx.db.get(userId))!;
    } else {
      await ctx.db.patch(user._id, {
        name: args.name,
        role: "academy_admin",
        academyId: academy._id,
        emailVerificationTime: user.emailVerificationTime ?? Date.now(),
      });
    }

    // 2. AuthAccount for all case variations
    const identifiers = Array.from(new Set([normalizedEmail, rawEmail]));
    for (const identifier of identifiers) {
      const existingAuth = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", identifier),
        )
        .first();

      if (existingAuth) {
        await ctx.db.patch(existingAuth._id, {
          secret,
          userId: user._id,
          emailVerified: identifier,
        });
      } else {
        await ctx.db.insert("authAccounts", {
          userId: user._id,
          provider: "password",
          providerAccountId: identifier,
          secret,
          emailVerified: identifier,
        });
      }
    }

    return {
      success: true,
      name: args.name,
      email: normalizedEmail,
      identifiers,
      role: "academy_admin",
      academyName: academy.name,
      academyId: academy._id,
    };
  },
});




