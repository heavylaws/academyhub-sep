import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  ArrowLeft,
  Cake,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Link2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Ruler,
  ShieldOff,
  ShieldCheck,
  Unlink,
  UserRound,
  Weight,
  MessageSquare,
  Users,
  Shield,
  Activity,
  Copy,
  Check,
  Sparkles,
  BarChart3,
  Calendar,
  Video,
  KeyRound,
  FileText,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  ErrorState,
  ErrorStateContent,
  ErrorStateDescription,
  ErrorStateHeader,
  ErrorStateMedia,
  ErrorStateTitle,
} from "@/components/ui/status-state.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import AthleteFormDialog from "./_components/athlete-form-dialog.tsx";
import CreatePlanDialog from "./_components/plan-dialogs.tsx";
import AthleteAssessments from "./_components/athlete-assessments.tsx";
import AthletePerformanceAnalytics from "./_components/athlete-performance-analytics.tsx";
import VideoAnalysisSection from "./_components/video-analysis-section.tsx";
import AthleteAttendanceCard from "./_components/athlete-attendance-card.tsx";

function calculateAge(dateOfBirth: string | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function calculateBmi(heightCm?: number, weightKg?: number): string | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return bmi.toFixed(1);
}

function getSportBadgeColor(sport?: string): string {
  const s = (sport || "").toLowerCase();
  if (s.includes("soccer") || s.includes("football")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  }
  if (s.includes("basket")) {
    return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30";
  }
  if (s.includes("track") || s.includes("field") || s.includes("run")) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
  }
  if (s.includes("fitness") || s.includes("gym")) {
    return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30";
  }
  if (s.includes("swim")) {
    return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30";
  }
  return "bg-secondary text-secondary-foreground border-border";
}

export default function AthleteDetail() {
  const { athleteId } = useParams<{ athleteId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const canManage =
    user?.role === "academy_admin" ||
    user?.role === "coach" ||
    user?.role === "platform_admin";

  const athlete = useQuery(
    api.athletes.getAthlete,
    athleteId ? { athleteId: athleteId as Id<"athletes"> } : "skip",
  );
  const athleteTeams = useQuery(
    api.teams.listTeamsForAthlete,
    athleteId ? { athleteId: athleteId as Id<"athletes"> } : "skip",
  );
  const plans = useQuery(
    api.trainingPlans.listPlansForAthlete,
    athleteId ? { athleteId: athleteId as Id<"athletes"> } : "skip",
  );
  const assessmentData = useQuery(
    api.assessments.listAssessmentsForAthlete,
    athleteId ? { athleteId: athleteId as Id<"athletes"> } : "skip",
  );
  const videoAnalyses = useQuery(
    api.videoAnalyses.listAnalysesForAthlete,
    athleteId ? { athleteId: athleteId as Id<"athletes"> } : "skip",
  );

  const setStatus = useMutation(api.athletes.setAthleteStatus);
  const linkToUser = useMutation(api.athletes.linkAthleteToUser);
  const unlinkUser = useMutation(api.athletes.unlinkAthleteUser);
  const regeneratePin = useMutation(api.athletes.regenerateCheckInPin);
  const getOrCreateConversation = useMutation(api.messages.getOrCreateConversation);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "overview") {
      next.delete("tab");
    } else {
      next.set("tab", tab);
    }
    setSearchParams(next);
  };

  const [editOpen, setEditOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  const handleCopyPin = (pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedPin(true);
    toast.success("PIN copied to clipboard");
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleMessageAthlete = async () => {
    if (!athlete) return;
    if (athlete.userId) {
      try {
        const convId = await getOrCreateConversation({
          targetUserId: athlete.userId,
          athleteId: athlete._id,
        });
        navigate(`/messages/${convId}`);
      } catch (error) {
        toast.error(
          error instanceof ConvexError
            ? String((error.data as { message?: string }).message)
            : "Failed to open messaging channel",
        );
      }
    } else {
      toast.info("Link a user login account first to message this athlete directly.");
    }
  };

  const handleLinkAccount = async () => {
    if (!athlete || !linkEmail.trim()) return;
    setIsLinking(true);
    try {
      await linkToUser({
        athleteId: athlete._id,
        email: linkEmail.trim(),
      });
      toast.success("Login account linked to athlete");
      setLinkOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to link account",
      );
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkAccount = async () => {
    if (!athlete) return;
    setIsLinking(true);
    try {
      await unlinkUser({
        athleteId: athlete._id,
      });
      toast.success("Login account unlinked");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to unlink account",
      );
    } finally {
      setIsLinking(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!athlete) return;
    try {
      await setStatus({
        athleteId: athlete._id,
        status: athlete.status === "active" ? "inactive" : "active",
      });
      toast.success(
        athlete.status === "active"
          ? "Athlete marked inactive"
          : "Athlete marked active",
      );
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to update athlete",
      );
    }
  };

  if (athlete === undefined) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (athlete === null) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <ErrorState>
          <ErrorStateHeader>
            <ErrorStateMedia variant="icon">
              <UserRound />
            </ErrorStateMedia>
            <ErrorStateTitle>Athlete not found</ErrorStateTitle>
            <ErrorStateDescription>
              This profile doesn't exist or you don't have access to it.
            </ErrorStateDescription>
          </ErrorStateHeader>
          <ErrorStateContent>
            <Button size="sm" onClick={() => navigate("/athletes")}>
              Back to athletes
            </Button>
          </ErrorStateContent>
        </ErrorState>
      </div>
    );
  }

  const age = calculateAge(athlete.dateOfBirth);
  const bmi = calculateBmi(athlete.heightCm, athlete.weightKg);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="w-fit text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/athletes")}
        >
          <ArrowLeft className="size-4" />
          <span>Back to athletes directory</span>
        </Button>
      </div>

      {/* Hero Header Card */}
      <Card className="border shadow-sm overflow-hidden bg-card/60 backdrop-blur-sm">
        <CardHeader className="p-5 sm:p-6 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Avatar & Identification */}
            <div className="flex items-center gap-4 min-w-0">
              <Avatar className="size-16 sm:size-20 shrink-0 border-2 border-primary/20 ring-4 ring-muted/50">
                <AvatarFallback className="bg-secondary text-xl sm:text-2xl font-bold">
                  {athlete.firstName[0]}
                  {athlete.lastName[0]}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col min-w-0">
                <h1 className="font-display text-2xl font-bold tracking-tight text-foreground truncate">
                  {athlete.firstName} {athlete.lastName}
                </h1>

                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-xs border ${getSportBadgeColor(athlete.sport)}`}
                  >
                    {athlete.sport || "General Athletics"}
                  </Badge>

                  <Badge
                    variant={athlete.status === "active" ? "secondary" : "outline"}
                    className={`text-xs ${
                      athlete.status === "active"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                        : "text-muted-foreground"
                    }`}
                  >
                    {athlete.status === "active" ? "Active" : "Inactive"}
                  </Badge>

                  {athlete.userId ? (
                    <Badge
                      variant="outline"
                      className="border-primary/40 text-primary gap-1 text-xs"
                    >
                      <Link2 className="size-3" />
                      Login Linked
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground gap-1 text-xs"
                    >
                      <Unlink className="size-3" />
                      No Login Linked
                    </Badge>
                  )}
                </div>

                {/* Squad Memberships Tags */}
                {athleteTeams && athleteTeams.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground mr-1">Squads:</span>
                    {athleteTeams.map((team) => (
                      <Link
                        key={team._id}
                        to={`/teams/${team._id}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-muted hover:bg-muted/80 text-foreground border transition-colors"
                      >
                        <Shield className="size-3 text-primary" />
                        <span>{team.name}</span>
                        {team.jerseyNumber !== undefined && (
                          <span className="font-mono text-muted-foreground">#{team.jerseyNumber}</span>
                        )}
                        {team.tacticalPosition && (
                          <span className="text-[10px] text-muted-foreground">({team.tacticalPosition})</span>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Coach / Admin Action Buttons */}
            {canManage && (
              <div className="flex flex-wrap sm:flex-col lg:flex-row items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMessageAthlete}
                  className="h-9 text-xs gap-1.5 w-full sm:w-auto"
                >
                  <MessageSquare className="size-4" />
                  <span>Message</span>
                </Button>

                {athlete.userId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlinkAccount}
                    disabled={isLinking}
                    className="h-9 text-xs gap-1.5"
                  >
                    <Unlink className="size-4" />
                    <span>Unlink Login</span>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLinkEmail(athlete.email ?? "");
                      setLinkOpen(true);
                    }}
                    className="h-9 text-xs gap-1.5"
                  >
                    <Link2 className="size-4" />
                    <span>Link Login</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                  className="h-9 text-xs gap-1.5"
                >
                  <Pencil className="size-4" />
                  <span>Edit Profile</span>
                </Button>

                <Button
                  variant={athlete.status === "active" ? "ghost" : "secondary"}
                  size="sm"
                  onClick={handleToggleStatus}
                  className="h-9 text-xs gap-1.5"
                >
                  {athlete.status === "active" ? (
                    <ShieldOff className="size-4 text-amber-600" />
                  ) : (
                    <ShieldCheck className="size-4 text-emerald-600" />
                  )}
                  <span>{athlete.status === "active" ? "Deactivate" : "Reactivate"}</span>
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Main Tabbed Sections */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-11 p-1 bg-muted/70 rounded-xl">
          <TabsTrigger value="overview" className="text-xs sm:text-sm gap-1.5 font-medium">
            <UserRound className="size-4" />
            <span>Overview</span>
          </TabsTrigger>

          <TabsTrigger value="performance" className="text-xs sm:text-sm gap-1.5 font-medium">
            <BarChart3 className="size-4" />
            <span>Performance</span>
            {assessmentData && assessmentData.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 hidden sm:inline">
                {assessmentData.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="plans" className="text-xs sm:text-sm gap-1.5 font-medium">
            <ClipboardList className="size-4" />
            <span>Plans</span>
            {plans && plans.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 hidden sm:inline">
                {plans.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger value="attendance" className="text-xs sm:text-sm gap-1.5 font-medium">
            <Calendar className="size-4" />
            <span>Attendance</span>
          </TabsTrigger>

          <TabsTrigger value="video" className="text-xs sm:text-sm gap-1.5 font-medium">
            <Video className="size-4" />
            <span>Video Hub</span>
            {videoAnalyses && videoAnalyses.length > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 hidden sm:inline">
                {videoAnalyses.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left 2 Cols: Physical & Contact */}
            <div className="md:col-span-2 space-y-6">
              {/* Physical Profile Card */}
              <Card className="border">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Activity className="size-4 text-primary" />
                    <span>Physical Profile & Biometrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat
                      icon={Cake}
                      label="Age"
                      value={age !== null ? `${age} yrs` : "—"}
                    />
                    <Stat
                      icon={Ruler}
                      label="Height"
                      value={athlete.heightCm !== undefined ? `${athlete.heightCm} cm` : "—"}
                    />
                    <Stat
                      icon={Weight}
                      label="Weight"
                      value={athlete.weightKg !== undefined ? `${athlete.weightKg} kg` : "—"}
                    />
                    <Stat
                      icon={Activity}
                      label="BMI Index"
                      value={bmi ? `${bmi}` : "—"}
                    />
                  </div>

                  {athlete.dateOfBirth && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Born on <strong>{athlete.dateOfBirth}</strong> {athlete.gender ? `· Gender: ${athlete.gender}` : ""}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Contact & Guardians Card */}
              <Card className="border">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Mail className="size-4 text-primary" />
                    <span>Contact & Guardian Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                      <Mail className="size-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Direct Email</p>
                        <p className="text-sm font-medium truncate">{athlete.email || "No email on file"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                      <Phone className="size-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Direct Phone</p>
                        <p className="text-sm font-medium truncate">{athlete.phone || "No phone on file"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Guardian Banner */}
                  {(athlete.guardianName || athlete.guardianPhone || athlete.guardianEmail) ? (
                    <div className="rounded-xl border bg-muted/40 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Parent / Legal Guardian
                        </span>
                        {athlete.guardianEmail && (
                          <Badge variant="outline" className="text-[10px]">
                            {athlete.guardianUserId ? "Account Linked" : "Invited / Unlinked"}
                          </Badge>
                        )}
                      </div>
                      <p className="font-semibold text-base">{athlete.guardianName || "Guardian Name Not Set"}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                        {athlete.guardianPhone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="size-3.5" />
                            {athlete.guardianPhone}
                          </span>
                        )}
                        {athlete.guardianEmail && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="size-3.5" />
                            {athlete.guardianEmail}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg border border-dashed text-xs text-muted-foreground text-center">
                      No parent/guardian information registered for this athlete.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Coach Notes */}
              {athlete.notes && (
                <Card className="border">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <span>Coach & Staff Notes</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-5">
                    <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed">
                      {athlete.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right 1 Col: Check-in Kiosk PIN & Squads */}
            <div className="space-y-6">
              {/* Kiosk Check-In PIN Card */}
              <Card className="border bg-gradient-to-br from-card via-card to-primary/5">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <KeyRound className="size-4 text-amber-500" />
                    <span>Entrance Kiosk PIN</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    4-digit check-in code for academy entrance kiosk
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 space-y-4">
                  {athlete.checkInPin ? (
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl border bg-background/80 shadow-inner">
                      <span className="text-xs text-muted-foreground font-medium mb-1">Passcode</span>
                      <span className="font-mono text-3xl font-extrabold tracking-widest text-primary">
                        {athlete.checkInPin}
                      </span>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => athlete.checkInPin && handleCopyPin(athlete.checkInPin)}
                          className="h-8 text-xs gap-1.5"
                        >
                          {copiedPin ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                          <span>{copiedPin ? "Copied" : "Copy PIN"}</span>
                        </Button>

                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                const pin = await regeneratePin({ athleteId: athlete._id });
                                toast.success(`Generated new PIN: ${pin}`);
                              } catch {
                                toast.error("Failed to generate PIN");
                              }
                            }}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                          >
                            New Code
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-4 rounded-xl border border-dashed space-y-2">
                      <p className="text-xs text-muted-foreground">No check-in PIN assigned yet.</p>
                      {canManage && (
                        <Button
                          size="sm"
                          onClick={async () => {
                            try {
                              const pin = await regeneratePin({ athleteId: athlete._id });
                              toast.success(`Assigned PIN: ${pin}`);
                            } catch {
                              toast.error("Failed to generate PIN");
                            }
                          }}
                          className="text-xs gap-1.5"
                        >
                          <KeyRound className="size-3.5" />
                          Assign Check-in PIN
                        </Button>
                      )}
                    </div>
                  )}

                  <div className="rounded-lg bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Kiosk Instructions:</p>
                    <p>Enter this PIN on the tablet at the academy front desk to register real-time attendance.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Squads & Roles Card */}
              <Card className="border">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Users className="size-4 text-primary" />
                    <span>Squad Assignments</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-5">
                  {athleteTeams === undefined ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : athleteTeams.length === 0 ? (
                    <div className="p-3 text-center border border-dashed rounded-lg text-xs text-muted-foreground">
                      No team assignments yet. Assign this athlete from the Teams tab.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {athleteTeams.map((team) => (
                        <Link
                          key={team._id}
                          to={`/teams/${team._id}`}
                          className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/40 bg-card hover:bg-muted/30 transition-all"
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{team.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {team.sport ?? "Sport"} {team.preferredFormation ? `· Formation: ${team.preferredFormation}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {team.jerseyNumber !== undefined && (
                              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-secondary">
                                #{team.jerseyNumber}
                              </span>
                            )}
                            {team.tacticalPosition && (
                              <Badge variant="outline" className="text-[10px]">
                                {team.tacticalPosition}
                              </Badge>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Performance & Radar */}
        <TabsContent value="performance" className="space-y-6 pt-4">
          <AthletePerformanceAnalytics
            athleteName={`${athlete.firstName} ${athlete.lastName}`}
            athleteId={athlete._id}
            canManage={canManage}
            assessmentData={assessmentData}
          />

          <AthleteAssessments
            athleteId={athlete._id}
            assessmentData={assessmentData}
            canManage={canManage}
            isLoading={assessmentData === undefined}
          />
        </TabsContent>

        {/* Tab 3: Training Plans */}
        <TabsContent value="plans" className="space-y-6 pt-4">
          <Card className="border">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-base font-semibold">Training Plans & Curriculums</CardTitle>
                <CardDescription className="text-xs">
                  Tailored development programs and workout regimens
                </CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => setCreatePlanOpen(true)} className="gap-1.5 text-xs">
                  <Plus className="size-4" />
                  New Plan
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {plans === undefined ? (
                <div className="flex flex-col gap-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))}
                </div>
              ) : plans.length === 0 ? (
                <Empty>
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <ClipboardList />
                    </EmptyMedia>
                    <EmptyTitle>No training plans</EmptyTitle>
                    <EmptyDescription>
                      {canManage
                        ? "Create a personalised plan to track this athlete's exercises, targets, and results."
                        : "No training plans have been assigned to you yet."}
                    </EmptyDescription>
                  </EmptyHeader>
                  {canManage && (
                    <EmptyContent>
                      <Button size="sm" onClick={() => setCreatePlanOpen(true)}>
                        <Plus className="size-4" />
                        Create First Plan
                      </Button>
                    </EmptyContent>
                  )}
                </Empty>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {plans.map((plan) => (
                    <PlanCard key={plan._id} plan={plan} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Attendance */}
        <TabsContent value="attendance" className="space-y-6 pt-4">
          <AthleteAttendanceCard athleteId={athlete._id} />
        </TabsContent>

        {/* Tab 5: Video Analysis */}
        <TabsContent value="video" className="space-y-6 pt-4">
          <VideoAnalysisSection
            athleteId={athlete._id}
            analyses={videoAnalyses}
            canManage={canManage}
            isLoading={videoAnalyses === undefined}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {canManage && (
        <>
          <AthleteFormDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            athlete={athlete}
          />
          <CreatePlanDialog
            open={createPlanOpen}
            onOpenChange={setCreatePlanOpen}
            athleteId={athlete._id}
          />
        </>
      )}

      {/* Link Account Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link Athlete to User Account</DialogTitle>
            <DialogDescription>
              Connect this athlete profile to a registered user account so the
              athlete can log in and view their stats, training plans, and fees.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <label className="text-sm font-medium">User Email Address</label>
            <Input
              type="email"
              placeholder="athlete@example.com"
              value={linkEmail}
              onChange={(e) => setLinkEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkOpen(false)}
              disabled={isLinking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkAccount}
              disabled={isLinking || !linkEmail.trim()}
            >
              {isLinking ? "Linking..." : "Link Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const PLAN_STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  archived: "bg-muted text-muted-foreground",
};

type PlanWithCounts = Doc<"trainingPlans"> & {
  itemCount: number;
  completedCount: number;
};

function PlanCard({ plan }: { plan: PlanWithCounts }) {
  return (
    <Link
      to={`/plans/${plan._id}`}
      className="flex items-center justify-between gap-3 rounded-xl border p-4 transition-all hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">{plan.title}</span>
          <Badge
            className={cn("shrink-0 text-[10px] px-2 py-0 border", PLAN_STATUS_STYLES[plan.status])}
          >
            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {(plan.startDate || plan.endDate) && (
            <span className="flex items-center gap-1">
              <CalendarRange className="size-3.5" />
              {plan.startDate && plan.endDate
                ? `${plan.startDate} – ${plan.endDate}`
                : (plan.startDate ?? plan.endDate)}
            </span>
          )}
          {plan.itemCount > 0 && (
            <span className="flex items-center gap-1 font-medium">
              <CheckCircle2 className="size-3.5 text-primary" />
              {plan.completedCount}/{plan.itemCount} exercises completed
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <span className="font-display text-lg font-bold">{value}</span>
    </div>
  );
}
