import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import AppLayout from "@/components/layout/app-layout.tsx";
import { useCurrentUser, type UserRole } from "@/hooks/use-current-user.ts";

function LoadingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="size-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium animate-pulse">
          Loading CoachTactics...
        </span>
      </div>
    </div>
  );
}

/** Wraps a page that requires sign-in and one of the given roles. Renders inside AppLayout on success. */
export default function ProtectedRoute({
  children,
  allow,
}: {
  children: React.ReactNode;
  allow: UserRole[];
}) {
  const { user, isLoading } = useCurrentUser();

  if (isLoading || user === undefined) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Platform admin has universal access to all management modules
  if (user?.role === "platform_admin" || (user?.role && allow.includes(user.role))) {
    return <AppLayout>{children}</AppLayout>;
  }

  return <Navigate to="/" replace />;
}

