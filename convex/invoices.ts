import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server.js";
import { requireRole } from "./lib/auth.ts";
import { invoiceStatusValidator } from "./schema.ts";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import type { MutationCtx } from "./_generated/server.js";

const FINANCE_ROLES: Array<Doc<"users">["role"]> = [
  "academy_admin",
  "accounting",
];

/** Generate a zero-padded invoice number for an academy using an atomic counter on the academy record. */
async function buildInvoiceNumber(
  ctx: MutationCtx,
  academyId: Id<"academies">,
): Promise<string> {
  const academy = await ctx.db.get("academies", academyId);
  let nextNum = academy?.nextInvoiceNumber;
  if (nextNum === undefined) {
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_academy", (q) => q.eq("academyId", academyId))
      .collect();
    nextNum = existing.length + 1;
  }
  await ctx.db.patch("academies", academyId, {
    nextInvoiceNumber: nextNum + 1,
  });
  return `INV-${String(nextNum).padStart(4, "0")}`;
}

/** Create a new invoice. */
export const createInvoice = mutation({
  args: {
    description: v.string(),
    amount: v.number(),
    currency: v.string(),
    dueDate: v.string(),
    athleteId: v.optional(v.id("athletes")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    if (!user.academyId)
      throw new ConvexError({ code: "FORBIDDEN", message: "No academy" });

    if (args.athleteId) {
      const athlete = await ctx.db.get("athletes", args.athleteId);
      if (!athlete || athlete.academyId !== user.academyId) {
        throw new ConvexError({
          code: "FORBIDDEN",
          message: "Athlete not in your academy",
        });
      }
    }

    const invoiceNumber = await buildInvoiceNumber(ctx, user.academyId);

    const invoiceId = await ctx.db.insert("invoices", {
      academyId: user.academyId,
      athleteId: args.athleteId,
      invoiceNumber,
      description: args.description,
      amount: args.amount,
      currency: args.currency,
      dueDate: args.dueDate,
      status: "draft",
      note: args.note,
      issuedAt: new Date().toISOString(),
      createdBy: user._id,
    });

    return invoiceId;
  },
});

/** Update invoice status (draft→sent, sent→paid, any→overdue, etc.) with an optional note. */
export const updateInvoiceStatus = mutation({
  args: {
    invoiceId: v.id("invoices"),
    status: invoiceStatusValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    const invoice = await ctx.db.get("invoices", args.invoiceId);
    if (!invoice)
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Invoice not found",
      });
    if (invoice.academyId !== user.academyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your academy" });
    }

    await ctx.db.patch("invoices", args.invoiceId, {
      status: args.status,
      ...(args.note !== undefined ? { note: args.note } : {}),
    });

    return null;
  },
});

/** Delete an invoice. */
export const deleteInvoice = mutation({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args): Promise<null> => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    const invoice = await ctx.db.get("invoices", args.invoiceId);
    if (!invoice)
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Invoice not found",
      });
    if (invoice.academyId !== user.academyId) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Not your academy" });
    }
    await ctx.db.delete("invoices", args.invoiceId);
    return null;
  },
});

/** List invoices for the caller's academy, optionally filtered by status. */
export const listInvoicesForAcademy = query({
  args: { status: v.optional(invoiceStatusValidator) },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, FINANCE_ROLES);
    if (!user.academyId) return [];

    const invoiceList = args.status
      ? await ctx.db
          .query("invoices")
          .withIndex("by_academy_and_status", (q) =>
            q.eq("academyId", user.academyId!).eq("status", args.status!),
          )
          .order("desc")
          .collect()
      : await ctx.db
          .query("invoices")
          .withIndex("by_academy", (q) => q.eq("academyId", user.academyId!))
          .order("desc")
          .collect();

    return await Promise.all(
      invoiceList.map(async (inv) => {
        const athleteName = inv.athleteId
          ? await ctx.db
              .get("athletes", inv.athleteId)
              .then((a) => (a ? `${a.firstName} ${a.lastName}` : "Unknown"))
          : null;
        return { ...inv, athleteName };
      }),
    );
  },
});

/** Platform admin: billing overview across all academies. */
export const adminBillingOverview = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireRole(ctx, ["platform_admin"]);
    void user;

    const allInvoices = await ctx.db.query("invoices").collect();
    const academyIds = [...new Set(allInvoices.map((i) => i.academyId))];

    const academies = await Promise.all(
      academyIds.map(async (id) => {
        const academy = await ctx.db.get("academies", id);
        const invs = allInvoices.filter((i) => i.academyId === id);
        const totalAmount = invs.reduce((s, i) => s + i.amount, 0);
        const statusCounts = {
          draft: invs.filter((i) => i.status === "draft").length,
          sent: invs.filter((i) => i.status === "sent").length,
          paid: invs.filter((i) => i.status === "paid").length,
          overdue: invs.filter((i) => i.status === "overdue").length,
        };
        return {
          academyId: id,
          academyName: academy?.name ?? "Unknown",
          totalInvoices: invs.length,
          totalAmount,
          currency: invs[0]?.currency ?? "USD",
          statusCounts,
        };
      }),
    );

    const currencyTotals: Record<string, { invoiced: number; paid: number }> =
      {};
    for (const inv of allInvoices) {
      const curr = inv.currency || "USD";
      if (!currencyTotals[curr]) {
        currencyTotals[curr] = { invoiced: 0, paid: 0 };
      }
      currencyTotals[curr].invoiced += inv.amount;
      if (inv.status === "paid") {
        currencyTotals[curr].paid += inv.amount;
      }
    }

    const grandTotal = allInvoices.reduce((s, i) => s + i.amount, 0);
    const paidTotal = allInvoices
      .filter((i) => i.status === "paid")
      .reduce((s, i) => s + i.amount, 0);

    return {
      academies,
      grandTotal,
      paidTotal,
      currencyTotals,
      totalInvoices: allInvoices.length,
    };
  },
});
