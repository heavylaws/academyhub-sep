import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Sparkles,
  Layers,
  Activity,
  Plus,
  Trash2,
  Target,
  Clock,
  Compass,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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
import { Spinner } from "@/components/ui/spinner.tsx";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDrillCreated?: (drillId: string) => void;
}

const AGE_GROUP_DEFAULTS: Record<string, string> = {
  "U6-U8": "2018–2020",
  "U9-U10": "2016–2017",
  "U11-U12": "2014–2015",
  "U13-U14": "2012–2013",
  "U15-U16": "2011",
  "All U16": "2011–2020",
};

const CATEGORY_LABELS: Record<string, string> = {
  ball_mastery: "Ball Mastery & 1v1",
  passing_rondos: "Passing & Rondos",
  shooting_finishing: "Shooting & Finishing",
  tactical_possession: "Positional & Tactical",
  defending_pressing: "Defending & Pressing",
  agility_speed: "Agility & Biomechanics",
  goalkeeping: "Goalkeeping",
};

export default function CreateSpecificDrillDialog({
  open,
  onOpenChange,
  onDrillCreated,
}: Props) {
  const createDrill = useMutation(api.drills.createDrill);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [ageGroup, setAgeGroup] = useState<string>("U11-U12");
  const [birthYears, setBirthYears] = useState("2014–2015");
  const [category, setCategory] = useState("passing_rondos");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [recommendedSets, setRecommendedSets] = useState(4);
  const [recommendedReps, setRecommendedReps] = useState(6);
  const [gridDimensions, setGridDimensions] = useState("20m x 20m grid");
  const [equipmentInput, setEquipmentInput] = useState("Cones, 6 Soccer balls, 4 Mini-goals");
  const [summary, setSummary] = useState("");
  const [setup, setSetup] = useState("");

  // Instructions array
  const [instructions, setInstructions] = useState<string[]>([
    "Players form two rotating groups outside the penalty area.",
    "First player executes a sharp give-and-go pass with central midfielder.",
    "Accelerate into open channel and deliver low cross into the box.",
  ]);

  // Coaching points array
  const [coachingPoints, setCoachingPoints] = useState<string[]>([
    "Lock ankle and strike through the center of the ball.",
    "Open hips and scan shoulder before first touch.",
    "High intensity transition speed after passing.",
  ]);

  // Performance Analysis & Statistics Specification
  const [metricName, setMetricName] = useState("Passing Streak & Conversion");
  const [metricUnit, setMetricUnit] = useState("passes");
  const [benchmark, setBenchmark] = useState<number>(15);
  const [isLowerBetter, setIsLowerBetter] = useState(false);
  const [targetAttribute, setTargetAttribute] = useState<
    "Speed" | "Power" | "Agility" | "Strength" | "Endurance" | "Mobility" | "Technical" | "Tactical"
  >("Tactical");

  const handleAgeChange = (val: string) => {
    setAgeGroup(val);
    if (AGE_GROUP_DEFAULTS[val]) {
      setBirthYears(AGE_GROUP_DEFAULTS[val]);
    }
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, ""]);
  };

  const handleUpdateInstruction = (index: number, val: string) => {
    const next = [...instructions];
    next[index] = val;
    setInstructions(next);
  };

  const handleRemoveInstruction = (index: number) => {
    if (instructions.length <= 1) return;
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleAddCoachingPoint = () => {
    setCoachingPoints([...coachingPoints, ""]);
  };

  const handleUpdateCoachingPoint = (index: number, val: string) => {
    const next = [...coachingPoints];
    next[index] = val;
    setCoachingPoints(next);
  };

  const handleRemoveCoachingPoint = (index: number) => {
    if (coachingPoints.length <= 1) return;
    setCoachingPoints(coachingPoints.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a drill title");
      return;
    }
    if (!metricName.trim()) {
      toast.error("Please enter a performance metric name for statistics analysis");
      return;
    }

    setSubmitting(true);
    try {
      const cleanEquipment = equipmentInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const cleanInstructions = instructions
        .map((s) => s.trim())
        .filter(Boolean);

      const cleanPoints = coachingPoints
        .map((s) => s.trim())
        .filter(Boolean);

      const newId = await createDrill({
        title: title.trim(),
        ageGroup,
        birthYears: birthYears.trim() || AGE_GROUP_DEFAULTS[ageGroup] || "2011–2020",
        category,
        categoryLabel: CATEGORY_LABELS[category] || "Technical",
        difficulty,
        durationMinutes: Number(durationMinutes) || 15,
        durationSeconds: (Number(durationMinutes) || 15) * 60,
        recommendedSets: Number(recommendedSets) || 4,
        recommendedReps: Number(recommendedReps) || 6,
        gridDimensions: gridDimensions.trim() || "20m x 20m grid",
        equipment: cleanEquipment.length > 0 ? cleanEquipment : ["Soccer balls", "Cones"],
        summary: summary.trim() || `Specific soccer drill created for youth development (${ageGroup}).`,
        setup: setup.trim() || "Set up marked grid with cones and soccer balls at starting line.",
        instructions: cleanInstructions.length > 0 ? cleanInstructions : ["Execute drill according to coach guidelines."],
        coachingPoints: cleanPoints.length > 0 ? cleanPoints : ["Focus on proper body shape and touch quality."],
        variations: [],
        metricName: metricName.trim(),
        metricUnit: metricUnit.trim() || "pts",
        benchmark: Number(benchmark) || 10,
        isLowerBetter,
        targetAttribute,
      });

      toast.success("Specific drill created successfully!", {
        description: `"${title}" is now available in the playbook and for athlete performance data analysis.`,
      });

      onOpenChange(false);
      onDrillCreated?.(newId);

      // Reset form
      setTitle("");
      setSummary("");
      setSetup("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create drill");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] sm:max-h-[88vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Compass className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Create Specific Soccer Drill</DialogTitle>
              <DialogDescription>
                Design a custom tactical or technical drill. It will be added to the playbook and fully integrated for athlete statistics and performance analytics.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-2">
          {/* Section 1: Core Details */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              1. Drill Identity & Age Bracket
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="drill-title">Drill Title *</Label>
                <Input
                  id="drill-title"
                  placeholder="e.g. Rapid 5-Gate Transition & Finish"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Target Age Bracket</Label>
                <Select value={ageGroup} onValueChange={handleAgeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="U6-U8">U6–U8 (Born 2018–2020)</SelectItem>
                    <SelectItem value="U9-U10">U9–U10 (Born 2016–2017)</SelectItem>
                    <SelectItem value="U11-U12">U11–U12 (Born 2014–2015)</SelectItem>
                    <SelectItem value="U13-U14">U13–U14 (Born 2012–2013)</SelectItem>
                    <SelectItem value="U15-U16">U15–U16 (Born 2011)</SelectItem>
                    <SelectItem value="All U16">All U16 (Born 2011–2020)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="birth-years">Birth Years</Label>
                <Input
                  id="birth-years"
                  value={birthYears}
                  onChange={(e) => setBirthYears(e.target.value)}
                  placeholder="e.g. 2014–2015"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Tactical Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ball_mastery">Ball Mastery & 1v1</SelectItem>
                    <SelectItem value="passing_rondos">Passing & Rondos</SelectItem>
                    <SelectItem value="shooting_finishing">Shooting & Finishing</SelectItem>
                    <SelectItem value="tactical_possession">Positional & Tactical</SelectItem>
                    <SelectItem value="defending_pressing">Defending & Pressing</SelectItem>
                    <SelectItem value="agility_speed">Agility & Biomechanics</SelectItem>
                    <SelectItem value="goalkeeping">Goalkeeping</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Difficulty Level</Label>
                <Select
                  value={difficulty}
                  onValueChange={(val: "Beginner" | "Intermediate" | "Advanced") => setDifficulty(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Beginner">Beginner</SelectItem>
                    <SelectItem value="Intermediate">Intermediate</SelectItem>
                    <SelectItem value="Advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 2: Structure, Timing & Setup */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase flex items-center gap-2">
              <Clock className="size-4 text-primary" />
              2. Dimensions, Equipment & Timing
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="duration">Duration (mins)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  max={90}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sets">Sets</Label>
                <Input
                  id="sets"
                  type="number"
                  min={1}
                  max={20}
                  value={recommendedSets}
                  onChange={(e) => setRecommendedSets(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reps">Reps per Set</Label>
                <Input
                  id="reps"
                  type="number"
                  min={1}
                  max={50}
                  value={recommendedReps}
                  onChange={(e) => setRecommendedReps(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="grid">Grid Dimensions</Label>
                <Input
                  id="grid"
                  placeholder="e.g. 20m x 20m grid"
                  value={gridDimensions}
                  onChange={(e) => setGridDimensions(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="equipment">Equipment (comma separated)</Label>
                <Input
                  id="equipment"
                  placeholder="Cones, 6 Soccer balls, 2 Mini-goals"
                  value={equipmentInput}
                  onChange={(e) => setEquipmentInput(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="summary">Drill Summary / Tactical Objective</Label>
              <Textarea
                id="summary"
                rows={2}
                placeholder="Briefly describe the drill purpose (e.g. Fast-paced transition drill developing third-man runs under pressure)."
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="setup">Pitch Setup</Label>
              <Textarea
                id="setup"
                rows={2}
                placeholder="Describe how to place cones, goals, and player starting positions."
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
              />
            </div>
          </div>

          {/* Section 3: Performance Metric & Statistics Benchmark */}
          <div className="space-y-4 pt-4 border-t bg-muted/30 p-4 rounded-xl border">
            <div>
              <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase flex items-center gap-2">
                <Activity className="size-4 text-primary" />
                3. Performance Metric & Statistics Analysis Specification
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                This configuration makes this drill immediately trackable in athlete performance analytics, progression charts, and radar profiles.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="metric-name">Performance Metric Name *</Label>
                <Input
                  id="metric-name"
                  placeholder="e.g. 4v2 Pass Streak or Slalom Time"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metric-unit">Unit</Label>
                <Input
                  id="metric-unit"
                  placeholder="e.g. passes, s, made, %"
                  value={metricUnit}
                  onChange={(e) => setMetricUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="benchmark">Target Benchmark</Label>
                <Input
                  id="benchmark"
                  type="number"
                  step="any"
                  value={benchmark}
                  onChange={(e) => setBenchmark(Number(e.target.value))}
                />
                <p className="text-[11px] text-muted-foreground">
                  Expected target score for athletes in this bracket.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>Score Direction</Label>
                <Select
                  value={isLowerBetter ? "lower" : "higher"}
                  onValueChange={(val) => setIsLowerBetter(val === "lower")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="higher">Higher is Better (e.g. Passes, Made, %)</SelectItem>
                    <SelectItem value="lower">Lower is Better (e.g. Seconds, Race Times)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Athletic Radar Competency</Label>
                <Select
                  value={targetAttribute}
                  onValueChange={(val: typeof targetAttribute) => setTargetAttribute(val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">Technical (Ball Mastery)</SelectItem>
                    <SelectItem value="Tactical">Tactical (Vision & Passing)</SelectItem>
                    <SelectItem value="Speed">Speed (Acceleration & Pace)</SelectItem>
                    <SelectItem value="Agility">Agility (Change of Direction)</SelectItem>
                    <SelectItem value="Power">Power (Striking & Force)</SelectItem>
                    <SelectItem value="Endurance">Endurance (Stamina & Work Rate)</SelectItem>
                    <SelectItem value="Mobility">Mobility (Flexibility)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section 4: Execution Steps & Coaching Points */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Step-by-Step Instructions</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddInstruction}
                className="h-7 text-xs gap-1"
              >
                <Plus className="size-3" /> Add Step
              </Button>
            </div>
            <div className="space-y-2">
              {instructions.map((step, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-5 text-right">
                    {idx + 1}.
                  </span>
                  <Input
                    value={step}
                    onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
                    placeholder={`Step ${idx + 1}`}
                  />
                  {instructions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveInstruction(idx)}
                      className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3">
              <Label className="text-sm font-semibold">Key Coaching Points</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddCoachingPoint}
                className="h-7 text-xs gap-1"
              >
                <Plus className="size-3" /> Add Point
              </Button>
            </div>
            <div className="space-y-2">
              {coachingPoints.map((point, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground w-5 text-right">
                    •
                  </span>
                  <Input
                    value={point}
                    onChange={(e) => handleUpdateCoachingPoint(idx, e.target.value)}
                    placeholder={`Key coaching reminder ${idx + 1}`}
                  />
                  {coachingPoints.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCoachingPoint(idx)}
                      className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Spinner className="size-4" /> Saving Drill...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" /> Save Specific Drill
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
