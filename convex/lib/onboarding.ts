import type { MutationCtx } from "../_generated/server.js";
import type { Doc, Id } from "../_generated/dataModel.d.ts";

/** Emails (comma-separated, case-insensitive) that become platform_admin on first verified sign-in. */
function platformAdminEmails(): string[] {
  return (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Assigns a role/academy to a newly verified user and links them to athlete
 * records. Idempotent: never overwrites an existing role, only fills links
 * that are still empty. Runs only once the user's email is verified, because
 * invites and guardian links are matched by email address.
 */
export async function onboardUser(
  ctx: MutationCtx,
  userId: Id<"users">,
): Promise<void> {
  const user = await ctx.db.get("users", userId);
  if (!user || !user.email || user.emailVerificationTime === undefined) {
    return;
  }
  const email = user.email.trim().toLowerCase();
  let role = user.role;
  let academyId = user.academyId;

  if (!role) {
    const invite = await ctx.db
      .query("invites")
      .withIndex("by_email_and_status", (q) =>
        q.eq("email", email).eq("status", "pending"),
      )
      .first();
    const athleteRecord = await ctx.db
      .query("athletes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const guardianOf = await ctx.db
      .query("athletes")
      .withIndex("by_guardian_email", (q) => q.eq("guardianEmail", email))
      .first();

    if (platformAdminEmails().includes(email)) {
      role = "platform_admin";
    } else if (invite) {
      role = invite.role;
      academyId = invite.academyId;
      await ctx.db.patch("invites", invite._id, {
        status: "accepted",
        acceptedAt: new Date().toISOString(),
      });
    } else if (athleteRecord) {
      role = "athlete";
      academyId = athleteRecord.academyId;
    } else if (guardianOf) {
      role = "guardian";
      academyId = guardianOf.academyId;
    }

    if (role) {
      await ctx.db.patch("users", userId, { role, academyId });
    }
  }

  const linked: Doc<"users"> = { ...user, role, academyId };
  await linkAthleteRecords(ctx, linked, email);
}

async function linkAthleteRecords(
  ctx: MutationCtx,
  user: Doc<"users">,
  email: string,
): Promise<void> {
  if (user.role === "athlete" && user.academyId) {
    const athlete = await ctx.db
      .query("athletes")
      .withIndex("by_academy_and_email", (q) =>
        q.eq("academyId", user.academyId!).eq("email", email),
      )
      .first();
    if (athlete && !athlete.userId) {
      await ctx.db.patch("athletes", athlete._id, { userId: user._id });
    }
  }

  if (user.role === "guardian") {
    const children = await ctx.db
      .query("athletes")
      .withIndex("by_guardian_email", (q) => q.eq("guardianEmail", email))
      .collect();
    for (const child of children) {
      if (!child.guardianUserId && child.academyId === user.academyId) {
        await ctx.db.patch("athletes", child._id, { guardianUserId: user._id });
      }
    }
  }
}

/**
 * Called when staff set/change an athlete's guardian email: links an already
 * registered, verified guardian account right away (otherwise the link is made
 * by onboardUser when the guardian signs up).
 */
export async function linkGuardianByEmail(
  ctx: MutationCtx,
  athleteId: Id<"athletes">,
): Promise<void> {
  const athlete = await ctx.db.get("athletes", athleteId);
  if (!athlete) return;
  if (!athlete.guardianEmail) {
    if (athlete.guardianUserId) {
      await ctx.db.patch("athletes", athleteId, { guardianUserId: undefined });
    }
    return;
  }
  const guardian = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", athlete.guardianEmail))
    .first();
  if (!guardian || guardian.emailVerificationTime === undefined) {
    if (athlete.guardianUserId) {
      await ctx.db.patch("athletes", athleteId, { guardianUserId: undefined });
    }
    return;
  }
  if (!guardian.role) {
    await ctx.db.patch("users", guardian._id, {
      role: "guardian",
      academyId: athlete.academyId,
    });
  } else if (
    guardian.role !== "guardian" ||
    guardian.academyId !== athlete.academyId
  ) {
    // Staff or other-academy accounts are never silently turned into guardians.
    return;
  }
  await ctx.db.patch("athletes", athleteId, { guardianUserId: guardian._id });
}
