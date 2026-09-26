/**
 * Transactional email via Resend's HTTP API (https://resend.com).
 * Requires Convex env vars RESEND_API_KEY and EMAIL_FROM
 * (e.g. "PeakForm Athletics <no-reply@your-domain.com>", on a domain verified in Resend).
 */
export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  // Local testing only: print emails (incl. sign-up codes) to the Convex logs
  // instead of sending them. Never set EMAIL_DEV_LOG on a real deployment.
  if (process.env.EMAIL_DEV_LOG === "true") {
    console.log(
      `[EMAIL_DEV_LOG] to=${message.to} subject=${message.subject}
${message.text ?? message.html}`,
    );
    return;
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error(
      "Email is not configured: set RESEND_API_KEY and EMAIL_FROM",
    );
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, ...message }),
  });
  if (!res.ok) {
    throw new Error(`Resend error ${res.status}: ${await res.text()}`);
  }
}

/** Public URL of the frontend, used for links in emails. */
export function siteUrl(): string {
  return (process.env.SITE_URL ?? "").replace(/\/$/, "");
}
