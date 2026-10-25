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
  validateTacticalPlan,
  buildSquadPlayerNodes,
} from "@/domain/tactics/tactical-domain.ts";
import { TACTICAL_PRESETS } from "@/data/tactical-presets.ts";
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
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import LoadSquadDialog from "./_components/load-squad-dialog.tsx";
import { NewDrillWizardDialog } from "./_components/new-drill-wizard-dialog.tsx";
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
  const [showGuide, setShowGuide] = useState(false);
  const [newDrillWizardOpen, setNewDrillWizardOpen] = useState(false);

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
          {/* 1-Click New Drill Wizard */}
          <Button
            variant="default"
            size="sm"
            onClick={() => setNewDrillWizardOpen(true)}
            className="h-9 text-xs gap-1.5 font-bold bg-[#00E5FF] hover:bg-[#18FFFF] text-[#0A131F] shadow-[0_0_12px_rgba(0,229,255,0.3)] transition-all"
            title="Create a fresh tactical drill or pick a squad template"
          >
            <Plus className="size-3.5" />
            <span>New Drill</span>
          </Button>

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
            title="Save this board under a new custom title to your Academy Playbook"
          >
            <Save className="size-3.5" />
            <span>Save As New...</span>
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

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowGuide((prev) => !prev)}
          className="ml-auto h-7 text-[11px] gap-1 text-muted-foreground hover:text-foreground shrink-0"
        >
          <HelpCircle className="size-3 text-primary" />
          <span>{showGuide ? "Hide Guide" : "Coach Quick Guide"}</span>
          {showGuide ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </Button>
      </div>

      {/* Soccer Pitch Section Sub-Pills (1-click half pitch, rondo, box switching) */}
      {["full", "attacking_half", "defending_half", "penalty_box", "rondo_grid"].includes(activePlan.pitchType) && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 bg-muted/20 border-b text-xs">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Compass className="size-3 text-primary" />
            Pitch Section:
          </span>
          {[
            { id: "full", label: "⚽ Full Pitch" },
            { id: "attacking_half", label: "⚽ Attacking Half" },
            { id: "defending_half", label: "⚽ Defending Half" },
            { id: "penalty_box", label: "⚽ 18-Yard Box" },
            { id: "rondo_grid", label: "⚽ Rondo / Grid" },
          ].map((sec) => (
            <button
              key={sec.id}
              type="button"
              onClick={() => {
                setActivePlan((prev) => ({
                  ...prev,
                  pitchType: sec.id as PitchType,
                  gridDimensions: sec.id === "attacking_half" ? "Half Pitch" : undefined,
                  updatedAt: new Date().toISOString(),
                }));
                toast.info(`Pitch set to ${sec.label.replace("⚽ ", "")}`);
              }}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors shrink-0",
                activePlan.pitchType === sec.id
                  ? "bg-primary/20 text-primary border-primary/50 font-bold shadow-xs"
                  : "bg-muted/30 text-muted-foreground border-transparent hover:text-foreground hover:bg-muted"
              )}
            >
              {sec.label}
            </button>
          ))}
        </div>
      )}

      {/* 3-Step Guided Workflow Banner for Non-Technical Coaches */}
      {showGuide && (
        <div className="bg-[#0D1826]/80 border border-[#1E3249] rounded-xl p-3.5 space-y-3 text-white text-xs shadow-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#1E3249] pb-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[11px] font-semibold bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/30">
                Simple 3-Step Workflow
              </Badge>
              <span className="text-gray-300 text-xs">A quick roadmap for designing realistic drills:</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-[#142337] border border-[#1E334A] rounded-lg p-2.5 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#00E5FF]">
                <span className="size-5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] font-bold text-[11px] flex items-center justify-center">1</span>
                <span>Setup Squad & Pitch</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Choose sport above, then use <strong>Quick Formats</strong> or <strong>Shape</strong> in the toolbar below to automatically place your team into a formation (4-3-3, 3-5-2, etc.).
              </p>
            </div>
            <div className="bg-[#142337] border border-[#1E334A] rounded-lg p-2.5 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#FF6E40]">
                <span className="size-5 rounded-full bg-[#FF6E40]/20 text-[#FF6E40] font-bold text-[11px] flex items-center justify-center">2</span>
                <span>Position & Draw Tactics</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Drag any player to position them. Drag their target dot to show where they run. Use the <strong>Pen</strong>, <strong>Pass</strong>, or <strong>Zone</strong> tools to sketch tactical instructions.
              </p>
            </div>
            <div className="bg-[#142337] border border-[#1E334A] rounded-lg p-2.5 space-y-1">
              <div className="flex items-center gap-2 font-semibold text-[#69F0AE]">
                <span className="size-5 rounded-full bg-[#69F0AE]/20 text-[#69F0AE] font-bold text-[11px] flex items-center justify-center">3</span>
                <span>Animate & Save</span>
              </div>
              <p className="text-[11px] text-gray-400">
                Click <strong>+ Add</strong> next to Phase to record the next move. Press <strong>▶ Play</strong> to see the smooth animation. When happy, click <strong>Save Plan</strong> or <strong>Export Sheet</strong>!
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* 1-Click New Drill Creation Wizard */}
      <NewDrillWizardDialog
        open={newDrillWizardOpen}
        onOpenChange={setNewDrillWizardOpen}
        onDrillCreated={(plan) => {
          setActivePlan(plan);
          setSelectedPresetId("");
          toast.success(`Created "${plan.title}"`);
        }}
      />
    </div>
  );
}
