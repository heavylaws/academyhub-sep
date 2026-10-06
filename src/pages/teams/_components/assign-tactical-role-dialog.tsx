import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Shield, Shirt } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
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
import {
  SOCCER_POSITIONS,
  SOCCER_ROLES,
} from "@/domain/tactics/tactical-domain.ts";

interface AssignTacticalRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: Id<"teams">;
  athlete: {
    _id: Id<"athletes">;
    firstName: string;
    lastName: string;
    jerseyNumber?: number;
    tacticalPosition?: string;
    tacticalRole?: string;
  } | null;
}

function AssignRoleForm({
  teamId,
  athlete,
  onClose,
}: {
  teamId: Id<"teams">;
  athlete: NonNullable<AssignTacticalRoleDialogProps["athlete"]>;
  onClose: () => void;
}) {
  const assignRole = useMutation(api.teams.assignAthleteTacticalRole);
  const [jerseyNumber, setJerseyNumber] = useState<string>(
    athlete.jerseyNumber !== undefined ? String(athlete.jerseyNumber) : "",
  );
  const [tacticalPosition, setTacticalPosition] = useState<string>(
    athlete.tacticalPosition || "",
  );
  const [tacticalRole, setTacticalRole] = useState<string>(
    athlete.tacticalRole || "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parsedJersey = jerseyNumber ? parseInt(jerseyNumber, 10) : undefined;
      await assignRole({
        teamId,
        athleteId: athlete._id,
        jerseyNumber: isNaN(parsedJersey as number) ? undefined : parsedJersey,
        tacticalPosition: tacticalPosition || undefined,
        tacticalRole: tacticalRole || undefined,
      });

      toast.success(`Tactical role updated for ${athlete.firstName} ${athlete.lastName}`);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string })?.message || error.message)
          : "Failed to update tactical role",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Jersey Number */}
      <div className="space-y-1.5">
        <Label htmlFor="jersey" className="flex items-center gap-1.5 text-xs font-medium">
          <Shirt className="size-3.5 text-muted-foreground" />
          <span>Squad Jersey Number (1–99)</span>
        </Label>
        <Input
          id="jersey"
          type="number"
          min={1}
          max={99}
          placeholder="e.g. 10"
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Tactical Position */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Primary Tactical Position</Label>
        <Select value={tacticalPosition} onValueChange={setTacticalPosition}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select pitch position" />
          </SelectTrigger>
          <SelectContent>
            {SOCCER_POSITIONS.map((pos) => (
              <SelectItem key={pos.value} value={pos.value}>
                {pos.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tactical Role / Player Profile */}
      <div className="space-y-1.5">
        <Label className="text-xs font-medium">Tactical Duty & Role</Label>
        <Select value={tacticalRole} onValueChange={setTacticalRole}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select specific tactical role" />
          </SelectTrigger>
          <SelectContent>
            {SOCCER_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {role}
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
          {isSubmitting ? "Saving..." : "Save Tactical Assignment"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function AssignTacticalRoleDialog({
  open,
  onOpenChange,
  teamId,
  athlete,
}: AssignTacticalRoleDialogProps) {
  if (!athlete) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-primary" />
            <DialogTitle>Tactical Assignment</DialogTitle>
          </div>
          <DialogDescription>
            Assign jersey number, tactical position, and pitch role for{" "}
            <span className="font-semibold text-foreground">
              {athlete.firstName} {athlete.lastName}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <AssignRoleForm
          key={athlete._id}
          teamId={teamId}
          athlete={athlete}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
