import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Users, ShieldAlert, CheckCircle2, UserCheck } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

interface AssignPlanToTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Doc<"trainingPlans">;
}

export function AssignPlanToTeamDialog({
  open,
  onOpenChange,
  plan,
}: AssignPlanToTeamDialogProps) {
  const teams = useQuery(api.teams.listTeams, open ? {} : "skip");
  const assignPlanToTeam = useMutation(api.trainingPlans.assignPlanToTeam);

  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [skipInjuredOutAthletes, setSkipInjuredOutAthletes] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!selectedTeamId) {
      toast.error("Please choose a team roster");
      return;
    }

    setSubmitting(true);
    try {
      const res = await assignPlanToTeam({
        sourcePlanId: plan._id,
        teamId: selectedTeamId as Id<"teams">,
        skipInjuredOutAthletes,
      });

      const assignedMsg = `${res.assignedCount} athlete${res.assignedCount === 1 ? "" : "s"}`;
      const skippedMsg = res.skippedInjuredCount > 0 ? ` (${res.skippedInjuredCount} injured-out athlete(s) skipped)` : "";
      toast.success(`Plan "${plan.title}" assigned to ${assignedMsg}${skippedMsg}`);

      onOpenChange(false);
      setSelectedTeamId("");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to assign plan to team",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <DialogTitle>Assign Plan to Entire Team</DialogTitle>
          </div>
          <DialogDescription>
            Bulk clone <strong>"{plan.title}"</strong> and all prescribed exercises across a team roster.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Select Target Team</label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue placeholder="Choose a squad / team" />
              </SelectTrigger>
              <SelectContent>
                {(teams || []).map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name} {t.sport ? `(${t.sport})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border p-3.5 bg-muted/20 space-y-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="skipInjured"
                checked={skipInjuredOutAthletes}
                onCheckedChange={(c) => setSkipInjuredOutAthletes(Boolean(c))}
                className="mt-0.5"
              />
              <div className="grid gap-1">
                <label
                  htmlFor="skipInjured"
                  className="text-xs font-semibold leading-none cursor-pointer flex items-center gap-1.5"
                >
                  <ShieldAlert className="size-3.5 text-amber-500" />
                  <span>Protect Injured Players (Medical Room integration)</span>
                </label>
                <p className="text-[11px] text-muted-foreground leading-normal">
                  Automatically skips athletes currently flagged as <strong>Injured - Out</strong> in the academy medical room.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !selectedTeamId} className="font-semibold gap-1.5">
            {submitting && <Spinner className="size-4" />}
            <UserCheck className="size-4" />
            <span>Assign to Team</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
