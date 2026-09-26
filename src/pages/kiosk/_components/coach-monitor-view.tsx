import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import type { KioskRosterAthlete } from "./kiosk-roster-grid.tsx";

interface CoachMonitorViewProps {
  roster: KioskRosterAthlete[];
  stats: {
    total: number;
    present: number;
    late: number;
    excused: number;
    absent: number;
    unrecorded: number;
    percentCheckedIn: number;
  };
  onSetStatus: (
    athleteId: string,
    status: "present" | "late" | "absent" | "excused",
  ) => void;
  onBulkMarkAbsent: () => void;
}

export function CoachMonitorView({
  roster,
  stats,
  onSetStatus,
  onBulkMarkAbsent,
}: CoachMonitorViewProps) {
  const [filter, setFilter] = useState<
    "all" | "present" | "late" | "absent" | "unrecorded"
  >("all");

  const displayedAthletes = roster.filter((a) => {
    if (filter === "all") return true;
    return a.status === filter;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stat Pills Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center ${
            filter === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-md"
              : "bg-card border-border hover:bg-muted/50"
          }`}
        >
          <span className="text-2xl font-display font-extrabold">{stats.total}</span>
          <span className="text-[11px] font-medium opacity-80 uppercase tracking-wider">
            Total Squad
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("present")}
          className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center ${
            filter === "present"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
              : "bg-card border-border hover:bg-emerald-500/10"
          }`}
        >
          <span className="text-2xl font-display font-extrabold text-emerald-600 dark:text-emerald-400">
            {stats.present}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            On Time
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("late")}
          className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center ${
            filter === "late"
              ? "bg-amber-600 text-white border-amber-600 shadow-md"
              : "bg-card border-border hover:bg-amber-500/10"
          }`}
        >
          <span className="text-2xl font-display font-extrabold text-amber-600 dark:text-amber-400">
            {stats.late}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Late
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("unrecorded")}
          className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center ${
            filter === "unrecorded"
              ? "bg-blue-600 text-white border-blue-600 shadow-md"
              : "bg-card border-border hover:bg-blue-500/10"
          }`}
        >
          <span className="text-2xl font-display font-extrabold text-blue-600 dark:text-blue-400">
            {stats.unrecorded}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Unchecked
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("absent")}
          className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center ${
            filter === "absent"
              ? "bg-rose-600 text-white border-rose-600 shadow-md"
              : "bg-card border-border hover:bg-rose-500/10"
          }`}
        >
          <span className="text-2xl font-display font-extrabold text-rose-600 dark:text-rose-400">
            {stats.absent}
          </span>
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Absent
          </span>
        </button>
      </div>

      {/* Progress Bar & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border">
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-foreground">Attendance Quota</span>
            <span className="font-mono text-primary font-bold">
              {stats.present + stats.late} / {stats.total} ({stats.percentCheckedIn}%)
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.percentCheckedIn}%` }}
            />
          </div>
        </div>

        {stats.unrecorded > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="h-10 text-xs font-semibold rounded-xl gap-2 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 shrink-0"
              >
                <UserX className="size-4" />
                <span>Mark Remaining Absent ({stats.unrecorded})</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark Unchecked Athletes as Absent?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will mark all {stats.unrecorded} remaining athletes as absent
                  for this session. You can still adjust individual statuses later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onBulkMarkAbsent}>
                  Confirm & Mark Absent
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Table of Athletes */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-bold">Athlete</TableHead>
              <TableHead className="font-bold">Check-In Status</TableHead>
              <TableHead className="font-bold">Timestamp</TableHead>
              <TableHead className="text-right font-bold">Quick Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedAthletes.map((athlete) => {
              const formattedTime = athlete.recordedAt
                ? new Date(athlete.recordedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—";

              return (
                <TableRow key={athlete._id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="font-bold text-sm text-foreground">
                      {athlete.firstName} {athlete.lastName}
                    </div>
                    {athlete.sport && (
                      <div className="text-xs text-muted-foreground">
                        {athlete.sport}
                      </div>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        athlete.status === "present"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs"
                          : athlete.status === "late"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs"
                            : athlete.status === "absent"
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs"
                              : "bg-muted text-muted-foreground text-xs"
                      }
                    >
                      {athlete.status === "present"
                        ? "Present (On Time)"
                        : athlete.status === "late"
                          ? "Late Arrival"
                          : athlete.status === "absent"
                            ? "Absent"
                            : "Unrecorded"}
                    </Badge>
                  </TableCell>

                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formattedTime}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant={athlete.status === "present" ? "default" : "outline"}
                        onClick={() => onSetStatus(athlete._id, "present")}
                        className="h-8 px-2.5 text-xs font-semibold"
                      >
                        Present
                      </Button>
                      <Button
                        size="sm"
                        variant={athlete.status === "late" ? "default" : "outline"}
                        onClick={() => onSetStatus(athlete._id, "late")}
                        className="h-8 px-2.5 text-xs font-semibold"
                      >
                        Late
                      </Button>
                      <Button
                        size="sm"
                        variant={athlete.status === "absent" ? "destructive" : "outline"}
                        onClick={() => onSetStatus(athlete._id, "absent")}
                        className="h-8 px-2.5 text-xs font-semibold"
                      >
                        Absent
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
