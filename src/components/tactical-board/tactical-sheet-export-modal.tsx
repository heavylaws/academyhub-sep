import React, { useRef } from "react";
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
import type { TacticalPlan } from "@/domain/tactics/tactical-domain.ts";

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
  const [copied, setCopied] = React.useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

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

## Setup
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
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:m-0 print:p-0 print:border-none print:shadow-none">
        <DialogHeader className="border-b pb-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  Tactical Training Session Sheet
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Print or export a high-contrast pitch sheet for session preparation and clipboard delivery.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Sheet Card */}
        <div
          ref={printAreaRef}
          className="border border-border rounded-xl p-4 sm:p-6 bg-white text-zinc-950 font-sans space-y-4 print:border-none print:p-0"
        >
          {/* Header banner */}
          <div className="flex flex-wrap items-start justify-between border-b-2 border-zinc-900 pb-3 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-600">
                  COACHTACTICS • SESSION DRILL SHEET
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
                <span><strong>Difficulty:</strong> {drill.difficulty}</span>
              </div>
            </div>

            <div className="text-right text-xs text-zinc-600 font-mono">
              <div>Date: {new Date().toLocaleDateString()}</div>
              <div>Pitch: {tacticalPlan?.pitchType || "Half Pitch"}</div>
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
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Grid Dimensions</span>
              <span className="font-bold text-sm text-zinc-900 truncate block">{drill.gridDimensions}</span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Benchmark Target</span>
              <span className="font-bold text-sm text-zinc-900">{drill.benchmark} {drill.metricUnit}</span>
            </div>
          </div>

          {/* Tactical Summary */}
          <div className="text-xs space-y-1">
            <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Tactical Objective & Summary</h4>
            <p className="text-zinc-700 leading-relaxed bg-zinc-50/50 p-2.5 rounded border border-zinc-200">
              {drill.summary}
            </p>
          </div>

          {/* Equipment Checklist */}
          <div className="text-xs space-y-1">
            <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Required Equipment Checklist</h4>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {drill.equipment.map((eq, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs bg-zinc-100 border border-zinc-300 px-2 py-1 rounded">
                  <div className="size-3 border border-zinc-400 rounded-xs" />
                  <span className="font-medium text-zinc-800">{eq}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Setup & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Spatial Setup</h4>
              <p className="text-zinc-700 leading-relaxed bg-zinc-50/50 p-2.5 rounded border border-zinc-200 min-h-[90px]">
                {drill.setup}
              </p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Execution Rules & Flow</h4>
              <ol className="list-decimal list-inside space-y-1 text-zinc-700 bg-zinc-50/50 p-2.5 rounded border border-zinc-200 min-h-[90px]">
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

          {/* Variations & Coach Notes lined area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div className="space-y-1">
              <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Progressions / Variations</h4>
              <ul className="list-disc list-inside space-y-1 text-zinc-700">
                {(drill.variations || ["Limit touches to 2-touch maximum", "Add opposition recovery runner"]).slice(0, 2).map((v, i) => (
                  <li key={i}>{v}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-zinc-900 uppercase tracking-wider text-[11px]">Pitch-Side Notes / Athlete Observations</h4>
              <div className="border border-dashed border-zinc-300 rounded p-2 text-zinc-400 h-16 text-[11px]">
                Log athlete technical execution, fatigue signals, or rotational changes here...
              </div>
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
