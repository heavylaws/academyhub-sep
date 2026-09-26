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

const TEST_USERS_BY_ROLE = [
  {
    id: "usr_super_admin",
    name: "Ahmad Baalbaki",
    email: "ah.baalbaki@gmail.com",
    role: "Platform Admin (Super Admin)",
    roleBadge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    desc: "SaaS Super Admin: full access to all 3 academies, platform billing, staff and rosters",
    icon: Crown,
    isSuperAdmin: true,
  },
  {
    id: "usr_admin",
    name: "Jane Sterling",
    email: "admin@hercules.com",
    role: "Academy Admin",
    roleBadge: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    desc: "Full academy operations: athletes, rosters, schedule, staff permissions, fees & invoices",
    icon: ShieldCheck,
  },
  {
    id: "usr_coach",
    name: "Dave Miller",
    email: "dave@hercules.com",
    role: "Coach",
    roleBadge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    desc: "Team training: view assigned rosters, log session attendance, create plans",
    icon: Timer,
  },
  {
    id: "usr_athlete",
    name: "Marcus Vance",
    email: "marcus@hercules.com",
    role: "Athlete (Track & Field)",
    roleBadge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    desc: "Athlete portal: personal Sprint Elite schedule, $250 fee ledger & payment history",
    icon: User,
  },
  {
    id: "usr_guardian_mary",
    name: "Mary Vance",
    email: "mary.vance@gmail.com",
    role: "Parent / Guardian",
    roleBadge: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    desc: "Family portal: track Marcus's practice attendance, medical releases, and pay dues",
    icon: HeartPulse,
  },
  {
    id: "usr_athlete_elena",
    name: "Elena Rostova",
    email: "elena@hercules.com",
    role: "Athlete (Gymnastics)",
    roleBadge: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    desc: "Athlete portal: gymnastics team schedule, paid fees & training assessments",
    icon: User,
  },
  {
    id: "usr_accounting",
    name: "Sarah Lin",
    email: "finance@hercules.com",
    role: "Accounting",
    roleBadge: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    desc: "Financial management: fee collections, record partial payments & issue invoices",
    icon: DollarSign,
  },
  {
    id: "usr_platform",
    name: "Alex Woods",
    email: "super@peakform.io",
    role: "Platform Admin",
    roleBadge: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    desc: "SaaS super-admin: oversee all 3 academies and cross-tenant currency billing",
    icon: Crown,
  },
];

function LiveLandingScreen() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-xl shadow-primary/20">
          <Activity className="size-7" />
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-balance">
          PeakForm Athletics
        </h1>
        <p className="max-w-md text-sm text-muted-foreground text-balance">
          The performance and biomechanics platform for sports academies.
        </p>
      </div>
      <PasswordAuthForm />
    </div>
  );
}

function LandingScreen() {
  const [email, setEmail] = useState("ah.baalbaki@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPersonas, setShowPersonas] = useState(true);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your email");
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
      toast.success(
        `Welcome, ${res.user?.name}! Signed in as ${res.user?.role ? res.user.role.replace("_", " ") : "User"}.`,
      );
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Sign-in error");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickSuperAdmin = () => {
    setEmail("ah.baalbaki@gmail.com");
    const res = localMockStore.authenticateWithPassword(
      "ah.baalbaki@gmail.com",
      "",
    );
    if (res.success) {
      toast.success("Welcome, Ahmad Baalbaki! Signed in as Super Admin.");
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
          The performance and biomechanics platform for sports academies. Sign
          in with your credentials below:
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-xl">
        {/* Quick Super Admin Button */}
        <button
          type="button"
          onClick={handleQuickSuperAdmin}
          className="mb-5 flex w-full items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-left text-xs transition-all hover:bg-rose-500/20"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white shadow-sm">
              <Crown className="size-3.5" />
            </div>
            <div>
              <div className="font-semibold text-foreground">
                One-Click Super Admin Login
              </div>
              <div className="text-[11px] text-muted-foreground">
                ah.baalbaki@gmail.com
              </div>
            </div>
          </div>
          <span className="shrink-0 font-medium text-rose-500 hover:underline">
            Sign In &rarr;
          </span>
        </button>

        {/* Credentials Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="email"
                placeholder="name@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-9 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-9 pr-9 text-sm"
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
            {loading ? "Signing in..." : "Sign In to Account"}
          </Button>
        </form>
      </div>

      {/* Test Personas Section */}
      <div className="flex flex-col items-center gap-4 w-full max-w-4xl">
        <div className="flex items-center justify-between w-full border-b pb-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Users className="size-4" />
            <span>Or Select a Demo Persona</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPersonas(!showPersonas)}
            className="h-7 text-xs text-muted-foreground"
          >
            {showPersonas ? "Hide Personas" : "Show All Personas"}
          </Button>
        </div>

        {showPersonas && (
          <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TEST_USERS_BY_ROLE.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.id}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all hover:shadow-lg ${
                    p.isSuperAdmin
                      ? "border-rose-500/40 bg-rose-500/5 hover:border-rose-500"
                      : "border-border/80 bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className="size-4 shrink-0 text-primary" />
                        <span className="font-bold text-xs truncate text-foreground">
                          {p.name}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] font-medium shrink-0 ${p.roleBadge}`}
                      >
                        {p.role.split(" ")[0]}
                      </Badge>
                    </div>

                    <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded truncate">
                      {p.email}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {p.desc}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant={p.isSuperAdmin ? "default" : "outline"}
                    onClick={() => {
                      if (p.id === "usr_super_admin") {
                        handleQuickSuperAdmin();
                      } else {
                        localMockStore.setPersona(p.id);
                        toast.success(`Signed in as ${p.name} (${p.role})`);
                      }
                    }}
                    className="w-full h-8 text-xs font-semibold gap-1.5 mt-2"
                  >
                    <span>Login as {p.name.split(" ")[0]}</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
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
