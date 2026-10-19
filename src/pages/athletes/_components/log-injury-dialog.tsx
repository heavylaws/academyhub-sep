import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { AlertCircle, Lock, Stethoscope } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";

interface LogInjuryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: Id<"athletes">;
  athleteName: string;
}

const BODY_PARTS = [
  "Hamstring",
  "Quadriceps",
  "Groin / Adductor",
  "Calf",
  "Knee (ACL/MCL/Meniscus)",
  "Ankle",
  "Foot / Toe",
  "Shoulder",
  "Elbow / Wrist",
  "Back / Spine",
  "Hip",
  "Concussion / Head",
  "General Illness / Viral",
  "Other",
];

export default function LogInjuryDialog({
  open,
  onOpenChange,
  athleteId,
  athleteName,
}: LogInjuryDialogProps) {
  const logInjury = useMutation(api.injuries.logInjuryRecord);

  const [availabilityStatus, setAvailabilityStatus] = useState<
    "fit" | "modified_training" | "injured_out" | "illness"
  >("injured_out");
  const [bodyPart, setBodyPart] = useState("Hamstring");
  const [customBodyPart, setCustomBodyPart] = useState("");
  const [laterality, setLaterality] = useState<
    "left" | "right" | "bilateral" | "midline" | "not_applicable"
  >("left");
  const [mechanism, setMechanism] = useState<
    "contact" | "non_contact_overload" | "non_contact_acute" | "illness" | "other"
  >("non_contact_acute");
  const [severity, setSeverity] = useState<
    "minor_1_7_days" | "moderate_8_28_days" | "severe_28_plus_days"
  >("moderate_8_28_days");
  const [injuryDate, setInjuryDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [coachingRestrictions, setCoachingRestrictions] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const resolvedBodyPart =
      bodyPart === "Other" ? customBodyPart.trim() || "Other" : bodyPart;

    try {
      const injuryDateMs = new Date(injuryDate + "T12:00:00").getTime();
      const expectedReturnDateMs = expectedReturnDate
        ? new Date(expectedReturnDate + "T12:00:00").getTime()
        : undefined;

      await logInjury({
        athleteId,
        availabilityStatus,
        bodyPart: resolvedBodyPart,
        laterality,
        mechanism,
        severity,
        injuryDate: injuryDateMs,
        expectedReturnDate: expectedReturnDateMs,
        coachingRestrictions: coachingRestrictions.trim() || undefined,
        clinicalNotes: clinicalNotes.trim() || undefined,
      });

      toast.success("Medical incident recorded successfully");
      onOpenChange(false);
      // Reset form
      setCoachingRestrictions("");
      setClinicalNotes("");
      setExpectedReturnDate("");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to log medical record",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="size-5 text-primary" />
            <span>Log Medical Record & Availability</span>
          </DialogTitle>
          <DialogDescription>
            Record an injury, illness, or modified training protocol for {athleteName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Availability Status */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Availability Status *</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: "injured_out", label: "Injured - Sidelined" },
                { value: "modified_training", label: "Modified Training" },
                { value: "illness", label: "Illness / Inactive" },
                { value: "fit", label: "Fit / Cleared" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setAvailabilityStatus(
                      opt.value as "fit" | "modified_training" | "injured_out" | "illness",
                    )
                  }
                  className={`px-2.5 py-2 rounded-lg text-xs font-medium border text-center transition-all ${
                    availabilityStatus === opt.value
                      ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body Part & Laterality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Body Part / Anatomical Site *</Label>
              <select
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {BODY_PARTS.map((bp) => (
                  <option key={bp} value={bp}>
                    {bp}
                  </option>
                ))}
              </select>
              {bodyPart === "Other" && (
                <Input
                  placeholder="Specify body part..."
                  value={customBodyPart}
                  onChange={(e) => setCustomBodyPart(e.target.value)}
                  className="mt-1 text-xs"
                  required
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Laterality</Label>
              <select
                value={laterality}
                onChange={(e) =>
                  setLaterality(
                    e.target.value as "left" | "right" | "bilateral" | "midline" | "not_applicable",
                  )
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="left">Left Side</option>
                <option value="right">Right Side</option>
                <option value="bilateral">Bilateral</option>
                <option value="midline">Midline</option>
                <option value="not_applicable">Not Applicable</option>
              </select>
            </div>
          </div>

          {/* Mechanism & Severity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mechanism *</Label>
              <select
                value={mechanism}
                onChange={(e) =>
                  setMechanism(
                    e.target.value as
                      | "contact"
                      | "non_contact_overload"
                      | "non_contact_acute"
                      | "illness"
                      | "other",
                  )
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="non_contact_acute">Non-Contact (Acute Sprint/Jump)</option>
                <option value="non_contact_overload">Non-Contact (Overload / Overuse)</option>
                <option value="contact">Contact (Tackle / Collision)</option>
                <option value="illness">Illness / Infection</option>
                <option value="other">Other / Trauma</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Estimated Severity *</Label>
              <select
                value={severity}
                onChange={(e) =>
                  setSeverity(
                    e.target.value as
                      | "minor_1_7_days"
                      | "moderate_8_28_days"
                      | "severe_28_plus_days",
                  )
                }
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="minor_1_7_days">Minor (1–7 days)</option>
                <option value="moderate_8_28_days">Moderate (8–28 days)</option>
                <option value="severe_28_plus_days">Severe (28+ days)</option>
              </select>
            </div>
          </div>

          {/* Injury Date & Expected Return */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Onset / Injury Date *</Label>
              <Input
                type="date"
                value={injuryDate}
                onChange={(e) => setInjuryDate(e.target.value)}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Expected Return to Play (RTP)</Label>
              <Input
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Coaching Restrictions */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                Coaching & Training Restrictions
              </Label>
              <span className="text-[11px] text-muted-foreground">Visible to Coaches</span>
            </div>
            <Textarea
              placeholder="e.g. Max 45 mins, no contact drills, no high-speed sprint >70% intensity..."
              value={coachingRestrictions}
              onChange={(e) => setCoachingRestrictions(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>

          {/* Confidential Clinical Notes */}
          <div className="space-y-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-purple-900 dark:text-purple-300">
                <Lock className="size-3.5" />
                Confidential Clinical & Physio Notes
              </Label>
              <span className="text-[10px] uppercase font-bold text-purple-600 dark:text-purple-400">
                Medical Staff Only
              </span>
            </div>
            <Textarea
              placeholder="Clinical diagnosis, palpation findings, treatment plan, MRI notes, etc. Strictly restricted to medical staff, sporting director & platform admin."
              value={clinicalNotes}
              onChange={(e) => setClinicalNotes(e.target.value)}
              className="text-xs min-h-[70px] bg-background"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Save Medical Record"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
