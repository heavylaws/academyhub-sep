import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Compass,
  Sparkles,
  Users,
  Grid,
  Check,
  Target,
  CircleDot,
  Layers,
} from "lucide-react";
import type { PitchType, SportType, TacticalPlan } from "@/domain/tactics/tactical-domain.ts";
import {
  createBlankTacticalPlan,
  create3v2OverloadTacticalPlan,
  create5v5StarterPlan,
  create7v7StarterPlan,
  TACTICAL_PRESETS,
} from "@/data/tactical-presets.ts";
import {
  createDefaultTacticalPlan,
  createBasketballTacticalPlan,
  createFutsalTacticalPlan,
  createHandballTacticalPlan,
  createVolleyballTacticalPlan,
  createRugbyTacticalPlan,
} from "@/domain/tactics/tactical-domain.ts";

interface NewDrillWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDrillCreated: (plan: TacticalPlan) => void;
}

type SquadStarterId = "blank" | "3v2" | "rondo" | "5v5" | "7v7" | "11v11";

export const NewDrillWizardDialog: React.FC<NewDrillWizardDialogProps> = ({
  open,
  onOpenChange,
  onDrillCreated,
}) => {
  const [drillTitle, setDrillTitle] = useState("");
  const [selectedSport, setSelectedSport] = useState<SportType>("soccer");
  const [selectedPitch, setSelectedPitch] = useState<PitchType>("attacking_half");
  const [selectedSquad, setSelectedSquad] = useState<SquadStarterId>("3v2");

  const handleCreate = () => {
    const finalTitle = drillTitle.trim() || "My Tactical Drill";
    let newPlan: TacticalPlan;

    if (selectedSport !== "soccer") {
      if (selectedSport === "basketball") {
        newPlan = { ...createBasketballTacticalPlan(), title: finalTitle };
      } else if (selectedSport === "futsal") {
        newPlan = { ...createFutsalTacticalPlan(), title: finalTitle };
      } else if (selectedSport === "handball") {
        newPlan = { ...createHandballTacticalPlan(), title: finalTitle };
      } else if (selectedSport === "volleyball") {
        newPlan = { ...createVolleyballTacticalPlan(), title: finalTitle };
      } else {
        newPlan = { ...createRugbyTacticalPlan(), title: finalTitle };
      }
    } else {
      switch (selectedSquad) {
        case "blank":
          newPlan = createBlankTacticalPlan(finalTitle, selectedPitch, "soccer");
          break;
        case "3v2":
          newPlan = { ...create3v2OverloadTacticalPlan(finalTitle), pitchType: selectedPitch };
          break;
        case "rondo": {
          const rondoPreset = TACTICAL_PRESETS.find((p) => p.id === "preset_rondo_4v4_3");
          newPlan = rondoPreset
            ? { ...JSON.parse(JSON.stringify(rondoPreset.plan)), title: finalTitle, pitchType: selectedPitch }
            : createBlankTacticalPlan(finalTitle, selectedPitch, "soccer");
          break;
        }
        case "5v5":
          newPlan = { ...create5v5StarterPlan(finalTitle), pitchType: selectedPitch };
          break;
        case "7v7":
          newPlan = { ...create7v7StarterPlan(finalTitle), pitchType: selectedPitch };
          break;
        case "11v11":
        default:
          newPlan = { ...createDefaultTacticalPlan(finalTitle), pitchType: selectedPitch };
          break;
      }
    }

    onDrillCreated(newPlan);
    onOpenChange(false);
    setDrillTitle("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#0B1523] border border-[#1E3249] text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-white">
            <Sparkles className="size-5 text-[#00E5FF]" />
            Create New Tactical Drill
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400">
            Start fresh or pick a squad template to begin designing your drill without clutter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Step 1: Drill Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">
              Drill Title
            </label>
            <Input
              value={drillTitle}
              onChange={(e) => setDrillTitle(e.target.value)}
              placeholder="e.g. 3v2 Counter-Attack Transition, 4v4 High Press Rondo"
              className="h-9 bg-[#132338] border-[#1E334A] text-white text-xs placeholder:text-gray-500 focus-visible:ring-[#00E5FF]"
              autoFocus
            />
          </div>

          {/* Sport Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300">Sport</label>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: "soccer" as SportType, label: "⚽ Soccer" },
                { id: "basketball" as SportType, label: "🏀 Basketball" },
                { id: "futsal" as SportType, label: "⚡ Futsal" },
                { id: "handball" as SportType, label: "🤾 Handball" },
                { id: "volleyball" as SportType, label: "🏐 Volleyball" },
                { id: "rugby" as SportType, label: "🏉 Rugby" },
              ].map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => setSelectedSport(sp.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedSport === sp.id
                      ? "bg-[#00E5FF]/20 border-[#00E5FF] text-[#00E5FF] font-bold"
                      : "bg-[#132338] border-[#1E334A] text-gray-400 hover:text-white"
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Soccer Pitch Type Selector (only shown for soccer) */}
          {selectedSport === "soccer" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Pitch Section
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "attacking_half" as PitchType, title: "Attacking Half", desc: "Overloads & finishing" },
                  { id: "full" as PitchType, title: "Full Pitch (105×68)", desc: "11v11 & game phases" },
                  { id: "defending_half" as PitchType, title: "Defending Half", desc: "Defensive shape & clearance" },
                  { id: "penalty_box" as PitchType, title: "18-Yard Box", desc: "Crossing & box finishing" },
                  { id: "rondo_grid" as PitchType, title: "Rondo / Grid", desc: "Small-sided possession" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPitch(p.id)}
                    className={`p-2.5 rounded-lg text-left border transition-all ${
                      selectedPitch === p.id
                        ? "bg-[#00E5FF]/15 border-[#00E5FF] text-white"
                        : "bg-[#132338] border-[#1E334A] text-gray-400 hover:text-white hover:border-gray-600"
                    }`}
                  >
                    <div className="font-semibold text-xs text-white">{p.title}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Squad Starter Template (only shown for soccer) */}
          {selectedSport === "soccer" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Starting Squad Setup
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: "3v2" as SquadStarterId,
                    title: "3v2 Counter Overload",
                    desc: "3 Attackers vs 2 Def + GK",
                    badge: "Popular",
                    badgeColor: "bg-[#00E5FF]/20 text-[#00E5FF]",
                  },
                  {
                    id: "rondo" as SquadStarterId,
                    title: "4v4 + 3 Rondos",
                    desc: "4v4 with 3 central jokers",
                    badge: "Possession",
                    badgeColor: "bg-emerald-500/20 text-emerald-400",
                  },
                  {
                    id: "blank" as SquadStarterId,
                    title: "Blank Pitch",
                    desc: "Start with 0 players",
                    badge: "Clean Slate",
                    badgeColor: "bg-gray-500/20 text-gray-300",
                  },
                  {
                    id: "5v5" as SquadStarterId,
                    title: "5v5 Mini Game",
                    desc: "5 vs 5 Diamond + GKs",
                    badge: "Small Sided",
                    badgeColor: "bg-amber-500/20 text-amber-400",
                  },
                  {
                    id: "7v7" as SquadStarterId,
                    title: "7v7 Youth Match",
                    desc: "7 vs 7 Formations",
                    badge: "Youth Form",
                    badgeColor: "bg-indigo-500/20 text-indigo-400",
                  },
                  {
                    id: "11v11" as SquadStarterId,
                    title: "11v11 Full Squad",
                    desc: "Full standard match block",
                    badge: "Match Tactical",
                    badgeColor: "bg-rose-500/20 text-rose-400",
                  },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSquad(s.id)}
                    className={`p-2.5 rounded-lg text-left border relative transition-all ${
                      selectedSquad === s.id
                        ? "bg-[#00E5FF]/15 border-[#00E5FF] text-white"
                        : "bg-[#132338] border-[#1E334A] text-gray-400 hover:text-white hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs text-white">{s.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${s.badgeColor}`}>
                        {s.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-[#1E3249]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-gray-400 hover:text-white text-xs"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleCreate}
            className="bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] font-bold text-xs gap-1.5 shadow-[0_0_12px_rgba(0,229,255,0.3)]"
          >
            <Sparkles className="size-3.5" />
            <span>Create Drill & Open Board</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
