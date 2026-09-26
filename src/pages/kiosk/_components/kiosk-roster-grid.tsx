import { useMemo, useState } from "react";
import { Check, Clock, Search, Undo2, UserCheck, Users, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { cn } from "@/lib/utils.ts";

export interface KioskRosterAthlete {
  _id: string;
  firstName: string;
  lastName: string;
  sport?: string;
  hasPin?: boolean;
  status: "present" | "late" | "absent" | "excused" | "unrecorded";
  recordedAt?: string;
}

interface KioskRosterGridProps {
  roster: KioskRosterAthlete[];
  onCheckIn: (athleteId: string) => void;
  onUndo: (athleteId: string) => void;
  isLoading?: boolean;
}

function initials(first: string, last: string) {
  return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
}

export function KioskRosterGrid({
  roster,
  onCheckIn,
  onUndo,
  isLoading,
}: KioskRosterGridProps) {
  const [search, setSearch] = useState("");
  const [onlyUnchecked, setOnlyUnchecked] = useState(false);

  const filtered = useMemo(() => {
    return roster.filter((a) => {
      if (onlyUnchecked && a.status !== "unrecorded") return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
        if (!fullName.includes(q)) return false;
      }
      return true;
    });
  }, [roster, onlyUnchecked, search]);

  return (
    <div className="flex flex-col gap-6">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3.5 bg-card/60 p-4 rounded-2xl border border-border">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search athlete by name…"
            className="h-12 pl-11 pr-10 text-base rounded-xl bg-background border-border"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={onlyUnchecked ? "default" : "outline"}
            onClick={() => setOnlyUnchecked(!onlyUnchecked)}
            className="h-12 px-5 text-sm font-semibold rounded-xl gap-2 transition-all shrink-0"
          >
            <UserCheck className="size-4" />
            <span>Unchecked Only</span>
            {onlyUnchecked && (
              <Badge variant="secondary" className="px-1.5 py-0 text-xs">
                Active
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Roster Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 p-16 text-center">
          <Users className="size-12 text-muted-foreground/40 mb-3" />
          <h3 className="font-display text-lg font-bold text-foreground">
            No athletes found
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1">
            {onlyUnchecked
              ? "All athletes are checked in for this session!"
              : "Try adjusting your search criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((athlete) => {
            const isCheckedIn =
              athlete.status === "present" || athlete.status === "late";
            const isLate = athlete.status === "late";

            const formattedTime = athlete.recordedAt
              ? new Date(athlete.recordedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : null;

            return (
              <div
                key={athlete._id}
                className={cn(
                  "relative flex flex-col justify-between rounded-2xl border p-4 transition-all duration-200",
                  isCheckedIn
                    ? "border-emerald-500/30 bg-emerald-500/[0.04] shadow-sm"
                    : "border-border bg-card hover:border-primary/40 hover:shadow-md",
                )}
              >
                {/* Top: Athlete Avatar & Info */}
                <div className="flex items-start gap-3.5 mb-4">
                  <Avatar className="size-12 rounded-xl ring-2 ring-border/50 shrink-0">
                    <AvatarFallback className="rounded-xl font-display font-bold text-sm bg-primary/10 text-primary">
                      {initials(athlete.firstName, athlete.lastName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-bold text-base text-foreground truncate">
                      {athlete.firstName} {athlete.lastName}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      {athlete.sport && (
                        <span className="text-xs text-muted-foreground truncate">
                          {athlete.sport}
                        </span>
                      )}
                      {athlete.hasPin && (
                        <span className="text-[10px] font-mono text-muted-foreground/60">
                          PIN: ••••
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom: Check-In Action or Checked State */}
                <div>
                  {isCheckedIn ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 text-emerald-600 dark:text-emerald-400">
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <Check className="size-4 stroke-[3]" />
                        <span>{isLate ? "Checked In (Late)" : "Checked In"}</span>
                        {formattedTime && (
                          <span className="text-[11px] font-mono opacity-75">
                            {formattedTime}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onUndo(athlete._id)}
                        className="size-7 rounded-lg text-emerald-700/60 hover:text-destructive hover:bg-destructive/10"
                        title="Undo check-in"
                      >
                        <Undo2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : athlete.status === "absent" ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-destructive/10 border border-destructive/20 px-3 py-2 text-destructive text-xs font-semibold">
                      <span>Marked Absent</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCheckIn(athlete._id)}
                        className="size-7 text-xs"
                      >
                        <Check className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => onCheckIn(athlete._id)}
                      disabled={isLoading}
                      className="w-full h-12 rounded-xl font-bold text-sm gap-2 shadow-md shadow-primary/10 hover:shadow-primary/25 active:scale-[0.98] transition-all"
                    >
                      <UserCheck className="size-4" />
                      <span>TAP TO CHECK IN</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
