import { ConvexError } from "convex/values";
import { internalMutation, type MutationCtx } from "./_generated/server.js";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { onboardUser } from "./lib/onboarding.ts";

/**
 * Local test data: 3 academies, each with 1 coach and 3 athletes plus
 * guardians, a team, sessions + attendance, assessments, a training plan,
 * fees in every state, a recurring fee, PINs, announcements, a conversation
 * and an invoice.
 *
 * Accounts must already exist (sign up each email first); this links them.
 * Run: npx convex run devSeed:seedDemoData
 * Only runs on a local/dev backend (EMAIL_DEV_LOG=true).
 */

type AthleteSeed = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: "male" | "female";
  heightCm: number;
  weightKg: number;
  phone: string;
  notes?: string;
  guardian?: { name: string; email: string; phone: string };
};

type AcademySeed = {
  name: string;
  slug: string;
  sport: string;
  location: string;
  teamName: string;
  monthlyFee: number;
  coach: { name: string; email: string };
  /** Academy manager (academy_admin): joins through a pending invite. */
  manager: { name: string; email: string };
  metrics: Array<{ metric: string; unit: string; base: number; step: number }>;
  planItems: string[];
  athletes: AthleteSeed[];
};

export const SEED: AcademySeed[] = [
  {
    name: "Hercules Track & Field Academy",
    slug: "hercules-track",
    sport: "Track & Field",
    location: "Camille Chamoun Sports City, Track 2",
    teamName: "Sprint Squad",
    monthlyFee: 60,
    coach: { name: "Karim Haddad", email: "karim.haddad@hercules.test" },
    manager: { name: "Ziad Khalil", email: "ziad.khalil@hercules.test" },
    metrics: [
      { metric: "Sprint 40m (s)", unit: "s", base: 5.6, step: -0.08 },
      { metric: "Vertical Jump (cm)", unit: "cm", base: 48, step: 1.5 },
      { metric: "Agility T-Test (s)", unit: "s", base: 11.4, step: -0.15 },
      { metric: "1 Mile Run (min)", unit: "min", base: 7.1, step: -0.1 },
    ],
    planItems: [
      "Block starts 6×20m",
      "Flying 30m sprints",
      "Box jumps 4×6",
      "Hurdle mobility drills",
    ],
    athletes: [
      {
        firstName: "Lara",
        lastName: "Khoury",
        email: "lara.khoury@hercules.test",
        dateOfBirth: "2010-03-14",
        gender: "female",
        heightCm: 165,
        weightKg: 52,
        phone: "+961 70 111 201",
        guardian: {
          name: "Rania Khoury",
          email: "rania.khoury@family.test",
          phone: "+961 70 111 200",
        },
      },
      {
        firstName: "Omar",
        lastName: "Saleh",
        email: "omar.saleh@hercules.test",
        dateOfBirth: "2011-07-02",
        gender: "male",
        heightCm: 170,
        weightKg: 58,
        phone: "+961 71 222 301",
        notes: "Mild asthma: inhaler kept in kit bag.",
        guardian: {
          name: "Samir Saleh",
          email: "samir.saleh@family.test",
          phone: "+961 71 222 300",
        },
      },
      {
        firstName: "Yara",
        lastName: "Nassar",
        email: "yara.nassar@hercules.test",
        dateOfBirth: "2012-11-21",
        gender: "female",
        heightCm: 158,
        weightKg: 45,
        phone: "+961 76 333 401",
        guardian: {
          name: "Mona Nassar",
          email: "mona.nassar@family.test",
          phone: "+961 76 333 400",
        },
      },
    ],
  },
  {
    name: "Cedars Swim Club",
    slug: "cedars-swim",
    sport: "Swimming",
    location: "Jounieh Olympic Pool, Lane 4-6",
    teamName: "Junior Squad",
    monthlyFee: 80,
    coach: { name: "Nadine Farah", email: "nadine.farah@cedars.test" },
    manager: { name: "Carla Sfeir", email: "carla.sfeir@cedars.test" },
    metrics: [
      { metric: "50m Freestyle Sprint (s)", unit: "s", base: 34.5, step: -0.6 },
      { metric: "Broad Jump (m)", unit: "m", base: 1.75, step: 0.04 },
      { metric: "Shuttle Run (s)", unit: "s", base: 12.8, step: -0.12 },
      { metric: "Sit and Reach (cm)", unit: "cm", base: 22, step: 1 },
    ],
    planItems: [
      "Kick sets 8×50m",
      "Pull buoy 4×100m",
      "Turn practice",
      "Dryland core circuit",
    ],
    athletes: [
      {
        firstName: "Adam",
        lastName: "Aoun",
        email: "adam.aoun@cedars.test",
        dateOfBirth: "2011-01-09",
        gender: "male",
        heightCm: 168,
        weightKg: 55,
        phone: "+961 3 444 501",
        guardian: {
          name: "Joseph Aoun",
          email: "joseph.aoun@family.test",
          phone: "+961 3 444 500",
        },
      },
      {
        firstName: "Maya",
        lastName: "Aoun",
        email: "maya.aoun@cedars.test",
        dateOfBirth: "2013-05-30",
        gender: "female",
        heightCm: 152,
        weightKg: 41,
        phone: "+961 3 444 502",
        notes: "Sibling of Adam Aoun.",
        guardian: {
          name: "Joseph Aoun",
          email: "joseph.aoun@family.test",
          phone: "+961 3 444 500",
        },
      },
      {
        firstName: "Tarek",
        lastName: "Mansour",
        email: "tarek.mansour@cedars.test",
        dateOfBirth: "2010-09-17",
        gender: "male",
        heightCm: 176,
        weightKg: 63,
        phone: "+961 70 555 601",
        guardian: {
          name: "Hiba Mansour",
          email: "hiba.mansour@family.test",
          phone: "+961 70 555 600",
        },
      },
    ],
  },
  {
    name: "Beirut Gymnastics Center",
    slug: "beirut-gymnastics",
    sport: "Gymnastics",
    location: "Hamra Sports Hall, Floor 2",
    teamName: "Competition Group",
    monthlyFee: 70,
    coach: { name: "Elie Karam", email: "elie.karam@beirutgym.test" },
    manager: { name: "Rami Daher", email: "rami.daher@beirutgym.test" },
    metrics: [
      { metric: "Sit and Reach (cm)", unit: "cm", base: 30, step: 1.2 },
      { metric: "Vertical Jump (cm)", unit: "cm", base: 40, step: 1.2 },
      { metric: "Agility T-Test (s)", unit: "s", base: 12.1, step: -0.12 },
      { metric: "Plank Hold Endurance (s)", unit: "s", base: 75, step: 8 },
    ],
    planItems: [
      "Handstand holds 5×30s",
      "Split flexibility routine",
      "Beam balance series",
      "Rope climb 3×",
    ],
    athletes: [
      {
        firstName: "Sara",
        lastName: "Hajj",
        email: "sara.hajj@beirutgym.test",
        dateOfBirth: "2012-02-11",
        gender: "female",
        heightCm: 148,
        weightKg: 38,
        phone: "+961 78 666 701",
        guardian: {
          name: "Nour Hajj",
          email: "nour.hajj@family.test",
          phone: "+961 78 666 700",
        },
      },
      {
        firstName: "Lina",
        lastName: "Chami",
        email: "lina.chami@beirutgym.test",
        dateOfBirth: "2011-08-05",
        gender: "female",
        heightCm: 153,
        weightKg: 42,
        phone: "+961 71 777 801",
        notes: "Recovering from a left wrist sprain: no vault until October.",
        guardian: {
          name: "Fadi Chami",
          email: "fadi.chami@family.test",
          phone: "+961 71 777 800",
        },
      },
      {
        firstName: "Jad",
        lastName: "Rizk",
        email: "jad.rizk@beirutgym.test",
        dateOfBirth: "2007-04-19",
        gender: "male",
        heightCm: 172,
        weightKg: 64,
        phone: "+961 76 888 901",
        notes: "Adult athlete (19): no guardian on file.",
      },
    ],
  },
];

/**
 * Creates a pending academy_admin invite for the academy's manager unless
 * they already have an account or an invite. Signing up with that email then
 * makes them the manager through the normal onboarding path.
 */
async function inviteManager(
  ctx: MutationCtx,
  seed: AcademySeed,
  academyId: Id<"academies">,
  invitedBy: Id<"users">,
): Promise<string> {
  const email = seed.manager.email;
  const user = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
  if (user) {
    return `${email}: account already exists (role ${user.role ?? "none"})`;
  }
  const pending = await ctx.db
    .query("invites")
    .withIndex("by_email_and_status", (q) =>
      q.eq("email", email).eq("status", "pending"),
    )
    .first();
  if (pending) return `${email}: invite already pending`;
  await ctx.db.insert("invites", {
    academyId,
    email,
    role: "academy_admin",
    invitedBy,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  return `${email}: invited as academy manager`;
}

/** Invites the academy managers for academies that were already seeded. */
export const inviteAcademyManagers = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.EMAIL_DEV_LOG !== "true") {
      throw new ConvexError("devSeed only runs on a local/dev backend");
    }
    const results: string[] = [];
    for (const seed of SEED) {
      const academy = await ctx.db
        .query("academies")
        .withIndex("by_slug", (q) => q.eq("slug", seed.slug))
        .first();
      if (!academy) {
        results.push(`${seed.name}: not seeded yet`);
        continue;
      }
      const coach = await userByEmail(ctx, seed.coach.email);
      results.push(await inviteManager(ctx, seed, academy._id, coach._id));
    }
    return results;
  },
});

/** Every email that needs an account before seeding (managers join by invite afterwards). */
export function seedEmails(): string[] {
  const emails = new Set<string>();
  for (const a of SEED) {
    emails.add(a.coach.email);
    for (const ath of a.athletes) {
      emails.add(ath.email);
      if (ath.guardian) emails.add(ath.guardian.email);
    }
  }
  return [...emails];
}

const DAY = 24 * 60 * 60 * 1000;
const isoDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

async function userByEmail(ctx: MutationCtx, email: string) {
  const user = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
  if (!user) {
    throw new ConvexError(`No account for ${email}: sign it up first`);
  }
  return user;
}

export const seedDemoData = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (process.env.EMAIL_DEV_LOG !== "true") {
      throw new ConvexError("devSeed only runs on a local/dev backend");
    }
    const missing: string[] = [];
    for (const email of seedEmails()) {
      const u = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      if (!u) missing.push(email);
    }
    if (missing.length) {
      throw new ConvexError(
        `Sign up these accounts first: ${missing.join(", ")}`,
      );
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const summary: string[] = [];
    let pinCounter = 0;

    for (const [ai, seed] of SEED.entries()) {
      const exists = await ctx.db
        .query("academies")
        .withIndex("by_slug", (q) => q.eq("slug", seed.slug))
        .first();
      if (exists) {
        summary.push(`${seed.name}: already exists, skipped`);
        continue;
      }

      const coach = await userByEmail(ctx, seed.coach.email);
      const academyId = await ctx.db.insert("academies", {
        name: seed.name,
        slug: seed.slug,
        status: "active",
        createdAt: nowIso,
        nextInvoiceNumber: 2,
      });
      await ctx.db.patch("users", coach._id, {
        role: "coach",
        academyId,
        name: seed.coach.name,
      });
      await inviteManager(ctx, seed, academyId, coach._id);

      // Athletes (emails drive the real onboarding links below).
      const athletes: Array<Doc<"athletes">> = [];
      for (const a of seed.athletes) {
        pinCounter++;
        const athleteId = await ctx.db.insert("athletes", {
          academyId,
          firstName: a.firstName,
          lastName: a.lastName,
          dateOfBirth: a.dateOfBirth,
          gender: a.gender,
          sport: seed.sport,
          heightCm: a.heightCm,
          weightKg: a.weightKg,
          email: a.email,
          phone: a.phone,
          guardianName: a.guardian?.name,
          guardianPhone: a.guardian?.phone,
          guardianEmail: a.guardian?.email,
          notes: a.notes,
          status: "active",
          checkInPin: String(1000 + ai * 1111 + pinCounter * 7).slice(-4),
          createdBy: coach._id,
          createdAt: nowIso,
        });
        athletes.push((await ctx.db.get("athletes", athleteId))!);
      }

      // Link athlete and guardian accounts through the app's own onboarding.
      for (const a of seed.athletes) {
        const u = await userByEmail(ctx, a.email);
        await ctx.db.patch("users", u._id, {
          name: `${a.firstName} ${a.lastName}`,
        });
        await onboardUser(ctx, u._id);
        if (a.guardian) {
          const g = await userByEmail(ctx, a.guardian.email);
          await ctx.db.patch("users", g._id, { name: a.guardian.name });
          await onboardUser(ctx, g._id);
        }
      }

      // Team with all three athletes.
      const teamId = await ctx.db.insert("teams", {
        academyId,
        name: seed.teamName,
        sport: seed.sport,
        createdBy: coach._id,
        createdAt: nowIso,
      });
      for (const ath of athletes) {
        await ctx.db.insert("teamMembers", {
          teamId,
          athleteId: ath._id,
          academyId,
          createdAt: nowIso,
        });
      }

      // Sessions: 8 past (last 4 weeks) + 4 upcoming, 16:00 Beirut (13:00 UTC).
      const at1300 = (ms: number) => {
        const d = new Date(ms);
        d.setUTCHours(13, 0, 0, 0);
        return d.getTime();
      };
      const offsets = [-27, -24, -20, -17, -13, -10, -6, -3, 1, 4, 8, 11];
      const statuses = [
        "present",
        "present",
        "late",
        "present",
        "absent",
        "present",
        "excused",
        "present",
      ] as const;
      const pastSessions: Id<"trainingSessions">[] = [];
      for (const [si, off] of offsets.entries()) {
        const startsAt = new Date(at1300(now + off * DAY)).toISOString();
        const sessionId = await ctx.db.insert("trainingSessions", {
          academyId,
          teamId,
          title:
            si % 2 === 0
              ? `${seed.teamName} technique`
              : `${seed.teamName} conditioning`,
          startsAt,
          durationMinutes: 90,
          location: seed.location,
          createdBy: coach._id,
          createdAt: nowIso,
        });
        if (off < 0) {
          pastSessions.push(sessionId);
          for (const [ti, ath] of athletes.entries()) {
            await ctx.db.insert("attendanceRecords", {
              sessionId,
              athleteId: ath._id,
              academyId,
              status: statuses[(si + ti * 3) % statuses.length],
              recordedBy: coach._id,
              recordedAt: new Date(
                Date.parse(startsAt) + 10 * 60 * 1000,
              ).toISOString(),
            });
          }
        }
      }

      // Assessments: 4 rounds, 3 weeks apart, trending better; varied per athlete.
      for (const [ti, ath] of athletes.entries()) {
        for (let round = 0; round < 4; round++) {
          const assessedOn = isoDate(now - (63 - round * 21) * DAY);
          for (const m of seed.metrics) {
            const jitter = (ti + 1) * 0.03 * m.base * (ti % 2 === 0 ? 1 : -1);
            const value = +(m.base + jitter + m.step * round).toFixed(2);
            await ctx.db.insert("assessments", {
              academyId,
              athleteId: ath._id,
              metric: m.metric,
              value,
              unit: m.unit,
              assessedOn,
              createdBy: coach._id,
              createdAt: nowIso,
            });
          }
        }

        // One active plan with 4 items, first two completed.
        const planId = await ctx.db.insert("trainingPlans", {
          academyId,
          athleteId: ath._id,
          title: `${ath.firstName}'s autumn block`,
          description: `Six-week ${seed.sport.toLowerCase()} development block.`,
          status: "active",
          startDate: isoDate(now - 14 * DAY),
          endDate: isoDate(now + 28 * DAY),
          createdBy: coach._id,
          createdAt: nowIso,
        });
        for (const [order, name] of seed.planItems.entries()) {
          await ctx.db.insert("planItems", {
            planId,
            academyId,
            order,
            name,
            sets: 4,
            reps: 6,
            ...(order < 2
              ? {
                  completedAt: new Date(
                    now - (10 - order * 3) * DAY,
                  ).toISOString(),
                  completedBy: coach._id,
                  result: "Completed with good form",
                }
              : {}),
          });
        }
      }

      // Fees: July + August paid; September varies per athlete; one-off fee.
      const thisPeriod = isoDate(now).slice(0, 7);
      const month = (offset: number) => {
        const d = new Date(now);
        d.setUTCDate(1);
        d.setUTCMonth(d.getUTCMonth() + offset);
        return d;
      };
      const label = (d: Date) =>
        `Monthly membership – ${d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`;
      const pay = async (
        feeId: Id<"athleteFees">,
        athleteId: Id<"athletes">,
        amountPaid: number,
        paidOn: string,
        method: string,
      ) =>
        await ctx.db.insert("feePayments", {
          feeId,
          athleteId,
          academyId,
          amountPaid,
          currency: "USD",
          paidOn,
          method,
          recordedBy: coach._id,
          recordedAt: nowIso,
        });

      for (const [ti, ath] of athletes.entries()) {
        const scheduleId = await ctx.db.insert("feeSchedules", {
          academyId,
          athleteId: ath._id,
          label: "Monthly membership",
          amount: seed.monthlyFee,
          currency: "USD",
          dueDay: 5,
          startPeriod: isoDate(month(-2).getTime()).slice(0, 7),
          active: true,
          createdBy: coach._id,
          createdAt: nowIso,
        });
        for (const offset of [-2, -1, 0]) {
          const d = month(offset);
          const period = isoDate(d.getTime()).slice(0, 7);
          // Current month is due later in the month so the reminder window is testable.
          const dueDate =
            offset === 0 ? isoDate(now + (2 + ti) * DAY) : `${period}-05`;
          let status: Doc<"athleteFees">["status"] = "paid";
          if (offset === -1 && ti === 2) status = "overdue";
          if (offset === 0)
            status = ti === 0 ? "paid" : ti === 1 ? "partially_paid" : "unpaid";
          const feeId = await ctx.db.insert("athleteFees", {
            academyId,
            athleteId: ath._id,
            label: label(d),
            amountDue: seed.monthlyFee,
            currency: "USD",
            dueDate,
            status,
            createdBy: coach._id,
            createdAt: nowIso,
            scheduleId,
            period,
            ...(status === "overdue" ? { overdueNotifiedAt: nowIso } : {}),
          });
          if (status === "paid") {
            await pay(
              feeId,
              ath._id,
              seed.monthlyFee,
              offset === 0 ? isoDate(now - DAY) : `${period}-03`,
              ti % 2 ? "Bank transfer" : "Cash",
            );
          } else if (status === "partially_paid") {
            await pay(
              feeId,
              ath._id,
              seed.monthlyFee / 2,
              isoDate(now - 2 * DAY),
              "Cash",
            );
          }
        }
        void thisPeriod;
      }
      // One-off competition entry fee for the first athlete.
      await ctx.db.insert("athleteFees", {
        academyId,
        athleteId: athletes[0]._id,
        label: "Regional championship entry",
        amountDue: 25,
        currency: "USD",
        dueDate: isoDate(now + 12 * DAY),
        status: "unpaid",
        notes: "Covers entry + transport.",
        createdBy: coach._id,
        createdAt: nowIso,
      });

      // Announcements.
      await ctx.db.insert("announcements", {
        academyId,
        title: "Regional championship in 3 weeks",
        content: `The ${seed.teamName} competes at the regional championship. Entry fees are due in 12 days; check your fees page.`,
        category: "meet_schedule",
        priority: "important",
        isPinned: true,
        createdBy: coach._id,
        createdAt: new Date(now - 2 * DAY).toISOString(),
      });
      await ctx.db.insert("announcements", {
        academyId,
        title: "Venue change next Tuesday",
        content: `Tuesday's session moves to the indoor hall because of maintenance at ${seed.location}.`,
        category: "facility",
        priority: "normal",
        isPinned: false,
        targetTeamId: teamId,
        createdBy: coach._id,
        createdAt: new Date(now - 5 * DAY).toISOString(),
      });

      // Coach ↔ first athlete conversation.
      const athleteUserId = (await userByEmail(ctx, seed.athletes[0].email))
        ._id;
      const lines: Array<[Id<"users">, string]> = [
        [
          coach._id,
          `Great work on Tuesday, ${seed.athletes[0].firstName}. Let's focus on your start this week.`,
        ],
        [
          athleteUserId,
          "Thanks coach! Should I do the extra drills at home too?",
        ],
        [
          coach._id,
          "Yes, 10 minutes of mobility every evening. We'll check progress Friday.",
        ],
      ];
      const conversationId = await ctx.db.insert("conversations", {
        academyId,
        participantIds: [coach._id, athleteUserId],
        athleteId: athletes[0]._id,
        title: "Weekly check-in",
        contextType: "general",
        createdAt: new Date(now - 3 * DAY).toISOString(),
      });
      for (const [li, [senderId, content]] of lines.entries()) {
        const createdAt = new Date(
          now - 3 * DAY + li * 60 * 60 * 1000,
        ).toISOString();
        await ctx.db.insert("messages", {
          conversationId,
          academyId,
          senderId,
          content,
          readBy: [senderId],
          createdAt,
        });
        await ctx.db.patch("conversations", conversationId, {
          lastMessageText: content,
          lastMessageAt: createdAt,
          lastSenderId: senderId,
        });
      }

      // Invoice for the championship kit.
      await ctx.db.insert("invoices", {
        academyId,
        athleteId: athletes[1]._id,
        invoiceNumber: "INV-0001",
        description: "Competition kit (tracksuit + singlet)",
        amount: 45,
        currency: "USD",
        dueDate: isoDate(now + 10 * DAY),
        status: "sent",
        issuedAt: new Date(now - DAY).toISOString(),
        createdBy: coach._id,
      });

      summary.push(
        `${seed.name}: coach ${seed.coach.email}, athletes ${athletes.map((a) => `${a.firstName} (PIN ${a.checkInPin})`).join(", ")}`,
      );
    }
    return summary;
  },
});
