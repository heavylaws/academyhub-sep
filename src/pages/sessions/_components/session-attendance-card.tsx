import {
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

export type AttendanceStatus = "present" | "absent" | "excused" | "late";

export const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
  { value: "absent", label: "Absent" },
];

export const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  late: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  excused: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  absent: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

interface SessionAttendanceCardProps {
  roster: Doc<"athletes">[];
  attendance: Doc<"attendanceRecords">[];
  attendanceByAthlete: Map<Id<"athletes">, Doc<"attendanceRecords">>;
  canManage: boolean;
  onSetStatus: (athleteId: Id<"athletes">, status: AttendanceStatus) => Promise<void>;
}

export function SessionAttendanceCard({
  roster,
  attendance,
  attendanceByAthlete,
  canManage,
  onSetStatus,
}: SessionAttendanceCardProps) {
  const presentCount = attendance.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const excusedCount = attendance.filter((a) => a.status === "excused").length;
  const recordedCount = attendance.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Attendance</CardTitle>
            <span className="text-sm text-muted-foreground">
              {recordedCount}/{roster.length} recorded
            </span>
          </div>
          {/* Summary chips */}
          {roster.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-secondary px-2.5 py-1 text-xs font-medium">
                <CheckCircle2 className="size-3.5 text-accent-foreground" />
                {presentCount} present / late
              </span>
              {absentCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                  <XCircle className="size-3.5" />
                  {absentCount} absent
                </span>
              )}
              {excusedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Clock className="size-3.5" />
                  {excusedCount} excused
                </span>
              )}
              {roster.length - recordedCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {roster.length - recordedCount} not recorded
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {roster.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CheckCircle2 />
              </EmptyMedia>
              <EmptyTitle>No athletes on this team</EmptyTitle>
              <EmptyDescription>
                Add athletes to the team's roster to track attendance.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div>
            {/* Mobile View: High-ergonomics touch attendance cards */}
            <div className="flex flex-col divide-y sm:hidden -mx-2">
              {roster.map((athlete: Doc<"athletes">) => {
                const record = attendanceByAthlete.get(athlete._id);
                const status = record?.status;

                return (
                  <div key={athlete._id} className="p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-secondary text-xs">
                            {athlete.firstName[0]}
                            {athlete.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm text-foreground">
                          {athlete.firstName} {athlete.lastName}
                        </span>
                      </div>

                      {status && (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                            STATUS_STYLES[status],
                          )}
                        >
                          {status === "present" ? (
                            <CheckCircle2 className="size-2.5" />
                          ) : status === "absent" ? (
                            <XCircle className="size-2.5" />
                          ) : (
                            <Clock className="size-2.5" />
                          )}
                          {STATUS_OPTIONS.find((o) => o.value === status)?.label}
                        </span>
                      )}
                    </div>

                    {canManage && (
                      <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted/40 border border-border/50">
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              onSetStatus(athlete._id, option.value)
                            }
                            className={cn(
                              "h-9 rounded-lg text-xs font-semibold transition-all active:scale-95 flex items-center justify-center",
                              status === option.value
                                ? STATUS_STYLES[option.value] + " shadow-xs font-bold"
                                : "text-muted-foreground hover:bg-background/80 hover:text-foreground",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop View: Table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Athlete</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((athlete: Doc<"athletes">) => {
                    const record = attendanceByAthlete.get(athlete._id);
                    const status = record?.status;
                    return (
                      <TableRow key={athlete._id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-secondary text-xs">
                                {athlete.firstName[0]}
                                {athlete.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {athlete.firstName} {athlete.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {canManage ? (
                            <div className="flex justify-end gap-1">
                              {STATUS_OPTIONS.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    onSetStatus(athlete._id, option.value)
                                  }
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                                    status === option.value
                                      ? STATUS_STYLES[option.value]
                                      : "border-transparent text-muted-foreground hover:bg-accent",
                                  )}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          ) : status ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium",
                                STATUS_STYLES[status],
                              )}
                            >
                              {status === "present" ? (
                                <CheckCircle2 className="size-3" />
                              ) : status === "absent" ? (
                                <XCircle className="size-3" />
                              ) : (
                                <Clock className="size-3" />
                              )}
                              {
                                STATUS_OPTIONS.find((o) => o.value === status)
                                  ?.label
                              }
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Not recorded
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
