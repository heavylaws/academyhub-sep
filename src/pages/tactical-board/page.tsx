import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/app-layout.tsx";
import { TacticalBoard } from "@/components/tactical-board/tactical-board.tsx";
import {
  type TacticalPlan,
  createDefaultTacticalPlan,
} from "@/domain/tactics/tactical-domain.ts";
import { SOCCER_DRILLS } from "@/data/soccer-drills.ts";
import {
  Compass,
  ArrowLeft,
  Sparkles,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { academyFirestoreService } from "@/services/academy-firestore-service.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";

const TACTICAL_PRESETS: Array<{ id: string; title: string; category: string; plan: TacticalPlan }> = [
  {
    id: "preset_433_buildup",
    title: "4-3-3 Build-up vs 4-4-2 High Press Block",
    category: "Positional Play",
    plan: createDefaultTacticalPlan("4-3-3 Build-up vs 4-4-2 High Press Block"),
  },
  {
    id: "preset_rondo_4v4_3",
    title: "4v4 + 3 Neutral Jokers Directional Rondo",
    category: "Passing & Rondos",
    plan: {
      id: "plan_rondo",
      title: "4v4 + 3 Directional Possession Rondo",
      pitchType: "rondo_grid",
      gridDimensions: "30m × 30m Grid",
      coachingPoints: [
        "Play through the central #6 neutral player whenever possible.",
        "Wide neutrals create maximum width on the boundary touchlines.",
        "Defenders press in pairs to close the central passing lane.",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phases: [
        {
          id: "p1",
          phaseNumber: 1,
          title: "Possession Circulation",
          durationSeconds: 3,
          coachingNotes: "Blue retains ball with central joker.",
          players: [
            // Blue possession
            { id: "b1", team: "home", number: 4, role: "CB", label: "Blue 4", position: { x: 25, y: 30 } },
            { id: "b2", team: "home", number: 5, role: "CB", label: "Blue 5", position: { x: 25, y: 70 } },
            { id: "b3", team: "home", number: 8, role: "CM", label: "Blue 8", position: { x: 75, y: 30 } },
            { id: "b4", team: "home", number: 10, role: "AM", label: "Blue 10", position: { x: 75, y: 70 } },
            // Red pressing
            { id: "r1", team: "away", number: 6, role: "DM", label: "Red 6", position: { x: 42, y: 44 } },
            { id: "r2", team: "away", number: 8, role: "CM", label: "Red 8", position: { x: 42, y: 56 } },
            { id: "r3", team: "away", number: 9, role: "ST", label: "Red 9", position: { x: 58, y: 44 } },
            { id: "r4", team: "away", number: 11, role: "ST", label: "Red 11", position: { x: 58, y: 56 } },
            // Orange jokers
            { id: "j_mid", team: "neutral", number: "J", role: "Pivot", label: "Central Joker", position: { x: 50, y: 50 }, hasBall: true },
            { id: "j_top", team: "neutral", number: "J", role: "Width", label: "Top Joker", position: { x: 50, y: 18 } },
            { id: "j_bot", team: "neutral", number: "J", role: "Width", label: "Bottom Joker", position: { x: 50, y: 82 } },
          ],
          ball: { x: 50, y: 50, attachedPlayerId: "j_mid" },
          equipment: [
            { id: "c1", type: "cone", position: { x: 20, y: 15 } },
            { id: "c2", type: "cone", position: { x: 80, y: 15 } },
            { id: "c3", type: "cone", position: { x: 20, y: 85 } },
            { id: "c4", type: "cone", position: { x: 80, y: 85 } },
          ],
          annotations: [
            {
              id: "a1",
              type: "pass_line",
              points: [{ x: 50, y: 50 }, { x: 75, y: 30 }],
              color: "#60A5FA",
              width: 2.5,
              label: "Quick switch",
            },
          ],
        },
      ],
    },
  },
  {
    id: "preset_overlap_cross",
    title: "Overlapping Fullback & Wide Channel Cross",
    category: "Wide Play & Crossing",
    plan: {
      id: "plan_overlap",
      title: "Overlapping Fullback & Near-Post Box Attack",
      pitchType: "attacking_half",
      gridDimensions: "Half Pitch",
      coachingPoints: [
        "Winger cuts inside to drag opposition full-back.",
        "Overlapping full-back delivers low driven cross between penalty spot and 6-yard box.",
        "Striker attacks front post; opposite winger crashes back post.",
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      phases: [
        {
          id: "p1",
          phaseNumber: 1,
          title: "Underlap & Overlap Trigger",
          durationSeconds: 3.5,
          coachingNotes: "Winger #7 commits defender, #2 makes blind-side overlapping sprint.",
          players: [
            { id: "wng", team: "home", number: 7, role: "RW", label: "Right Wing", position: { x: 65, y: 72 }, targetPosition: { x: 74, y: 62 }, hasBall: true },
            { id: "fb", team: "home", number: 2, role: "RB", label: "Right Back", position: { x: 55, y: 85 }, targetPosition: { x: 86, y: 84 } },
            { id: "st", team: "home", number: 9, role: "ST", label: "Striker", position: { x: 70, y: 48 }, targetPosition: { x: 88, y: 45 } },
            { id: "am", team: "home", number: 10, role: "AM", label: "Midfielder", position: { x: 60, y: 50 }, targetPosition: { x: 78, y: 52 } },
            { id: "lw", team: "home", number: 11, role: "LW", label: "Left Wing", position: { x: 68, y: 22 }, targetPosition: { x: 85, y: 30 } },
            // Defenders
            { id: "df_lb", team: "away", number: 3, role: "LB", label: "Opp. Left Back", position: { x: 72, y: 70 } },
            { id: "df_cb1", team: "away", number: 4, role: "CB", label: "Opp. Left CB", position: { x: 80, y: 45 } },
            { id: "df_cb2", team: "away", number: 5, role: "CB", label: "Opp. Right CB", position: { x: 80, y: 32 } },
            { id: "gk", team: "gk_away", number: 1, role: "GK", label: "Goalkeeper", position: { x: 95, y: 50 } },
          ],
          ball: { x: 65, y: 72, attachedPlayerId: "wng" },
          equipment: [
            { id: "m1", type: "mannequin", position: { x: 75, y: 50 } },
            { id: "m2", type: "mannequin", position: { x: 82, y: 40 } },
          ],
          annotations: [
            {
              id: "an1",
              type: "run_arrow",
              points: [{ x: 55, y: 85 }, { x: 86, y: 84 }],
              color: "#34D399",
              width: 2.5,
              label: "Overlapping sprint",
            },
          ],
        },
      ],
    },
  },
];

export default function TacticalBoardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const drillId = searchParams.get("drillId");

  const [activePlan, setActivePlan] = useState<TacticalPlan>(() => {
    // Check if matching drill was requested
    if (drillId) {
      const match = SOCCER_DRILLS.find((d) => d.id === drillId);
      if (match) {
        return createDefaultTacticalPlan(match.title);
      }
    }
    return TACTICAL_PRESETS[0].plan;
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>(TACTICAL_PRESETS[0].id);
  const [savedBoards, setSavedBoards] = useState<Array<{ id: string; title: string; plan: TacticalPlan }>>([]);

  useEffect(() => {
    const user = localMockStore.getCurrentUser();
    const academyId = user?.academyId || "acad_hercules";
    const unsub = academyFirestoreService.subscribeTacticalBoards(academyId, (boards) => {
      if (boards && boards.length > 0) {
        setSavedBoards(
          boards.map((b) => ({
            id: (b.id || b._id || `board_${Math.random().toString(36).substring(2, 7)}`) as string,
            title: b.title || "Custom Tactical Board",
            plan: b as unknown as TacticalPlan,
          })),
        );
      }
    });
    return () => unsub();
  }, []);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const foundPreset = TACTICAL_PRESETS.find((p) => p.id === presetId);
    if (foundPreset) {
      setActivePlan(foundPreset.plan);
      toast.success(`Loaded preset: ${foundPreset.title}`);
      return;
    }
    const foundSaved = savedBoards.find((b) => b.id === presetId);
    if (foundSaved) {
      setActivePlan(foundSaved.plan);
      toast.success(`Loaded saved board: ${foundSaved.title}`);
    }
  };

  const handleSavePlan = async (plan: TacticalPlan) => {
    setActivePlan(plan);
    const user = localMockStore.getCurrentUser();
    const academyId = user?.academyId || "acad_hercules";
    try {
      await academyFirestoreService.saveTacticalBoard(academyId, plan);
      setSavedBoards((prev) => {
        const existing = prev.findIndex((b) => b.id === plan.id);
        const item = { id: plan.id, title: plan.title || "Tactical Board", plan };
        if (existing >= 0) {
          const next = [...prev];
          next[existing] = item;
          return next;
        }
        return [item, ...prev];
      });
      toast.success("Tactical board saved to academy Firestore!");
    } catch (err) {
      console.warn("Could not save tactical board to Firestore:", err);
      toast.error("Could not save tactical board");
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="size-8"
              title="Go Back"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <Compass className="size-5 text-primary" />
                <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight">
                  Tactical Board
                </h1>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Design tactical scenarios, animate multi-phase movements, and sketch pitch instructions.
              </p>
            </div>
          </div>

          {/* Preset Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <BookOpen className="size-4 text-muted-foreground" />
              <Select value={selectedPresetId} onValueChange={handleSelectPreset}>
                <SelectTrigger className="h-9 w-[220px] sm:w-[260px] text-xs">
                  <SelectValue placeholder="Select tactical preset" />
                </SelectTrigger>
                <SelectContent>
                  {savedBoards.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                        Academy Saved Boards
                      </div>
                      {savedBoards.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.title}
                        </SelectItem>
                      ))}
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase border-t mt-1">
                        Tactical Presets
                      </div>
                    </>
                  )}
                  {TACTICAL_PRESETS.map((preset) => (
                    <SelectItem key={preset.id} value={preset.id} className="text-xs">
                      {preset.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/drills")}
              className="h-9 text-xs gap-1.5"
            >
              <span>Drill Catalog</span>
            </Button>
          </div>
        </div>

        {/* Tactical Board Canvas & Controls */}
        <TacticalBoard
          key={activePlan.id}
          initialPlan={activePlan}
          onSavePlan={handleSavePlan}
        />
      </div>
  );
}
