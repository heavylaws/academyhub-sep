import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { KeyRound, Shield, Compass, Sparkles } from "lucide-react";

type Step =
  | { kind: "signIn" }
  | { kind: "signUp" }
  | { kind: "verify"; email: string }
  | { kind: "forgot" }
  | { kind: "reset"; email: string };

const DEMO_PRESETS = [
  {
    label: "Super Admin",
    email: "ah.baalbaki@gmail.com",
    password: "A!t3r3g0",
    icon: Shield,
    badge: "Platform",
  },
  {
    label: "Head Coach",
    email: "adminhajali@academieshub.com",
    password: "hajali2026!",
    icon: Compass,
    badge: "Coach",
  },
  {
    label: "Hercules Coach",
    email: "adminhercules@academieshub.com",
    password: "hercules2026!",
    icon: Sparkles,
    badge: "Academy",
  },
];

function errorMessage(err: unknown, fallback: string): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  if (err instanceof ConvexError && typeof err.data === "string") {
    return err.data;
  }
  // Convex Auth deliberately reports sign-in failures without details.
  if (/InvalidSecret|InvalidAccountId/i.test(msg)) {
    return "Incorrect email or password. You can use one of the quick sign-in credentials below.";
  }
  return fallback;
}

/** Email + password sign-in backed by Convex Auth (email verified by one-time code). */
export function PasswordAuthForm() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<Step>({ kind: "signIn" });
  const [busy, setBusy] = useState(false);
  const [emailVal, setEmailVal] = useState("");
  const [passwordVal, setPasswordVal] = useState("");

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

  const handleQuickSignIn = async (email: string, pass: string) => {
    setEmailVal(email);
    setPasswordVal(pass);
    await run(async () => {
      const res = await signIn("password", {
        email: email.trim().toLowerCase(),
        password: pass,
        flow: "signIn",
      });
      if (res && !res.signingIn) {
        setStep({ kind: "verify", email });
        toast.success(`We emailed a verification code to ${email}`);
      }
    }, "Could not sign in with selected account");
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const get = (k: string) => String(form.get(k) ?? "");

    if (step.kind === "signIn" || step.kind === "signUp") {
      const email = (emailVal || get("email")).trim().toLowerCase();
      const password = passwordVal || get("password");
      void run(
        async () => {
          const res = await signIn("password", {
            email,
            password,
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
    <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {step.kind === "signIn" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Enter your credentials or choose a quick role below.
          </p>
        )}
      </div>

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
            value={emailVal}
            onChange={(e) => setEmailVal(e.target.value)}
            placeholder={
              step.kind === "signIn"
                ? "Email (e.g. adminhajali@academieshub.com)"
                : "name@domain.com"
            }
            autoComplete="email"
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
            value={passwordVal}
            onChange={(e) => setPasswordVal(e.target.value)}
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

      {/* Quick Sign-In Presets for Coach / Admin testing */}
      {step.kind === "signIn" && (
        <div className="pt-2 border-t border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <KeyRound className="size-3 text-primary" />
              <span>Quick Role Sign-In</span>
            </span>
            <span className="text-[10px] text-muted-foreground">1-Tap Fill & Sign In</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.email}
                  type="button"
                  disabled={busy}
                  onClick={() => handleQuickSignIn(preset.email, preset.password)}
                  className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/80 hover:border-primary/40 text-left transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background border border-border/80 group-hover:border-primary/30">
                      <Icon className="size-3.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-semibold text-foreground block truncate">
                        {preset.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono block truncate">
                        {preset.email}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">
                    Sign in &rarr;
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2 text-sm pt-1">
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
