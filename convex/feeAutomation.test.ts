import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema.ts";
import { modules } from "./test.setup.ts";
import { api, internal } from "./_generated/api.js";
import type { Id } from "./_generated/dataModel.d.ts";


const TODAY = "2026-10-10";

async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const academyId = await ctx.db.insert("academies", {
      name: "Academy",
      slug: "academy",
      status: "active",
      createdAt: TODAY,
    });
    const financeId = await ctx.db.insert("users", {
      email: "finance@academy.test",
      emailVerificationTime: 1,
      role: "accounting",
      academyId,
    });
    const athleteUserId = await ctx.db.insert("users", {
      email: "kid@academy.test",
      emailVerificationTime: 1,
      role: "athlete",
      academyId,
    });
    const athlete = (firstName: string, status: "active" | "inactive") =>
      ctx.db.insert("athletes", {
        academyId,
        firstName,
        lastName: "Test",
        status,
        createdBy: financeId,
        createdAt: TODAY,
      });
    const activeId = await athlete("Active", "active");
    const inactiveId = await athlete("Inactive", "inactive");
    return { academyId, financeId, athleteUserId, activeId, inactiveId };
  });
  const finance = t.withIdentity({ subject: `${ids.financeId}|s` });
  return { t, finance, ...ids };
}

type T = Awaited<ReturnType<typeof setup>>["t"];

function feesOf(t: T, athleteId: Id<"athletes">) {
  return t.run((ctx) =>
    ctx.db
      .query("athleteFees")
      .withIndex("by_athlete", (q) => q.eq("athleteId", athleteId))
      .collect(),
  );
}

const schedule = {
  label: "Monthly membership",
  amount: 50,
  currency: "USD",
  dueDay: 25,
  startPeriod: "2026-10",
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("recurring fees", () => {
  it("creates this month's fee once, never twice", async () => {
    const { t, finance, activeId } = await setup();
    await finance.mutation(api.feeAutomation.createFeeSchedules, {
      ...schedule,
      athleteIds: [activeId],
    });
    await t.mutation(internal.feeAutomation.generateMonthlyFees, {});
    await t.mutation(internal.feeAutomation.generateMonthlyFees, {});

    const fees = await feesOf(t, activeId);
    expect(fees).toHaveLength(1);
    expect(fees[0]).toMatchObject({
      label: "Monthly membership – October 2026",
      amountDue: 50,
      dueDate: "2026-10-25",
      status: "unpaid",
      period: "2026-10",
    });
  });

  it("gives a grace period when the due day already passed this month", async () => {
    const { t, finance, activeId } = await setup();
    await finance.mutation(api.feeAutomation.createFeeSchedules, {
      ...schedule,
      dueDay: 5,
      athleteIds: [activeId],
    });
    const [fee] = await feesOf(t, activeId);
    expect(fee.dueDate).toBe("2026-10-17");
  });

  it("waits for the start month, skips paused schedules and inactive athletes", async () => {
    const { t, finance, activeId, inactiveId } = await setup();
    await finance.mutation(api.feeAutomation.createFeeSchedules, {
      ...schedule,
      startPeriod: "2026-11",
      athleteIds: [activeId],
    });
    await finance.mutation(api.feeAutomation.createFeeSchedules, {
      ...schedule,
      athleteIds: [inactiveId],
    });
    expect(await feesOf(t, activeId)).toHaveLength(0);
    expect(await feesOf(t, inactiveId)).toHaveLength(0);

    const schedules = await finance.query(
      api.feeAutomation.listFeeSchedules,
      {},
    );
    const next = schedules.find((s) => s.athleteId === activeId)!;
    await finance.mutation(api.feeAutomation.setFeeScheduleActive, {
      scheduleId: next._id,
      active: false,
    });
    vi.setSystemTime(new Date("2026-11-02T12:00:00Z"));
    await t.mutation(internal.feeAutomation.generateMonthlyFees, {});
    expect(await feesOf(t, activeId)).toHaveLength(0);

    await finance.mutation(api.feeAutomation.setFeeScheduleActive, {
      scheduleId: next._id,
      active: true,
    });
    await t.mutation(internal.feeAutomation.generateMonthlyFees, {});
    expect(await feesOf(t, activeId)).toHaveLength(1);
  });

  it("only finance staff can manage schedules", async () => {
    const { t, athleteUserId, activeId } = await setup();
    const athlete = t.withIdentity({ subject: `${athleteUserId}|s` });
    await expect(
      athlete.mutation(api.feeAutomation.createFeeSchedules, {
        ...schedule,
        athleteIds: [activeId],
      }),
    ).rejects.toThrow();
    await expect(
      athlete.query(api.feeAutomation.listFeeSchedules, {}),
    ).rejects.toThrow();
  });
});

describe("overdue and reminders", () => {
  async function insertFee(
    t: T,
    ids: {
      academyId: Id<"academies">;
      activeId: Id<"athletes">;
      financeId: Id<"users">;
    },
    dueDate: string,
    status: "unpaid" | "partially_paid" | "paid" = "unpaid",
  ) {
    return await t.run((ctx) =>
      ctx.db.insert("athleteFees", {
        academyId: ids.academyId,
        athleteId: ids.activeId,
        label: "Fee",
        amountDue: 50,
        currency: "USD",
        dueDate,
        status,
        createdBy: ids.financeId,
        createdAt: TODAY,
      }),
    );
  }

  it("flags past-due fees as overdue and notifies once", async () => {
    const { t, ...ids } = await setup();
    const get = (id: Id<"athleteFees">) =>
      t.run((ctx) => ctx.db.get("athleteFees", id));
    const pastDue = await insertFee(t, ids, "2026-10-09");
    const partial = await insertFee(t, ids, "2026-10-01", "partially_paid");
    const paid = await insertFee(t, ids, "2026-10-01", "paid");
    const dueToday = await insertFee(t, ids, TODAY);

    await t.mutation(internal.feeAutomation.updateOverdueAndReminders, {});

    expect((await get(pastDue))?.status).toBe("overdue");
    expect((await get(partial))?.status).toBe("overdue");
    expect((await get(paid))?.status).toBe("paid");
    expect((await get(dueToday))?.status).toBe("unpaid");
    const notifiedAt = (await get(pastDue))?.overdueNotifiedAt;
    expect(notifiedAt).toBeDefined();

    // A later partial payment moves it back to partially_paid; the next run
    // flags it again but does not email the family a second time.
    await t.run((ctx) =>
      ctx.db.patch("athleteFees", pastDue, { status: "partially_paid" }),
    );
    vi.setSystemTime(new Date("2026-10-11T12:00:00Z"));
    await t.mutation(internal.feeAutomation.updateOverdueAndReminders, {});
    expect((await get(pastDue))?.status).toBe("overdue");
    expect((await get(pastDue))?.overdueNotifiedAt).toBe(notifiedAt);
  });

  it("sends one reminder for fees due within 3 days", async () => {
    const { t, ...ids } = await setup();
    const get = (id: Id<"athleteFees">) =>
      t.run((ctx) => ctx.db.get("athleteFees", id));
    const soon = await insertFee(t, ids, "2026-10-12");
    const later = await insertFee(t, ids, "2026-10-20");

    await t.mutation(internal.feeAutomation.updateOverdueAndReminders, {});
    const sentAt = (await get(soon))?.reminderSentAt;
    expect(sentAt).toBeDefined();
    expect((await get(later))?.reminderSentAt).toBeUndefined();

    await t.mutation(internal.feeAutomation.updateOverdueAndReminders, {});
    expect((await get(soon))?.reminderSentAt).toBe(sentAt);
  });
});
