import { useState } from "react";
import { useQuery } from "convex/react";
import { toast } from "sonner";
import { Users, Shield, ArrowRight } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
  type PlayerNode,
  type TacticalPlan,
  buildSquadPlayerNodes,
} from "@/domain/tactics/tactical-domain.ts";

interface LoadSquadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activePlan: TacticalPlan;
  onDeploySquad: (newPlayers: PlayerNode[]) => void;
}

export default function LoadSquadDialog({
  open,
  onOpenChange,
  activePlan,
  onDeploySquad,
}: LoadSquadDialogProps) {
  const teams = useQuery(api.teams.listTeams, {});
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");

  const teamData = useQuery(
    api.teams.getTeam,
    selectedTeamId ? { teamId: selectedTeamId as Id<"teams"> } : "skip",
  );

  const handleDeploy = () => {
    if (!teamData || teamData.roster.length === 0) {
      toast.error("Please select a team with athletes on the roster");
      return;
    }

    const deployedPlayers = buildSquadPlayerNodes(
      teamData.team.name,
      teamData.team.preferredFormation || "4-3-3",
      teamData.roster,
      activePlan.pitchType,
    );

    onDeploySquad(deployedPlayers);
    toast.success(`Deployed ${deployedPlayers.length} athletes from ${teamData.team.name} onto board!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <DialogTitle>Deploy Squad Roster</DialogTitle>
          </div>
          <DialogDescription>
            Select a team to populate the tactical pitch with real squad athletes, jersey numbers, and assigned positions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Team selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Select Squad</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {(teams || []).map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name} ({t.memberCount} athletes)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Roster preview */}
          {teamData && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs">{teamData.team.name}</span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {teamData.team.preferredFormation || "4-3-3"}
                </Badge>
              </div>

              {teamData.roster.length === 0 ? (
                <p className="text-xs text-muted-foreground">No athletes currently on this squad.</p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y text-xs">
                  {teamData.roster.map((athlete) => (
                    <div key={athlete._id} className="py-1.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {athlete.jerseyNumber !== undefined && (
                          <span className="font-mono font-bold text-muted-foreground">
                            #{athlete.jerseyNumber}
                          </span>
                        )}
                        <span>{athlete.firstName} {athlete.lastName}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {athlete.tacticalPosition || "CM"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={!teamData || teamData.roster.length === 0}
            className="gap-1.5"
          >
            <span>Deploy onto Pitch</span>
            <ArrowRight className="size-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
