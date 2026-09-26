import Resend from "@auth/core/providers/resend";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { DataModel, Id } from "./_generated/dataModel.d.ts";
import type { MutationCtx } from "./_generated/server.js";
import { sendEmail } from "./lib/email.ts";
import { onboardUser } from "./lib/onboarding.ts";

function generateCode(): string {
  const digits = new Uint32Array(8);
  crypto.getRandomValues(digits);
  return Array.from(digits, (d) => (d % 10).toString()).join("");
}

/** Emails an 8-digit one-time code (sign-up verification or password reset). */
function emailCode(id: string, subject: string, intro: string) {
  return Resend({
    id,
    apiKey: process.env.RESEND_API_KEY,
    maxAge: 15 * 60,
    async generateVerificationToken() {
      return generateCode();
    },
    async sendVerificationRequest({ identifier: email, token }) {
      await sendEmail({
        to: email,
        subject,
        text: `${intro}\n\nYour code: ${token}\n\nIt expires in 15 minutes. If you didn't request this, ignore this email.`,
        html: `<p>${intro}</p><p style="font-size:24px;font-weight:700;letter-spacing:4px">${token}</p><p>It expires in 15 minutes. If you didn't request this, ignore this email.</p>`,
      });
    },
  });
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const email = String(params.email ?? "")
          .trim()
          .toLowerCase();
        if (!email.includes("@")) {
          throw new ConvexError("Enter a valid email address");
        }
        const name = typeof params.name === "string" ? params.name.trim() : "";
        return name ? { email, name } : { email };
      },
      validatePasswordRequirements(password) {
        if (password.length < 10) {
          throw new ConvexError("Password must be at least 10 characters");
        }
      },
      verify: emailCode(
        "email-verify",
        "Verify your PeakForm Athletics email",
        "Use this code to verify your email address:",
      ),
      reset: emailCode(
        "password-reset",
        "Reset your PeakForm Athletics password",
        "Use this code to reset your password:",
      ),
    }),
  ],
  callbacks: {
    // Fires on account creation and again after email verification; onboarding
    // only acts once the email is verified.
    async afterUserCreatedOrUpdated(ctx, { userId }) {
      await onboardUser(ctx as unknown as MutationCtx, userId as Id<"users">);
    },
  },
});
