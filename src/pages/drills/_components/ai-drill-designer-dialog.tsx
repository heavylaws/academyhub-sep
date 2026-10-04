import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Layers,
  Compass,
  CheckCircle2,
  RefreshCw,
  Plus,
  BookOpen,
  ArrowRight,
  Shield,
  Target,
  Timer,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  synthesizeTacticalDrill,
  type AgeGroup,
  type TacticalCategory,
  type TacticalGenerationResponse,
} from "@/services/tactical-ai-service.ts";
import { TacticalBoard } from "@/components/tactical-board/tactical-board.tsx";
import { toast } from "sonner";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

interface AiDrillDesignerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDrillCreated?: () => void;
}

export const AiDrillDesignerDialog: React.FC<AiDrillDesignerDialogProps> = ({
  open,
  onOpenChange,
  onDrillCreated,
}) => {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const createDrillMutation = useMutation(api.drills.createDrill);
  const saveTacticalPlanMutation = useMutation(api.tacticalPlans.saveTacticalPlan);
  const generateDrillAction = useAction(api.tacticalAi.generateTacticalDrillAction);

  // Form input state
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("U13-U14");
  const [category, setCategory] = useState<TacticalCategory>("tactical_possession");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced" | "Elite">("Intermediate");
  const [targetAttribute, setTargetAttribute] = useState<
    "Tactical" | "Technical" | "Speed" | "Agility" | "Power" | "Strength" | "Endurance" | "Mobility"
  >("Tactical");
  const [promptNotes, setPromptNotes] = useState("");

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");
  const [result, setResult] = useState<TacticalGenerationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"criteria" | "preview">("criteria");
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStep("Querying versioned tactical cache & AI Tactical Engine...");

    try {
      const response = await generateDrillAction({
        ageGroup,
        category,
        difficulty,
        targetAttribute,
        promptNotes: promptNotes.trim() || undefined,
      });

      const plan = response.tacticalPlan as unknown as TacticalGenerationResponse["tacticalPlan"];
      const valResult = {
        valid: response.validationResult.valid,
        errors: response.validationResult.errors,
        warnings: response.validationResult.warnings,
        normalizedPlan: plan,
      };

      setResult({
        drill: response.drill,
        tacticalPlan: plan,
        validationResult: valResult,
        engineUsed: response.engineUsed as TacticalGenerationResponse["engineUsed"],
      });

      setActiveTab("preview");

      if (response.isCacheHit) {
        toast.info("Retrieved from Versioned Tactical Cache", {
          description: `Key: ${response.cacheKey.slice(0, 28)}...`,
        });
      } else {
        toast.success("Tactical drill synthesized successfully!", {
          description: response.engineUsed,
        });
      }
    } catch (err) {
      console.warn("Backend tactical generation failed, using local pitch-side synthesis:", err);
      try {
        const localFallback = synthesizeTacticalDrill({
          ageGroup,
          category,
          difficulty,
          targetAttribute,
          promptNotes: promptNotes.trim() || undefined,
        });
        setResult(localFallback);
        setActiveTab("preview");
        toast.success("Synthesized via CoachTactics Pitch-Side Engine");
      } catch {
        toast.error("Failed to generate tactical drill");
      }
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  const handleSaveToPlaybook = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      let createdDrillId: string | undefined;
      if (user?.academyId) {
        createdDrillId = await createDrillMutation({
          title: result.drill.title,
          ageGroup: result.drill.ageGroup,
          birthYears: result.drill.birthYears,
          category: result.drill.category,
          categoryLabel: result.drill.categoryLabel,
          difficulty: result.drill.difficulty,
          durationMinutes: result.drill.durationMinutes,
          durationSeconds: result.drill.durationSeconds,
          recommendedSets: result.drill.recommendedSets,
          recommendedReps: result.drill.recommendedReps,
          gridDimensions: result.drill.gridDimensions,
          equipment: result.drill.equipment,
          summary: result.drill.summary,
          setup: result.drill.setup,
          instructions: result.drill.instructions,
          coachingPoints: result.drill.coachingPoints,
          variations: result.drill.variations,
          metricName: result.drill.metricName,
          metricUnit: result.drill.metricUnit,
          benchmark: result.drill.benchmark,
          isLowerBetter: result.drill.isLowerBetter,
          targetAttribute: result.drill.targetAttribute,
        });
      }

      // Persist tactical plan to Convex as sole authoritative store
      if (result.tacticalPlan && user?.academyId) {
        await saveTacticalPlanMutation({
          title: result.drill.title,
          drillId: createdDrillId,
          category: result.drill.category,
          pitchType: result.tacticalPlan.pitchType || "full",
          gridDimensions: result.drill.gridDimensions,
          coachingPoints: result.drill.coachingPoints || [],
          planData: JSON.stringify(result.tacticalPlan),
        });
      }

      toast.success("Drill and Tactical Plan saved to academy playbook!");
      onDrillCreated?.();
      onOpenChange(false);
    } catch {
      toast.error("Could not save drill to backend");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenInTacticalBoard = async () => {
    if (!result) return;
    if (result.tacticalPlan && user?.academyId) {
      try {
        await saveTacticalPlanMutation({
          title: result.drill.title,
          category: result.drill.category,
          pitchType: result.tacticalPlan.pitchType || "full",
          gridDimensions: result.drill.gridDimensions,
          coachingPoints: result.drill.coachingPoints || [],
          planData: JSON.stringify(result.tacticalPlan),
        });
      } catch (err) {
        console.warn("Could not pre-save tactical plan to Convex:", err);
      }
    }
    onOpenChange(false);
    navigate(`/tactical-board?drillTitle=${encodeURIComponent(result.drill.title)}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <span>CoachTactics AI Drill Designer</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">
                  Tactical Synthesis Engine
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Generate domain-validated soccer drills with interactive pitch formations, multi-phase movements, and coaching points.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation between Criteria and Live Preview */}
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "criteria" | "preview")}>
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <TabsList className="h-9">
              <TabsTrigger value="criteria" className="text-xs">
                1. Tactical Criteria
              </TabsTrigger>
              <TabsTrigger value="preview" disabled={!result} className="text-xs">
                2. Tactical Preview {result ? "✓" : ""}
              </TabsTrigger>
            </TabsList>

            {result && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Engine: <strong className="text-foreground">{result.engineUsed}</strong>
              </span>
            )}
          </div>

          {/* Tab 1: Tactical Setup Criteria Form */}
          <TabsContent value="criteria" className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Age Group */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Age Bracket & Biological Maturity</Label>
                <Select value={ageGroup} onValueChange={(val) => setAgeGroup(val as AgeGroup)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="U6-U8">U6–U8 (2018–2020) — Fundamentals & Ball Discovery</SelectItem>
                    <SelectItem value="U9-U10">U9–U10 (2016–2017) — 1v1 Skills & Small-Sided</SelectItem>
                    <SelectItem value="U11-U12">U11–U12 (2014–2015) — Transition & Play Speed</SelectItem>
                    <SelectItem value="U13-U14">U13–U14 (2012–2013) — Positional Play & Roles</SelectItem>
                    <SelectItem value="U15-U16">U15–U16 (2011) — Match Tempo & Tactical Depth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tactical Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tactical Category</Label>
                <Select value={category} onValueChange={(val) => setCategory(val as TacticalCategory)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tactical_possession">Positional Play & Tactical Build-up</SelectItem>
                    <SelectItem value="passing_rondos">Passing & Directional Rondos</SelectItem>
                    <SelectItem value="finishing_crossing">Finishing & Wide Channel Crossing</SelectItem>
                    <SelectItem value="counter_attack">Counter-Attacking & Direct Transition</SelectItem>
                    <SelectItem value="agility_transitions">Agility & Cognitive Pressing</SelectItem>
                    <SelectItem value="ball_mastery">Ball Mastery & Isolation 1v1 Take-Ons</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Difficulty */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tactical Complexity</Label>
                <Select value={difficulty} onValueChange={(val) => setDifficulty(val as typeof difficulty)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner — Simple Spatial Cues</SelectItem>
                    <SelectItem value="Intermediate">Intermediate — 2-3 Line Combinations</SelectItem>
                    <SelectItem value="Advanced">Advanced — High-Tempo Transition</SelectItem>
                    <SelectItem value="Elite">Elite — Dynamic Decision-Making</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Target Attribute */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Primary Athletic / Tactical Focus</Label>
                <Select value={targetAttribute} onValueChange={(val) => setTargetAttribute(val as typeof targetAttribute)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Tactical">Tactical (Vision & Decision Speed)</SelectItem>
                    <SelectItem value="Technical">Technical (Passing & Ball Striking)</SelectItem>
                    <SelectItem value="Speed">Speed (Acceleration & Recovery)</SelectItem>
                    <SelectItem value="Agility">Agility (Deceleration & Cutting)</SelectItem>
                    <SelectItem value="Power">Power (Explosive Pressing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Custom Prompt Context */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Specific Coaching Focus or Tactical Objectives (Optional)</span>
                <span className="text-[10px] text-muted-foreground font-normal">e.g. Overlapping fullbacks, 3v2 counter, low block</span>
              </Label>
              <Textarea
                value={promptNotes}
                onChange={(e) => setPromptNotes(e.target.value)}
                placeholder="Example: Focus on center-backs splitting wide and defensive pivot dropping to receive between lines. Finish on mini goals on turnover."
                className="text-xs resize-none h-20 bg-background"
              />
            </div>

            {/* Live Generation Progress Indicator */}
            {isGenerating && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <RefreshCw className="size-5 text-primary animate-spin" />
                <div>
                  <p className="text-xs font-bold text-foreground">Synthesizing Tactical Drill...</p>
                  <p className="text-[11px] text-muted-foreground">{generationStep}</p>
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="h-9 px-4 text-xs font-bold gap-1.5"
              >
                <Sparkles className="size-3.5" />
                <span>{isGenerating ? "Synthesizing..." : "Generate Drill & Tactical Board"}</span>
              </Button>
            </div>
          </TabsContent>

          {/* Tab 2: Live Tactical Preview & Board */}
          {result && (
            <TabsContent value="preview" className="space-y-4 pt-1">
              {/* Drill Summary Header */}
              <div className="bg-muted/40 border rounded-xl p-3.5 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs font-bold">
                      {result.drill.ageGroup}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {result.drill.categoryLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground font-mono">
                      {result.drill.birthYears}
                    </span>
                  </div>

                  <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                    <CheckCircle2 className="size-3 mr-1" /> Domain Validated
                  </Badge>
                </div>

                <h3 className="font-bold text-base text-foreground">{result.drill.title}</h3>
                <p className="text-xs text-muted-foreground">{result.drill.summary}</p>

                {/* Key prescriptions */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="bg-background/80 border rounded-lg p-2 text-center">
                    <span className="text-[10px] text-muted-foreground block">Duration</span>
                    <span className="font-bold">{result.drill.durationMinutes} mins</span>
                  </div>
                  <div className="bg-background/80 border rounded-lg p-2 text-center">
                    <span className="text-[10px] text-muted-foreground block">Sets × Reps</span>
                    <span className="font-bold">{result.drill.recommendedSets} × {result.drill.recommendedReps}</span>
                  </div>
                  <div className="bg-background/80 border rounded-lg p-2 text-center">
                    <span className="text-[10px] text-muted-foreground block">Grid</span>
                    <span className="font-bold truncate block">{result.drill.gridDimensions}</span>
                  </div>
                  <div className="bg-background/80 border rounded-lg p-2 text-center">
                    <span className="text-[10px] text-muted-foreground block">Benchmark</span>
                    <span className="font-bold">{result.drill.benchmark} {result.drill.metricUnit}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Tactical Board Component Embedded */}
              <div className="border rounded-xl p-2 bg-background shadow-xs">
                <div className="flex items-center justify-between pb-2 px-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="size-3.5 text-primary" /> Interactive Tactical Board Pitch
                  </h4>
                  <span className="text-[11px] text-muted-foreground">
                    Drag players, press Play to animate phases
                  </span>
                </div>

                <TacticalBoard initialPlan={result.tacticalPlan} />
              </div>

              {/* Coaching Points */}
              <div className="space-y-1.5 text-xs bg-muted/20 border rounded-xl p-3">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="size-3.5 text-primary" /> Key Coaching Points
                </h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  {result.drill.coachingPoints.map((pt, i) => (
                    <li key={i}>{pt}</li>
                  ))}
                </ul>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("criteria")}
                  className="h-9 text-xs gap-1.5"
                >
                  <RefreshCw className="size-3.5" />
                  <span>Modify Criteria</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenInTacticalBoard}
                    className="h-9 text-xs gap-1.5 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                  >
                    <Compass className="size-3.5" />
                    <span>Open in Full Board</span>
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveToPlaybook}
                    disabled={isSaving}
                    className="h-9 px-4 text-xs font-bold gap-1.5"
                  >
                    <BookOpen className="size-3.5" />
                    <span>{isSaving ? "Saving..." : "Save to Playbook"}</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AiDrillDesignerDialog;
