import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Video,
  Play,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  User,
  Plus,
  ArrowRight,
  Maximize2,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { isLocalDev } from "@/lib/env.ts";
import VideoAssessmentStudio, {
  type VideoAnalysisItem,
} from "./_components/video-assessment-studio.tsx";

const FALLBACK_ANALYSES: VideoAnalysisItem[] = [
  {
    _id: "va_sprint_1" as Id<"videoAnalyses">,
    _creationTime: 1725800000000,
    academyId: "acad_hercules" as Id<"academies">,
    athleteId: "ath_marcus" as Id<"athletes">,
    storageId: "storage_mock_1" as Id<"_storage">,
    filename: "marcus_40m_sprint_drive_phase.mp4",
    context: "Block start & first 3 steps drive angle",
    status: "complete",
    requestedAt: "2026-09-07T14:30:00.000Z",
    completedAt: "2026-09-07T14:30:15.000Z",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    createdBy: "usr_coach" as Id<"users">,
    feedback: {
      summary: "Excellent low torso drive angle during initial 3 steps. Knee drive is aggressive at 84° with minimal lateral sway.",
      strengths: ["Drive phase shin angle (42°)", "Force vector alignment", "Arm carriage cadence"],
      improvements: ["Slight overstride on step 4", "Head rises too early"],
      metrics: [
        { label: "Block Exit Velocity", value: "4.8 m/s" },
        { label: "Ground Contact Time", value: "0.108 s" },
        { label: "Torso Inclination", value: "44°" },
        { label: "Stride Frequency", value: "4.4 Hz" },
      ],
      recommendations: ["Maintain downward visual focus for 10m", "Incorporate resisted sled pushes"],
    },
  },
  {
    _id: "va_sprint_2" as Id<"videoAnalyses">,
    _creationTime: 1725700000000,
    academyId: "acad_hercules" as Id<"academies">,
    athleteId: "ath_marcus" as Id<"athletes">,
    storageId: "storage_mock_2" as Id<"_storage">,
    filename: "marcus_upright_mechanics_slowmo.mp4",
    context: "Top-end speed mechanics at 60m mark",
    status: "complete",
    requestedAt: "2026-09-05T09:15:00.000Z",
    completedAt: "2026-09-05T09:15:20.000Z",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    createdBy: "usr_coach" as Id<"users">,
    feedback: {
      summary: "High knee lift and tall posture observed. Dorsiflexion prior to ground contact is solid.",
      strengths: ["Vertical posture (1.5° lean)", "Active pawback action"],
      improvements: ["Heel recovery loops slightly wide behind hip"],
      metrics: [
        { label: "Top Speed", value: "10.4 m/s" },
        { label: "Step Length", value: "2.18 m" },
        { label: "Flight Time", value: "0.124 s" },
      ],
      recommendations: ["Mini-hurdle wicket drills to tighten backside mechanics"],
    },
  },
];

export default function VideoHubPage() {
  const { user } = useCurrentUser();
  const athletes = useQuery(api.athletes.listAthletes, {});

  // Fetch analyses for athletes
  // Note: in live or mock mode, we gather all analyses from local mock store / convex
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeStudioAnalysis, setActiveStudioAnalysis] = useState<VideoAnalysisItem | null>(null);

  // If viewing specific athlete, fetch directly; otherwise gather
  const currentAthleteId = selectedAthleteId !== "all" ? (selectedAthleteId as Id<"athletes">) : undefined;
  const analysesQuery = useQuery(
    api.videoAnalyses.listAnalysesForAthlete,
    currentAthleteId ? { athleteId: currentAthleteId } : "skip",
  );

  // In offline mock mode, we can also load directly from mock store if available
  const allAnalyses: VideoAnalysisItem[] = useMemo(() => {
    if (analysesQuery) return analysesQuery;
    // Sample data is for mock/demo mode only; never show fake records live.
    return isLocalDev ? FALLBACK_ANALYSES : [];
  }, [analysesQuery]);

  const filteredAnalyses = useMemo(() => {
    return allAnalyses.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (
        searchQuery.trim() &&
        !item.filename.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.context?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [allAnalyses, statusFilter, searchQuery]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Video className="size-6 text-primary" />
              AI Video Biomechanics Hub
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review video analysis recordings, form critiques, and launch the interactive motion studio.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="gap-1 text-xs">
              <Link to="/athletes">
                <User className="size-3.5" />
                Go to Athlete Profiles
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter bar */}
        <Card className="bg-card/40 backdrop-blur-sm border-border">
          <CardContent className="p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search clips or techniques..."
                className="pl-8 h-9 text-xs"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grid of Video Analysis Cards */}
        {filteredAnalyses.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground text-sm">
            No video clips match the current filters.
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAnalyses.map((analysis) => (
              <Card
                key={analysis._id}
                className="group flex flex-col justify-between overflow-hidden border-border/80 transition-all hover:border-primary/50 hover:shadow-lg"
              >
                {/* Thumbnail / Video header */}
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                  {analysis.videoUrl ? (
                    <video
                      src={analysis.videoUrl}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      muted
                      playsInline
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Video className="size-8 text-primary" />
                      <span className="text-xs">Training Clip</span>
                    </div>
                  )}

                  {/* Play Overlay Button */}
                  <button
                    onClick={() => setActiveStudioAnalysis(analysis)}
                    className="absolute inset-0 m-auto size-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 hover:bg-primary z-20"
                    title="Launch Studio"
                  >
                    <Play className="size-5 ml-0.5" />
                  </button>

                  <Badge className="absolute top-2 left-2 bg-black/70 backdrop-blur-md text-[10px] font-mono border-white/10 z-10">
                    {format(new Date(analysis.requestedAt), "MMM d, yyyy")}
                  </Badge>

                  <Badge
                    variant="secondary"
                    className={`absolute top-2 right-2 text-[10px] z-10 ${
                      analysis.status === "complete"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {analysis.status === "complete" ? "AI Verified" : "Processing"}
                  </Badge>
                </div>

                {/* Body Details */}
                <CardContent className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {analysis.filename}
                    </h3>
                    {analysis.context && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 italic">
                        "{analysis.context}"
                      </p>
                    )}
                  </div>

                  {analysis.feedback && (
                    <div className="pt-2 border-t flex flex-col gap-2">
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <Sparkles className="size-3.5" />
                        <span>Key Biomechanical Insight:</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {analysis.feedback.summary}
                      </p>
                    </div>
                  )}

                  <div className="pt-2 border-t flex items-center justify-between">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full gap-1.5 text-xs font-semibold"
                      onClick={() => setActiveStudioAnalysis(analysis)}
                    >
                      <Maximize2 className="size-3.5" />
                      Open Biomechanics Studio
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Video Assessment Studio Modal */}
        {activeStudioAnalysis && (
          <VideoAssessmentStudio
            open={Boolean(activeStudioAnalysis)}
            onOpenChange={(open) => !open && setActiveStudioAnalysis(null)}
            primaryAnalysis={activeStudioAnalysis}
            allAnalyses={filteredAnalyses}
            athleteName={(() => {
              const a = athletes?.find(
                (x) => x._id === activeStudioAnalysis.athleteId,
              );
              return a ? `${a.firstName} ${a.lastName}` : "Athlete";
            })()}
          />
        )}
      </div>
  );
}
