import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Video,
  Maximize2,
} from "lucide-react";
import VideoAssessmentStudio from "./video-assessment-studio.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import UploadVideoDialog from "./upload-video-dialog.tsx";

type VideoAnalysis = Doc<"videoAnalyses"> & { videoUrl: string | null };

type Feedback = NonNullable<Doc<"videoAnalyses">["feedback"]>;

function StatusBadge({ status }: { status: VideoAnalysis["status"] }) {
  if (status === "analyzing" || status === "pending") {
    return (
      <Badge className="gap-1 bg-muted text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Analysing…
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="gap-1 bg-destructive/15 text-destructive">
        <AlertTriangle className="size-3" />
        Failed
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-accent/20 text-accent-foreground">
      <CheckCircle2 className="size-3" />
      Complete
    </Badge>
  );
}

function FeedbackSection({ feedback }: { feedback: Feedback }) {
  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="rounded-lg bg-muted/50 px-4 py-3 text-sm leading-relaxed">
        {feedback.summary}
      </div>

      {/* Metrics */}
      {feedback.metrics.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Observed metrics
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {feedback.metrics.map((m, i) => (
              <div key={i} className="rounded-md border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {m.label}
                  </span>
                  <span className="font-mono text-sm font-semibold">
                    {m.value}
                  </span>
                </div>
                {m.note && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {m.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths / Improvements side-by-side */}
      <div className="grid gap-4 sm:grid-cols-2">
        {feedback.strengths.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <TrendingUp className="size-3.5 text-accent-foreground" />{" "}
              Strengths
            </p>
            <ul className="flex flex-col gap-1.5">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 size-4 shrink-0 rounded-full bg-accent/20 text-accent-foreground flex items-center justify-center text-[10px] font-bold">
                    ✓
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {feedback.improvements.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="size-3.5 text-amber-500" /> Areas to
              improve
            </p>
            <ul className="flex flex-col gap-1.5">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 size-4 shrink-0 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-[10px] font-bold">
                    !
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {feedback.recommendations.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recommendations
          </p>
          <ol className="flex flex-col gap-1.5">
            {feedback.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="shrink-0 font-display text-sm font-bold text-primary">
                  {i + 1}.
                </span>
                {r}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function AnalysisCard({
  analysis,
  canManage,
  onOpenStudio,
}: {
  analysis: VideoAnalysis;
  canManage: boolean;
  onOpenStudio: (analysis: VideoAnalysis) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const deleteAnalysis = useMutation(api.videoAnalyses.deleteAnalysis);

  const handleDelete = async () => {
    try {
      await deleteAnalysis({ analysisId: analysis._id });
      toast.success("Analysis deleted");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to delete",
      );
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Video className="size-4 shrink-0 text-muted-foreground" />
              <span className="font-medium truncate max-w-[220px]">
                {analysis.filename}
              </span>
              <StatusBadge status={analysis.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="size-3" />
                {format(
                  new Date(analysis.requestedAt),
                  "MMM d, yyyy 'at' h:mm a",
                )}
              </span>
            </div>
            {analysis.context && (
              <p className="text-xs text-muted-foreground italic">
                "{analysis.context}"
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10"
              onClick={() => onOpenStudio(analysis)}
            >
              <Maximize2 className="size-3" />
              Motion Studio
            </Button>
            {analysis.status === "complete" && analysis.feedback && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setExpanded((e) => !e)}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="size-3.5" /> Hide
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3.5" /> View results
                  </>
                )}
              </Button>
            )}
            {canManage && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this analysis?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the uploaded video and all AI
                      feedback. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      variant="destructive"
                      onClick={handleDelete}
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Inline video player (always available if URL exists) */}
      {analysis.videoUrl && expanded && (
        <CardContent className="pt-0 pb-3">
          <video
            src={analysis.videoUrl}
            controls
            className="w-full rounded-md max-h-64 bg-black"
          />
        </CardContent>
      )}

      {/* AI feedback */}
      {analysis.status === "complete" && analysis.feedback && expanded && (
        <CardContent className="pt-0">
          <Separator className="mb-4" />
          <div className="flex items-center gap-1.5 mb-3 text-sm font-medium">
            <Sparkles className="size-4 text-accent-foreground" />
            AI performance analysis
          </div>
          <FeedbackSection feedback={analysis.feedback} />
        </CardContent>
      )}

      {analysis.status === "failed" && (
        <CardContent className="pt-0">
          <p className="text-sm text-destructive">
            Analysis failed:{" "}
            {analysis.errorMessage ??
              "An unexpected error occurred. Please try again."}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

export default function VideoAnalysisSection({
  athleteId,
  analyses,
  canManage,
  isLoading,
}: {
  athleteId: Id<"athletes">;
  analyses: VideoAnalysis[] | undefined;
  canManage: boolean;
  isLoading: boolean;
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedStudioAnalysis, setSelectedStudioAnalysis] =
    useState<VideoAnalysis | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">
            AI video analysis
          </h2>
          <p className="text-sm text-muted-foreground">
            Upload training clips for AI-powered biomechanics feedback.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="size-4" />
            Upload video
          </Button>
        )}
      </div>

      {isLoading || analyses === undefined ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : analyses.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Video />
                </EmptyMedia>
                <EmptyTitle>No video analyses yet</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? "Upload a short training clip to get AI-powered technique feedback and biomechanics insights."
                    : "No video analyses have been uploaded yet."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setUploadOpen(true)}>
                    <Plus className="size-4" />
                    Upload video
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {analyses.map((a) => (
            <AnalysisCard
              key={a._id}
              analysis={a}
              canManage={canManage}
              onOpenStudio={setSelectedStudioAnalysis}
            />
          ))}
        </div>
      )}

      {canManage && (
        <UploadVideoDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          athleteId={athleteId}
        />
      )}

      {selectedStudioAnalysis && (
        <VideoAssessmentStudio
          open={Boolean(selectedStudioAnalysis)}
          onOpenChange={(open) => !open && setSelectedStudioAnalysis(null)}
          primaryAnalysis={selectedStudioAnalysis}
          allAnalyses={analyses}
          athleteName="Athlete"
        />
      )}
    </div>
  );
}
