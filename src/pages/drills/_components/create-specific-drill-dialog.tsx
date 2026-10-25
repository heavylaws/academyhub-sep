import React, { useState, useEffect } from "react";
import { useMutation, useAction } from "convex/react";
import { toast } from "sonner";
import {
  Sparkles,
  Layers,
  Activity,
  Plus,
  Trash2,
  Clock,
  Compass,
  Check,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Target,
  Wand2,
  Eye,
  Sliders,
  Users,
  CalendarClock,
  Copy,
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
import { Switch } from "@/components/ui/switch.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import type { SoccerDrill } from "@/data/soccer-drills.ts";
import {
  synthesizeTacticalDrill,
  type AgeGroup,
  type TacticalCategory,
} from "@/services/tactical-ai-service.ts";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDrillCreated?: (drillId: string) => void;
  initialDrill?: SoccerDrill | null;
  onScheduleDrill?: (drill: SoccerDrill) => void;
}

const AGE_GROUP_CONFIG: Record<
  string,
  { label: string; birthYears: string; desc: string }
> = {
  "U6-U8": {
    label: "U6–U8",
    birthYears: "2018–2020",
    desc: "Ball discovery & fun",
  },
  "U9-U10": {
    label: "U9–U10",
    birthYears: "2016–2017",
    desc: "1v1 skills & small-sided",
  },
  "U11-U12": {
    label: "U11–U12",
    birthYears: "2014–2015",
    desc: "Transition & passing speed",
  },
  "U13-U14": {
    label: "U13–U14",
    birthYears: "2012–2013",
    desc: "Positional play & tactics",
  },
  "U15-U16": {
    label: "U15–U16",
    birthYears: "2011",
    desc: "Match tempo & fitness",
  },
  "All U16": {
    label: "All U16",
    birthYears: "2011–2020",
    desc: "General academy drill",
  },
};

interface CategoryOption {
  id: string;
  label: string;
  icon: string;
  shortDesc: string;
  defaultMetric: string;
  defaultUnit: string;
  defaultBenchmark: number;
  isLowerBetter: boolean;
  targetAttribute:
    | "Speed"
    | "Power"
    | "Agility"
    | "Strength"
    | "Endurance"
    | "Mobility"
    | "Technical"
    | "Tactical";
  defaultGrid: string;
  defaultEquipment: string[];
  sampleInstructions: string[];
  samplePoints: string[];
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "passing_rondos",
    label: "Passing & Rondos",
    icon: "🔄",
    shortDesc: "Possession, 3v1, 4v2, third-man runs",
    defaultMetric: "Pass Streak (Clean Possessions)",
    defaultUnit: "passes",
    defaultBenchmark: 15,
    isLowerBetter: false,
    targetAttribute: "Tactical",
    defaultGrid: "15m x 15m grid",
    defaultEquipment: ["Cones", "Soccer balls", "Bibs/Pinnies"],
    sampleInstructions: [
      "Position possession players along the perimeter with 1-2 defenders inside.",
      "Keep ball moving with 1-2 touch restrictions.",
      "Defenders switch out upon winning the ball or forcing a turnover.",
    ],
    samplePoints: [
      "Open body shape and scan the field before receiving.",
      "Firm, crisp ground passes to the correct foot.",
      "Support angles must form clear passing triangles at all times.",
    ],
  },
  {
    id: "shooting_finishing",
    label: "Shooting & Finishing",
    icon: "🎯",
    shortDesc: "Striking technique, rebounds, 1v1 vs keeper",
    defaultMetric: "Finishing Accuracy",
    defaultUnit: "% on target",
    defaultBenchmark: 70,
    isLowerBetter: false,
    targetAttribute: "Technical",
    defaultGrid: "Penalty box & arc",
    defaultEquipment: ["Soccer balls", "Regulation Goal", "Cones"],
    sampleInstructions: [
      "Player receives layoff pass at top of the penalty box.",
      "Take one positive prep touch toward goal angle.",
      "Strike low and driven toward the far corner.",
    ],
    samplePoints: [
      "Lock ankle firmly on contact and strike through ball center.",
      "Keep chest and knee over the ball to keep the shot down.",
      "Follow through with landing on striking foot.",
    ],
  },
  {
    id: "ball_mastery",
    label: "Ball Mastery & 1v1",
    icon: "⚽",
    shortDesc: "Dribbling, feints, change of direction",
    defaultMetric: "1v1 Dribble Success",
    defaultUnit: "% successful",
    defaultBenchmark: 65,
    isLowerBetter: false,
    targetAttribute: "Technical",
    defaultGrid: "10m x 15m channel",
    defaultEquipment: ["Cones", "Soccer balls", "Mini-goals"],
    sampleInstructions: [
      "Attacker and defender start on opposite endlines.",
      "Attacker receives ball and commits defender toward a gate.",
      "Execute drop-shoulder or stepover move to break past into space.",
    ],
    samplePoints: [
      "Keep ball on safe side away from defender reach.",
      "Explosive acceleration immediately after the feint.",
      "Use both inside and outside of both feet.",
    ],
  },
  {
    id: "tactical_possession",
    label: "Positional & Tactical",
    icon: "♟️",
    shortDesc: "Overloads, switching play, build-up shapes",
    defaultMetric: "Box Penetration Pass Rate",
    defaultUnit: "completed",
    defaultBenchmark: 12,
    isLowerBetter: false,
    targetAttribute: "Tactical",
    defaultGrid: "Half pitch (35m x 40m)",
    defaultEquipment: ["Cones", "Soccer balls", "Bibs/Pinnies", "Mini-goals"],
    sampleInstructions: [
      "Teams play 6v6 with neutral playmakers in wide channels.",
      "To score, possession must circulate through the central pivot.",
      "Create 2v1 overloads on the weak side.",
    ],
    samplePoints: [
      "Quick switch of play when central space is congested.",
      "Maintain proper team width and depth.",
      "Communication and vocal cues between midfield lines.",
    ],
  },
  {
    id: "defending_pressing",
    label: "Defending & Pressing",
    icon: "🛡️",
    shortDesc: "Trigger press, body shape, delaying",
    defaultMetric: "Interception & Recovery Count",
    defaultUnit: "recoveries",
    defaultBenchmark: 10,
    isLowerBetter: false,
    targetAttribute: "Tactical",
    defaultGrid: "25m x 25m zone",
    defaultEquipment: ["Cones", "Soccer balls", "Bibs/Pinnies"],
    sampleInstructions: [
      "Defenders initiate coordinated press on coach pass trigger.",
      "First defender bends run to cut off passing lane to center.",
      "Secondary defenders shift across to lock play toward sideline.",
    ],
    samplePoints: [
      "Side-on body shape, low center of gravity.",
      "Do not dive in; wait for heavy touch or backward pass.",
      "Communicate trigger word early.",
    ],
  },
  {
    id: "agility_speed",
    label: "Agility & Biomechanics",
    icon: "⚡",
    shortDesc: "Footwork, deceleration, change of pace",
    defaultMetric: "Agility Slalom Circuit Time",
    defaultUnit: "seconds",
    defaultBenchmark: 14.5,
    isLowerBetter: true,
    targetAttribute: "Agility",
    defaultGrid: "15m sprint corridor",
    defaultEquipment: ["Agility Poles", "Cones", "Agility Ladders"],
    sampleInstructions: [
      "Quick feet through the agility ladder (2 in, 2 out).",
      "Sharp plant and deceleration around marker cone.",
      "Full sprint through the final timing gate.",
    ],
    samplePoints: [
      "Pump arms actively from shoulders, not elbows.",
      "Stay light on balls of feet.",
      "Sink hips on deceleration to protect knees.",
    ],
  },
  {
    id: "goalkeeping",
    label: "Goalkeeping",
    icon: "🧤",
    shortDesc: "Handling, diving, distribution & footwork",
    defaultMetric: "Clean Catch & Recovery Rate",
    defaultUnit: "% clean catches",
    defaultBenchmark: 80,
    isLowerBetter: false,
    targetAttribute: "Technical",
    defaultGrid: "Goal box area",
    defaultEquipment: ["Regulation Goal", "Soccer balls", "Cones"],
    sampleInstructions: [
      "Goalkeeper starts on goal line, shuffles through cones to set position.",
      "Coach or partner strikes mid-height shot toward side post.",
      "Goalkeeper secures catch with W-technique and distributes quickly.",
    ],
    samplePoints: [
      "Set feet square to ball before shot is released.",
      "Hands attack the ball out in front of the body.",
      "Keep eyes locked on the ball into the gloves.",
    ],
  },
];

const COMMON_EQUIPMENT = [
  "Cones",
  "Soccer balls",
  "Mini-goals",
  "Bibs/Pinnies",
  "Agility Ladders",
  "Poles/Mannequins",
  "Regulation Goal",
];

const PRESET_GRIDS = [
  "15m x 15m grid",
  "20m x 20m grid",
  "Penalty box area",
  "Half pitch (35m x 40m)",
  "Full pitch",
];

const SQUAD_SIZE_OPTIONS = [
  { id: "2-4", label: "2–4 Players", desc: "1v1, 2v2, Skills" },
  { id: "5-8", label: "5–8 Players", desc: "Small Rondos, 4v2" },
  { id: "9-12", label: "9–12 Players", desc: "Positional, 6v6" },
  { id: "13+", label: "13+ Players", desc: "Large Match Play" },
];

const PITCH_SETUP_PRESETS = [
  {
    name: "4-Cone Box",
    grid: "15m x 15m grid",
    setup: "Set up a 15x15m square with 4 boundary cones. Place 6 soccer balls on the outside for rapid restarts.",
  },
  {
    name: "Penalty Box & Arc",
    grid: "Penalty box area",
    setup: "Use the standard penalty area. Position server at the D arc with 2 feeder stations on the wings.",
  },
  {
    name: "Two Mini-Goals",
    grid: "20m x 25m grid",
    setup: "Position two mini-goals on opposite endlines with a central transition gate marked by flat disc cones.",
  },
  {
    name: "Passing Triangle",
    grid: "10m triangle grid",
    setup: "Set 3 cones in an equilateral triangle 10m apart, with 2 players per station ready for one-touch wall passes.",
  },
  {
    name: "Channels & Flanks",
    grid: "Half pitch (35m x 40m)",
    setup: "Divide half pitch into 3 vertical channels using flat markers: central build-up zone and wide crossing corridors.",
  },
];

function PitchMiniDiagram({ presetName }: { presetName: string }) {
  if (presetName === "4-Cone Box") {
    return (
      <svg viewBox="0 0 200 110" className="w-full h-24 rounded-xl bg-emerald-950/60 border border-emerald-500/30 shadow-inner">
        <rect x="5" y="5" width="190" height="100" rx="4" fill="none" stroke="#10b981" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
        <rect x="55" y="20" width="90" height="70" fill="rgba(16, 185, 129, 0.15)" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 2" />
        <circle cx="55" cy="20" r="4.5" fill="#f97316" />
        <circle cx="145" cy="20" r="4.5" fill="#f97316" />
        <circle cx="55" cy="90" r="4.5" fill="#f97316" />
        <circle cx="145" cy="90" r="4.5" fill="#f97316" />
        <circle cx="100" cy="55" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        <text x="100" y="103" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="600">15m × 15m 4-Cone Box Setup</text>
      </svg>
    );
  }
  if (presetName === "Two Mini-Goals") {
    return (
      <svg viewBox="0 0 200 110" className="w-full h-24 rounded-xl bg-emerald-950/60 border border-emerald-500/30 shadow-inner">
        <rect x="5" y="5" width="190" height="100" rx="4" fill="none" stroke="#10b981" strokeWidth="1" opacity="0.3" />
        <line x1="100" y1="5" x2="100" y2="105" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" />
        <rect x="8" y="40" width="6" height="30" fill="#f87171" stroke="#ef4444" strokeWidth="1.5" rx="1" />
        <rect x="186" y="40" width="6" height="30" fill="#60a5fa" stroke="#3b82f6" strokeWidth="1.5" rx="1" />
        <circle cx="100" cy="25" r="3.5" fill="#f97316" />
        <circle cx="100" cy="85" r="3.5" fill="#f97316" />
        <circle cx="100" cy="55" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        <text x="100" y="103" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="600">Two Mini-Goals Transition Pitch (20m × 25m)</text>
      </svg>
    );
  }
  if (presetName === "Penalty Box & Arc") {
    return (
      <svg viewBox="0 0 200 110" className="w-full h-24 rounded-xl bg-emerald-950/60 border border-emerald-500/30 shadow-inner">
        <line x1="10" y1="98" x2="190" y2="98" stroke="#10b981" strokeWidth="2" opacity="0.5" />
        <rect x="80" y="96" width="40" height="8" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" rx="1" />
        <rect x="35" y="28" width="130" height="70" fill="rgba(16, 185, 129, 0.12)" stroke="#34d399" strokeWidth="1.5" />
        <rect x="65" y="70" width="70" height="28" fill="none" stroke="#34d399" strokeWidth="1" />
        <circle cx="100" cy="60" r="2.5" fill="#ffffff" />
        <path d="M 80 28 A 25 25 0 0 1 120 28" fill="none" stroke="#34d399" strokeWidth="1.5" />
        <circle cx="100" cy="18" r="4.5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        <text x="100" y="106" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="600">Regulation 18-Yard Box & Finishing Arc</text>
      </svg>
    );
  }
  if (presetName === "Passing Triangle") {
    return (
      <svg viewBox="0 0 200 110" className="w-full h-24 rounded-xl bg-emerald-950/60 border border-emerald-500/30 shadow-inner">
        <polygon points="100,16 45,85 155,85" fill="rgba(16, 185, 129, 0.15)" stroke="#34d399" strokeWidth="1.5" strokeDasharray="3 3" />
        <circle cx="100" cy="16" r="4.5" fill="#f97316" />
        <circle cx="45" cy="85" r="4.5" fill="#f97316" />
        <circle cx="155" cy="85" r="4.5" fill="#f97316" />
        <circle cx="100" cy="52" r="5" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
        <text x="100" y="103" textAnchor="middle" fill="#94a3b8" fontSize="8.5" fontWeight="600">10m Triangle Wall-Pass Combinations</text>
      </svg>
    );
  }
  // Channels & Flanks
  return (
    <svg viewBox="0 0 200 110" className="w-full h-24 rounded-xl bg-emerald-950/60 border border-emerald-500/30 shadow-inner">
      <rect x="15" y="8" width="170" height="92" fill="rgba(16, 185, 129, 0.08)" stroke="#10b981" strokeWidth="1.5" />
      <line x1="65" y1="8" x2="65" y2="100" stroke="#facc15" strokeWidth="1.5" strokeDasharray="4 2" />
      <line x1="135" y1="8" x2="135" y2="100" stroke="#facc15" strokeWidth="1.5" strokeDasharray="4 2" />
      <text x="40" y="55" textAnchor="middle" fill="#94a3b8" fontSize="8">Wide Flank</text>
      <text x="100" y="55" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Central Pivot</text>
      <text x="160" y="55" textAnchor="middle" fill="#94a3b8" fontSize="8">Wide Flank</text>
      <text x="100" y="104" textAnchor="middle" fill="#94a3b8" fontSize="8">Half Pitch Corridors (35m × 40m)</text>
    </svg>
  );
}

export default function CreateSpecificDrillDialog({
  open,
  onOpenChange,
  onDrillCreated,
  initialDrill,
  onScheduleDrill,
}: Props) {
  const createDrill = useMutation(api.drills.createDrill);
  const generateDrillAction = useAction(api.tacticalAi.generateTacticalDrillAction);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [isTitleTouched, setIsTitleTouched] = useState(false);
  const [showAdvancedTracking, setShowAdvancedTracking] = useState(false);
  const [activePitchPreset, setActivePitchPreset] = useState("4-Cone Box");

  // Step 1: Basics
  const [title, setTitle] = useState("");
  const [ageGroup, setAgeGroup] = useState<string>("U11-U12");
  const [category, setCategory] = useState("passing_rondos");
  const [difficulty, setDifficulty] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");

  // Step 2: Practice & Pitch Setup
  const [playerCount, setPlayerCount] = useState<string>("5-8");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [gridDimensions, setGridDimensions] = useState("15m x 15m grid");
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    "Cones",
    "Soccer balls",
    "Bibs/Pinnies",
  ]);
  const [customEquipment, setCustomEquipment] = useState("");
  const [summary, setSummary] = useState(
    "Quick-paced passing rondo developing awareness and 1-2 touch combinations."
  );
  const [setup, setSetup] = useState(
    "Set up a 15x15m grid with 4 cones. Provide 6 soccer balls on the outside for rapid restarts."
  );
  const [instructions, setInstructions] = useState<string[]>([
    "Position possession players along the perimeter with 1-2 defenders inside.",
    "Keep ball moving with 1-2 touch restrictions.",
    "Defenders switch out upon winning the ball or forcing a turnover.",
  ]);
  const [coachingPoints, setCoachingPoints] = useState<string[]>([
    "Open body shape and scan the field before receiving.",
    "Firm, crisp ground passes to the correct foot.",
    "Support angles must form clear passing triangles at all times.",
  ]);

  // Step 3: Performance Tracking & Review
  const [trackProgress, setTrackProgress] = useState(true);
  const [metricName, setMetricName] = useState("Pass Streak (Clean Possessions)");
  const [metricUnit, setMetricUnit] = useState("passes");
  const [benchmark, setBenchmark] = useState<number>(15);
  const [isLowerBetter, setIsLowerBetter] = useState(false);
  const [targetAttribute, setTargetAttribute] = useState<
    "Speed" | "Power" | "Agility" | "Strength" | "Endurance" | "Mobility" | "Technical" | "Tactical"
  >("Tactical");

  // Prepopulate if cloning from an existing drill
  useEffect(() => {
    if (initialDrill && open) {
      setTitle(`${initialDrill.title} (Progression)`);
      setIsTitleTouched(true);
      setAgeGroup(initialDrill.ageGroup);
      setCategory(initialDrill.category);
      setDifficulty(initialDrill.difficulty);
      setDurationMinutes(initialDrill.durationMinutes);
      setGridDimensions(initialDrill.gridDimensions);
      setSelectedEquipment(initialDrill.equipment);
      setSummary(initialDrill.summary);
      setSetup(initialDrill.setup);
      setInstructions(initialDrill.instructions);
      setCoachingPoints(initialDrill.coachingPoints);
      if (initialDrill.metricName) {
        setMetricName(initialDrill.metricName);
        setMetricUnit(initialDrill.metricUnit || "pts");
        setBenchmark(initialDrill.benchmark || 10);
        setIsLowerBetter(Boolean(initialDrill.isLowerBetter));
        setTargetAttribute(initialDrill.targetAttribute || "Tactical");
      }
      setCurrentStep(1);
    }
  }, [initialDrill, open]);

  // Category change handler
  const handleSelectCategory = (catId: string) => {
    setCategory(catId);
    const cat = CATEGORY_OPTIONS.find((c) => c.id === catId);
    if (!cat) return;

    setMetricName(cat.defaultMetric);
    setMetricUnit(cat.defaultUnit);
    setBenchmark(cat.defaultBenchmark);
    setIsLowerBetter(cat.isLowerBetter);
    setTargetAttribute(cat.targetAttribute);
    setGridDimensions(cat.defaultGrid);
    setSelectedEquipment(cat.defaultEquipment);
    setInstructions(cat.sampleInstructions);
    setCoachingPoints(cat.samplePoints);

    if (!isTitleTouched && !title.trim()) {
      const ageLabel = AGE_GROUP_CONFIG[ageGroup]?.label || ageGroup;
      if (catId === "passing_rondos") setTitle(`${ageLabel} Fast-Paced Rondo`);
      else if (catId === "shooting_finishing") setTitle(`${ageLabel} Turn & Strike Finishing`);
      else if (catId === "ball_mastery") setTitle(`${ageLabel} 1v1 Skill & Gate Escape`);
      else if (catId === "tactical_possession") setTitle(`${ageLabel} 4v4+2 Directional Possession`);
      else if (catId === "defending_pressing") setTitle(`${ageLabel} High-Press Trap & Recover`);
      else if (catId === "agility_speed") setTitle(`${ageLabel} Explosive Change of Pace`);
      else if (catId === "goalkeeping") setTitle(`${ageLabel} Shot-Stopping & Rapid Recovery`);
    }
  };

  const handleToggleEquipment = (item: string) => {
    if (selectedEquipment.includes(item)) {
      if (selectedEquipment.length > 1) {
        setSelectedEquipment(selectedEquipment.filter((e) => e !== item));
      }
    } else {
      setSelectedEquipment([...selectedEquipment, item]);
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

  // AI Autofill handler
  const handleAiAutofill = async () => {
    setAiGenerating(true);
    try {
      const response = await generateDrillAction({
        ageGroup: (ageGroup === "All U16" ? "U13-U14" : ageGroup) as AgeGroup,
        category: (category === "goalkeeping" ? "tactical_possession" : category) as TacticalCategory,
        difficulty: difficulty === "Beginner" ? "Beginner" : difficulty === "Advanced" ? "Advanced" : "Intermediate",
        targetAttribute: targetAttribute,
        promptNotes: aiPrompt.trim() || undefined,
      });

      const d = response.drill;
      if (d) {
        setTitle(d.title);
        setIsTitleTouched(true);
        setSummary(d.summary);
        setSetup(d.setup);
        setGridDimensions(d.gridDimensions || "20m x 20m grid");
        if (d.equipment && d.equipment.length > 0) {
          setSelectedEquipment(d.equipment);
        }
        if (d.instructions && d.instructions.length > 0) {
          setInstructions(d.instructions);
        }
        if (d.coachingPoints && d.coachingPoints.length > 0) {
          setCoachingPoints(d.coachingPoints);
        }
        if (d.durationMinutes) {
          setDurationMinutes(d.durationMinutes);
        }
        if (d.metricName) {
          setMetricName(d.metricName);
          setMetricUnit(d.metricUnit || "pts");
          setBenchmark(d.benchmark || 10);
          setIsLowerBetter(Boolean(d.isLowerBetter));
        }

        toast.success("✨ Drill autofilled with AI!", {
          description: "All steps have been customized for you. Review or adjust any details.",
        });

        setCurrentStep(2);
        setShowAiHelper(false);
      }
    } catch (err) {
      console.warn("Backend AI call failed, falling back to local CoachTactics synthesis:", err);
      try {
        const localDrill = synthesizeTacticalDrill({
          ageGroup: (ageGroup === "All U16" ? "U13-U14" : ageGroup) as AgeGroup,
          category: (category === "goalkeeping" ? "tactical_possession" : category) as TacticalCategory,
          difficulty: difficulty === "Beginner" ? "Beginner" : difficulty === "Advanced" ? "Advanced" : "Intermediate",
          targetAttribute: targetAttribute,
          promptNotes: aiPrompt.trim() || undefined,
        });

        const d = localDrill.drill;
        setTitle(d.title);
        setIsTitleTouched(true);
        setSummary(d.summary);
        setSetup(d.setup);
        setGridDimensions(d.gridDimensions);
        setSelectedEquipment(d.equipment);
        setInstructions(d.instructions);
        setCoachingPoints(d.coachingPoints);
        setDurationMinutes(d.durationMinutes);
        setMetricName(d.metricName);
        setMetricUnit(d.metricUnit);
        setBenchmark(d.benchmark);
        setIsLowerBetter(d.isLowerBetter);

        toast.success("✨ Generated via Pitch-Side AI Engine!", {
          description: "Review and customize the drill as needed.",
        });
        setCurrentStep(2);
        setShowAiHelper(false);
      } catch {
        toast.error("Failed to generate drill. Please try again.");
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const handleNextFromStep1 = () => {
    if (!title.trim()) {
      toast.error("Please enter a drill name to continue");
      return;
    }
    setCurrentStep(2);
  };

  const handleNextFromStep2 = () => {
    const validInstructions = instructions.filter((i) => i.trim());
    if (validInstructions.length === 0) {
      toast.error("Please add at least one instruction step");
      return;
    }
    setCurrentStep(3);
  };

  const handleSubmit = async (scheduleAfterSave = false) => {
    if (!title.trim()) {
      toast.error("Please enter a drill title");
      setCurrentStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const allEquipment = [...selectedEquipment];
      if (customEquipment.trim()) {
        const extras = customEquipment.split(",").map((s) => s.trim()).filter(Boolean);
        allEquipment.push(...extras);
      }

      const cleanInstructions = instructions.map((s) => s.trim()).filter(Boolean);
      const cleanPoints = coachingPoints.map((s) => s.trim()).filter(Boolean);

      const activeCat = CATEGORY_OPTIONS.find((c) => c.id === category);
      const catLabel = activeCat ? activeCat.label : "Technical";
      const birthYears = AGE_GROUP_CONFIG[ageGroup]?.birthYears || "2011–2020";

      // Include squad size in summary for indexing & search
      const squadLabel = SQUAD_SIZE_OPTIONS.find((s) => s.id === playerCount)?.label || "5–8 Players";
      const cleanSummary = summary.trim()
        ? summary.trim().includes("Squad:")
          ? summary.trim()
          : `${summary.trim()} [Squad: ${squadLabel}]`
        : `Practical ${catLabel} drill for ${ageGroup} youth athletes. [Squad: ${squadLabel}]`;

      const finalMetricName = trackProgress && metricName.trim()
        ? metricName.trim()
        : `${title.trim()} Completion`;
      const finalMetricUnit = trackProgress && metricUnit.trim() ? metricUnit.trim() : "pts";
      const finalBenchmark = trackProgress ? Number(benchmark) || 10 : 10;

      const drillPayload = {
        title: title.trim(),
        ageGroup,
        birthYears,
        category,
        categoryLabel: catLabel,
        difficulty,
        durationMinutes: Number(durationMinutes) || 15,
        durationSeconds: (Number(durationMinutes) || 15) * 60,
        recommendedSets: 4,
        recommendedReps: 6,
        gridDimensions: gridDimensions.trim() || "20m x 20m grid",
        equipment: allEquipment.length > 0 ? allEquipment : ["Soccer balls", "Cones"],
        summary: cleanSummary,
        setup: setup.trim() || "Set up marked grid with cones and soccer balls at starting line.",
        instructions: cleanInstructions.length > 0 ? cleanInstructions : ["Execute drill according to coach guidelines."],
        coachingPoints: cleanPoints.length > 0 ? cleanPoints : ["Focus on proper body shape and touch quality."],
        variations: [`Squad size: ${squadLabel}`],
        metricName: finalMetricName,
        metricUnit: finalMetricUnit,
        benchmark: finalBenchmark,
        isLowerBetter,
        targetAttribute,
      };

      const newId = await createDrill(drillPayload);

      toast.success("Drill created successfully!", {
        description: `"${title}" has been saved to your academy playbook.`,
      });

      onOpenChange(false);
      onDrillCreated?.(newId);

      if (scheduleAfterSave && onScheduleDrill) {
        onScheduleDrill({
          ...drillPayload,
          id: newId,
          ageGroup: drillPayload.ageGroup as SoccerDrill["ageGroup"],
          category: drillPayload.category as SoccerDrill["category"],
          difficulty: drillPayload.difficulty as SoccerDrill["difficulty"],
          targetAttribute: drillPayload.targetAttribute as SoccerDrill["targetAttribute"],
        });
      }

      // Reset wizard
      setCurrentStep(1);
      setTitle("");
      setIsTitleTouched(false);
      setAiPrompt("");
      setShowAiHelper(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create drill");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = CATEGORY_OPTIONS.find((c) => c.id === category) || CATEGORY_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 rounded-2xl border shadow-2xl bg-background">
        {/* Header with Step Tracker */}
        <div className="p-4 sm:p-6 pb-4 border-b bg-muted/20">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                {initialDrill ? <Copy className="size-5" /> : <Compass className="size-5" />}
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight">
                  {initialDrill ? `Clone & Tweak: ${initialDrill.title}` : "Create Soccer Drill"}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  {initialDrill
                    ? "Modify details below and save as a brand new drill progression."
                    : "Step-by-step coach playbook builder with optional AI assistance."}
                </DialogDescription>
              </div>
            </div>

            {/* AI Assistant Quick Pill */}
            {currentStep === 1 && (
              <Button
                type="button"
                variant={showAiHelper ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowAiHelper(!showAiHelper)}
                className="gap-1.5 text-xs font-semibold h-8 border-primary/30 text-primary hover:bg-primary/10"
              >
                <Sparkles className="size-3.5" />
                {showAiHelper ? "Close AI" : "✨ Autofill with AI"}
              </Button>
            )}
          </div>

          {/* Stepper Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                currentStep === 1
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : currentStep > 1
                  ? "bg-primary/15 text-primary hover:bg-primary/25 font-medium"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <div
                className={`size-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  currentStep === 1
                    ? "bg-primary-foreground text-primary"
                    : currentStep > 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > 1 ? <Check className="size-3" /> : "1"}
              </div>
              <div className="truncate">
                <p className="text-xs leading-none">1. The Basics</p>
                <span className="text-[10px] opacity-80 hidden sm:inline">Name & Category</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (title.trim()) setCurrentStep(2);
                else toast.error("Enter a drill title first");
              }}
              className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                currentStep === 2
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : currentStep > 2
                  ? "bg-primary/15 text-primary hover:bg-primary/25 font-medium"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <div
                className={`size-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  currentStep === 2
                    ? "bg-primary-foreground text-primary"
                    : currentStep > 2
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {currentStep > 2 ? <Check className="size-3" /> : "2"}
              </div>
              <div className="truncate">
                <p className="text-xs leading-none">2. On The Pitch</p>
                <span className="text-[10px] opacity-80 hidden sm:inline">Space & Steps</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                if (title.trim()) setCurrentStep(3);
                else toast.error("Complete the previous steps first");
              }}
              className={`flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                currentStep === 3
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <div
                className={`size-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  currentStep === 3
                    ? "bg-primary-foreground text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                3
              </div>
              <div className="truncate">
                <p className="text-xs leading-none">3. Review & Track</p>
                <span className="text-[10px] opacity-80 hidden sm:inline">Preview & Save</span>
              </div>
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* ================= STEP 1: BASICS ================= */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Optional AI Assistant Dropdown Box */}
              {showAiHelper && (
                <div className="p-4 rounded-xl border border-primary/25 bg-gradient-to-r from-primary/10 via-amber-500/5 to-primary/5 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="size-4 text-primary animate-pulse" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                        AI Drill Designer Shortcut
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-background">
                      Optional Assistance
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Type a quick description (e.g. <i>"High intensity 4v2 transition rondo"</i>) or leave blank to generate a complete drill for your selected age & category.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="e.g. Rapid counter-attack finishing drill under pressure..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      className="bg-background text-xs h-9"
                    />
                    <Button
                      type="button"
                      onClick={handleAiAutofill}
                      disabled={aiGenerating}
                      className="gap-1.5 text-xs font-semibold h-9 shrink-0 shadow-sm"
                    >
                      {aiGenerating ? (
                        <>
                          <Spinner className="size-3.5" />
                          Designing Drill...
                        </>
                      ) : (
                        <>
                          <Wand2 className="size-3.5" />
                          Generate Drill
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Drill Name */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="drill-title" className="text-sm font-semibold">
                    Drill Name *
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Descriptive title for players & staff
                  </span>
                </div>
                <Input
                  id="drill-title"
                  placeholder="e.g. Rapid 5-Gate Transition & Finish"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setIsTitleTouched(true);
                  }}
                  className="text-base font-medium h-11"
                  required
                />
              </div>

              {/* Age Bracket Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Target Age Group</Label>
                  <span className="text-xs text-primary font-medium">
                    Born {AGE_GROUP_CONFIG[ageGroup]?.birthYears}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                  {Object.entries(AGE_GROUP_CONFIG).map(([key, config]) => {
                    const isSelected = ageGroup === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setAgeGroup(key)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs"
                            : "bg-card hover:bg-muted/40 text-foreground border-border"
                        }`}
                      >
                        <span className="font-bold text-xs">{config.label}</span>
                        <span
                          className={`text-[10px] mt-1 line-clamp-1 ${
                            isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                          }`}
                        >
                          {config.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category Grid */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Practice Focus / Category</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => handleSelectCategory(cat.id)}
                        className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? "bg-primary/10 border-primary text-foreground ring-1 ring-primary"
                            : "bg-card hover:bg-muted/40 text-foreground border-border"
                        }`}
                      >
                        <span className="text-2xl shrink-0 p-1 rounded-lg bg-background border">
                          {cat.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs sm:text-sm">
                              {cat.label}
                            </span>
                            {isSelected && (
                              <CheckCircle2 className="size-4 text-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                            {cat.shortDesc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Difficulty Level */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Difficulty Level</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Beginner", "Intermediate", "Advanced"] as const).map((lvl) => {
                    const isSelected = difficulty === lvl;
                    const colors = {
                      Beginner: isSelected
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "border-border hover:bg-muted/50",
                      Intermediate: isSelected
                        ? "bg-amber-600 text-white border-amber-600"
                        : "border-border hover:bg-muted/50",
                      Advanced: isSelected
                        ? "bg-rose-600 text-white border-rose-600"
                        : "border-border hover:bg-muted/50",
                    };
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setDifficulty(lvl)}
                        className={`p-2.5 rounded-xl border text-center font-medium text-xs transition-all ${colors[lvl]}`}
                      >
                        {lvl}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: ON THE PITCH ================= */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Squad Size Selector (NEW: Solves coach player count problem) */}
              <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Users className="size-4 text-primary" /> Ideal Squad Size / Players
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Matches sideline attendance
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {SQUAD_SIZE_OPTIONS.map((opt) => {
                    const isSelected = playerCount === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPlayerCount(opt.id)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                            : "bg-background text-foreground hover:bg-muted/50 border-border"
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.label}</div>
                        <div className={`text-[10px] truncate ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Practice Timing & Space */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="drill-duration" className="text-sm font-semibold flex items-center gap-1.5">
                    <Clock className="size-4 text-primary" /> Practice Duration
                  </Label>
                  <div className="flex items-center gap-2">
                    {[10, 15, 20, 30].map((mins) => (
                      <Button
                        key={mins}
                        type="button"
                        variant={durationMinutes === mins ? "default" : "outline"}
                        size="sm"
                        onClick={() => setDurationMinutes(mins)}
                        className="text-xs h-9 flex-1"
                      >
                        {mins}m
                      </Button>
                    ))}
                    <Input
                      id="drill-duration"
                      type="number"
                      min={1}
                      max={90}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className="w-16 h-9 text-center text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grid-dim" className="text-sm font-semibold flex items-center gap-1.5">
                    <Compass className="size-4 text-primary" /> Pitch Dimensions
                  </Label>
                  <Select value={gridDimensions} onValueChange={setGridDimensions}>
                    <SelectTrigger id="grid-dim" className="h-9 text-xs">
                      <SelectValue placeholder="Select space" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_GRIDS.map((p) => (
                        <SelectItem key={p} value={p} className="text-xs">
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Equipment Needed Chips */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Equipment Needed</Label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_EQUIPMENT.map((eq) => {
                    const isSelected = selectedEquipment.includes(eq);
                    return (
                      <button
                        key={eq}
                        type="button"
                        onClick={() => handleToggleEquipment(eq)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary font-medium"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
                        }`}
                      >
                        {isSelected && <Check className="size-3" />}
                        {eq}
                      </button>
                    );
                  })}
                </div>
                <Input
                  placeholder="Extra equipment (e.g. 4 yellow bibs, stopwatch, 2 agility hurdles)..."
                  value={customEquipment}
                  onChange={(e) => setCustomEquipment(e.target.value)}
                  className="text-xs h-8 mt-1"
                />
              </div>

              {/* Visual Pitch Setup with SVG Diagram & 1-Click Presets */}
              <div className="space-y-2.5 p-3.5 rounded-xl border bg-card/60">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Target className="size-4 text-primary" /> Visual Pitch Setup & Presets
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    1-Click Field Presets:
                  </span>
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {PITCH_SETUP_PRESETS.map((preset) => {
                    const isSelected = activePitchPreset === preset.name;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setActivePitchPreset(preset.name);
                          setSetup(preset.setup);
                          setGridDimensions(preset.grid);
                        }}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1 ${
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                            : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
                        }`}
                      >
                        📐 {preset.name}
                      </button>
                    );
                  })}
                </div>

                {/* Live SVG Pitch Mini-Diagram */}
                <PitchMiniDiagram presetName={activePitchPreset} />

                <Textarea
                  id="drill-setup"
                  rows={2}
                  placeholder="Where do players, balls, and cones start before the whistle?"
                  value={setup}
                  onChange={(e) => setSetup(e.target.value)}
                  className="text-xs sm:text-sm mt-1"
                />
              </div>

              {/* Summary / Objective */}
              <div className="space-y-1.5">
                <Label htmlFor="drill-summary" className="text-sm font-semibold">
                  Tactical Purpose & Summary
                </Label>
                <Textarea
                  id="drill-summary"
                  rows={2}
                  placeholder="In 1-2 sentences, what will players practice or learn in this drill?"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="text-xs sm:text-sm"
                />
              </div>

              {/* Step-by-Step Instructions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Step-by-Step Execution</Label>
                    <p className="text-[11px] text-muted-foreground">
                      How players execute the practice phase
                    </p>
                  </div>
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
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right shrink-0">
                        {idx + 1}.
                      </span>
                      <Input
                        value={step}
                        onChange={(e) => handleUpdateInstruction(idx, e.target.value)}
                        placeholder={`Step ${idx + 1}...`}
                        className="text-xs h-9"
                      />
                      {instructions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveInstruction(idx)}
                          className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Coaching Points */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Key Coaching Tips</Label>
                    <p className="text-[11px] text-muted-foreground">
                      What to praise and correct during practice
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCoachingPoint}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="size-3" /> Add Tip
                  </Button>
                </div>
                <div className="space-y-2">
                  {coachingPoints.map((point, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs text-primary font-bold w-5 text-right shrink-0">
                        •
                      </span>
                      <Input
                        value={point}
                        onChange={(e) => handleUpdateCoachingPoint(idx, e.target.value)}
                        placeholder={`Coaching tip ${idx + 1}...`}
                        className="text-xs h-9"
                      />
                      {coachingPoints.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveCoachingPoint(idx)}
                          className="size-8 text-muted-foreground hover:text-destructive shrink-0"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: TRACKING & REVIEW ================= */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-in fade-in-50 duration-200">
              {/* Performance Tracking Section */}
              <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Activity className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">
                        Athlete Progress & Radar Tracking
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Pre-configured automatically based on drill category.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="track-progress" className="text-xs font-medium cursor-pointer hidden sm:inline">
                      {trackProgress ? "Tracking Active" : "Tracking Off"}
                    </Label>
                    <Switch
                      id="track-progress"
                      checked={trackProgress}
                      onCheckedChange={setTrackProgress}
                    />
                  </div>
                </div>

                {trackProgress && (
                  <div className="pt-2 border-t space-y-3">
                    {/* Auto-Configured Summary Card */}
                    <div className="p-3 rounded-lg bg-background border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">Skill Focus:</span>
                          <Badge variant="outline" className="text-[11px] font-semibold text-primary">
                            {targetAttribute}
                          </Badge>
                          <span className="text-muted-foreground ml-2">Metric:</span>
                          <strong className="text-foreground">{metricName}</strong>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Target Goal: <span className="font-semibold text-foreground">{benchmark} {metricUnit}</span> • Evaluated by: <span className="font-semibold text-foreground">{isLowerBetter ? "Faster Time (lower)" : "Higher Score (more)"}</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdvancedTracking(!showAdvancedTracking)}
                        className="text-xs h-7 text-primary border-primary/20 hover:bg-primary/10 shrink-0"
                      >
                        <Sliders className="size-3 mr-1" />
                        {showAdvancedTracking ? "Hide Customization" : "Customize Metric"}
                      </Button>
                    </div>

                    {/* Advanced Customization Drawer */}
                    {showAdvancedTracking && (
                      <div className="p-3 rounded-lg border bg-card/60 space-y-3 animate-in fade-in-50 duration-150">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 space-y-1.5">
                            <Label htmlFor="metric-name" className="text-xs font-medium">
                              Metric Name
                            </Label>
                            <Input
                              id="metric-name"
                              value={metricName}
                              onChange={(e) => setMetricName(e.target.value)}
                              placeholder="e.g. Pass Streak or Finishing Accuracy"
                              className="text-xs h-8"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="metric-unit" className="text-xs font-medium">
                              Unit
                            </Label>
                            <Input
                              id="metric-unit"
                              value={metricUnit}
                              onChange={(e) => setMetricUnit(e.target.value)}
                              placeholder="e.g. passes, s, %"
                              className="text-xs h-8"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="metric-bench" className="text-xs font-medium">
                              Target Benchmark
                            </Label>
                            <Input
                              id="metric-bench"
                              type="number"
                              step="any"
                              value={benchmark}
                              onChange={(e) => setBenchmark(Number(e.target.value))}
                              className="text-xs h-8"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Score Direction</Label>
                            <Select
                              value={isLowerBetter ? "lower" : "higher"}
                              onValueChange={(val) => setIsLowerBetter(val === "lower")}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="higher" className="text-xs">
                                  🏆 Higher is Better (passes, goals)
                                </SelectItem>
                                <SelectItem value="lower" className="text-xs">
                                  ⏱️ Faster is Better (seconds, race time)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Radar Competency</Label>
                            <Select
                              value={targetAttribute}
                              onValueChange={(val: typeof targetAttribute) => setTargetAttribute(val)}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Tactical" className="text-xs">Tactical (Vision & Passing)</SelectItem>
                                <SelectItem value="Technical" className="text-xs">Technical (Ball Mastery)</SelectItem>
                                <SelectItem value="Agility" className="text-xs">Agility (Movement)</SelectItem>
                                <SelectItem value="Speed" className="text-xs">Speed (Pace & Sprint)</SelectItem>
                                <SelectItem value="Power" className="text-xs">Power (Striking)</SelectItem>
                                <SelectItem value="Endurance" className="text-xs">Endurance (Stamina)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Playbook Card Preview */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Eye className="size-4 text-primary" />
                  <Label className="text-sm font-semibold">Playbook Card Preview</Label>
                </div>
                <div className="p-4 rounded-xl border bg-card shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {AGE_GROUP_CONFIG[ageGroup]?.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <span>{selectedCategoryObj.icon}</span>
                          <span>{selectedCategoryObj.label}</span>
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            difficulty === "Beginner"
                              ? "text-emerald-500 border-emerald-500/30"
                              : difficulty === "Advanced"
                              ? "text-rose-500 border-rose-500/30"
                              : "text-amber-500 border-amber-500/30"
                          }`}
                        >
                          {difficulty}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {durationMinutes} mins
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] text-primary bg-primary/10">
                          {SQUAD_SIZE_OPTIONS.find((s) => s.id === playerCount)?.label}
                        </Badge>
                      </div>
                      <h4 className="text-base font-bold text-foreground">
                        {title || "Untitled Drill"}
                      </h4>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {summary || "No description provided."}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t">
                    <div>
                      <span className="font-semibold text-foreground">Grid: </span>
                      <span className="text-muted-foreground">{gridDimensions}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Equipment: </span>
                      <span className="text-muted-foreground truncate">
                        {selectedEquipment.join(", ") || "Standard balls & cones"}
                      </span>
                    </div>
                  </div>

                  {trackProgress && (
                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/15 text-[11px] flex items-center justify-between">
                      <span className="text-primary font-medium flex items-center gap-1">
                        <Target className="size-3" />
                        Target: {benchmark} {metricUnit}
                      </span>
                      <span className="text-muted-foreground">
                        Focus: {targetAttribute}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 sm:p-5 border-t bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {currentStep === 1 ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto text-xs"
            >
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCurrentStep((s) => (s - 1) as 1 | 2)}
              className="w-full sm:w-auto gap-1 text-xs"
            >
              <ChevronLeft className="size-3.5" /> Back
            </Button>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            {currentStep === 1 && (
              <Button
                type="button"
                onClick={handleNextFromStep1}
                className="w-full sm:w-auto gap-1 text-xs font-semibold h-9 shadow-sm"
              >
                Next: Pitch Setup <ChevronRight className="size-3.5" />
              </Button>
            )}

            {currentStep === 2 && (
              <Button
                type="button"
                onClick={handleNextFromStep2}
                className="w-full sm:w-auto gap-1 text-xs font-semibold h-9 shadow-sm"
              >
                Next: Review & Track <ChevronRight className="size-3.5" />
              </Button>
            )}

            {currentStep === 3 && (
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="w-full sm:w-auto text-xs font-semibold h-9 shadow-xs"
                >
                  Save to Playbook
                </Button>

                <Button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="w-full sm:w-auto gap-1.5 text-xs font-semibold h-9 shadow-sm bg-primary text-primary-foreground"
                >
                  {submitting ? (
                    <>
                      <Spinner className="size-3.5" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CalendarClock className="size-3.5" />
                      Save & Add to Session 📅
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
