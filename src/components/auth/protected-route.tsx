import { Navigate } from "react-router-dom";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import AppLayout from "@/components/layout/app-layout.tsx";
import { useCurrentUser, type UserRole } from "@/hooks/use-current-user.ts";

function SignInScreen() {
  return <Navigate to="/" replace />;
}

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
  return (
    <>
      <Unauthenticated>
        <SignInScreen />
      </Unauthenticated>
      <AuthLoading>
        <LoadingScreen />
      </AuthLoading>
      <Authenticated>
        <RoleGate allow={allow}>{children}</RoleGate>
      </Authenticated>
    </>
  );
}

function RoleGate({
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
  if (!user || !user.role || !allow.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <AppLayout>{children}</AppLayout>;
}
