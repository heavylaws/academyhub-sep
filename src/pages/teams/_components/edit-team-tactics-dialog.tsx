import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Compass, LayoutTemplate } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
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
import { FORMATIONS } from "@/domain/tactics/tactical-domain.ts";

interface EditTeamTacticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: Id<"teams">;
  currentFormation?: string;
  currentPlanId?: Id<"tacticalPlans">;
}

function EditTacticsForm({
  teamId,
  currentFormation,
  currentPlanId,
  onClose,
}: {
  teamId: Id<"teams">;
  currentFormation?: string;
  currentPlanId?: Id<"tacticalPlans">;
  onClose: () => void;
}) {
  const updateTactics = useMutation(api.teams.updateTeamTacticalSetup);
  const tacticalPlans = useQuery(api.tacticalPlans.listTacticalPlans, {});

  const [formation, setFormation] = useState<string>(currentFormation || "4-3-3");
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    currentPlanId ? String(currentPlanId) : "none",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await updateTactics({
        teamId,
        preferredFormation: formation || undefined,
        activeTacticalPlanId:
          selectedPlanId && selectedPlanId !== "none"
            ? (selectedPlanId as Id<"tacticalPlans">)
            : undefined,
      });

      toast.success("Team tactical setup updated");
      onClose();
    } catch {
      toast.error("Failed to update team tactical setup");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Preferred Formation */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs font-medium">
          <LayoutTemplate className="size-3.5 text-muted-foreground" />
          <span>Base Team Formation</span>
        </Label>
        <Select value={formation} onValueChange={setFormation}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select formation" />
          </SelectTrigger>
          <SelectContent>
            {FORMATIONS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Tactical Routine */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5 text-xs font-medium">
          <Compass className="size-3.5 text-muted-foreground" />
          <span>Active Tactical Routine / Playbook Plan</span>
        </Label>
        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Link a saved tactical routine" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No linked routine</SelectItem>
            {(tacticalPlans || []).map((plan) => (
              <SelectItem key={plan._id} value={plan._id}>
                {plan.title} ({plan.pitchType.replace(/_/g, " ")})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Tactical Setup"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function EditTeamTacticsDialog({
  open,
  onOpenChange,
  teamId,
  currentFormation,
  currentPlanId,
}: EditTeamTacticsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <DialogTitle>Team Tactical Architecture</DialogTitle>
          </div>
          <DialogDescription>
            Configure the team's default playing shape and primary playbook tactical plan.
          </DialogDescription>
        </DialogHeader>

        <EditTacticsForm
          key={`${teamId}_${currentFormation || "4-3-3"}_${currentPlanId || "none"}`}
          teamId={teamId}
          currentFormation={currentFormation}
          currentPlanId={currentPlanId}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
