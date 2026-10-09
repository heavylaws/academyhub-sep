import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireRole, requireUser } from "./lib/auth.ts";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Platform admin: create a new academy workspace. */
export const createAcademy = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["platform_admin"]);
    const baseSlug = slugify(args.name);
    if (!baseSlug) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Invalid academy name",
      });
    }
    let slug = baseSlug;
    let suffix = 1;
    while (
      await ctx.db
        .query("academies")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique()
    ) {
      slug = `${baseSlug}-${suffix++}`;
    }
    const academyId = await ctx.db.insert("academies", {
      name: args.name,
      slug,
      status: "active",
      createdBy: admin._id,
      createdAt: new Date().toISOString(),
    });
    // Give a platform admin without a working academy one to operate in.
    if (admin.role === "platform_admin" && !admin.academyId) {
      await ctx.db.patch("users", admin._id, { academyId });
    }
    return academyId;
  },
});

/**
 * Platform admin: choose which academy the academy-scoped pages (athletes,
 * teams, schedule, finance, ...) operate on.
 */
export const setActiveAcademy = mutation({
  args: { academyId: v.id("academies") },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["platform_admin"]);
    const academy = await ctx.db.get("academies", args.academyId);
    if (!academy) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Academy not found" });
    }
    await ctx.db.patch("users", admin._id, { academyId: args.academyId });
    return null;
  },
});

/** Platform admin: list every academy on the platform. */
export const listAcademies = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["platform_admin"]);
    return await ctx.db.query("academies").order("desc").collect();
  },
});

import { paginationOptsValidator } from "convex/server";

/** Platform admin: paginated list of academies for scalable browsing. */
export const listAcademiesPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["platform_admin"]);
    return await ctx.db.query("academies").order("desc").paginate(args.paginationOpts);
  },
});

/**
 * Platform admin: every academy with head counts (athletes, managers, coaches,
 * accounting staff, guardians), for the platform-wide overview.
 */
export const platformOverview = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["platform_admin"]);
    const academies = await ctx.db.query("academies").order("desc").collect();
    return await Promise.all(
      academies.map(async (academy) => {
        const athletes = await ctx.db
          .query("athletes")
          .withIndex("by_academy", (q) => q.eq("academyId", academy._id))
          .collect();
        const members = await ctx.db
          .query("users")
          .withIndex("by_academy", (q) => q.eq("academyId", academy._id))
          .collect();
        const count = (role: string) =>
          members.filter((m) => m.role === role).length;
        return {
          ...academy,
          activeAthletes: athletes.filter((a) => a.status === "active").length,
          totalAthletes: athletes.length,
          managers: count("academy_admin"),
          coaches: count("coach"),
          accounting: count("accounting"),
          guardians: count("guardian"),
        };
      }),
    );
  },
});

/** Platform admin: toggle an academy's active/suspended status. */
export const setAcademyStatus = mutation({
  args: {
    academyId: v.id("academies"),
    status: v.union(v.literal("active"), v.literal("suspended")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["platform_admin"]);
    await ctx.db.patch("academies", args.academyId, { status: args.status });
    return null;
  },
});

/** Platform admin: permanently delete an academy and all its data. */
export const deleteAcademy = mutation({
  args: { academyId: v.id("academies") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["platform_admin"]);
    const { academyId } = args;

    // Delete all athletes in the academy
    const athletes = await ctx.db
      .query("athletes")
      .withIndex("by_academy_and_status", (q) => q.eq("academyId", academyId))
      .collect();
    for (const athlete of athletes) {
      await ctx.db.delete("athletes", athlete._id);
    }

    // Delete teams and their sessions, attendance, memberships
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    for (const team of teams) {
      const members = await ctx.db
        .query("teamMembers")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      for (const m of members) await ctx.db.delete("teamMembers", m._id);

      const sessions = await ctx.db
        .query("trainingSessions")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      for (const s of sessions) {
        const records = await ctx.db
          .query("attendanceRecords")
          .withIndex("by_session", (q) => q.eq("sessionId", s._id))
          .collect();
        for (const r of records)
          await ctx.db.delete("attendanceRecords", r._id);
        await ctx.db.delete("trainingSessions", s._id);
      }
      await ctx.db.delete("teams", team._id);
    }

    // Delete training plans and their plan items
    const plans = await ctx.db
      .query("trainingPlans")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    for (const plan of plans) {
      const items = await ctx.db
        .query("planItems")
        .withIndex("by_plan", (q) => q.eq("planId", plan._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete("planItems", item._id);
      }
      await ctx.db.delete("trainingPlans", plan._id);
    }

    // Delete assessments
    const assessmentList = await ctx.db
      .query("assessments")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    for (const a of assessmentList) {
      await ctx.db.delete("assessments", a._id);
    }

    // Delete video analyses and their stored video files
    const videoList = await ctx.db
      .query("videoAnalyses")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    for (const v of videoList) {
      if (v.storageId) {
        try {
          await ctx.storage.delete(v.storageId);
        } catch {
          // Ignore missing storage files
        }
      }
      await ctx.db.delete("videoAnalyses", v._id);
    }

    // Delete athlete fees and fee payments
    const payments = await ctx.db
      .query("feePayments")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    for (const p of payments) {
      await ctx.db.delete("feePayments", p._id);
    }

    const fees = await ctx.db
      .query("athleteFees")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    for (const f of fees) {
      await ctx.db.delete("athleteFees", f._id);
    }

    // Delete invoices
    const invoiceList = await ctx.db
      .query("invoices")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    for (const inv of invoiceList) {
      await ctx.db.delete("invoices", inv._id);
    }

    // Delete pending invites
    const invites = await ctx.db
      .query("invites")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    for (const inv of invites) await ctx.db.delete("invites", inv._id);

    // Remove academy reference from staff users
    const staffUsers = await ctx.db
      .query("users")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    for (const u of staffUsers) {
      await ctx.db.patch("users", u._id, {
        academyId: undefined,
        // Platform admins only lose their active academy, never their role.
        ...(u.role === "platform_admin" ? {} : { role: undefined }),
      });
    }

    // Delete the academy itself
    await ctx.db.delete("academies", academyId);
    return null;
  },
});

/** Returns the current user's own academy (any authenticated academy member). */
export const getMyAcademy = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (!user.academyId) {
      return null;
    }
    return await ctx.db.get("academies", user.academyId);
  },
});
