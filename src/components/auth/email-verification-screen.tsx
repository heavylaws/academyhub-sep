import { useState } from "react";
import { Mail, RefreshCw, Send, LogOut, CheckCircle2, ShieldAlert } from "lucide-react";
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

export interface EmailVerificationScreenProps {
  email?: string | null;
  onVerified: () => void;
  onSignOut: () => void;
}

export function EmailVerificationScreen({
  email,
  onVerified,
  onSignOut,
}: EmailVerificationScreenProps) {
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);

  const handleCheckVerification = async () => {
    setChecking(true);
    try {
      const refreshed = await firebaseAuthService.reloadUser();
      if (refreshed?.emailVerified) {
        toast.success("Email verified successfully! Welcome to CoachTactics.");
        onVerified();
      } else {
        toast.error("Email not verified yet. Please click the link in your verification email.");
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
      toast.success(`Verification email resent to ${email || auth.currentUser?.email || "your inbox"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend verification email");
    } finally {
      setResending(false);
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
        <CardContent className="flex flex-col gap-5 pt-2">
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Verification sent to
            </p>
            <p className="text-sm font-semibold text-foreground font-mono mt-1 break-all">
              {email || auth.currentUser?.email || "your email address"}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            <Button
              onClick={handleCheckVerification}
              disabled={checking}
              className="w-full h-10 gap-2 font-semibold shadow-sm"
            >
              <CheckCircle2 className="size-4" />
              {checking ? "Checking status..." : "I've Verified My Email"}
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
              className="w-full h-10 gap-2 text-muted-foreground hover:text-destructive"
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
