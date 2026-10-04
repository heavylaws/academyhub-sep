import React from "react";
import {
  Users,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Shield,
  Layers,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { toast } from "sonner";
import type { PitchType, PlayerNode, PlayerTeam } from "@/domain/tactics/tactical-domain.ts";
import {
  generateSoccerFormat,
  renumberTeam,
  snapToFormation,
  SOCCER_FORMATIONS,
  type SoccerFormat,
  type SoccerFormation,
} from "@/domain/tactics/tactical-formats.ts";

interface SquadStepperToolbarProps {
  players: PlayerNode[];
  pitchType: PitchType;
  onUpdatePlayers: (players: PlayerNode[]) => void;
  onSetGridDimensions?: (dim: string) => void;
  onSetTitle?: (title: string) => void;
  disabled?: boolean;
}

export const SquadStepperToolbar: React.FC<SquadStepperToolbarProps> = ({
  players,
  pitchType,
  onUpdatePlayers,
  onSetGridDimensions,
  onSetTitle,
  disabled = false,
}) => {
  // Counts by team
  const homePlayers = players.filter((p) => p.team === "home" || p.team === "gk_home");
  const awayPlayers = players.filter((p) => p.team === "away" || p.team === "gk_away");
  const neutralPlayers = players.filter((p) => p.team === "neutral");

  // Step Team Players (+1 / -1)
  const handleStepPlayer = (team: PlayerTeam, increment: boolean) => {
    if (disabled) return;

    if (increment) {
      const isHome = team === "home" || team === "gk_home";
      const isAway = team === "away" || team === "gk_away";
      const teamList = isHome ? homePlayers : isAway ? awayPlayers : neutralPlayers;

      const nextNum = teamList.length + 1;
      const id = `${team === "neutral" ? "neu" : isHome ? "h" : "a"}_${Date.now()}`;

      // Smart position coordinates depending on team and pitch type
      let x = isHome ? 35 + (teamList.length * 4) % 45 : 75 - (teamList.length * 4) % 45;
      let y = 20 + (teamList.length * 12) % 65;

      if (pitchType === "attacking_half") {
        x = isHome ? 60 + (teamList.length * 3) % 25 : 80 - (teamList.length * 3) % 20;
      }

      const newPlayer: PlayerNode = {
        id,
        team,
        number: team === "neutral" ? `N${nextNum}` : nextNum,
        role: team === "neutral" ? "NEU" : isHome ? "ATT" : "DEF",
        label: team === "neutral" ? `Joker ${nextNum}` : `${isHome ? "Home" : "Away"} #${nextNum}`,
        position: { x, y },
      };

      onUpdatePlayers([...players, newPlayer]);
      toast.success(`Added ${isHome ? "Home" : isAway ? "Away" : "Neutral"} player #${nextNum}`);
    } else {
      // Decrement: remove highest numbered outfield player
      const isHome = team === "home" || team === "gk_home";
      const isAway = team === "away" || team === "gk_away";
      const targetList = isHome ? homePlayers : isAway ? awayPlayers : neutralPlayers;

      if (targetList.length === 0) return;

      // Avoid deleting GK if outfield players exist
      const outfield = targetList.filter((p) => p.team !== "gk_home" && p.team !== "gk_away" && p.role !== "GK");
      const playerToRemove = outfield.length > 0 ? outfield[outfield.length - 1] : targetList[targetList.length - 1];

      onUpdatePlayers(players.filter((p) => p.id !== playerToRemove.id));
      toast.info(`Removed ${playerToRemove.label}`);
    }
  };

  // Instant Format Application
  const handleSelectFormat = (formatKey: SoccerFormat) => {
    if (disabled) return;
    const res = generateSoccerFormat(formatKey, pitchType);
    onUpdatePlayers(res.players);
    if (onSetGridDimensions) onSetGridDimensions(res.gridDimensions);
    if (onSetTitle) onSetTitle(res.title);
    toast.success(`Applied ${formatKey} formation (${res.players.length} players)`);
  };

  // Formation Snap
  const handleSnapFormation = (formationKey: SoccerFormation, targetTeam: PlayerTeam) => {
    if (disabled) return;
    const snapped = snapToFormation(players, formationKey, targetTeam, pitchType);
    onUpdatePlayers(snapped);
    toast.success(`Snapped ${targetTeam === "home" ? "Home" : "Away"} team into ${SOCCER_FORMATIONS[formationKey].name}`);
  };

  // Renumber Team
  const handleRenumber = (targetTeam: PlayerTeam) => {
    if (disabled) return;
    const renumbered = renumberTeam(players, targetTeam);
    onUpdatePlayers(renumbered);
    toast.success(`Sequentialized ${targetTeam === "home" ? "Home" : "Away"} squad numbers 1–${targetTeam === "home" ? homePlayers.length : awayPlayers.length}`);
  };

  // Clear Team
  const handleClearTeam = (targetTeam: "away" | "neutral" | "all") => {
    if (disabled) return;
    if (targetTeam === "all") {
      onUpdatePlayers([]);
      toast.info("Cleared all players from pitch");
    } else if (targetTeam === "away") {
      onUpdatePlayers(players.filter((p) => p.team !== "away" && p.team !== "gk_away"));
      toast.info("Cleared away sparring squad");
    } else {
      onUpdatePlayers(players.filter((p) => p.team !== "neutral"));
      toast.info("Cleared neutral jokers");
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-card/80 backdrop-blur-md border border-border/80 rounded-xl px-3 py-2 text-xs shadow-xs">
      {/* Left: Game Format Quick Setter */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Users className="size-3.5 text-primary" />
          <span>Format:</span>
        </span>
        <Select onValueChange={(val) => handleSelectFormat(val as SoccerFormat)}>
          <SelectTrigger className="h-8 w-[145px] text-xs font-semibold">
            <SelectValue placeholder="Quick Formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="11v11">⚽ 11v11 Full Match</SelectItem>
            <SelectItem value="10v8">⚔️ 10v8 Attack vs Def</SelectItem>
            <SelectItem value="9v9">🎯 9v9 Middle Third</SelectItem>
            <SelectItem value="7v7">⚡ 7v7 Small Sided</SelectItem>
            <SelectItem value="5v5">🏃 5v5 Mini Pitch</SelectItem>
            <SelectItem value="4v4+3">🔄 4v4 + 3 Neutrals</SelectItem>
            <SelectItem value="3v2">🔥 3v2 Counter Overload</SelectItem>
            <SelectItem value="2v1">⚡ 2v1 Breakaway</SelectItem>
            <SelectItem value="1v1">🥊 1v1 Box Duel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Middle: Live Squad Steppers */}
      <div className="flex items-center gap-2 overflow-x-auto py-0.5">
        {/* Home Team Stepper */}
        <div className="inline-flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 rounded-lg px-2 py-1">
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mr-0.5">
            Home:
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStepPlayer("home", false)}
            disabled={homePlayers.length === 0 || disabled}
            className="size-5 rounded-md hover:bg-blue-500/20 text-blue-700 dark:text-blue-300"
            title="Remove 1 Home player"
          >
            <Minus className="size-3" />
          </Button>
          <span className="font-mono font-bold text-xs px-1 text-foreground min-w-[16px] text-center">
            {homePlayers.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStepPlayer("home", true)}
            disabled={homePlayers.length >= 15 || disabled}
            className="size-5 rounded-md hover:bg-blue-500/20 text-blue-700 dark:text-blue-300"
            title="Add 1 Home player"
          >
            <Plus className="size-3" />
          </Button>

          {/* Home Snap Shape Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-blue-700 dark:text-blue-300 hover:bg-blue-500/20 font-semibold gap-0.5 ml-1"
                title="Arrange Home team formation"
              >
                <span>Shape</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground">
                Home Formations
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleSnapFormation("4-3-3", "home")}>
                4-3-3 Attacking
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnapFormation("4-2-3-1", "home")}>
                4-2-3-1 Double Pivot
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnapFormation("3-5-2", "home")}>
                3-5-2 Wingbacks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnapFormation("4-4-2", "home")}>
                4-4-2 Classic Flat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnapFormation("3-4-3", "home")}>
                3-4-3 Wide Front
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleRenumber("home")}>
                Renumber 1–{homePlayers.length}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Away Team Stepper */}
        <div className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded-lg px-2 py-1">
          <span className="text-[11px] font-bold text-red-600 dark:text-red-400 mr-0.5">
            Away:
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStepPlayer("away", false)}
            disabled={awayPlayers.length === 0 || disabled}
            className="size-5 rounded-md hover:bg-red-500/20 text-red-700 dark:text-red-300"
            title="Remove 1 Away player"
          >
            <Minus className="size-3" />
          </Button>
          <span className="font-mono font-bold text-xs px-1 text-foreground min-w-[16px] text-center">
            {awayPlayers.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStepPlayer("away", true)}
            disabled={awayPlayers.length >= 15 || disabled}
            className="size-5 rounded-md hover:bg-red-500/20 text-red-700 dark:text-red-300"
            title="Add 1 Away player"
          >
            <Plus className="size-3" />
          </Button>

          {/* Away Defensive Snap Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] text-red-700 dark:text-red-300 hover:bg-red-500/20 font-semibold gap-0.5 ml-1"
                title="Arrange Away defensive structure"
              >
                <Shield className="size-2.5" />
                <span>Block</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="text-xs">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground">
                Away Defensive Blocks
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleSnapFormation("4-4-2-low-block", "away")}>
                4-4-2 Compact Low Block
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnapFormation("5-3-2-mid-block", "away")}>
                5-3-2 Mid Block
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleSnapFormation("high-press", "away")}>
                4-3-3 High Press
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleRenumber("away")}>
                Renumber 1–{awayPlayers.length}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleClearTeam("away")}
                className="text-destructive focus:text-destructive"
              >
                Clear Away Team
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Neutrals Stepper */}
        <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mr-0.5">
            Neutrals:
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStepPlayer("neutral", false)}
            disabled={neutralPlayers.length === 0 || disabled}
            className="size-5 rounded-md hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
            title="Remove 1 Neutral player"
          >
            <Minus className="size-3" />
          </Button>
          <span className="font-mono font-bold text-xs px-1 text-foreground min-w-[16px] text-center">
            {neutralPlayers.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleStepPlayer("neutral", true)}
            disabled={neutralPlayers.length >= 6 || disabled}
            className="size-5 rounded-md hover:bg-amber-500/20 text-amber-700 dark:text-amber-300"
            title="Add 1 Neutral joker"
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </div>

      {/* Right: Squad Tools & Batch Actions */}
      <div className="flex items-center gap-1.5 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs gap-1 font-medium"
              title="Batch Squad Tools"
            >
              <SlidersHorizontal className="size-3 text-muted-foreground" />
              <span>Squad Tools</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="text-xs">
            <DropdownMenuLabel className="text-[10px] font-bold uppercase text-muted-foreground">
              Pitch Management
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleRenumber("home")}>
              Renumber Home (1–{homePlayers.length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRenumber("away")}>
              Renumber Away (1–{awayPlayers.length})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleClearTeam("neutral")}>
              Clear Neutrals ({neutralPlayers.length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleClearTeam("away")}>
              Clear Away Team ({awayPlayers.length})
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleClearTeam("all")}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-3 mr-1" />
              <span>Clear Entire Pitch</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
