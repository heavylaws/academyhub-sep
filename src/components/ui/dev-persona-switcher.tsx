import { useState, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import {
  Users,
  ShieldCheck,
  Crown,
  RotateCcw,
  LogOut,
  ChevronDown,
  ChevronUp,
  Mail,
} from "lucide-react";

import { Input } from "@/components/ui/input.tsx";
import { isLocalDev } from "@/lib/env.ts";

interface PersonaOption {
  id: string;
  name: string;
  email: string;
  role: string;
  label: string;
  icon: typeof ShieldCheck;
  color: string;
}

const PERSONAS: PersonaOption[] = [
  {
    id: "usr_admin",
    name: "Alex Thorne",
    email: "alex.admin@test.local",
    role: "academy_admin",
    label: "Academy Admin",
    icon: ShieldCheck,
    color: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  },
  {
    id: "usr_coach",
    name: "Dave Miller",
    email: "dave.miller@test.local",
    role: "coach",
    label: "Head Coach",
    icon: ShieldCheck,
    color: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  },
];

export function DevPersonaSwitcher() {
  const { signOut: convexSignOut } = useAuthActions();
  const [expanded, setExpanded] = useState(false);
  const [customEmail, setCustomEmail] = useState("");
  const [currentUser, setCurrentUser] = useState(() =>
    localMockStore.getCurrentUser(),
  );

  useEffect(() => {
    if (!isLocalDev) return;
    return localMockStore.subscribeAuth(() => {
      setCurrentUser(localMockStore.getCurrentUser());
    });
  }, []);

  if (!isLocalDev) return null;

  const currentPersona = PERSONAS.find((p) => p.id === currentUser?._id);

  const handleSelectPersona = (id: string) => {
    localMockStore.setPersona(id);
    const p = PERSONAS.find((item) => item.id === id);
    toast.success(`Switched role to ${p?.label} (${p?.name})`);
  };

  const handleSignOut = async () => {
    try {
      await convexSignOut();
    } catch {
      // Ignored
    }
    localMockStore.setPersona(null);
    localMockStore.wipe();
    try {
      localStorage.removeItem("coachtactics_email_bypassed");
      localStorage.removeItem("coachtactics_persona_id_v3");
      localStorage.removeItem("coachtactics_auth_user");
      localStorage.removeItem("coachtactics_active_academy_id");
      sessionStorage.clear();
    } catch {
      // Ignored
    }
    toast.info("Signed out to landing screen");
    window.location.href = "/";
  };

  const handleResetData = () => {
    localMockStore.resetToDefault();
    toast.success("Local database reset to fresh sample data");
  };

  return (
    <aside
      aria-label="Local dev persona switcher"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2 font-sans"
    >
      {/* Expanded Control Panel */}
      {expanded && (
        <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-background/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200 w-80">
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Local Dev Mode Personas
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-mono"
            >
              Offline Mock
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Switch persona to test role-specific dashboards, access controls,
            and permissions:
          </p>

          <div className="grid gap-1.5">
            {PERSONAS.map((persona) => {
              const isSelected = currentUser?._id === persona.id;
              const Icon = persona.icon;
              return (
                <button
                  key={persona.id}
                  onClick={() => handleSelectPersona(persona.id)}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-all ${
                    isSelected
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold leading-tight flex items-center justify-between gap-1.5">
                        <span className="truncate">{persona.name}</span>
                        <Badge
                          variant={isSelected ? "outline" : "secondary"}
                          className="text-[9px] px-1 py-0 font-normal shrink-0"
                        >
                          {persona.label}
                        </Badge>
                      </div>
                      <div
                        className={`text-[10px] font-mono truncate mt-0.5 ${
                          isSelected
                            ? "text-primary-foreground/90"
                            : "text-muted-foreground"
                        }`}
                      >
                        {persona.email}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] font-mono uppercase bg-primary-foreground/20 px-1.5 py-0.5 rounded shrink-0">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Manual Login by Any Email */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!customEmail.trim()) return;
              const u = localMockStore.setPersonaByEmail(customEmail.trim());
              toast.success(
                `Signed in as ${u.name} (${u.role ? u.role.replace("_", " ") : "Pending Member"})`,
              );
              setCustomEmail("");
            }}
            className="flex gap-1.5 pt-1"
          >
            <Input
              value={customEmail}
              onChange={(e) => setCustomEmail(e.target.value)}
              placeholder="Sign in with any email..."
              className="h-8 text-xs font-mono bg-muted/30"
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className="h-8 text-xs shrink-0 gap-1"
            >
              <Mail className="size-3" />
              Login
            </Button>
          </form>

          <div className="flex items-center justify-between border-t pt-2.5 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetData}
              className="h-8 text-xs gap-1.5 flex-1"
            >
              <RotateCcw className="size-3" />
              Reset Data
            </Button>
            {currentUser ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleSignOut}
                className="h-8 text-xs gap-1.5"
              >
                <LogOut className="size-3" />
                Sign Out
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleSelectPersona("usr_admin")}
                className="h-8 text-xs gap-1.5"
              >
                Sign In
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Floating Pill Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2.5 rounded-full border border-border/80 bg-background/90 px-4 py-2 text-xs font-medium shadow-lg backdrop-blur-md transition-all hover:bg-muted hover:shadow-xl active:scale-95"
      >
        <span className="relative flex size-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
        </span>
        {currentUser && currentPersona ? (
          <div className="flex items-center gap-1.5">
            <currentPersona.icon className="size-3.5 text-primary" />
            <span>{currentPersona.name}</span>
            <Badge
              variant="secondary"
              className="px-1.5 py-0 text-[10px] font-normal"
            >
              {currentPersona.label}
            </Badge>
          </div>
        ) : (
          <span className="text-muted-foreground font-normal">
            Signed Out (Click to Switch)
          </span>
        )}
        {expanded ? (
          <ChevronDown className="size-3.5 text-muted-foreground" />
        ) : (
          <ChevronUp className="size-3.5 text-muted-foreground" />
        )}
      </button>
    </aside>
  );
}
