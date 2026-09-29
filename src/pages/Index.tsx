import { useEffect, useRef, useState } from "react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
} from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { PasswordAuthForm } from "@/components/auth/password-auth-form.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { isLocalDev } from "@/lib/env.ts";
import PendingAccess from "./PendingAccess.tsx";
import Dashboard from "./Dashboard.tsx";
import AppLayout from "@/components/layout/app-layout.tsx";
import {
  Activity,
  ShieldCheck,
  Timer,
  User,
  DollarSign,
  ArrowRight,
  Mail,
  Lock,
  Eye,
  EyeOff,
  HeartPulse,
  Sparkles,
  Users,
} from "lucide-react";

function LiveLandingScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
          <Activity className="size-7" />
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance">
          CoachTactics
        </h1>
        <p className="max-w-md text-sm text-muted-foreground text-balance">
          The tactical planning and performance platform for sports academies.
        </p>
      </div>
      <PasswordAuthForm />
    </div>
  );
}

function LandingScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your username or email");
      return;
    }
    setLoading(true);
    try {
      const res = localMockStore.authenticateWithPassword(
        email.trim(),
        password,
      );
      if (!res.success) {
        toast.error(res.error || "Authentication failed");
        setLoading(false);
        return;
      }
      const roleStr = res.user?.role === "platform_admin" ? "Super Admin" : (res.user?.role ?? "User");
      toast.success(
        `Welcome, ${res.user?.name}! Signed in as ${roleStr}.`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign-in error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      {/* Brand Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
          <Activity className="size-7" />
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance">
          PeakForm Athletics
        </h1>
        <p className="max-w-md text-sm text-muted-foreground text-balance">
          The tactical planning and athletic performance platform. Sign in with your account credentials:
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Username or Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="name@academy.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 gap-2 text-sm font-semibold mt-1"
          >
            <Sparkles className="size-4" />
            {loading ? "Signing in..." : "Sign In to Academy"}
          </Button>
        </form>
      </div>
    </div>
  );
}

function IndexAuthenticated() {
  const { user, isLoading } = useCurrentUser();
  const syncUser = useMutation(api.users.updateCurrentUser);
  const synced = useRef(false);

  // Pick up invites / guardian links created after this account was verified.
  useEffect(() => {
    if (isLocalDev || synced.current || !user || user.role) return;
    synced.current = true;
    void syncUser().catch(() => {});
  }, [user, syncUser]);

  if (isLoading || user === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    );
  }

  if (!user || !user.role) {
    return <PendingAccess />;
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  );
}

export default function Index() {
  return (
    <>
      <Unauthenticated>
        {isLocalDev ? <LandingScreen /> : <LiveLandingScreen />}
      </Unauthenticated>
      <AuthLoading>
        <div className="flex min-h-svh items-center justify-center bg-background p-6">
          <Skeleton className="h-40 w-full max-w-md" />
        </div>
      </AuthLoading>
      <Authenticated>
        <IndexAuthenticated />
      </Authenticated>
    </>
  );
}
