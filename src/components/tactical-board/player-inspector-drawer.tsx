import React from "react";
import {
  X,
  Trash2,
  CircleDot,
  TrendingUp,
  Shield,
  User,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import type { PlayerNode, PlayerTeam } from "@/domain/tactics/tactical-domain.ts";

interface PlayerInspectorDrawerProps {
  player: PlayerNode | null;
  onClose: () => void;
  onUpdatePlayer: (updated: PlayerNode) => void;
  onDeletePlayer: (id: string) => void;
  onToggleBallPossession: (playerId: string) => void;
  hasBall: boolean;
}

const ROLES = [
  "GK",
  "CB",
  "LB",
  "RB",
  "LWB",
  "RWB",
  "DM",
  "CM",
  "AM",
  "LM",
  "RM",
  "LW",
  "RW",
  "ST",
  "CF",
  "Wall",
  "Target",
];

export const PlayerInspectorDrawer: React.FC<PlayerInspectorDrawerProps> = ({
  player,
  onClose,
  onUpdatePlayer,
  onDeletePlayer,
  onToggleBallPossession,
  hasBall,
}) => {
  if (!player) return null;

  return (
    <div className="absolute right-3 top-3 bottom-3 w-72 sm:w-80 bg-background/95 backdrop-blur-md border border-border/80 rounded-xl p-4 shadow-xl z-30 flex flex-col justify-between overflow-y-auto">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-2.5">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs font-mono">
              #{player.number}
            </div>
            <div>
              <h3 className="font-bold text-sm leading-none">{player.label}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{player.role} • Position</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="size-7">
            <X className="size-4" />
          </Button>
        </div>

        {/* Squad Number & Role */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label className="text-xs">Jersey #</Label>
            <Input
              type="text"
              value={player.number}
              onChange={(e) => onUpdatePlayer({ ...player, number: e.target.value })}
              className="h-8 text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Tactical Role</Label>
            <Select
              value={player.role}
              onValueChange={(val) => onUpdatePlayer({ ...player, role: val })}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Team Assignment */}
        <div className="space-y-1">
          <Label className="text-xs">Team / Unit</Label>
          <Select
            value={player.team}
            onValueChange={(val) => onUpdatePlayer({ ...player, team: val as PlayerTeam })}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="home">Home Squad (Blue)</SelectItem>
              <SelectItem value="away">Opposition (Red)</SelectItem>
              <SelectItem value="neutral">Neutral / Wall / Joker (Orange)</SelectItem>
              <SelectItem value="gk_home">Home Goalkeeper (Lime)</SelectItem>
              <SelectItem value="gk_away">Opp. Goalkeeper (Yellow)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Movement Type in this Phase */}
        <div className="space-y-1">
          <Label className="text-xs">Phase Movement Type</Label>
          <Select
            value={player.movementType || "straight_run"}
            onValueChange={(val) =>
              onUpdatePlayer({
                ...player,
                movementType: val as PlayerNode["movementType"],
              })
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="straight_run">Direct Line Run</SelectItem>
              <SelectItem value="overlap">Overlapping Wing Run</SelectItem>
              <SelectItem value="curve_run">Curved Blind-Side Run</SelectItem>
              <SelectItem value="press">Closing Down / Pressing</SelectItem>
              <SelectItem value="hold">Hold Positional Shape</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Movement Destination & Run Trajectory */}
        <div className="p-2.5 rounded-lg bg-muted/30 border border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
              <ArrowUpRight className="size-3.5 text-primary" /> Run Destination
            </Label>
            {player.targetPosition ? (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                Active ({Math.round(player.targetPosition.x)}%, {Math.round(player.targetPosition.y)}%)
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Static</span>
            )}
          </div>

          {player.targetPosition ? (
            <div className="space-y-1.5">
              <p className="text-[11px] text-muted-foreground">
                Player will run to destination circle during this phase. Drag the dashed circle on pitch to adjust.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onUpdatePlayer({ ...player, targetPosition: undefined })}
                className="w-full h-7 text-xs text-destructive border-destructive/40 hover:bg-destructive/10 gap-1 font-bold"
              >
                <Trash2 className="size-3" />
                <span>Remove Movement Run</span>
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const forwardOffset = player.team === "away" || player.team === "gk_away" ? -10 : 10;
                onUpdatePlayer({
                  ...player,
                  targetPosition: {
                    x: Math.min(95, Math.max(5, player.position.x + forwardOffset)),
                    y: player.position.y,
                  },
                });
              }}
              className="w-full h-8 text-xs gap-1 font-bold text-primary border-primary/40 hover:bg-primary/10"
            >
              <ArrowUpRight className="size-3.5" />
              <span>+ Set Run Destination</span>
            </Button>
          )}
        </div>

        {/* Ball Possession Attachment */}
        <div className="pt-1">
          <Button
            type="button"
            variant={hasBall ? "default" : "outline"}
            size="sm"
            onClick={() => onToggleBallPossession(player.id)}
            className="w-full h-8 text-xs gap-1.5 justify-center font-medium"
          >
            <CircleDot className="size-3.5" />
            <span>{hasBall ? "Has Ball (Possession Attached)" : "Pass Ball to Player"}</span>
          </Button>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="border-t pt-3 mt-4 flex items-center justify-between">
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDeletePlayer(player.id)}
          className="h-8 px-2.5 text-xs gap-1 text-white"
        >
          <Trash2 className="size-3.5" />
          <span>Remove</span>
        </Button>
        <Button variant="secondary" size="sm" onClick={onClose} className="h-8 px-3 text-xs">
          Done
        </Button>
      </div>
    </div>
  );
};
