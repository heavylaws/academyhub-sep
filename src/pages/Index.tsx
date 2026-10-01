import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useFirebaseAuth } from "@/components/providers/auth-context.ts";
import { FirebaseAuthForm } from "@/components/auth/firebase-auth-form.tsx";
import { EmailVerificationScreen } from "@/components/auth/email-verification-screen.tsx";
import PendingAccess from "./PendingAccess.tsx";
import Dashboard from "./Dashboard.tsx";
import AppLayout from "@/components/layout/app-layout.tsx";

function LandingScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
          <Activity className="size-7" />
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance">
          CoachTactics
        </h1>
        <p className="max-w-md text-sm text-muted-foreground text-balance">
          The soccer coaching and tactical planning platform. Sign in with your verified academy account or register below:
        </p>
      </div>

      {/* Main Authentication Card */}
      <FirebaseAuthForm />
    </div>
  );
}

export default function Index() {
  const {
    firebaseUser,
    isEmailUnverified,
    isResolvingMembership,
    refreshMembership,
    signOut,
    bypassEmailVerification,
    signInWithGoogle,
  } = useFirebaseAuth();
  const { user, isLoading } = useCurrentUser();

  // 1. If signed into Firebase Auth but email is not verified yet
  if (isEmailUnverified) {
    return (
      <EmailVerificationScreen
        email={firebaseUser?.email}
        onVerified={refreshMembership}
        onSignOut={signOut}
        onDevBypass={bypassEmailVerification}
        onSignInWithGoogle={signInWithGoogle}
      />
    );
  }

  // 2. Loading state while authentication or membership is being checked
  if (isResolvingMembership || (firebaseUser && isLoading)) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-40 w-full max-w-md" />
        </div>
      </div>
    );
  }

  // 3. User is signed in and email is verified
  if (user && user.emailVerified) {
    // If user has no academy role assigned
    if (!user.role) {
      return <PendingAccess />;
    }

    // User is active with an academy role
    return (
      <AppLayout>
        <Dashboard />
      </AppLayout>
    );
  }

  // 4. Fallback for mock/test users if active
  if (user && user.role) {
    return (
      <AppLayout>
        <Dashboard />
      </AppLayout>
    );
  }

  // 5. Unauthenticated visitor: show landing screen with email/password auth form
  return <LandingScreen />;
}
