"use node";

import escapeHtml from "escape-html";
import { v } from "convex/values";
import { internalAction } from "./_generated/server.js";
import { internal } from "./_generated/api.js";
import { sendEmail, siteUrl } from "./lib/email.ts";


/** Send an academy staff invite email. */
export const sendInviteEmail = internalAction({
  args: {
    to: v.string(),
    inviterName: v.string(),
    academyName: v.string(),
    role: v.string(),
  },
  handler: async (_ctx, { to, inviterName, academyName, role }) => {
    const safeInviter = escapeHtml(inviterName);
    const safeAcademy = escapeHtml(academyName);
    const safeRole = escapeHtml(role.replace("_", " "));
    const safeEmail = escapeHtml(to);
    const appUrl = siteUrl();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#1a1d27;border-radius:12px;border:1px solid #2a2d3a;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#161923;padding:28px 32px;border-bottom:1px solid #2a2d3a;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                PeakForm <span style="color:#b5e853;">Athletics</span>
              </p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                You've been invited
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#9ba3b8;line-height:1.6;">
                <strong style="color:#e2e8f0;">${safeInviter}</strong> has invited you to join
                <strong style="color:#e2e8f0;">${safeAcademy}</strong> as a
                <strong style="color:#b5e853;">${safeRole}</strong>.
              </p>

              <div style="background:#0f1117;border-radius:8px;border:1px solid #2a2d3a;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Invited email</p>
                <p style="margin:0;font-size:15px;color:#e2e8f0;font-family:monospace;">${safeEmail}</p>
              </div>

              <p style="margin:0 0 20px;font-size:14px;color:#9ba3b8;line-height:1.6;">
                To accept this invite, sign in to PeakForm Athletics using <strong style="color:#e2e8f0;">this exact email address</strong>. Your role will be assigned automatically.
              </p>

              <a href="${appUrl}"
                 style="display:inline-block;background:#b5e853;color:#0f1117;font-size:15px;font-weight:700;padding:13px 28px;border-radius:8px;text-decoration:none;letter-spacing:-0.2px;">
                Sign in to PeakForm
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #2a2d3a;">
              <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6;">
                If you weren't expecting this invite, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `You've been invited to PeakForm Athletics

${inviterName} has invited you to join ${academyName} as a ${role.replace("_", " ")}.

Invited email: ${to}

To accept, sign in to PeakForm Athletics using this exact email address:
${appUrl}

If you weren't expecting this invite, ignore this email.`;

    await sendEmail({
      to,
      subject: `You've been invited to ${academyName} on PeakForm Athletics`,
      html,
      text,
    });
  },
});

/**
 * Send athlete fee notification emails.
 * Looks up fee + athlete data internally to avoid passing PII through args.
 */
export const sendFeeNotification = internalAction({
  args: {
    feeId: v.id("athleteFees"),
    type: v.union(
      v.literal("new_fee"),
      v.literal("status_change"),
      v.literal("payment_received"),
      v.literal("reminder"),
      v.literal("overdue"),
    ),
    newStatus: v.optional(v.string()),
    amountPaid: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Fetch fee and athlete records
    const fee = await ctx.runQuery(internal.fees._getFeeForEmail, {
      feeId: args.feeId,
    });
    if (!fee) return;
    // Athlete and guardian (the one who usually pays for a minor), deduplicated.
    const recipients = Array.from(
      new Set(
        [fee.athleteEmail, fee.guardianEmail]
          .filter((e): e is string => Boolean(e))
          .map((e) => e.toLowerCase()),
      ),
    );
    if (recipients.length === 0) return; // no email on file — skip silently

    const safeName = escapeHtml(fee.athleteName);
    const safeLabel = escapeHtml(fee.label);
    const safeAmount = escapeHtml(
      `${fee.currency} ${fee.amountDue.toFixed(2)}`,
    );
    const safeDue = escapeHtml(fee.dueDate);

    let subject: string;
    let headline: string;
    let bodyHtml: string;
    let bodyText: string;

    if (args.type === "new_fee") {
      subject = `New fee: ${fee.label}`;
      headline = "You have a new fee";
      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;color:#9ba3b8;line-height:1.6;">
          Hi <strong style="color:#e2e8f0;">${safeName}</strong>, a new fee has been added to your account.
        </p>
        <div style="background:#0f1117;border-radius:8px;border:1px solid #2a2d3a;padding:16px 20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:13px;color:#6b7280;">Description</span>
            <span style="font-size:13px;color:#e2e8f0;font-weight:600;">${safeLabel}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:13px;color:#6b7280;">Amount due</span>
            <span style="font-size:15px;color:#b5e853;font-weight:700;">${safeAmount}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:13px;color:#6b7280;">Due date</span>
            <span style="font-size:13px;color:#e2e8f0;">${safeDue}</span>
          </div>
        </div>
        <p style="margin:0 0 20px;font-size:14px;color:#9ba3b8;">Please contact your academy admin if you have questions.</p>`;
      bodyText = `Hi ${fee.athleteName},\n\nA new fee has been added:\n${fee.label}\nAmount: ${fee.currency} ${fee.amountDue.toFixed(2)}\nDue: ${fee.dueDate}\n\nSign in to view details: ${siteUrl()}`;
    } else if (args.type === "reminder" || args.type === "overdue") {
      const isOverdue = args.type === "overdue";
      const safeBalance = escapeHtml(
        `${fee.currency} ${fee.remainingBalance.toFixed(2)}`,
      );
      subject = isOverdue
        ? `Overdue: ${fee.label}`
        : `Reminder: ${fee.label} is due on ${fee.dueDate}`;
      headline = isOverdue ? "A fee is overdue" : "A fee is due soon";
      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;color:#9ba3b8;line-height:1.6;">
          ${isOverdue ? "The fee below for" : "This is a friendly reminder about the fee below for"}
          <strong style="color:#e2e8f0;">${safeName}</strong>${isOverdue ? " has passed its due date." : "."}
        </p>
        <div style="background:#0f1117;border-radius:8px;border:1px solid #2a2d3a;padding:16px 20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:13px;color:#6b7280;">Description</span>
            <span style="font-size:13px;color:#e2e8f0;font-weight:600;">${safeLabel}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:13px;color:#6b7280;">Amount outstanding</span>
            <span style="font-size:15px;color:${isOverdue ? "#ef4444" : "#b5e853"};font-weight:700;">${safeBalance}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:13px;color:#6b7280;">Due date</span>
            <span style="font-size:13px;color:#e2e8f0;">${safeDue}</span>
          </div>
        </div>
        <p style="margin:0 0 20px;font-size:14px;color:#9ba3b8;">If you have already paid, please ignore this message or contact the academy.</p>`;
      bodyText = `${isOverdue ? "Overdue fee" : "Fee due soon"} for ${fee.athleteName}:
${fee.label}
Outstanding: ${fee.currency} ${fee.remainingBalance.toFixed(2)}
Due: ${fee.dueDate}

If you have already paid, please ignore this message or contact the academy.

Sign in for details: ${siteUrl()}`;
    } else if (args.type === "status_change") {
      const status = args.newStatus ?? "updated";
      const statusLabel =
        status === "paid"
          ? "Paid"
          : status === "overdue"
            ? "Overdue"
            : status === "waived"
              ? "Waived"
              : "Updated";
      const statusColor =
        status === "paid"
          ? "#b5e853"
          : status === "overdue"
            ? "#ef4444"
            : "#9ba3b8";
      subject = `Fee status update: ${fee.label}`;
      headline = `Your fee status has been updated`;
      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;color:#9ba3b8;line-height:1.6;">
          Hi <strong style="color:#e2e8f0;">${safeName}</strong>, the status of your fee has changed.
        </p>
        <div style="background:#0f1117;border-radius:8px;border:1px solid #2a2d3a;padding:16px 20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:13px;color:#6b7280;">Fee</span>
            <span style="font-size:13px;color:#e2e8f0;font-weight:600;">${safeLabel}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:13px;color:#6b7280;">New status</span>
            <span style="font-size:14px;font-weight:700;color:${statusColor};">${escapeHtml(statusLabel)}</span>
          </div>
        </div>`;
      bodyText = `Hi ${fee.athleteName},\n\nYour fee "${fee.label}" status has changed to: ${statusLabel}\n\nSign in for details: ${siteUrl()}`;
    } else {
      const paid = args.amountPaid ?? 0;
      subject = `Payment received: ${fee.label}`;
      headline = "Your payment has been received";
      bodyHtml = `
        <p style="margin:0 0 16px;font-size:15px;color:#9ba3b8;line-height:1.6;">
          Hi <strong style="color:#e2e8f0;">${safeName}</strong>, we've recorded your payment.
        </p>
        <div style="background:#0f1117;border-radius:8px;border:1px solid #2a2d3a;padding:16px 20px;margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:13px;color:#6b7280;">Fee</span>
            <span style="font-size:13px;color:#e2e8f0;font-weight:600;">${safeLabel}</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:13px;color:#6b7280;">Amount received</span>
            <span style="font-size:15px;color:#b5e853;font-weight:700;">${escapeHtml(`${fee.currency} ${paid.toFixed(2)}`)}</span>
          </div>
        </div>
        <p style="margin:0;font-size:14px;color:#b5e853;font-weight:600;">Thank you — your fee is now marked as paid.</p>`;
      bodyText = `Hi ${fee.athleteName},\n\nPayment received for "${fee.label}": ${fee.currency} ${paid.toFixed(2)}\nYour fee is now marked as paid.\n\nSign in for details: ${siteUrl()}`;
    }

    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#0f1117;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1117;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1a1d27;border-radius:12px;border:1px solid #2a2d3a;overflow:hidden;">
        <tr><td style="background:#161923;padding:24px 32px;border-bottom:1px solid #2a2d3a;">
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff;">PeakForm <span style="color:#b5e853;">Athletics</span></p>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#fff;">${escapeHtml(headline)}</h1>
          ${bodyHtml}
          <a href="${siteUrl()}" style="display:inline-block;background:#b5e853;color:#0f1117;font-size:14px;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:8px;">View in PeakForm</a>
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #2a2d3a;">
          <p style="margin:0;font-size:12px;color:#4b5563;">PeakForm Athletics — your performance platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    for (const to of recipients) {
      await sendEmail({ to, subject, html, text: bodyText });
    }
  },
});
