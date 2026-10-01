import { useState } from "react";
import { Mail, RefreshCw, Send, LogOut, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { firebaseAuthService } from "@/services/firebase-auth-service.ts";
import { auth } from "@/lib/firebase.ts";
import { isLocalDev } from "@/lib/env.ts";

export interface EmailVerificationScreenProps {
  email?: string | null;
  onVerified: () => void;
  onSignOut: () => void;
  onDevBypass?: () => void;
  onSignInWithGoogle?: () => Promise<void>;
}

export function EmailVerificationScreen({
  email,
  onVerified,
  onSignOut,
  onDevBypass,
  onSignInWithGoogle,
}: EmailVerificationScreenProps) {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const refreshed = await firebaseAuthService.reloadUser();
      if (refreshed?.emailVerified) {
        toast.success("Email verified successfully! Welcome to CoachTactics.");
        onVerified();
      } else {
        toast.error("Email not verified yet. Please check your inbox or Spam/Junk folder.");
      }
    } catch {
      toast.error("Could not refresh verification status. Please try again.");
    } finally {
      setChecking(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await firebaseAuthService.resendVerification();
      toast.success(
        `Verification email resent to ${email || auth.currentUser?.email || "your inbox"}. Please check your Spam/Junk folder if not in Inbox.`,
        { duration: 6000 },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  const handleGoogleVerify = async () => {
    setGoogleLoading(true);
    try {
      if (onSignInWithGoogle) {
        await onSignInWithGoogle();
      } else {
        await firebaseAuthService.signInWithGoogle();
        onVerified();
      }
      toast.success("Successfully verified with Google!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to authenticate with Google");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md border-border/80 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shadow-md">
            <Mail className="size-7" />
          </div>
          <CardTitle className="font-display text-2xl font-bold tracking-tight">
            Email Verification Required
          </CardTitle>
          <CardDescription className="text-sm mt-1">
            To secure your account and academy data, please verify your email address before using CoachTactics.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-2">
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Verification sent to
            </p>
            <p className="text-sm font-semibold text-foreground font-mono mt-1 break-all">
              {email || auth.currentUser?.email || "your email address"}
            </p>
          </div>

          {/* Email delivery explanation notice */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 text-xs text-muted-foreground flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-500">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>Can&apos;t find the verification email?</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-0.5">
              <li>Check your <strong>Spam / Junk</strong> or <strong>Promotions</strong> folder.</li>
              <li>Sender is: <code className="text-foreground text-[11px] bg-muted/60 px-1 py-0.5 rounded">noreply@gen-lang-client-0418974732.firebaseapp.com</code></li>
              <li>If the email hasn&apos;t arrived, click <strong className="text-foreground">Continue Without Verification</strong> below to enter the workspace immediately.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-2.5">
            {/* Direct bypass option when verification email cannot be delivered */}
            {onDevBypass && (
              <Button
                variant="secondary"
                onClick={() => {
                  toast.success("Verification bypassed. Accessing workspace...");
                  onDevBypass();
                }}
                className="w-full h-11 gap-2 text-sm font-semibold border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 shadow-sm"
              >
                <Sparkles className="size-4 text-primary" />
                Continue Without Verification (Instant Access)
              </Button>
            )}

            <Button
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full h-10 gap-2 font-semibold shadow-sm"
            >
              <CheckCircle2 className="size-4" />
              {checking ? "Checking status..." : "I've Verified My Email"}
            </Button>

            {/* Instant Google Verification option */}
            <Button
              variant="outline"
              disabled={true}
              title="Google Sign-In is temporarily disabled"
              className="w-full h-10 gap-2 border-primary/20 text-muted-foreground font-medium opacity-50 cursor-not-allowed bg-muted/30"
            >
              <svg className="size-4 shrink-0 opacity-60" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google Verification (Temporarily Disabled)</span>
            </Button>

            <Button
              variant="outline"
              onClick={handleResend}
              disabled={resending}
              className="w-full h-10 gap-2"
            >
              <Send className="size-4" />
              {resending ? "Sending..." : "Resend Verification Email"}
            </Button>

            <Button
              variant="ghost"
              onClick={onSignOut}
              className="w-full h-10 gap-2 text-muted-foreground hover:text-destructive text-xs"
            >
              <LogOut className="size-4" />
              Sign Out & Use Another Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
