import { useState } from "react";
import { useMutation } from "convex/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import type { SoccerDrill } from "@/data/soccer-drills.ts";

interface AddAssessmentInlineProps {
  athleteId?: Id<"athletes">;
  athleteName: string;
  activeSelectedMetric: string;
  activeSpec: {
    benchmark: number;
    metricUnit: string;
    isLowerBetter: boolean;
  };
  matchingDrill?: SoccerDrill;
  variant?: "full" | "compact";
}

export function AddAssessmentInline({
  athleteId,
  athleteName,
  activeSelectedMetric,
  activeSpec,
  matchingDrill,
  variant = "full",
}: AddAssessmentInlineProps) {
  const [inlineScore, setInlineScore] = useState("");
  const [inlineNotes, setInlineNotes] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);

  const recordAssessment = useMutation(api.assessments.recordAssessment);

  if (!athleteId) return null;

  const handleQuickLog = async () => {
    if (!inlineScore.trim() || isNaN(Number(inlineScore))) {
      toast.error("Please enter a valid numeric test result");
      return;
    }
    setInlineSaving(true);
    try {
      await recordAssessment({
        athleteId,
        metric: activeSelectedMetric,
        value: Number(inlineScore),
        unit: activeSpec.metricUnit,
        assessedOn: new Date().toISOString().slice(0, 10),
        notes:
          inlineNotes.trim() ||
          `Recorded via athlete performance statistics analysis (${matchingDrill?.title || activeSelectedMetric}).`,
      });
      toast.success("Assessment score saved!", {
        description: `Logged ${inlineScore} ${activeSpec.metricUnit} for ${athleteName}. Chart updated.`,
      });
      setInlineScore("");
      setInlineNotes("");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to record score");
    } finally {
      setInlineSaving(false);
    }
  };

  if (variant === "compact") {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          step="any"
          placeholder={`New score (${activeSpec.metricUnit})`}
          value={inlineScore}
          onChange={(e) => setInlineScore(e.target.value)}
          className="h-7 w-32 text-xs"
        />
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={handleQuickLog}
          disabled={inlineSaving}
        >
          {inlineSaving ? <Spinner className="size-3" /> : <Plus className="size-3" />}
          Add Point
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
      <Input
        type="number"
        step="any"
        placeholder={`Score (${activeSpec.metricUnit})`}
        value={inlineScore}
        onChange={(e) => setInlineScore(e.target.value)}
        className="h-8 w-36 text-xs text-center"
      />
      <Input
        placeholder="Coach notes (optional)..."
        value={inlineNotes}
        onChange={(e) => setInlineNotes(e.target.value)}
        className="h-8 w-52 text-xs"
      />
      <Button
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={handleQuickLog}
        disabled={inlineSaving}
      >
        {inlineSaving ? <Spinner className="size-3" /> : <Plus className="size-3" />}
        Record Assessment Point
      </Button>
    </div>
  );
}
