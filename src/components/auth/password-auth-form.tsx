import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";

type Step =
  | { kind: "signIn" }
  | { kind: "signUp" }
  | { kind: "verify"; email: string }
  | { kind: "forgot" }
  | { kind: "reset"; email: string };

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  // Convex Auth deliberately reports sign-in failures without details.
  if (
    err instanceof Error &&
    /InvalidSecret|InvalidAccountId/.test(err.message)
  ) {
    return "Incorrect email or password";
  }
  return fallback;
}

/** Email + password sign-in backed by Convex Auth (email verified by one-time code). */
export function PasswordAuthForm() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<Step>({ kind: "signIn" });
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>, fallback: string) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast.error(errorMessage(err, fallback));
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "");

    if (step.kind === "signIn" || step.kind === "signUp") {
      const email = get("email").trim().toLowerCase();
      void run(
        async () => {
          const res = await signIn("password", {
            email,
            password: get("password"),
            flow: step.kind,
            ...(step.kind === "signUp" ? { name: get("name").trim() } : {}),
          });
          // A verification code was emailed instead of signing in.
          if (!res.signingIn) {
            setStep({ kind: "verify", email });
            toast.success(`We emailed a verification code to ${email}`);
          }
        },
        step.kind === "signUp"
          ? "Could not create account"
          : "Incorrect email or password",
      );
    } else if (step.kind === "verify") {
      void run(async () => {
        await signIn("password", {
          email: step.email,
          code: get("code").trim(),
          flow: "email-verification",
        });
      }, "Invalid or expired code");
    } else if (step.kind === "forgot") {
      const email = get("email").trim().toLowerCase();
      void run(async () => {
        await signIn("password", { email, flow: "reset" });
        setStep({ kind: "reset", email });
        toast.success(
          `If an account exists, a reset code was sent to ${email}`,
        );
      }, "Could not send reset code");
    } else {
      void run(async () => {
        await signIn("password", {
          email: step.email,
          code: get("code").trim(),
          newPassword: get("password"),
          flow: "reset-verification",
        });
      }, "Invalid code or password");
    }
  };

  const title = {
    signIn: "Sign in",
    signUp: "Create your account",
    verify: "Check your email",
    forgot: "Reset your password",
    reset: "Choose a new password",
  }[step.kind];

  return (
    <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      <form key={step.kind} onSubmit={onSubmit} className="flex flex-col gap-3">
        {step.kind === "signUp" && (
          <Input
            name="name"
            placeholder="Full name"
            autoComplete="name"
            required
          />
        )}
        {(step.kind === "signIn" ||
          step.kind === "signUp" ||
          step.kind === "forgot") && (
          <Input
            name="email"
            type={step.kind === "signIn" ? "text" : "email"}
            placeholder={
              step.kind === "signIn"
                ? "Username or Email (e.g. AdminHajAli)"
                : "name@domain.com"
            }
            autoComplete={step.kind === "signIn" ? "username" : "email"}
            required
          />
        )}
        {(step.kind === "verify" || step.kind === "reset") && (
          <>
            <p className="text-sm text-muted-foreground">
              Enter the 8-digit code sent to {step.email}.
            </p>
            <Input
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Code"
              required
            />
          </>
        )}
        {(step.kind === "signIn" ||
          step.kind === "signUp" ||
          step.kind === "reset") && (
          <Input
            name="password"
            type="password"
            placeholder={
              step.kind === "signIn"
                ? "Password"
                : "New password (min. 10 characters)"
            }
            autoComplete={
              step.kind === "signIn" ? "current-password" : "new-password"
            }
            minLength={step.kind === "signIn" ? undefined : 10}
            required
          />
        )}
        <Button type="submit" disabled={busy} className="mt-1 h-10 w-full">
          {busy
            ? "Please wait..."
            : {
                signIn: "Sign in",
                signUp: "Create account",
                verify: "Verify email",
                forgot: "Send reset code",
                reset: "Set new password",
              }[step.kind]}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-sm">
        {step.kind === "signIn" ? (
          <>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setStep({ kind: "signUp" })}
            >
              Create an account
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:underline"
              onClick={() => setStep({ kind: "forgot" })}
            >
              Forgot password?
            </button>
          </>
        ) : (
          <button
            type="button"
            className="text-primary hover:underline"
            onClick={() => setStep({ kind: "signIn" })}
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
