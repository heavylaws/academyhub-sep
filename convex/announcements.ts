import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireAcademyMember, requireRole, requireUser } from "./lib/auth.ts";
import {
  announcementCategoryValidator,
  announcementPriorityValidator,
} from "./schema/announcements.ts";
import { userRoleValidator } from "./schema/invites.ts";

/** List all active announcements visible to the current user in their academy. */
export const listAnnouncements = query({
  args: {
    teamId: v.optional(v.id("teams")),
    category: v.optional(announcementCategoryValidator),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.academyId) {
      return [];
    }

    const all = await ctx.db
      .query("announcements")
      .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
      .order("desc")
      .collect();

    // Fetch user's read receipts
    const reads = await ctx.db
      .query("announcementReads")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const readMap = new Set(reads.map((r) => r.announcementId));

    // Fetch author names
    const authorIds = Array.from(new Set(all.map((a) => a.createdBy)));
    const authors = await Promise.all(authorIds.map((id) => ctx.db.get("users", id)));
    const authorMap = new Map(
      authors.filter(Boolean).map((u) => [u!._id, u!.name ?? u!.email ?? "Staff"]),
    );

    // Filter by team/category if requested
    let filtered = all.filter((a) => {
      if (args.category && a.category !== args.category) return false;
      // If targeted to a specific team, check if matches or user is admin/coach
      if (a.targetTeamId && args.teamId && a.targetTeamId !== args.teamId) {
        if (user.role === "athlete") return false;
      }
      // If targeted to a specific role, check role
      if (
        a.targetRole &&
        a.targetRole !== user.role &&
        user.role !== "academy_admin" &&
        user.role !== "platform_admin"
      ) {
        return false;
      }
      return true;
    });

    // Sort: pinned first, then priority (urgent > important > normal), then createdAt desc
    const priorityWeight = { urgent: 3, important: 2, normal: 1 };

    filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      const pDiff = (priorityWeight[b.priority] ?? 1) - (priorityWeight[a.priority] ?? 1);
      if (pDiff !== 0) return pDiff;
      return b.createdAt.localeCompare(a.createdAt);
    });

    return filtered.map((a) => ({
      ...a,
      isRead: readMap.has(a._id),
      authorName: authorMap.get(a.createdBy) ?? "Staff",
    }));
  },
});

/** Return unread announcement count for current user */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    try {
      const user = await requireUser(ctx);
      if (!user.academyId) return 0;

      const all = await ctx.db
        .query("announcements")
        .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
        .collect();

      const reads = await ctx.db
        .query("announcementReads")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();
      const readMap = new Set(reads.map((r) => r.announcementId));

      return all.filter((a) => !readMap.has(a._id)).length;
    } catch {
      return 0;
    }
  },
});

/** Coach or Admin broadcasts a new announcement */
export const createAnnouncement = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: announcementCategoryValidator,
    priority: announcementPriorityValidator,
    targetTeamId: v.optional(v.id("teams")),
    targetRole: v.optional(userRoleValidator),
    isPinned: v.boolean(),
    expiresAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["academy_admin", "coach"]);
    if (!user.academyId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "User does not belong to an academy",
      });
    }

    if (!args.title.trim()) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "Title is required",
      });
    }

    return await ctx.db.insert("announcements", {
      academyId: user.academyId,
      title: args.title.trim(),
      content: args.content.trim(),
      category: args.category,
      priority: args.priority,
      targetTeamId: args.targetTeamId,
      targetRole: args.targetRole,
      isPinned: args.isPinned,
      expiresAt: args.expiresAt,
      createdBy: user._id,
      createdAt: new Date().toISOString(),
    });
  },
});

/** Mark an announcement as read by the user */
export const markAnnouncementAsRead = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!user.academyId) {
      throw new ConvexError({
        code: "BAD_REQUEST",
        message: "User does not belong to an academy",
      });
    }

    const existing = await ctx.db
      .query("announcementReads")
      .withIndex("by_announcement_and_user", (q) =>
        q.eq("announcementId", args.announcementId).eq("userId", user._id),
      )
      .unique();

    if (!existing) {
      await ctx.db.insert("announcementReads", {
        announcementId: args.announcementId,
        userId: user._id,
        readAt: new Date().toISOString(),
      });
    }

    return null;
  },
});

/** Delete an announcement (Admin or Coach) */
export const deleteAnnouncement = mutation({
  args: {
    announcementId: v.id("announcements"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["academy_admin", "coach"]);
    const announcement = await ctx.db.get("announcements", args.announcementId);
    if (!announcement) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Announcement not found",
      });
    }
    await requireAcademyMember(ctx, announcement.academyId);
    await ctx.db.delete("announcements", args.announcementId);
    return null;
  },
});
