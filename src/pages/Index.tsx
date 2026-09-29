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
  Crown,
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
  const [email, setEmail] = useState("heavylaws");
  const [password, setPassword] = useState("//A!t3r3g0");
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

  const handleQuickSuperAdmin = () => {
    setEmail("heavylaws");
    setPassword("//A!t3r3g0");
    const res = localMockStore.authenticateWithPassword(
      "heavylaws",
      "//A!t3r3g0",
    );
    if (res.success) {
      toast.success("Welcome, heavylaws! Signed in as Super Admin.");
    } else {
      toast.error(res.error || "Login failed");
    }
  };

  const isSuperAdminEntry = email.trim().toLowerCase() === "heavylaws";

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
        {/* Quick Admin Button for Super Admin */}
        <div className="mb-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleQuickSuperAdmin}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-left text-xs transition-all hover:bg-rose-500/20"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white shadow-sm">
                <Crown className="size-3.5" />
              </div>
              <div>
                <div className="font-semibold text-foreground">
                  Login as heavylaws (Super Admin)
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  heavylaws &bull; Password: //A!t3r3g0
                </div>
              </div>
            </div>
            <span className="shrink-0 font-medium text-rose-500 hover:underline">
              Sign In &rarr;
            </span>
          </button>
        </div>

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
                placeholder="name@academy.com or heavylaws"
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
              {isSuperAdminEntry && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  //A!t3r3g0
                </span>
              )}
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
            {loading ? "Signing in..." : isSuperAdminEntry ? "Sign In as Super Admin" : "Sign In to Academy"}
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
