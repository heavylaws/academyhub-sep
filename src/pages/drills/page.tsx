import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
import {
  Search,
  SlidersHorizontal,
  Plus,
  Copy,
  Check,
  Sparkles,
  Timer,
  Repeat,
  Layers,
  Dumbbell,
  Shield,
  Target,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  BarChart3,
  Trash2,
  Compass,
  Printer,
  BookOpen,
  Tag,
  History,
  CalendarClock,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  SOCCER_DRILLS,
  combineAllDrills,
  type SoccerDrill,
} from "@/data/soccer-drills.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import CreateSpecificDrillDialog from "./_components/create-specific-drill-dialog.tsx";
import DrillAnalyticsDialog from "./_components/drill-analytics-dialog.tsx";
import AiDrillDesignerDialog from "./_components/ai-drill-designer-dialog.tsx";
import { DrillVersionHistoryDialog } from "./_components/drill-version-history-dialog.tsx";
import { PlaybookCollectionDialog } from "./_components/playbook-collection-dialog.tsx";
import { TacticalSheetExportModal } from "@/components/tactical-board/tactical-sheet-export-modal.tsx";
import AddDrillToSessionDialog from "./_components/add-drill-to-session-dialog.tsx";
import { DEFAULT_COLLECTIONS, type PlaybookCollection } from "@/domain/tactics/playbook-domain.ts";

const AGE_TABS = [
  { id: "all", label: "All U16 (2011–2020)", count: SOCCER_DRILLS.length },
  {
    id: "U6-U8",
    label: "U6–U8 (2018–2020)",
    sub: "Fundamentals & Ball Discovery",
    count: SOCCER_DRILLS.filter((d) => d.ageGroup === "U6-U8").length,
  },
  {
    id: "U9-U10",
    label: "U9–U10 (2016–2017)",
    sub: "1v1 Skills & Small-Sided",
    count: SOCCER_DRILLS.filter((d) => d.ageGroup === "U9-U10").length,
  },
  {
    id: "U11-U12",
    label: "U11–U12 (2014–2015)",
    sub: "Transition & Play Speed",
    count: SOCCER_DRILLS.filter((d) => d.ageGroup === "U11-U12").length,
  },
  {
    id: "U13-U14",
    label: "U13–U14 (2012–2013)",
    sub: "Positional Play & Roles",
    count: SOCCER_DRILLS.filter((d) => d.ageGroup === "U13-U14").length,
  },
  {
    id: "U15-U16",
    label: "U15–U16 (2011)",
    sub: "Match Tempo & Biomechanics",
    count: SOCCER_DRILLS.filter((d) => d.ageGroup === "U15-U16").length,
  },
];

const CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "ball_mastery", label: "Ball Mastery & 1v1" },
  { id: "passing_rondos", label: "Passing & Rondos" },
  { id: "shooting_finishing", label: "Shooting & Finishing" },
  { id: "tactical_possession", label: "Positional & Tactical" },
  { id: "defending_pressing", label: "Defending & Pressing" },
  { id: "agility_speed", label: "Agility & Biomechanics" },
  { id: "goalkeeping", label: "Goalkeeping" },
];

export default function DrillsPage() {
  const { user } = useCurrentUser();
  const isCoachOrAdmin =
    user?.role === "coach" ||
    user?.role === "academy_admin" ||
    user?.role === "platform_admin";

  const navigate = useNavigate();

  const [selectedAge, setSelectedAge] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDrill, setActiveDrill] = useState<SoccerDrill | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Specific Drill Creator Dialog & Analytics Dialog state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [aiDesignerOpen, setAiDesignerOpen] = useState(false);
  const [analyticsDrill, setAnalyticsDrill] = useState<SoccerDrill | null>(null);

  // Playbook Versioning, Tags & Session Sheet Export state
  const [versionDrill, setVersionDrill] = useState<SoccerDrill | null>(null);
  const [tagsDrill, setTagsDrill] = useState<SoccerDrill | null>(null);
  const [exportSheetDrill, setExportSheetDrill] = useState<SoccerDrill | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>("all");
  const [collections, setCollections] = useState<PlaybookCollection[]>(DEFAULT_COLLECTIONS);

  // Assign to Athlete state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assigningDrill, setAssigningDrill] = useState<SoccerDrill | null>(null);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [sessionDrill, setSessionDrill] = useState<SoccerDrill | null>(null);

  // Queries & Mutations
  const { isAuthenticated } = useConvexAuth();
  const athletes = useQuery(api.athletes.listAthletes, isAuthenticated ? {} : "skip");
  const customDrills = useQuery(
    api.drills.listDrills,
    isAuthenticated && user?.academyId ? { academyId: user.academyId } : "skip",
  );
  const createPlan = useMutation(api.trainingPlans.createPlan);
  const addPlanItem = useMutation(api.trainingPlans.addPlanItem);
  const deleteDrill = useMutation(api.drills.deleteDrill);

  const allDrills = useMemo(() => {
    return combineAllDrills(SOCCER_DRILLS, customDrills);
  }, [customDrills]);

  const ageTabs = useMemo(() => {
    return [
      { id: "all", label: "All U16 (2011–2020)", count: allDrills.length },
      {
        id: "U6-U8",
        label: "U6–U8 (2018–2020)",
        sub: "Fundamentals & Ball Discovery",
        count: allDrills.filter((d) => d.ageGroup === "U6-U8").length,
      },
      {
        id: "U9-U10",
        label: "U9–U10 (2016–2017)",
        sub: "1v1 Skills & Small-Sided",
        count: allDrills.filter((d) => d.ageGroup === "U9-U10").length,
      },
      {
        id: "U11-U12",
        label: "U11–U12 (2014–2015)",
        sub: "Transition & Play Speed",
        count: allDrills.filter((d) => d.ageGroup === "U11-U12").length,
      },
      {
        id: "U13-U14",
        label: "U13–U14 (2012–2013)",
        sub: "Positional Play & Roles",
        count: allDrills.filter((d) => d.ageGroup === "U13-U14").length,
      },
      {
        id: "U15-U16",
        label: "U15–U16 (2011)",
        sub: "Match Tempo & Biomechanics",
        count: allDrills.filter((d) => d.ageGroup === "U15-U16").length,
      },
    ];
  }, [allDrills]);

  const filteredDrills = useMemo(() => {
    return allDrills.filter((drill) => {
      // Playbook collection filter
      if (selectedCollectionId !== "all") {
        const col = collections.find((c) => c.id === selectedCollectionId);
        if (col && !col.drillIds.includes(drill.id)) {
          return false;
        }
      }
      // Age filter
      if (selectedAge !== "all" && drill.ageGroup !== selectedAge) {
        return false;
      }
      // Category filter
      if (selectedCategory !== "all" && drill.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = drill.title.toLowerCase().includes(q);
        const inSummary = drill.summary.toLowerCase().includes(q);
        const inPoints = drill.coachingPoints.some((cp) =>
          cp.toLowerCase().includes(q),
        );
        const inCat = drill.categoryLabel.toLowerCase().includes(q);
        if (!inTitle && !inSummary && !inPoints && !inCat) return false;
      }
      return true;
    });
  }, [allDrills, selectedAge, selectedCategory, searchQuery, selectedCollectionId, collections]);

  const handleDeleteDrill = async (drill: SoccerDrill) => {
    if (!window.confirm(`Are you sure you want to delete "${drill.title}"?`)) return;
    try {
      await deleteDrill({ drillId: drill.id as Id<"drills"> });
      toast.success("Drill deleted successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete drill");
    }
  };

  const handleCopyDrill = (drill: SoccerDrill) => {
    const text = `⚽ ${drill.title} (${drill.ageGroup} - Born ${drill.birthYears})
Category: ${drill.categoryLabel}
Grid: ${drill.gridDimensions}
Equipment: ${drill.equipment.join(", ")}
Duration: ${drill.durationMinutes} mins (${drill.recommendedSets} sets x ${drill.recommendedReps} reps)

Setup:
${drill.setup}

Instructions:
${drill.instructions.map((ins, i) => `${i + 1}. ${ins}`).join("\n")}

Key Coaching Points:
${drill.coachingPoints.map((cp) => `• ${cp}`).join("\n")}`;

    navigator.clipboard.writeText(text);
    setCopiedId(drill.id);
    toast.success("Drill copied to clipboard", {
      description: "Ready to paste into WhatsApp, session notes, or clipboard.",
    });
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAssignDrill = async () => {
    if (!selectedAthleteId || !assigningDrill) {
      toast.error("Please choose an athlete");
      return;
    }
    setAssignSubmitting(true);
    try {
      // Create a training plan for this drill or append
      const planId = await createPlan({
        athleteId: selectedAthleteId as Id<"athletes">,
        title: `${assigningDrill.title} Protocol`,
        description: `Soccer drill tailored for ${assigningDrill.ageGroup} (${assigningDrill.categoryLabel}).`,
        startDate: new Date().toISOString().slice(0, 10),
      });

      await addPlanItem({
        planId,
        name: `${assigningDrill.title} (${assigningDrill.ageGroup})`,
        sets: assigningDrill.recommendedSets,
        reps: assigningDrill.recommendedReps,
        durationSeconds:
          assigningDrill.durationSeconds ||
          assigningDrill.durationMinutes * 60,
        notes: `[Grid: ${assigningDrill.gridDimensions}] Coaching points: ${assigningDrill.coachingPoints.slice(0, 2).join(". ")}`,
      });

      toast.success("Drill assigned to athlete's training plan!", {
        description: "The athlete can now view and log results for this drill.",
      });
      setAssignModalOpen(false);
      setSelectedAthleteId("");
      setAssigningDrill(null);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to assign drill",
      );
    } finally {
      setAssignSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Soccer Drills & Playbook
            </span>
            <Badge variant="secondary" className="font-semibold text-xs">
              U16 Focus (2011–2020)
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tactical, technical, and biomechanics drills tailored for youth
            soccer development across all Under-16 age brackets.
          </p>
        </div>

        {/* Quick Highlights & Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-muted/50 border rounded-xl px-2.5 sm:px-3 py-1.5 text-xs text-muted-foreground">
            <Layers className="size-4 text-primary" />
            <span>
              <strong className="text-foreground font-semibold">
                {allDrills.length}
              </strong>{" "}
              Total Drills
            </span>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 border rounded-xl px-2.5 sm:px-3 py-1.5 text-xs text-muted-foreground">
            <Shield className="size-4 text-primary" />
            <span>
              <strong className="text-foreground font-semibold">5</strong> Age
              Brackets
            </span>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate("/tactical-board")}
            className="gap-1.5 text-xs font-semibold shadow-sm h-10 sm:h-9 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
          >
            <Compass className="size-4" />
            Tactical Board
          </Button>

          {isCoachOrAdmin && (
            <Button
              onClick={() => setAiDesignerOpen(true)}
              className="gap-1.5 text-xs font-semibold shadow-sm h-10 sm:h-9"
            >
              <Sparkles className="size-4" />
              AI Drill Designer
            </Button>
          )}

          {isCoachOrAdmin && (
            <Button
              variant="outline"
              onClick={() => setCreateModalOpen(true)}
              className="gap-1.5 text-xs font-semibold shadow-sm h-10 sm:h-9"
            >
              <Plus className="size-4" />
              Manual Drill
            </Button>
          )}
        </div>
      </div>

      {/* Age Bracket Selector Tabs (Touch-scrollable on mobile, 3-col on tablet, 6-col on desktop) */}
      <div className="flex flex-col gap-2.5">
        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
          Age Category & Birth Years
        </label>
        <div className="flex overflow-x-auto pb-2 -mx-1 px-1 sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2 scrollbar-none">
          {ageTabs.map((tab) => {
            const isSelected = selectedAge === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedAge(tab.id)}
                className={`flex flex-col text-left p-2.5 sm:p-3 rounded-xl border transition-all shrink-0 min-w-[155px] sm:min-w-0 min-h-[44px] ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card hover:bg-muted/40 text-foreground border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-1 w-full">
                  <span className="font-bold text-xs">{tab.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                </div>
                {tab.sub && (
                  <span
                    className={`text-[11px] mt-1 line-clamp-1 ${
                      isSelected
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    {tab.sub}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drills by name, coaching points, keywords (e.g. Cruyff, Rondo, Slalom)..."
            className="pl-9 h-11 sm:h-10 text-sm bg-background"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select
            value={selectedCollectionId}
            onValueChange={setSelectedCollectionId}
          >
            <SelectTrigger className="h-11 sm:h-10 text-xs w-full sm:w-44 bg-background">
              <BookOpen className="mr-1.5 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="All Playbooks" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Playbooks</SelectItem>
              {collections.map((col) => (
                <SelectItem key={col.id} value={col.id} className="text-xs">
                  {col.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <SlidersHorizontal className="size-4 text-muted-foreground shrink-0 hidden sm:inline" />
          <Select
            value={selectedCategory}
            onValueChange={setSelectedCategory}
          >
            <SelectTrigger className="h-11 sm:h-10 text-xs w-full sm:w-44 bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id} className="text-xs">
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Drill Grid */}
      {filteredDrills.length === 0 ? (
        <div className="border border-dashed rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <Dumbbell className="size-10 text-muted-foreground/50 mb-3" />
          <h3 className="font-semibold text-foreground text-sm">
            No drills found matching your filters
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Try resetting your search query or selecting "All U16" to view the
            entire soccer drill catalog.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedAge("all");
              setSelectedCategory("all");
              setSearchQuery("");
            }}
            className="mt-4 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrills.map((drill) => (
            <Card
              key={drill.id}
              className="flex flex-col justify-between border hover:border-primary/40 transition-colors shadow-sm overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default" className="text-[11px] font-bold">
                      {drill.ageGroup}
                    </Badge>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Born {drill.birthYears}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {drill.isCustom && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/10 text-amber-600 border border-amber-500/30 text-[10px]"
                      >
                        Custom
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground"
                    >
                      {drill.difficulty}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-base font-bold text-foreground leading-snug line-clamp-1">
                  {drill.title}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  {drill.categoryLabel}
                  {drill.createdByName ? ` • By ${drill.createdByName}` : ""}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3 pb-3 text-xs">
                <p className="text-muted-foreground leading-relaxed line-clamp-2">
                  {drill.summary}
                </p>

                <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border text-[11px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Timer className="size-3.5 text-primary" />
                    <span>{drill.durationMinutes} mins</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Repeat className="size-3.5 text-primary" />
                    <span>
                      {drill.recommendedSets} sets × {drill.recommendedReps} reps
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  <strong className="text-foreground font-semibold">
                    Grid:
                  </strong>{" "}
                  {drill.gridDimensions}
                </div>
              </CardContent>

              <CardFooter className="pt-2.5 pb-2.5 px-3 sm:px-4 border-t bg-muted/10 flex items-center justify-between gap-1.5">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setActiveDrill(drill)}
                  className="h-8 text-xs gap-1 font-medium shadow-xs"
                >
                  <span>View Plan</span>
                  <ArrowRight className="size-3" />
                </Button>

                <div className="flex items-center gap-1.5 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/tactical-board?drillId=${drill.id}`)}
                    className="h-8 text-xs gap-1 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 px-2.5"
                    title="Open in Tactical Board Pitch"
                  >
                    <Compass className="size-3.5" />
                    <span>Board</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAnalyticsDrill(drill)}
                    className="h-8 text-xs gap-1 text-foreground hover:text-primary hover:border-primary/40 px-2.5"
                    title="Athlete Statistics & Data Analysis for this drill"
                  >
                    <BarChart3 className="size-3.5 text-primary" />
                    <span>Stats</span>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-foreground"
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isCoachOrAdmin && (
                        <>
                          <DropdownMenuItem
                            onClick={() => setSessionDrill(drill)}
                            className="cursor-pointer gap-2"
                          >
                            <CalendarClock className="size-4 text-primary" />
                            <span>Add to Session</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setAssigningDrill(drill);
                              setAssignModalOpen(true);
                            }}
                            className="cursor-pointer gap-2"
                          >
                            <Plus className="size-4" />
                            <span>Assign to Athlete</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleCopyDrill(drill)}
                        className="cursor-pointer gap-2"
                      >
                        {copiedId === drill.id ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        <span>{copiedId === drill.id ? "Copied" : "Copy Details"}</span>
                      </DropdownMenuItem>

                      {drill.isCustom && isCoachOrAdmin && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteDrill(drill)}
                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4" />
                            <span>Delete Drill</span>
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Drill Detail Modal */}
      {activeDrill && (
        <Dialog
          open={activeDrill !== null}
          onOpenChange={(open) => {
            if (!open) setActiveDrill(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="default" className="text-xs">
                  {activeDrill.ageGroup}
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  Born {activeDrill.birthYears}
                </span>
                <Badge variant="outline" className="text-xs ml-auto">
                  {activeDrill.categoryLabel}
                </Badge>
              </div>
              <DialogTitle className="text-lg font-bold">
                {activeDrill.title}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {activeDrill.summary}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs py-2">
              {/* Prescriptions */}
              <div className="grid grid-cols-3 gap-2 bg-muted/40 p-3 rounded-xl border text-center">
                <div>
                  <span className="text-muted-foreground text-[10px] block">
                    Duration
                  </span>
                  <span className="font-semibold text-foreground text-sm">
                    {activeDrill.durationMinutes} min
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">
                    Sets & Reps
                  </span>
                  <span className="font-semibold text-foreground text-sm">
                    {activeDrill.recommendedSets} sets ×{" "}
                    {activeDrill.recommendedReps}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] block">
                    Difficulty
                  </span>
                  <span className="font-semibold text-foreground text-sm">
                    {activeDrill.difficulty}
                  </span>
                </div>
              </div>

              {/* Setup & Grid */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="size-3.5 text-primary" /> Setup & Dimensions
                </h4>
                <div className="bg-muted/20 border rounded-lg p-3 space-y-1">
                  <p>
                    <strong>Grid:</strong> {activeDrill.gridDimensions}
                  </p>
                  <p>
                    <strong>Equipment:</strong>{" "}
                    {activeDrill.equipment.join(", ")}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {activeDrill.setup}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="size-3.5 text-primary" /> Step-by-Step
                  Execution
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 bg-muted/20 border rounded-lg p-3 text-muted-foreground">
                  {activeDrill.instructions.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <span className="text-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Coaching Points */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-primary" /> Key Coaching
                  Points (What to Look For)
                </h4>
                <ul className="space-y-1.5 bg-primary/5 border border-primary/20 rounded-lg p-3">
                  {activeDrill.coachingPoints.map((cp, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-foreground leading-relaxed"
                    >
                      <span className="text-primary font-bold">✓</span>
                      <span>{cp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Variations */}
              {activeDrill.variations.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-primary" /> Variations &
                    Progressions
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
                    {activeDrill.variations.map((v, idx) => (
                      <li key={idx}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopyDrill(activeDrill)}
                className="w-full sm:w-auto text-xs"
              >
                <Copy className="size-3.5 mr-1" />
                Copy Full Plan
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate(`/tactical-board?drillId=${activeDrill.id}`);
                    setActiveDrill(null);
                  }}
                  className="w-full sm:w-auto text-xs gap-1 border-primary/30 text-primary bg-primary/5 hover:bg-primary/10"
                >
                  <Compass className="size-3.5" />
                  Tactical Board
                </Button>

                {isCoachOrAdmin && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSessionDrill(activeDrill);
                        setActiveDrill(null);
                      }}
                      className="w-full sm:w-auto text-xs gap-1 border-primary/30 text-primary"
                    >
                      <CalendarClock className="size-3.5" />
                      Add to Session
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setAssigningDrill(activeDrill);
                        setAssignModalOpen(true);
                        setActiveDrill(null);
                      }}
                      className="w-full sm:w-auto text-xs gap-1"
                    >
                      <Plus className="size-3.5" />
                      Assign to Athlete
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveDrill(null)}
                  className="w-full sm:w-auto text-xs"
                >
                  Close
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Assign to Athlete Modal */}
      {assignModalOpen && assigningDrill && (
        <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                Assign Drill to Athlete
              </DialogTitle>
              <DialogDescription className="text-xs">
                Select an athlete to attach{" "}
                <strong className="text-foreground">
                  {assigningDrill.title}
                </strong>{" "}
                to their individual training plan.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-foreground">
                  Select Athlete
                </label>
                <Select
                  value={selectedAthleteId}
                  onValueChange={setSelectedAthleteId}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Choose an active athlete..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {athletes && athletes.length > 0 ? (
                      athletes.map((ath) => (
                        <SelectItem
                          key={ath._id}
                          value={ath._id}
                          className="text-xs"
                        >
                          {ath.firstName} {ath.lastName}{" "}
                          {ath.sport ? `(${ath.sport})` : ""}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No athletes registered
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border space-y-1 text-muted-foreground">
                <p>
                  <strong>Target Age:</strong> {assigningDrill.ageGroup} (Born{" "}
                  {assigningDrill.birthYears})
                </p>
                <p>
                  <strong>Prescription:</strong> {assigningDrill.recommendedSets}{" "}
                  sets × {assigningDrill.recommendedReps} reps (
                  {assigningDrill.durationMinutes} min)
                </p>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAssignModalOpen(false)}
                disabled={assignSubmitting}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleAssignDrill}
                disabled={assignSubmitting || !selectedAthleteId}
                className="text-xs gap-1.5"
              >
                {assignSubmitting && <Spinner className="size-3" />}
                Confirm Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Specific Drill Modal (for Coach & higher roles) */}
      <CreateSpecificDrillDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onDrillCreated={() => {
          setSelectedAge("all");
          setSelectedCategory("all");
        }}
      />

      {/* CoachTactics AI Drill Designer Modal */}
      <AiDrillDesignerDialog
        open={aiDesignerOpen}
        onOpenChange={setAiDesignerOpen}
        onDrillCreated={() => {
          setSelectedAge("all");
          setSelectedCategory("all");
        }}
      />

      {/* Drill Performance Analytics & Athlete Statistics Modal */}
      <DrillAnalyticsDialog
        drill={analyticsDrill}
        open={analyticsDrill !== null}
        onOpenChange={(open) => {
          if (!open) setAnalyticsDrill(null);
        }}
        canManage={isCoachOrAdmin}
      />

      {/* Add Drill to Training Session Dialog */}
      <AddDrillToSessionDialog
        open={Boolean(sessionDrill)}
        onOpenChange={(open) => {
          if (!open) setSessionDrill(null);
        }}
        drill={sessionDrill}
      />
    </div>
  );
}
