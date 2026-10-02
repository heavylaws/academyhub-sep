import { useState, useEffect, useMemo } from "react";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Shield,
  UserRound,
  Compass,
  Target,
  Calendar,
  Activity,
  Video,
  MessageSquare,
  Megaphone,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Search,
  BookOpen,
  ListChecks,
  Map,
  X,
  RotateCcw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import {
  TUTORIAL_STEPS,
  CHECKLIST_ITEMS,
} from "./tutorial-steps.ts";

const ONBOARDING_CHECKLIST_KEY = "coachtactics_admin_checklist_v1";

interface AdminTutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialStep?: number;
}

export function AdminTutorialDialog({
  open,
  onOpenChange,
  initialStep = 1,
}: AdminTutorialDialogProps) {
  const [currentStepIdx, setCurrentStepIdx] = useState(
    Math.max(0, Math.min(initialStep - 1, TUTORIAL_STEPS.length - 1)),
  );
  const [activeTab, setActiveTab] = useState<"walkthrough" | "feature_map" | "checklist">(
    "walkthrough",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem("coachtactics_completed_tutorial_steps");
      return saved ? new Set(JSON.parse(saved)) : new Set([1]);
    } catch {
      return new Set([1]);
    }
  });

  const [checklistCompleted, setChecklistCompleted] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(ONBOARDING_CHECKLIST_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const step = TUTORIAL_STEPS[currentStepIdx];
  const progressPercent = Math.round(
    ((currentStepIdx + 1) / TUTORIAL_STEPS.length) * 100,
  );

  // Sync completed steps to localStorage
  const markStepDone = (stepNum: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      next.add(stepNum);
      try {
        localStorage.setItem(
          "coachtactics_completed_tutorial_steps",
          JSON.stringify(Array.from(next)),
        );
      } catch {
        // Ignored
      }
      return next;
    });
  };

  const toggleChecklistItem = (id: string) => {
    setChecklistCompleted((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(ONBOARDING_CHECKLIST_KEY, JSON.stringify(next));
      } catch {
        // Ignored
      }
      return next;
    });
  };

  const handleNext = () => {
    markStepDone(step.stepNumber);
    if (currentStepIdx < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  const handleNavigateToPage = (route: string) => {
    markStepDone(step.stepNumber);
    onOpenChange(false);
    window.location.href = route;
  };

  const handleSelectStep = (idx: number) => {
    setCurrentStepIdx(idx);
    setActiveTab("walkthrough");
  };

  const handleResetTutorial = () => {
    setCurrentStepIdx(0);
    setCompletedSteps(new Set([1]));
    try {
      localStorage.removeItem("coachtactics_completed_tutorial_steps");
    } catch {
      // Ignored
    }
  };

  // Filtered feature map
  const filteredSteps = useMemo(() => {
    if (!searchQuery.trim()) return TUTORIAL_STEPS;
    const q = searchQuery.toLowerCase();
    return TUTORIAL_STEPS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.pageName.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.capabilities.some((c) => c.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const StepIcon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden sm:max-h-[90vh] flex flex-col gap-0 border-border/80 shadow-2xl">
        {/* Header Bar */}
        <div className="bg-muted/40 border-b px-5 py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold leading-tight flex items-center gap-2">
                Academy Admin Guide & Tutorial
                <Badge variant="outline" className="text-[10px] uppercase font-mono tracking-wider">
                  v2.0
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Master the complete CoachTactics operational and tactical platform
              </DialogDescription>
            </div>
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "walkthrough" | "feature_map" | "checklist")}
            className="w-auto hidden sm:flex"
          >
            <TabsList className="h-8">
              <TabsTrigger value="walkthrough" className="text-xs gap-1.5 h-7 px-2.5">
                <BookOpen className="size-3.5" />
                <span>Walkthrough</span>
              </TabsTrigger>
              <TabsTrigger value="feature_map" className="text-xs gap-1.5 h-7 px-2.5">
                <Map className="size-3.5" />
                <span>Feature Map</span>
              </TabsTrigger>
              <TabsTrigger value="checklist" className="text-xs gap-1.5 h-7 px-2.5">
                <ListChecks className="size-3.5" />
                <span>Checklist</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="sm:hidden border-b px-3 py-1.5 bg-muted/20">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "walkthrough" | "feature_map" | "checklist")}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 h-8 w-full">
              <TabsTrigger value="walkthrough" className="text-xs">
                Walkthrough
              </TabsTrigger>
              <TabsTrigger value="feature_map" className="text-xs">
                Features ({TUTORIAL_STEPS.length})
              </TabsTrigger>
              <TabsTrigger value="checklist" className="text-xs">
                Checklist
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: STEP-BY-STEP WALKTHROUGH */}
          {activeTab === "walkthrough" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Progress & Category Banner */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      Step {step.stepNumber} of {TUTORIAL_STEPS.length}
                    </span>
                    <span>·</span>
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      {step.category}
                    </Badge>
                  </div>
                  <span className="font-mono text-muted-foreground">{progressPercent}% Completed</span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>

              {/* Step Main Card */}
              <div className="rounded-xl border bg-card p-5 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/20 shrink-0">
                      <StepIcon className="size-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold tracking-tight text-foreground">
                        {step.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        Page: <span className="text-primary font-semibold">{step.pageName}</span> ({step.route})
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNavigateToPage(step.route)}
                    className="shrink-0 text-xs gap-1.5 font-medium border-primary/30 hover:border-primary hover:bg-primary/5 text-primary"
                  >
                    <span>Visit Page</span>
                    <ExternalLink className="size-3.5" />
                  </Button>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed border-t pt-3">
                  {step.summary}
                </p>

                {/* Two Column Details */}
                <div className="grid gap-4 sm:grid-cols-2 pt-1">
                  {/* Left: Responsibilities */}
                  <div className="space-y-2 rounded-lg bg-muted/30 p-3.5 border border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-primary" />
                      Admin Responsibilities
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                      {step.responsibilities.map((r, i) => (
                        <li key={i} className="leading-normal">
                          <span className="text-foreground">{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Right: Key Capabilities */}
                  <div className="space-y-2 rounded-lg bg-muted/30 p-3.5 border border-border/50">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-primary" />
                      Key Capabilities & Actions
                    </h4>
                    <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
                      {step.capabilities.map((c, i) => (
                        <li key={i} className="leading-normal">
                          <span className="text-foreground">{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Pro Tip Callout */}
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-2.5">
                  <div className="size-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="size-3" />
                  </div>
                  <div className="text-xs leading-relaxed text-amber-950 dark:text-amber-200">
                    <strong className="font-semibold text-amber-900 dark:text-amber-100">
                      Pro CoachTactics Tip:{" "}
                    </strong>
                    {step.adminTip}
                  </div>
                </div>
              </div>

              {/* Step Quick Navigation Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                {TUTORIAL_STEPS.map((s, idx) => {
                  const isActive = idx === currentStepIdx;
                  const isDone = completedSteps.has(s.stepNumber);
                  return (
                    <button
                      key={s.id}
                      onClick={() => setCurrentStepIdx(idx)}
                      className={`size-7 rounded-md text-xs font-mono font-medium shrink-0 flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/40 scale-105"
                          : isDone
                            ? "bg-muted text-foreground border border-primary/30"
                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                      }`}
                      title={`${s.stepNumber}. ${s.title}`}
                    >
                      {s.stepNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FEATURE MAP & CHEATSHEET */}
          {activeTab === "feature_map" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    placeholder="Search feature, page, or responsibility (e.g. kiosk, drills, invoices)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="h-9 px-2 text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {filteredSteps.map((item, idx) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-card p-3.5 flex flex-col justify-between gap-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <ItemIcon className="size-4" />
                            </div>
                            <span className="font-semibold text-xs text-foreground truncate">
                              {item.title}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-[10px] shrink-0 font-normal">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t text-xs">
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {item.route}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectStep(idx)}
                            className="h-7 px-2 text-xs"
                          >
                            Read Guide
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleNavigateToPage(item.route)}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            <span>Open</span>
                            <ExternalLink className="size-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: ADMIN LAUNCH CHECKLIST */}
          {activeTab === "checklist" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ListChecks className="size-4 text-primary" />
                  Academy Admin Launch Checklist
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete these essential configuration milestones to bring your academy online:
                </p>
              </div>

              <div className="space-y-2.5">
                {CHECKLIST_ITEMS.map((item) => {
                  const isChecked = Boolean(checklistCompleted[item.id]);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start justify-between gap-3 p-3.5 rounded-lg border transition-all ${
                        isChecked
                          ? "bg-muted/30 border-muted-foreground/20 opacity-80"
                          : "bg-card border-border hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={item.id}
                          checked={isChecked}
                          onCheckedChange={() => toggleChecklistItem(item.id)}
                          className="mt-0.5"
                        />
                        <div className="space-y-0.5">
                          <label
                            htmlFor={item.id}
                            className={`text-xs font-semibold cursor-pointer select-none ${
                              isChecked ? "line-through text-muted-foreground" : "text-foreground"
                            }`}
                          >
                            {item.title}
                          </label>
                          <p className="text-xs text-muted-foreground leading-normal">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNavigateToPage(item.route)}
                        className="shrink-0 h-7 px-2 text-xs gap-1"
                      >
                        <span>Configure</span>
                        <ExternalLink className="size-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Bar */}
        <div className="bg-muted/40 border-t px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetTutorial}
            className="text-xs text-muted-foreground hover:text-foreground gap-1 h-8 px-2"
          >
            <RotateCcw className="size-3" />
            <span>Restart</span>
          </Button>

          <div className="flex items-center gap-2">
            {activeTab === "walkthrough" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={currentStepIdx === 0}
                  className="h-8 text-xs gap-1"
                >
                  <ChevronLeft className="size-3.5" />
                  <span>Previous</span>
                </Button>

                {currentStepIdx < TUTORIAL_STEPS.length - 1 ? (
                  <Button
                    size="sm"
                    onClick={handleNext}
                    className="h-8 text-xs gap-1 font-medium bg-primary text-primary-foreground"
                  >
                    <span>Next: Step {step.stepNumber + 1}</span>
                    <ChevronRight className="size-3.5" />
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => {
                      markStepDone(step.stepNumber);
                      onOpenChange(false);
                    }}
                    className="h-8 text-xs gap-1 font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle2 className="size-3.5" />
                    <span>Complete Tutorial</span>
                  </Button>
                )}
              </>
            )}

            {activeTab !== "walkthrough" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 text-xs"
              >
                Close Guide
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
