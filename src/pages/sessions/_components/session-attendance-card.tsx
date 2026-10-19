import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HeartPulse,
  ShieldAlert,
  XCircle,
  Zap,
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

// eslint-disable-next-line react-refresh/only-export-components
export const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
  { value: "absent", label: "Absent" },
];

// eslint-disable-next-line react-refresh/only-export-components
export const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  late: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  excused: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  absent: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

export interface MedicalAvailabilityInfo {
  availabilityStatus: string;
  coachingRestrictions?: string;
  bodyPart: string;
}

interface SessionAttendanceCardProps {
  roster: Doc<"athletes">[];
  attendance: Doc<"attendanceRecords">[];
  attendanceByAthlete: Map<Id<"athletes">, Doc<"attendanceRecords">>;
  canManage: boolean;
  medicalAvailabilityByAthlete?: Map<string, MedicalAvailabilityInfo>;
  sessionDurationMinutes?: number;
  onSetStatus: (
    athleteId: Id<"athletes">,
    status: AttendanceStatus,
    durationMinutes?: number,
    rpe?: number,
  ) => Promise<void>;
}

export function SessionAttendanceCard({
  roster,
  attendance,
  attendanceByAthlete,
  canManage,
  medicalAvailabilityByAthlete,
  sessionDurationMinutes = 60,
  onSetStatus,
}: SessionAttendanceCardProps) {
  const [rpeInputs, setRpeInputs] = useState<Record<string, number>>({});
  const [durationInputs, setDurationInputs] = useState<Record<string, number>>({});

  const presentCount = attendance.filter(
    (a) => a.status === "present" || a.status === "late",
  ).length;
  const absentCount = attendance.filter((a) => a.status === "absent").length;
  const excusedCount = attendance.filter((a) => a.status === "excused").length;
  const recordedCount = attendance.length;

  const getEffectiveDuration = (athleteId: string, record?: Doc<"attendanceRecords">) => {
    return durationInputs[athleteId] ?? record?.durationMinutes ?? sessionDurationMinutes;
  };

  const getEffectiveRpe = (athleteId: string, record?: Doc<"attendanceRecords">) => {
    return rpeInputs[athleteId] ?? record?.rpe;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Attendance & Workload Telemetry</CardTitle>
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
                const med = medicalAvailabilityByAthlete?.get(athlete._id);
                const effDuration = getEffectiveDuration(athlete._id, record);
                const effRpe = getEffectiveRpe(athlete._id, record);
                const currentLoad =
                  effDuration && effRpe ? Math.round(effDuration * effRpe) : record?.sessionLoad;

                return (
                  <div key={athlete._id} className="p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-secondary text-xs">
                            {athlete.firstName[0]}
                            {athlete.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-sm text-foreground">
                          {athlete.firstName} {athlete.lastName}
                        </span>

                        {/* Medical Availability Badge */}
                        {med && med.availabilityStatus !== "fit" && (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                              med.availabilityStatus === "modified_training"
                                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                : med.availabilityStatus === "illness"
                                  ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30"
                                  : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
                            )}
                            title={med.coachingRestrictions || `${med.bodyPart}`}
                          >
                            {med.availabilityStatus === "modified_training" ? (
                              <AlertTriangle className="size-3" />
                            ) : med.availabilityStatus === "illness" ? (
                              <HeartPulse className="size-3" />
                            ) : (
                              <ShieldAlert className="size-3" />
                            )}
                            {med.availabilityStatus === "modified_training"
                              ? "Modified"
                              : med.availabilityStatus === "illness"
                                ? "Illness"
                                : "Injured Out"}
                          </span>
                        )}
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

                    {/* Medical restriction warning if applicable */}
                    {med?.coachingRestrictions && (
                      <div className="text-[11px] bg-amber-500/10 text-amber-800 dark:text-amber-300 rounded px-2 py-1 border border-amber-500/20">
                        Directive: {med.coachingRestrictions}
                      </div>
                    )}

                    {canManage && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-muted/40 border border-border/50">
                          {STATUS_OPTIONS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                onSetStatus(
                                  athlete._id,
                                  option.value,
                                  effDuration,
                                  effRpe,
                                )
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

                        {/* Optional RPE & Duration for Present/Late athletes */}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <label className="flex items-center gap-1">
                            <span>Mins:</span>
                            <input
                              type="number"
                              min={1}
                              max={300}
                              value={effDuration}
                              onChange={(e) =>
                                setDurationInputs((prev) => ({
                                  ...prev,
                                  [athlete._id]: parseInt(e.target.value) || 0,
                                }))
                              }
                              className="w-14 h-7 rounded border bg-background px-1 text-center font-mono text-xs"
                            />
                          </label>

                          <label className="flex items-center gap-1">
                            <span>RPE (1-10):</span>
                            <select
                              value={effRpe ?? ""}
                              onChange={(e) => {
                                const newRpe = e.target.value ? parseInt(e.target.value) : undefined;
                                setRpeInputs((prev) => ({
                                  ...prev,
                                  [athlete._id]: newRpe ?? 0,
                                }));
                                if (status && newRpe) {
                                  onSetStatus(athlete._id, status, effDuration, newRpe);
                                }
                              }}
                              className="h-7 rounded border bg-background px-1 text-xs"
                            >
                              <option value="">RPE —</option>
                              {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                                <option key={val} value={val}>
                                  {val}
                                </option>
                              ))}
                            </select>
                          </label>

                          {currentLoad !== undefined && currentLoad > 0 && (
                            <span className="flex items-center gap-0.5 text-primary font-bold ml-auto text-[11px]">
                              <Zap className="size-3" />
                              {currentLoad} AU
                            </span>
                          )}
                        </div>
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
                    <TableHead>Availability</TableHead>
                    <TableHead>Workload Telemetry (sRPE)</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((athlete: Doc<"athletes">) => {
                    const record = attendanceByAthlete.get(athlete._id);
                    const status = record?.status;
                    const med = medicalAvailabilityByAthlete?.get(athlete._id);
                    const effDuration = getEffectiveDuration(athlete._id, record);
                    const effRpe = getEffectiveRpe(athlete._id, record);
                    const currentLoad =
                      effDuration && effRpe ? Math.round(effDuration * effRpe) : record?.sessionLoad;

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

                        {/* Medical Availability */}
                        <TableCell>
                          {med && med.availabilityStatus !== "fit" ? (
                            <div className="flex flex-col gap-0.5 items-start">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                  med.availabilityStatus === "modified_training"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                                    : med.availabilityStatus === "illness"
                                      ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30"
                                      : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
                                )}
                              >
                                {med.availabilityStatus === "modified_training" ? (
                                  <AlertTriangle className="size-3" />
                                ) : med.availabilityStatus === "illness" ? (
                                  <HeartPulse className="size-3" />
                                ) : (
                                  <ShieldAlert className="size-3" />
                                )}
                                {med.availabilityStatus === "modified_training"
                                  ? "Modified Training"
                                  : med.availabilityStatus === "illness"
                                    ? "Illness"
                                    : "Injured - Out"}
                              </span>
                              {med.coachingRestrictions && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={med.coachingRestrictions}>
                                  {med.coachingRestrictions}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                              <CheckCircle2 className="size-3.5" />
                              Fit
                            </span>
                          )}
                        </TableCell>

                        {/* Workload Telemetry */}
                        <TableCell>
                          {canManage ? (
                            <div className="flex items-center gap-2 text-xs">
                              <input
                                type="number"
                                min={1}
                                max={300}
                                placeholder="Min"
                                value={effDuration}
                                onChange={(e) =>
                                  setDurationInputs((prev) => ({
                                    ...prev,
                                    [athlete._id]: parseInt(e.target.value) || 0,
                                  }))
                                }
                                className="w-14 h-8 rounded border bg-background px-1.5 text-center font-mono text-xs"
                                title="Duration in minutes"
                              />
                              <select
                                value={effRpe ?? ""}
                                onChange={(e) => {
                                  const newRpe = e.target.value ? parseInt(e.target.value) : undefined;
                                  setRpeInputs((prev) => ({
                                    ...prev,
                                    [athlete._id]: newRpe ?? 0,
                                  }));
                                  if (status && newRpe) {
                                    onSetStatus(athlete._id, status, effDuration, newRpe);
                                  }
                                }}
                                className="h-8 rounded border bg-background px-2 text-xs"
                                title="Borg CR10 Rate of Perceived Exertion (1-10)"
                              >
                                <option value="">RPE —</option>
                                {Array.from({ length: 10 }, (_, i) => i + 1).map((val) => (
                                  <option key={val} value={val}>
                                    RPE {val}
                                  </option>
                                ))}
                              </select>

                              {currentLoad !== undefined && currentLoad > 0 && (
                                <span className="inline-flex items-center gap-1 font-semibold text-primary text-xs">
                                  <Zap className="size-3" />
                                  {currentLoad} AU
                                </span>
                              )}
                            </div>
                          ) : currentLoad ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                              <Zap className="size-3" />
                              {currentLoad} AU ({effRpe ? `RPE ${effRpe}` : ""})
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {canManage ? (
                            <div className="flex justify-end gap-1">
                              {STATUS_OPTIONS.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() =>
                                    onSetStatus(
                                      athlete._id,
                                      option.value,
                                      effDuration,
                                      effRpe,
                                    )
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
