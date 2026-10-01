import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import AppLayout from "@/components/layout/app-layout.tsx";
import { useCurrentUser, type UserRole } from "@/hooks/use-current-user.ts";
import { useFirebaseAuth } from "@/components/providers/auth-context.ts";

function LoadingScreen() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <Skeleton className="h-40 w-full max-w-md" />
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
  const { firebaseUser, isResolvingMembership } = useFirebaseAuth();
  const { user, isLoading } = useCurrentUser();

  if (isLoading || isResolvingMembership || (firebaseUser && user === undefined)) {
    return <LoadingScreen />;
  }

  if (!firebaseUser && !user) {
    return <Navigate to="/" replace />;
  }

  // Platform admin has universal access to all management modules
  if (user?.role === "platform_admin" || (user?.role && allow.includes(user.role))) {
    return <AppLayout>{children}</AppLayout>;
  }

  return <Navigate to="/" replace />;
}

