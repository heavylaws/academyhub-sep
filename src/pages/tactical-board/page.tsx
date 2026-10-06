import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { TacticalBoard } from "@/components/tactical-board/tactical-board.tsx";
import {
  type TacticalPlan,
  type PlayerNode,
  type PitchType,
  type SportType,
  createDefaultTacticalPlan,
  createBasketballTacticalPlan,
  createFutsalTacticalPlan,
  createHandballTacticalPlan,
  createVolleyballTacticalPlan,
  createRugbyTacticalPlan,
  validateTacticalPlan,
  buildSquadPlayerNodes,
} from "@/domain/tactics/tactical-domain.ts";
import { cn } from "@/lib/utils.ts";
import { SOCCER_DRILLS } from "@/data/soccer-drills.ts";
import {
  Compass,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Cloud,
  Save,
  Plus,
  Trash2,
  Share2,
  Check,
  AlertTriangle,
  Users,
  Printer,
} from "lucide-react";
import LoadSquadDialog from "./_components/load-squad-dialog.tsx";
import { TacticalSheetExportModal } from "@/components/tactical-board/tactical-sheet-export-modal.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

interface ParsedCloudPlan {
  _id: string;
  title: string;
  category: string;
  author: string;
  updatedAt: string;
  plan: TacticalPlan;
}

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
  {
    id: "preset_bball_pnr",
    title: "🏀 Basketball: 5-Out Pick & Roll Motion",
    category: "Basketball",
    plan: createBasketballTacticalPlan(),
  },
  {
    id: "preset_futsal_31",
    title: "⚡ Futsal: 3-1 Diamond Pivot Rotation",
    category: "Futsal",
    plan: createFutsalTacticalPlan(),
  },
  {
    id: "preset_handball_60",
    title: "🤾 Handball: 6:0 Defense vs Crossing Attack",
    category: "Handball",
    plan: createHandballTacticalPlan(),
  },
  {
    id: "preset_vball_51",
    title: "🏐 Volleyball: 5-1 Serve Receive & Middle Attack",
    category: "Volleyball",
    plan: createVolleyballTacticalPlan(),
  },
  {
    id: "preset_rugby_pods",
    title: "🏉 Rugby: 3-Man Forward Pod & Backline Spread",
    category: "Rugby",
    plan: createRugbyTacticalPlan(),
  },
];

export default function TacticalBoardPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const drillId = searchParams.get("drillId");
  const planId = searchParams.get("planId");
  const teamId = searchParams.get("teamId");
  const { user } = useCurrentUser();
  const { isAuthenticated } = useConvexAuth();

  // Cloud queries & mutations
  const cloudPlans = useQuery(
    api.tacticalPlans.listTacticalPlans,
    isAuthenticated && user?.academyId ? { academyId: user.academyId } : "skip",
  );
  const directTeamData = useQuery(
    api.teams.getTeam,
    teamId ? { teamId: teamId as Id<"teams"> } : "skip",
  );
  const saveTacticalPlan = useMutation(api.tacticalPlans.saveTacticalPlan);
  const deleteTacticalPlan = useMutation(api.tacticalPlans.deleteTacticalPlan);

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
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [squadModalOpen, setSquadModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalCategory, setModalCategory] = useState("Tactics");
  const [isSaving, setIsSaving] = useState(false);

  // Parse and normalize cloud-persisted plans
  const parsedCloudPlans = useMemo<ParsedCloudPlan[]>(() => {
    if (!cloudPlans) return [];
    return cloudPlans
      .map((cp: { _id: string; title: string; category?: string; createdByName?: string; updatedAt: string; planData: string }): ParsedCloudPlan | null => {
        try {
          const parsed = JSON.parse(cp.planData);
          const val = validateTacticalPlan(parsed);
          const normalized = val.normalizedPlan || parsed;
          return {
            _id: cp._id,
            title: cp.title,
            category: cp.category || "Tactics",
            author: cp.createdByName || "Coach",
            updatedAt: cp.updatedAt,
            plan: {
              ...normalized,
              id: cp._id,
              title: cp.title,
            } as TacticalPlan,
          };
        } catch {
          return null;
        }
      })
      .filter((p: ParsedCloudPlan | null): p is ParsedCloudPlan => p !== null);
  }, [cloudPlans]);

  // Auto-load linked plan from query parameters
  useEffect(() => {
    if (planId && parsedCloudPlans.length > 0) {
      const match = parsedCloudPlans.find((p) => p._id === planId);
      if (match) {
        queueMicrotask(() => {
          setActivePlan(match.plan);
          setSelectedPresetId(match._id);
          toast.info(`Loaded tactical plan: ${match.title}`);
        });
      }
    }
  }, [planId, parsedCloudPlans]);

  const handleDeploySquad = (deployedPlayers: PlayerNode[]) => {
    setActivePlan((prev) => {
      const phases = [...prev.phases];
      if (phases.length === 0) {
        phases.push({
          id: `phase_${Date.now()}`,
          phaseNumber: 1,
          title: "Phase 1: Squad Lineup",
          durationSeconds: 3,
          players: deployedPlayers,
          ball: { x: 50, y: 50 },
          equipment: [],
          annotations: [],
        });
      } else {
        phases[0] = {
          ...phases[0],
          players: deployedPlayers,
        };
      }
      return { ...prev, phases };
    });
  };

  // Auto-deploy squad from teamId parameter
  const deployedTeamIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (
      teamId &&
      directTeamData &&
      directTeamData.roster.length > 0 &&
      deployedTeamIdRef.current !== teamId
    ) {
      deployedTeamIdRef.current = teamId;
      const formation = directTeamData.team.preferredFormation || "4-3-3";
      const deployed = buildSquadPlayerNodes(
        directTeamData.team.name,
        formation,
        directTeamData.roster,
        activePlan.pitchType,
      );
      handleDeploySquad(deployed);
      toast.success(
        `Deployed ${deployed.length} athletes from ${directTeamData.team.name} in ${formation} formation!`,
      );
    }
  }, [teamId, directTeamData, activePlan.pitchType]);

  const exportDrillFallback = useMemo(() => {
    return {
      id: activePlan.id || "board_plan",
      title: activePlan.title || "Tactical Board Routine",
      ageGroup: "U13-U14" as const,
      birthYears: "All Ages",
      category: "tactical_possession" as const,
      categoryLabel: activePlan.category || "Tactics",
      intensity: "Medium" as const,
      difficulty: "Intermediate" as const,
      durationMinutes: 20,
      recommendedSets: 3,
      recommendedReps: 5,
      playerCountMin: activePlan.phases[0]?.players.length || 11,
      playerCountMax: activePlan.phases[0]?.players.length || 11,
      gridDimensions: activePlan.gridDimensions || "Standard Pitch",
      equipment: ["Cones", "Soccer Balls", "Bibs"],
      setup: `Tactical layout on ${activePlan.pitchType.replace(/_/g, " ")}.`,
      instructions: activePlan.phases.map((p) => `Phase ${p.phaseNumber}: ${p.title} (${p.durationSeconds}s)`),
      coachingPoints: activePlan.coachingPoints || ["Maintain compact defensive shape", "Exploit wide overloads"],
      variations: ["Add opposition touchline press", "Limit touches to 2-touch maximum"],
      summary: `Tactical routine with ${activePlan.phases.length} phase(s) and ${activePlan.phases[0]?.players.length || 0} active players.`,
      metricName: "Pass Completion",
      benchmark: 85,
      metricUnit: "%",
    };
  }, [activePlan]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const foundPreset = TACTICAL_PRESETS.find((p) => p.id === presetId);
    if (foundPreset) {
      setActivePlan(foundPreset.plan);
      toast.success(`Loaded preset: ${foundPreset.title}`);
      return;
    }
    const foundCloud = parsedCloudPlans.find((b: ParsedCloudPlan) => b._id === presetId);
    if (foundCloud) {
      setActivePlan(foundCloud.plan);
      toast.success(`Loaded cloud board: ${foundCloud.title}`);
    }
  };

  // Immediate save from the board canvas (Save button)
  const handleSavePlan = async (planToSave: TacticalPlan) => {
    // 1. Strict Domain Validation (Rule 7)
    const valResult = validateTacticalPlan(planToSave);
    if (!valResult.valid) {
      toast.error(`Tactical Validation Failed: ${valResult.errors[0]}`);
      return;
    }

    if (valResult.warnings.length > 0) {
      console.warn("Tactical validation warnings normalized:", valResult.warnings);
    }

    const validatedPlan = valResult.normalizedPlan || planToSave;
    setActivePlan(validatedPlan);

    // 2. Cloud Persistence via Convex
    setIsSaving(true);
    try {
      // Find existing cloud plan if this matches an ID
      const existingCloud = parsedCloudPlans.find((cp: ParsedCloudPlan) => cp._id === planToSave.id);
      const planIdArg = existingCloud ? (existingCloud._id as Id<"tacticalPlans">) : undefined;

      const savedId = await saveTacticalPlan({
        planId: planIdArg,
        title: validatedPlan.title || "Tactical Board Routine",
        drillId: validatedPlan.drillId,
        category: validatedPlan.category || "Tactics",
        pitchType: validatedPlan.pitchType,
        gridDimensions: validatedPlan.gridDimensions,
        coachingPoints: validatedPlan.coachingPoints || [],
        planData: JSON.stringify(validatedPlan),
      });

      // Update active ID if it was newly created
      if (!planIdArg && savedId) {
        setActivePlan((prev) => ({ ...prev, id: savedId }));
      }

      toast.success("Tactical board saved to Academy Cloud!", {
        description: "Shared with your coaching staff and accessible across all devices.",
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save tactical board");
    } finally {
      setIsSaving(false);
    }
  };

  // Save As New Board dialog handler
  const handleConfirmSaveAsNew = async () => {
    if (!modalTitle.trim()) {
      toast.error("Please enter a title for the tactical board");
      return;
    }

    const newPlan: TacticalPlan = {
      ...activePlan,
      id: `plan_${Date.now()}`,
      title: modalTitle.trim(),
      category: modalCategory.trim() || "Tactics",
      updatedAt: new Date().toISOString(),
    };

    setSaveModalOpen(false);
    await handleSavePlan(newPlan);
  };

  const handleDeleteCloudBoard = async (id: string, title: string) => {
    try {
      await deleteTacticalPlan({ id: id as Id<"tacticalPlans"> });
      toast.success(`Deleted '${title}'`);
      if (activePlan.id === id) {
        setActivePlan(TACTICAL_PRESETS[0].plan);
        setSelectedPresetId(TACTICAL_PRESETS[0].id);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete board");
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
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-500/30 text-emerald-500 flex items-center gap-1">
                <Cloud className="size-3" />
                Cloud Synced
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Design tactical scenarios, animate multi-phase movements, and sketch pitch instructions.
            </p>
          </div>
        </div>

        {/* Preset & Cloud Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <BookOpen className="size-4 text-muted-foreground" />
            <Select value={selectedPresetId} onValueChange={handleSelectPreset}>
              <SelectTrigger className="h-9 w-[220px] sm:w-[260px] text-xs">
                <SelectValue placeholder="Select tactical preset" />
              </SelectTrigger>
              <SelectContent>
                {parsedCloudPlans.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                      <Cloud className="size-3" />
                      Academy Cloud Boards ({parsedCloudPlans.length})
                    </div>
                    {parsedCloudPlans.map((b: ParsedCloudPlan) => (
                      <SelectItem key={b._id} value={b._id} className="text-xs">
                        {b.title} ({b.author})
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase border-t mt-1">
                      ⚽ Standard Tactical Presets
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
            onClick={() => setSquadModalOpen(true)}
            className="h-9 text-xs gap-1.5 font-medium border-primary/40 text-primary hover:bg-primary/10"
            title="Populate pitch with real team squad athletes"
          >
            <Users className="size-3.5" />
            <span>Deploy Squad</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="h-9 text-xs gap-1.5 font-medium"
            title="Export high-contrast printable tactical session sheet"
          >
            <Printer className="size-3.5" />
            <span>Export Sheet</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setModalTitle(`${activePlan.title} (Custom)`);
              setModalCategory(activePlan.category || "Tactics");
              setSaveModalOpen(true);
            }}
            className="h-9 text-xs gap-1.5 font-medium"
          >
            <Save className="size-3.5" />
            <span>Save to Cloud</span>
          </Button>

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

      {/* Multi-Sport Court & Pitch Mode Switcher */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 px-0.5 border-b text-xs">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <Compass className="size-3 text-primary" />
          <span>Pitch & Court:</span>
        </span>
        {[
          { id: "soccer", label: "⚽ Soccer", pitch: "full", presetId: "preset_433_buildup" },
          { id: "basketball", label: "🏀 Basketball", pitch: "basketball_half", presetId: "preset_bball_pnr" },
          { id: "futsal", label: "⚡ Futsal", pitch: "futsal_court", presetId: "preset_futsal_31" },
          { id: "handball", label: "🤾 Handball", pitch: "handball_court", presetId: "preset_handball_60" },
          { id: "volleyball", label: "🏐 Volleyball", pitch: "volleyball_court", presetId: "preset_vball_51" },
          { id: "rugby", label: "🏉 Rugby", pitch: "rugby_pitch", presetId: "preset_rugby_pods" },
        ].map((sport) => {
          const isActive =
            (sport.id === "soccer" && ["full", "attacking_half", "defending_half", "penalty_box", "rondo_grid"].includes(activePlan.pitchType)) ||
            (sport.id === "basketball" && ["basketball_full", "basketball_half"].includes(activePlan.pitchType)) ||
            (sport.id === "futsal" && activePlan.pitchType === "futsal_court") ||
            (sport.id === "handball" && activePlan.pitchType === "handball_court") ||
            (sport.id === "volleyball" && activePlan.pitchType === "volleyball_court") ||
            (sport.id === "rugby" && activePlan.pitchType === "rugby_pitch");

          return (
            <button
              key={sport.id}
              type="button"
              onClick={() => handleSelectPreset(sport.presetId)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center gap-1 border",
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                  : "bg-muted/50 text-muted-foreground border-border/60 hover:bg-muted hover:text-foreground",
              )}
            >
              <span>{sport.label}</span>
            </button>
          );
        })}
      </div>

      {/* Cloud Plans Management Strip if custom boards exist */}
      {parsedCloudPlans.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 text-xs">
          <span className="text-muted-foreground text-[11px] shrink-0 font-medium flex items-center gap-1">
            <Cloud className="size-3 text-primary" />
            Club Playbook:
          </span>
          {parsedCloudPlans.map((cp: ParsedCloudPlan) => (
            <div
              key={cp._id}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shrink-0 transition-colors ${
                activePlan.id === cp._id
                  ? "bg-primary/10 border-primary text-primary font-semibold"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelectPreset(cp._id)}
                className="hover:underline truncate max-w-[140px]"
              >
                {cp.title}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCloudBoard(cp._id, cp.title);
                }}
                className="text-muted-foreground hover:text-destructive size-3.5 flex items-center justify-center rounded-sm"
                title="Delete this cloud board"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tactical Board Canvas & Controls */}
      <TacticalBoard
        key={`${activePlan.id}_${activePlan.pitchType}`}
        initialPlan={activePlan}
        onSavePlan={handleSavePlan}
        onPlanChange={setActivePlan}
      />

      {/* Save to Academy Cloud Dialog */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Cloud className="size-4 text-primary" />
              Save Board to Academy Cloud
            </DialogTitle>
            <DialogDescription className="text-xs">
              Save this tactical pitch layout, player movements, and multi-phase animations to your academy cloud so all coaches can review and replay it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Tactical Board Title</label>
              <Input
                placeholder="e.g. 4-3-3 High Press Trap vs 3-5-2"
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Tactical Category</label>
              <Input
                placeholder="e.g. High Press, Set Pieces, Build-up"
                value={modalCategory}
                onChange={(e) => setModalCategory(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="rounded-lg border bg-muted/40 p-2.5 text-[11px] text-muted-foreground space-y-1">
              <div className="font-medium text-foreground flex items-center gap-1">
                <Check className="size-3 text-emerald-500" />
                Domain Validation Guaranteed
              </div>
              <p>
                Phases ({activePlan.phases.length}), coordinate boundaries (0–100%), and player tokens will be normalized and secured in Convex.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirmSaveAsNew} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save to Cloud"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load Squad Dialog */}
      <LoadSquadDialog
        open={squadModalOpen}
        onOpenChange={setSquadModalOpen}
        activePlan={activePlan}
        onDeploySquad={handleDeploySquad}
      />

      {/* Tactical Session Sheet Export Modal */}
      <TacticalSheetExportModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        drill={exportDrillFallback}
        tacticalPlan={activePlan}
      />
    </div>
  );
}
