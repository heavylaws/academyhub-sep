import React, { useRef, useState } from "react";
import {
  Printer,
  Copy,
  Check,
  FileText,
  X,
  Target,
  Layers,
  Shield,
  Timer,
  CheckSquare,
  Sparkles,
  Users,
  Sun,
  Eye,
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
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";
import type { SoccerDrill } from "@/data/soccer-drills.ts";
import type { TacticalPlan, TacticalPhase } from "@/domain/tactics/tactical-domain.ts";
import { TacticalPitchSvg } from "./tactical-pitch-svg.tsx";

interface TacticalSheetExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drill: SoccerDrill | null;
  tacticalPlan?: TacticalPlan;
}

export const TacticalSheetExportModal: React.FC<TacticalSheetExportModalProps> = ({
  open,
  onOpenChange,
  drill,
  tacticalPlan,
}) => {
  const [copied, setCopied] = useState(false);
  const [inkSaverMode, setInkSaverMode] = useState(false);
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(0);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const currentPhase: TacticalPhase =
    tacticalPlan?.phases[selectedPhaseIndex] || tacticalPlan?.phases[0] || {
      id: "phase_1",
      phaseNumber: 1,
      title: "Initial Setup",
      durationSeconds: 4,
      players: [],
      ball: { x: 50, y: 50 },
      equipment: [],
      annotations: [],
    };

  // Tally equipment counts
  const equipmentTally = React.useMemo(() => {
    const counts: Record<string, number> = {};
    currentPhase.equipment.forEach((eq) => {
      const name = eq.type.replace(/_/g, " ");
      counts[name] = (counts[name] || 0) + 1;
    });
    return counts;
  }, [currentPhase.equipment]);

  // Squad rosters
  const homeSquad = currentPhase.players.filter((p) => p.team === "home" || p.team === "gk_home");
  const awaySquad = currentPhase.players.filter((p) => p.team === "away" || p.team === "gk_away");
  const neutralSquad = currentPhase.players.filter((p) => p.team === "neutral");

  if (!drill) return null;

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened. Select 'Save as PDF' or choose a printer.");
  };

  const handleCopyMarkdown = () => {
    const text = `# ${drill.title} (${drill.ageGroup}) - Version ${drill.version || "1.0"}
Category: ${drill.categoryLabel} | Birth Years: ${drill.birthYears}
Duration: ${drill.durationMinutes} mins | Sets: ${drill.recommendedSets} | Reps: ${drill.recommendedReps}
Grid Dimensions: ${drill.gridDimensions}
Equipment: ${drill.equipment.join(", ")}

## Summary
${drill.summary}

## Spatial Setup
${drill.setup}

## Instructions
${drill.instructions.map((ins, i) => `${i + 1}. ${ins}`).join("\n")}

## Coaching Points
${drill.coachingPoints.map((pt) => `- [ ] ${pt}`).join("\n")}

## Variations
${(drill.variations || []).map((v) => `- ${v}`).join("\n")}

## Benchmark Metric
- ${drill.metricName}: ${drill.benchmark} ${drill.metricUnit} (${drill.isLowerBetter ? "Lower is better" : "Higher is better"})
`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Tactical session sheet copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Modal Header */}
        <DialogHeader className="border-b pb-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  High-Contrast Coach Clipboard Sheet & Drill Card
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Print-ready tactical sheet with pitch vector diagram, squad positions, phase steps, and equipment checklist.
                </DialogDescription>
              </div>
            </div>

            {/* Quick Print Style Toggles */}
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border text-xs">
              <button
                type="button"
                onClick={() => setInkSaverMode(false)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  !inkSaverMode
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ⚽ Color Pitch
              </button>
              <button
                type="button"
                onClick={() => setInkSaverMode(true)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                  inkSaverMode
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="size-3" />
                <span>Ink-Saver B&W</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Sheet Card */}
        <div
          ref={printAreaRef}
          className="border border-border rounded-xl p-4 sm:p-6 bg-white text-zinc-950 font-sans space-y-4 print:border-none print:p-0 print:text-black"
        >
          {/* Header Banner */}
          <div className="flex flex-wrap items-start justify-between border-b-2 border-zinc-900 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-600">
                  COACHTACTICS • TACTICAL TRAINING DRILL SHEET
                </span>
                <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-300 font-bold">
                  v{drill.version || "1.0"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight mt-0.5">
                {drill.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-zinc-600 mt-1">
                <span><strong>Age:</strong> {drill.ageGroup} ({drill.birthYears})</span>
                <span>•</span>
                <span><strong>Focus:</strong> {drill.categoryLabel}</span>
                <span>•</span>
                <span><strong>Format:</strong> {tacticalPlan?.gridDimensions || drill.gridDimensions}</span>
              </div>
            </div>

            <div className="text-right text-xs text-zinc-600 font-mono">
              <div>Date: {new Date().toLocaleDateString()}</div>
              <div>Pitch Mode: {tacticalPlan?.pitchType?.replace(/_/g, " ").toUpperCase() || "FULL PITCH"}</div>
              <div>Phase: {currentPhase.phaseNumber} of {tacticalPlan?.phases.length || 1}</div>
            </div>
          </div>

          {/* Quick Metrics & Prescriptions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Duration</span>
              <span className="font-bold text-sm text-zinc-900">{drill.durationMinutes} minutes</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Sets × Reps</span>
              <span className="font-bold text-sm text-zinc-900">{drill.recommendedSets} sets × {drill.recommendedReps} reps</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Grid Space</span>
              <span className="font-bold text-sm text-zinc-900 truncate block">{drill.gridDimensions}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Target Benchmark</span>
              <span className="font-bold text-sm text-zinc-900">{drill.benchmark} {drill.metricUnit}</span>
            </div>
          </div>

          {/* Tactical Pitch Visual Diagram Card */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Target className="size-3.5 text-zinc-700" />
                <span>Tactical Pitch Layout — {currentPhase.title}</span>
              </h4>

              {/* Phase Switcher for print inspection */}
              {tacticalPlan && tacticalPlan.phases.length > 1 && (
                <div className="flex items-center gap-1 print:hidden">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase">View Phase:</span>
                  {tacticalPlan.phases.map((p, idx) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPhaseIndex(idx)}
                      className={`size-6 rounded text-[10px] font-bold ${
                        selectedPhaseIndex === idx
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Visual Pitch Render Container */}
            <div
              className={`relative w-full aspect-[1000/650] max-h-[360px] rounded-lg overflow-hidden border-2 ${
                inkSaverMode ? "bg-white border-zinc-900" : "bg-emerald-950 border-emerald-900"
              }`}
            >
              {/* Pitch Markings SVG */}
              {!inkSaverMode ? (
                <TacticalPitchSvg pitchType={tacticalPlan?.pitchType || "full"} />
              ) : (
                <svg viewBox="0 0 1000 650" className="w-full h-full">
                  <rect width="1000" height="650" fill="#FFFFFF" />
                  <rect x="25" y="25" width="950" height="600" fill="none" stroke="#000000" strokeWidth="3" />
                  <line x1="500" y1="25" x2="500" y2="625" stroke="#000000" strokeWidth="3" />
                  <circle cx="500" cy="325" r="88" fill="none" stroke="#000000" strokeWidth="3" />
                  <circle cx="500" cy="325" r="4" fill="#000000" />
                  <rect x="25" y="150" width="160" height="350" fill="none" stroke="#000000" strokeWidth="3" />
                  <rect x="815" y="150" width="160" height="350" fill="none" stroke="#000000" strokeWidth="3" />
                  <circle cx="135" cy="325" r="4" fill="#000000" />
                  <circle cx="865" cy="325" r="4" fill="#000000" />
                </svg>
              )}

              {/* Vector Annotations Layer */}
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                {currentPhase.annotations.map((ann) => {
                  if (ann.points.length === 0) return null;
                  const start = ann.points[0];
                  const end = ann.points[ann.points.length - 1];
                  const isDashed = ann.type === "pass_line";

                  if (ann.type === "press_zone") {
                    const minX = Math.min(start.x, end.x);
                    const minY = Math.min(start.y, end.y);
                    const w = Math.abs(end.x - start.x);
                    const h = Math.abs(end.y - start.y);
                    return (
                      <rect
                        key={ann.id}
                        x={minX}
                        y={minY}
                        width={w}
                        height={h}
                        fill={inkSaverMode ? "#000000" : ann.color}
                        fillOpacity={0.15}
                        stroke={inkSaverMode ? "#000000" : ann.color}
                        strokeWidth={0.8}
                        strokeDasharray="2 2"
                      />
                    );
                  }

                  return (
                    <line
                      key={ann.id}
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke={inkSaverMode ? "#000000" : ann.color}
                      strokeWidth={1}
                      strokeDasharray={isDashed ? "2.5 1.5" : undefined}
                    />
                  );
                })}

                {/* Trajectory dashed lines */}
                {currentPhase.players.map((p) => {
                  if (!p.targetPosition) return null;
                  return (
                    <line
                      key={`traj_${p.id}`}
                      x1={p.position.x}
                      y1={p.position.y}
                      x2={p.targetPosition.x}
                      y2={p.targetPosition.y}
                      stroke={inkSaverMode ? "#666666" : "rgba(255,255,255,0.7)"}
                      strokeWidth={0.8}
                      strokeDasharray="1.5 1.5"
                    />
                  );
                })}
              </svg>

              {/* Equipment Tokens */}
              {currentPhase.equipment.map((eq) => (
                <div
                  key={eq.id}
                  style={{
                    left: `${eq.position.x}%`,
                    top: `${eq.position.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className="absolute pointer-events-none"
                >
                  {eq.type === "cone" && (
                    <div className="size-3 bg-amber-500 border border-amber-800 rounded-full" />
                  )}
                  {eq.type === "mannequin" && (
                    <div className="w-2 h-4 bg-amber-400 border border-amber-900 rounded-xs flex items-center justify-center text-[6px] font-black">
                      M
                    </div>
                  )}
                  {eq.type === "mini_goal" && (
                    <div className="w-5 h-2.5 border-2 border-red-600 bg-red-500/30 rounded-xs" />
                  )}
                  {eq.type === "agility_pole" && (
                    <div className="w-1 h-4 bg-yellow-400 border border-black rounded-full" />
                  )}
                  {eq.type === "speed_ladder" && (
                    <div className="w-3 h-8 border-x border-yellow-400 flex flex-col justify-between py-0.5">
                      <div className="h-0.5 w-full bg-yellow-400" />
                      <div className="h-0.5 w-full bg-yellow-400" />
                    </div>
                  )}
                  {eq.type === "rebounder_board" && (
                    <div className="w-5 h-2 bg-zinc-800 border border-amber-400 text-[5px] text-white font-bold flex items-center justify-center">
                      WALL
                    </div>
                  )}
                </div>
              ))}

              {/* Ball Token */}
              <div
                style={{
                  left: `${currentPhase.ball.x}%`,
                  top: `${currentPhase.ball.y}%`,
                  transform: "translate(-50%, -50%)",
                }}
                className="absolute size-3.5 bg-white border-2 border-black rounded-full shadow-md flex items-center justify-center z-20 pointer-events-none"
              >
                <div className="size-1 bg-black rounded-full" />
              </div>

              {/* Player Tokens */}
              {currentPhase.players.map((p) => {
                const isHome = p.team === "home" || p.team === "gk_home";
                const isGK = p.team === "gk_home" || p.team === "gk_away" || p.role === "GK";

                let tokenBg = isHome ? "bg-blue-600 text-white border-white" : "bg-red-600 text-white border-white";
                if (isGK) tokenBg = "bg-amber-400 text-black border-black font-black";
                if (p.team === "neutral") tokenBg = "bg-orange-500 text-white border-white";

                if (inkSaverMode) {
                  tokenBg = isHome
                    ? "bg-black text-white border-black"
                    : isGK
                    ? "bg-zinc-200 text-black border-black"
                    : "bg-white text-black border-2 border-black";
                }

                return (
                  <div
                    key={p.id}
                    style={{
                      left: `${p.position.x}%`,
                      top: `${p.position.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute flex flex-col items-center pointer-events-none z-10"
                  >
                    <div
                      className={`size-5 sm:size-6 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold shadow-md ${tokenBg}`}
                    >
                      {p.number}
                    </div>
                    <span
                      className={`text-[8px] font-black leading-none px-0.5 rounded-xs mt-0.5 ${
                        inkSaverMode
                          ? "bg-white text-black border border-black"
                          : isHome
                          ? "bg-blue-900 text-blue-100"
                          : "bg-red-900 text-red-100"
                      }`}
                    >
                      {p.role}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Phase-by-Phase Step Instructions Cards */}
          {tacticalPlan && tacticalPlan.phases.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Layers className="size-3.5 text-zinc-700" />
                <span>Phase Progressions & Coaching Cues</span>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {tacticalPlan.phases.map((ph) => (
                  <div
                    key={ph.id}
                    className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold border-b border-zinc-200 pb-1">
                      <span className="text-zinc-900 font-black">
                        Phase {ph.phaseNumber}: {ph.title}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {ph.durationSeconds}s
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-700 leading-snug">
                      {ph.coachingNotes || "Establish structural width and depth. Wait for defensive trigger before committing into half-space."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Squad Roster Matrix */}
          <div className="space-y-1.5">
            <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Users className="size-3.5 text-zinc-700" />
              <span>Squad Lineup & Tactical Assignments</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Home Squad */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
                <span className="font-bold text-zinc-900 text-[11px] uppercase tracking-wider block mb-1">
                  Home Team (Attacking / Possession) — {homeSquad.length} Players
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                  {homeSquad.map((p) => (
                    <div key={p.id} className="flex items-center gap-1 text-zinc-800">
                      <span className="font-mono font-bold w-5">#{p.number}</span>
                      <span className="font-bold text-zinc-600">[{p.role}]</span>
                      <span className="truncate">{p.label || "Athlete"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Away Squad & Equipment */}
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-2.5">
                <span className="font-bold text-zinc-900 text-[11px] uppercase tracking-wider block mb-1">
                  Opposition / Sparring Squad — {awaySquad.length} Players
                </span>
                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px]">
                  {awaySquad.map((p) => (
                    <div key={p.id} className="flex items-center gap-1 text-zinc-800">
                      <span className="font-mono font-bold w-5">#{p.number}</span>
                      <span className="font-bold text-zinc-600">[{p.role}]</span>
                      <span className="truncate">{p.label || "Defender"}</span>
                    </div>
                  ))}
                </div>
                {neutralSquad.length > 0 && (
                  <div className="mt-2 pt-1 border-t border-zinc-200">
                    <span className="text-[10px] font-bold text-amber-700 block">
                      Neutral Wall Jokers: {neutralSquad.map((n) => `#${n.number} (${n.role})`).join(", ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Required Equipment Checklist */}
          <div className="text-xs space-y-1">
            <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">
              Required Field Equipment Checklist
            </h4>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {Object.keys(equipmentTally).length > 0 ? (
                Object.entries(equipmentTally).map(([name, count]) => (
                  <div key={name} className="flex items-center gap-1.5 text-xs bg-zinc-100 border border-zinc-300 px-2.5 py-1 rounded">
                    <div className="size-3 border border-zinc-400 rounded-xs" />
                    <span className="font-bold text-zinc-900 uppercase text-[10px]">{name}:</span>
                    <span className="font-mono font-bold text-zinc-900">{count}</span>
                  </div>
                ))
              ) : (
                drill.equipment.map((eq, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs bg-zinc-100 border border-zinc-300 px-2 py-1 rounded">
                    <div className="size-3 border border-zinc-400 rounded-xs" />
                    <span className="font-medium text-zinc-800">{eq}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Setup & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Spatial Setup</h4>
              <p className="text-zinc-700 leading-relaxed bg-zinc-50/50 p-2.5 rounded border border-zinc-200 min-h-[80px]">
                {drill.setup}
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Execution Rules & Flow</h4>
              <ol className="list-decimal list-inside space-y-1 text-zinc-700 bg-zinc-50/50 p-2.5 rounded border border-zinc-200 min-h-[80px]">
                {drill.instructions.slice(0, 4).map((ins, i) => (
                  <li key={i}>{ins}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* Key Coaching Points (Observation Checklist) */}
          <div className="text-xs space-y-1.5">
            <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Key Coaching Points (Observation Checklist)</h4>
            <div className="space-y-1 bg-zinc-50 p-2.5 rounded border border-zinc-200">
              {drill.coachingPoints.map((pt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="size-3.5 border-2 border-zinc-400 rounded-xs mt-0.5 shrink-0" />
                  <span className="text-zinc-800 font-medium">{pt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pitch-Side Notes / Athlete Observations Box */}
          <div className="space-y-1 text-xs pt-1">
            <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Pitch-Side Notes / Athlete Observations</h4>
            <div className="border border-dashed border-zinc-300 rounded p-2 text-zinc-400 h-16 text-[11px]">
              Log athlete technical execution, fatigue signals, or rotational changes here...
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <DialogFooter className="border-t pt-3 print:hidden flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyMarkdown}
            className="h-9 text-xs gap-1.5"
          >
            {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
            <span>{copied ? "Copied" : "Copy Plain Text"}</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-9 text-xs"
            >
              Close
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="h-9 px-4 text-xs font-bold gap-1.5"
            >
              <Printer className="size-3.5" />
              <span>Print Session Sheet / PDF</span>
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
