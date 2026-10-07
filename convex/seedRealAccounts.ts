import { mutation } from "./_generated/server.js";

const PRECOMPUTED_SECRETS: Record<string, string> = {
  "A!t3r3g0": "32250a8ebc0b352d05503e7b8dd09011:d5584be5cd308fe01893821848abd23c312436956abe6c93e87e0baf191ec238ce4ea964c1aa2f7f09ef098ae2bc9de374d07506f2a0412d5d1e4f6f137c952d",
  "hercules2026!": "b005f3bc3abc89b5231411507d0b048c:e6cdde45c527f60634a6b11791886908932dd06b6e3af8221471132f7d2783e201d85216143f86d8f022f95dd9d270da049b704f748f2aea11dda899725bac0d",
  "Admin-123456": "b1577335f4922cd700f812e28cb45023:b01256e14505291dacd5429c4c6e2e394627032b545fa398542904f87df81938f780e823dfe40aaea73e2f04835b39730fcd947d851b56625928169205178fff",
  "Athlete-123456": "b88df0affa6245ee455c4aa779cea883:6c6e7d8c84b571fd60b84c7873f9b84bdaf243d1194e26d88bab2be6f4269aa3afc267bd59c378f360c6debf8aced023d00e495a27230389dcad7788526695ef",
  "Guardian-123456": "074f7f49493c27b1497936854c10fd6c:edd37c5df0c4c69d215108638df2fa57263876237f7b8df4bb4e1e2b292b05cdd57530ad8d54ccc8332ca87b72a4ac23caa378cc7d99ca4f70ff371e6f67f9a1",
  "Finance-123456": "a0df57f61a8d8def04229343d726a841:50be96f11386c728d7cfac3f33ce33b6b42168d71f80d7ba64e8306277f750e38ed7a25d32c83cfaf8b21d47f72627acee3095f6ece1d1b0db6a03d5c81234ed",
  "hajali2026!": "76ad97be0371220c424c07392bebcd87:5a64a0c84ca4a9ad305ea526ee89dc6cb80688a4362d5b10730a8397e99941e314ac1562b0a186a4e1711ada5239f8c62ceebfe636f9fc9ecfa46c62a77eb913",
  "alhakkani2026!": "98433375f42b3b7d835f2975813e3732:5dfaab8d386a82f8fb54ebd6131e9870787b28db14328c11450f9c467a411f9814657168e6643415c6ae75c635dd917d7dbe982aa9ca5320b4265eada999c111",
  "sportzona2026!": "412ee2ffa1baea89a9ca74d08fff0053:81a90bc775172304c512d5732272a1930c845be73b25756a03503e8210e1865646ba66c6988faacb076e9dc9eb9a182c9e6aea58c03ec1161d9e5c2b7ab35207",
  "eliteacademy2026!": "76546b7c14644f3b4c74ab2b4c486553:c8b49a1d496a7986932db90a4110f19ca35256c1ee6041d8c4beecdeb067c7b16842ea92d295bcc3dd50d852d2f5a3aab4a2a7938a790136a23db32ddd7ab83d",
  "cedars2026!": "e5f3dac565e3a328e9889e98a4391a31:030aaa481360b7def2c6b0f61f67d1aca9959fa879235b053231c668d425e874e209edb929e9a268830ef5ed08340b5a3d2fc2c34b5d630f5029dcb0e04ab2a6",
  "badems2026!": "908e30ae663b16cec0d7e1a0f0ac3b04:1db8fb89a0f164afc7b53af6a080236c1c40078ad9523bdfa8c71e3381ca7cf84ad9f1fe8bd60025f70f1e5f39f7670d1133daabee4521f29c501e1746bf59be",
};

export const seedRealAccounts = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // 1. Locate Hercules Sports Academy
    let hercules = await ctx.db
      .query("academies")
      .withIndex("by_slug", (q) => q.eq("slug", "hercules-sports"))
      .first();

    if (!hercules) {
      const acadId = await ctx.db.insert("academies", {
        name: "Hercules Sports Academy",
        slug: "hercules-sports",
        status: "active",
        createdAt: new Date().toISOString(),
        nextInvoiceNumber: 101,
      });
      hercules = (await ctx.db.get("academies", acadId))!;
    }

    const academyId = hercules._id;

    // 2. Define all accounts to provision on the real Convex DB
    const accountsToSeed = [
      {
        name: "Platform Admin",
        email: "ah.baalbaki@gmail.com",
        password: "A!t3r3g0",
        role: "platform_admin" as const,
        academyId,
      },
      {
        name: "Dave Miller",
        email: "adminhercules@academieshub.com",
        password: "hercules2026!",
        role: "coach" as const,
        academyId,
      },
      {
        name: "Dave Miller",
        email: "dave.miller@test.local",
        password: "hercules2026!",
        role: "coach" as const,
        academyId,
      },
      {
        name: "Alex Thorne",
        email: "alex.admin@test.local",
        password: "Admin-123456",
        role: "academy_admin" as const,
        academyId,
      },
      {
        name: "Marcus Vance",
        email: "marcus.vance@test.local",
        password: "Athlete-123456",
        role: "athlete" as const,
        academyId,
      },
      {
        name: "Sarah Vance",
        email: "sarah.guardian@test.local",
        password: "Guardian-123456",
        role: "guardian" as const,
        academyId,
      },
      {
        name: "Finance Manager",
        email: "finance@test.local",
        password: "Finance-123456",
        role: "accounting" as const,
        academyId,
      },
      {
        name: "Admin Haj Ali",
        email: "adminhajali@academieshub.com",
        password: "hajali2026!",
        role: "academy_admin" as const,
        academyId,
      },
      {
        name: "Admin AL-Hakkani",
        email: "adminalhakkani@academieshub.com",
        password: "alhakkani2026!",
        role: "academy_admin" as const,
        academyId,
      },
      {
        name: "Admin SportZona",
        email: "adminsportzona@academieshub.com",
        password: "sportzona2026!",
        role: "academy_admin" as const,
        academyId,
      },
      {
        name: "Admin Elite Academy",
        email: "admineliteacademy@academieshub.com",
        password: "eliteacademy2026!",
        role: "academy_admin" as const,
        academyId,
      },
      {
        name: "Admin Cedars",
        email: "admincedars@academieshub.com",
        password: "cedars2026!",
        role: "academy_admin" as const,
        academyId,
      },
      {
        name: "Admin BadEMS",
        email: "adminbadems@academieshub.com",
        password: "badems2026!",
        role: "academy_admin" as const,
        academyId,
      },
      {
        name: "c00ldude",
        email: "c00ldude@badems.com",
        password: "badems2026!",
        role: "academy_admin" as const,
        academyId,
      },
    ];

    const results = [];

    for (const acc of accountsToSeed) {
      const email = acc.email.toLowerCase();
      const secret = PRECOMPUTED_SECRETS[acc.password];

      // Upsert User
      let user = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();

      if (!user) {
        const userId = await ctx.db.insert("users", {
          name: acc.name,
          email,
          role: acc.role,
          academyId: acc.academyId,
          emailVerificationTime: now,
        });
        user = (await ctx.db.get("users", userId))!;
      } else {
        await ctx.db.patch("users", user._id, {
          name: acc.name,
          role: acc.role,
          academyId: acc.academyId,
          emailVerificationTime: user.emailVerificationTime ?? now,
        });
      }

      // Upsert AuthAccount (password provider)
      const existingAccount = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", email),
        )
        .first();

      if (existingAccount) {
        await ctx.db.patch("authAccounts", existingAccount._id, {
          secret,
          emailVerified: email,
          userId: user._id,
        });
        results.push({ email, action: "updated", userId: user._id, role: acc.role });
      } else {
        const accountId = await ctx.db.insert("authAccounts", {
          userId: user._id,
          provider: "password",
          providerAccountId: email,
          secret,
          emailVerified: email,
        });
        results.push({ email, action: "created", userId: user._id, accountId, role: acc.role });
      }
    }

    return {
      success: true,
      academy: hercules.name,
      academyId: hercules._id,
      provisionedAccounts: results,
    };
  },
});
