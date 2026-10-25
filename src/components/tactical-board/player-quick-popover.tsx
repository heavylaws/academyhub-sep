import React, { useState } from "react";
import {
  X,
  Trash2,
  CircleDot,
  Check,
  Plus,
  Minus,
  Sparkles,
  ArrowUpRight,
  Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import type { PlayerNode, PlayerTeam } from "@/domain/tactics/tactical-domain.ts";

interface PlayerQuickPopoverProps {
  player: PlayerNode;
  hasBall: boolean;
  onClose: () => void;
  onUpdatePlayer: (updated: PlayerNode) => void;
  onDeletePlayer: (playerId: string) => void;
  onToggleBallPossession: (playerId: string) => void;
}

const COMMON_ROLES = ["GK", "CB", "LB", "RB", "DM", "CM", "AM", "LW", "RW", "ST"];

export const PlayerQuickPopover: React.FC<PlayerQuickPopoverProps> = ({
  player,
  hasBall,
  onClose,
  onUpdatePlayer,
  onDeletePlayer,
  onToggleBallPossession,
}) => {
  const currentNum = typeof player.number === "number" ? player.number : parseInt(String(player.number), 10) || 1;

  const handleStepNumber = (increment: boolean) => {
    const next = increment ? Math.min(99, currentNum + 1) : Math.max(1, currentNum - 1);
    onUpdatePlayer({ ...player, number: next });
  };

  const handleSetRole = (role: string) => {
    onUpdatePlayer({ ...player, role, label: `${role} #${player.number}` });
  };

  const handleSetTeam = (team: PlayerTeam) => {
    onUpdatePlayer({ ...player, team });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute z-50 bg-popover/95 backdrop-blur-md border border-border/90 rounded-xl p-3 shadow-xl w-64 text-xs animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${Math.min(80, Math.max(20, player.position.x))}%`,
        top: `${player.position.y > 60 ? player.position.y - 25 : player.position.y + 12}%`,
        transform: "translateX(-50%)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="font-mono text-xs px-1.5 py-0 font-bold bg-muted/50">
            #{player.number}
          </Badge>
          <span className="font-bold text-foreground truncate max-w-[120px]">
            {player.label || `Player #${player.number}`}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="size-5 rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      {/* Jersey Number Stepper */}
      <div className="flex items-center justify-between py-1 mb-2">
        <span className="text-[11px] font-semibold text-muted-foreground">Jersey #:</span>
        <div className="inline-flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStepNumber(false)}
            className="size-6 text-xs rounded-md"
          >
            <Minus className="size-3" />
          </Button>
          <span className="font-mono font-bold text-xs px-2 text-center min-w-[24px]">
            {player.number}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStepNumber(true)}
            className="size-6 text-xs rounded-md"
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </div>

      {/* Common Tactical Roles */}
      <div className="mb-2.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Tactical Role
        </span>
        <div className="grid grid-cols-5 gap-1">
          {COMMON_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleSetRole(r)}
              className={`py-1 rounded-md text-[10px] font-bold transition-colors ${
                player.role === r
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Team Assignment */}
      <div className="mb-2.5">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
          Team Assignment
        </span>
        <div className="grid grid-cols-3 gap-1">
          <button
            type="button"
            onClick={() => handleSetTeam("home")}
            className={`py-1 rounded-md text-[10px] font-bold border transition-colors ${
              player.team === "home" || player.team === "gk_home"
                ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:bg-muted"
            }`}
          >
            Home (Blue)
          </button>
          <button
            type="button"
            onClick={() => handleSetTeam("away")}
            className={`py-1 rounded-md text-[10px] font-bold border transition-colors ${
              player.team === "away" || player.team === "gk_away"
                ? "bg-red-600 text-white border-red-500 shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:bg-muted"
            }`}
          >
            Away (Red)
          </button>
          <button
            type="button"
            onClick={() => handleSetTeam("neutral")}
            className={`py-1 rounded-md text-[10px] font-bold border transition-colors ${
              player.team === "neutral"
                ? "bg-amber-500 text-black border-amber-400 shadow-xs"
                : "bg-muted/30 text-muted-foreground hover:bg-muted"
            }`}
          >
            Joker
          </button>
        </div>
      </div>

      {/* Movement / Run Trajectory Section */}
      <div className="mb-2.5 p-2 rounded-lg bg-muted/30 border border-border/50">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight className="size-3 text-primary" /> Movement Run
          </span>
          {player.targetPosition && (
            <Badge variant="outline" className="text-[9px] px-1 py-0 text-emerald-400 border-emerald-500/40 bg-emerald-500/10">
              Target Set
            </Badge>
          )}
        </div>

        {player.targetPosition ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground bg-background/50 px-2 py-1 rounded border">
              <span>Destination:</span>
              <span className="font-mono font-bold text-foreground">
                X: {Math.round(player.targetPosition.x)}%, Y: {Math.round(player.targetPosition.y)}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  onUpdatePlayer({
                    ...player,
                    targetPosition: {
                      x: Math.min(95, Math.max(5, player.targetPosition!.x + (player.team === "away" ? -6 : 6))),
                      y: player.targetPosition!.y,
                    },
                  })
                }
                className="h-6 text-[10px] px-2 flex-1 hover:bg-muted"
                title="Nudge run further"
              >
                +6% Forward
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onUpdatePlayer({ ...player, targetPosition: undefined })}
                className="h-6 text-[10px] px-2 text-destructive border-destructive/40 hover:bg-destructive/10 gap-1 flex-1 font-bold"
                title="Remove movement run"
              >
                <Trash2 className="size-2.5" />
                <span>Remove Run</span>
              </Button>
            </div>
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
            className="w-full h-7 text-[11px] gap-1 font-bold text-primary border-primary/40 hover:bg-primary/10"
          >
            <ArrowUpRight className="size-3" />
            <span>+ Add Run Arrow</span>
          </Button>
        )}
      </div>

      {/* Quick Action Footer: Ball Possession & Delete */}
      <div className="flex items-center justify-between pt-2 border-t border-border/60 gap-1.5">
        <Button
          variant={hasBall ? "default" : "outline"}
          size="sm"
          onClick={() => onToggleBallPossession(player.id)}
          className={`h-7 px-2 text-[11px] gap-1 flex-1 ${
            hasBall ? "bg-amber-500 hover:bg-amber-600 text-black font-bold" : ""
          }`}
        >
          <CircleDot className="size-3" />
          <span>{hasBall ? "Has Ball" : "Give Ball"}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDeletePlayer(player.id)}
          className="size-7 rounded-md text-destructive hover:bg-destructive/10"
          title="Delete player from field"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
};
