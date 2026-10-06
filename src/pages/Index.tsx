import { Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { PasswordAuthForm } from "@/components/auth/password-auth-form.tsx";
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
          The soccer coaching and tactical planning platform. Sign in with your academy account or register below:
        </p>
      </div>

      {/* Main Authentication Card */}
      <PasswordAuthForm />
    </div>
  );
}

export default function Index() {
  const { user, isLoading } = useCurrentUser();

  // 1. Loading state while authentication is being resolved
  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-40 w-full max-w-md" />
        </div>
      </div>
    );
  }

  // 2. User is signed in
  if (user) {
    // If user has no academy role assigned yet
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

  // 3. Unauthenticated visitor: show landing screen with email/password auth form
  return <LandingScreen />;
}
