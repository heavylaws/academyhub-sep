import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  HeartPulse,
  Lock,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { cn } from "@/lib/utils.ts";
import { AVAILABILITY_CONFIG } from "./athlete-readiness-card.tsx";
import LogInjuryDialog from "./log-injury-dialog.tsx";

interface AthleteInjuriesCardProps {
  athleteId: Id<"athletes">;
  athleteName: string;
  canEditMedical: boolean;
}

const SEVERITY_LABELS: Record<string, string> = {
  minor_1_7_days: "Minor (1–7d)",
  moderate_8_28_days: "Moderate (8–28d)",
  severe_28_plus_days: "Severe (28+d)",
};

const MECHANISM_LABELS: Record<string, string> = {
  non_contact_acute: "Non-Contact Acute",
  non_contact_overload: "Non-Contact Overload",
  contact: "Contact / Trauma",
  illness: "Illness / Viral",
  other: "Other",
};

export default function AthleteInjuriesCard({
  athleteId,
  athleteName,
  canEditMedical,
}: AthleteInjuriesCardProps) {
  const injuries = useQuery(api.injuries.getAthleteInjuries, { athleteId });
  const updateInjury = useMutation(api.injuries.updateInjuryStatus);

  const [logOpen, setLogOpen] = useState(false);
  const [selectedInjury, setSelectedInjury] = useState<Doc<"injuries"> | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [rtpDate, setRtpDate] = useState("");
  const [editRestrictions, setEditRestrictions] = useState("");
  const [editClinical, setEditClinical] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleOpenUpdate = (injury: Doc<"injuries">) => {
    setSelectedInjury(injury);
    setRtpDate(
      injury.expectedReturnDate
        ? new Date(injury.expectedReturnDate).toISOString().split("T")[0]
        : "",
    );
    setEditRestrictions(injury.coachingRestrictions ?? "");
    setEditClinical(injury.clinicalNotes ?? "");
    setResolveDialogOpen(true);
  };

  const handleSaveUpdate = async (markResolved: boolean) => {
    if (!selectedInjury) return;
    setIsUpdating(true);
    try {
      const expectedReturnDateMs = rtpDate
        ? new Date(rtpDate + "T12:00:00").getTime()
        : undefined;

      await updateInjury({
        injuryId: selectedInjury._id,
        isResolved: markResolved ? true : undefined,
        availabilityStatus: markResolved ? "fit" : undefined,
        actualReturnDate: markResolved ? Date.now() : undefined,
        expectedReturnDate: expectedReturnDateMs,
        coachingRestrictions: editRestrictions.trim() || undefined,
        clinicalNotes: editClinical.trim() || undefined,
      });

      toast.success(
        markResolved
          ? "Athlete cleared and injury resolved"
          : "Return-To-Play status updated",
      );
      setResolveDialogOpen(false);
      setSelectedInjury(null);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to update injury",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  if (injuries === undefined) {
    return (
      <Card className="border">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const activeInjuries = injuries.filter((i) => !i.isResolved);
  const resolvedInjuries = injuries.filter((i) => i.isResolved);

  return (
    <>
      <Card className="border">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Stethoscope className="size-4 text-primary" />
              <span>Medical Room & Injury History</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Complete clinical and availability ledger with strict role-based privacy projection
            </CardDescription>
          </div>

          {canEditMedical && (
            <Button
              size="sm"
              onClick={() => setLogOpen(true)}
              className="text-xs gap-1.5 h-8"
            >
              <Plus className="size-3.5" />
              Log Incident
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-6">
          {injuries.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center space-y-2">
              <ShieldCheck className="size-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-sm">Clean Medical Bill</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No active or past injury records registered. Athlete is completely clear for full training and competition.
              </p>
              {canEditMedical && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setLogOpen(true)}
                  className="mt-2 text-xs"
                >
                  <Plus className="size-3.5" />
                  Log Medical Record
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Active Injuries Section */}
              {activeInjuries.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="size-4" />
                    <span>Active Cases & Rehabilitation ({activeInjuries.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {activeInjuries.map((injury) => {
                      const avail =
                        AVAILABILITY_CONFIG[injury.availabilityStatus] ??
                        AVAILABILITY_CONFIG.injured_out;
                      const AvailIcon = avail.icon;

                      return (
                        <div
                          key={injury._id}
                          className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">
                                  {injury.bodyPart}
                                </span>
                                {injury.laterality && injury.laterality !== "not_applicable" && (
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {injury.laterality}
                                  </Badge>
                                )}
                                <span
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border",
                                    avail.badgeClass,
                                  )}
                                >
                                  <AvailIcon className="size-3" />
                                  {avail.label}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                <span>
                                  Mechanism: {MECHANISM_LABELS[injury.mechanism] ?? injury.mechanism}
                                </span>
                                <span>•</span>
                                <span>
                                  Severity: {SEVERITY_LABELS[injury.severity] ?? injury.severity}
                                </span>
                                <span>•</span>
                                <span>
                                  Injured: {new Date(injury.injuryDate).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            {canEditMedical && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenUpdate(injury as Doc<"injuries">)}
                                className="text-xs h-7"
                              >
                                Update RTP / Resolve
                              </Button>
                            )}
                          </div>

                          {/* Expected Return Date */}
                          {injury.expectedReturnDate && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                              <Calendar className="size-3.5 text-primary" />
                              <span>
                                Target Return to Play:{" "}
                                <strong className="text-foreground">
                                  {new Date(injury.expectedReturnDate).toLocaleDateString()}
                                </strong>
                              </span>
                            </div>
                          )}

                          {/* Coaching Restrictions */}
                          {injury.coachingRestrictions && (
                            <div className="rounded-lg bg-background/80 border p-2.5 text-xs">
                              <span className="font-semibold text-foreground">
                                Coaching Restrictions:{" "}
                              </span>
                              <span className="text-muted-foreground">
                                {injury.coachingRestrictions}
                              </span>
                            </div>
                          )}

                          {/* Clinical Notes (Rendered ONLY if present from server) */}
                          {injury.clinicalNotes && (
                            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-2.5 text-xs space-y-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-purple-900 dark:text-purple-300">
                                <span className="flex items-center gap-1">
                                  <Lock className="size-3" />
                                  Clinical Diagnosis & Physio Notes
                                </span>
                                <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                                  Privileged
                                </span>
                              </div>
                              <p className="text-purple-800 dark:text-purple-200/90 whitespace-pre-wrap">
                                {injury.clinicalNotes}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resolved / Past Injuries History */}
              {resolvedInjuries.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    <span>Past Resolved History ({resolvedInjuries.length})</span>
                  </h4>

                  <div className="divide-y rounded-xl border bg-card">
                    {resolvedInjuries.map((injury) => (
                      <div key={injury._id} className="p-3.5 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">
                                {injury.bodyPart}
                              </span>
                              {injury.laterality && injury.laterality !== "not_applicable" && (
                                <Badge variant="outline" className="text-[10px] capitalize">
                                  {injury.laterality}
                                </Badge>
                              )}
                              <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                Resolved / Cleared
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(injury.injuryDate).toLocaleDateString()} —{" "}
                              {injury.actualReturnDate
                                ? `Returned ${new Date(injury.actualReturnDate).toLocaleDateString()}`
                                : "Recovered"}
                            </p>
                          </div>

                          <span className="text-[11px] text-muted-foreground">
                            {SEVERITY_LABELS[injury.severity] ?? injury.severity}
                          </span>
                        </div>

                        {/* Clinical notes if present */}
                        {injury.clinicalNotes && (
                          <div className="rounded bg-muted/40 p-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">Clinical Summary: </span>
                            {injury.clinicalNotes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Injury Modal */}
      {canEditMedical && (
        <LogInjuryDialog
          open={logOpen}
          onOpenChange={setLogOpen}
          athleteId={athleteId}
          athleteName={athleteName}
        />
      )}

      {/* Update RTP / Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Update Medical Case & RTP</DialogTitle>
            <DialogDescription>
              Modify Return-To-Play dates or clear this athlete back to full training.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Expected Return to Play Date</Label>
              <Input
                type="date"
                value={rtpDate}
                onChange={(e) => setRtpDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Coaching Restrictions Directive</Label>
              <Textarea
                placeholder="e.g. Non-contact only, limited minutes..."
                value={editRestrictions}
                onChange={(e) => setEditRestrictions(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            {selectedInjury?.clinicalNotes !== undefined && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Confidential Clinical Notes</Label>
                <Textarea
                  value={editClinical}
                  onChange={(e) => setEditClinical(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSaveUpdate(false)}
              disabled={isUpdating}
              className="sm:mr-auto text-xs"
            >
              {isUpdating ? "Saving..." : "Save Progress"}
            </Button>

            <Button
              type="button"
              onClick={() => handleSaveUpdate(true)}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
            >
              <CheckCircle2 className="size-4" />
              Clear & Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
