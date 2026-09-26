import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Separator } from "@/components/ui/separator.tsx";
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
} from "@/components/ui/error-state.tsx";
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
  const [editOpen, setEditOpen] = useState(false);
  const [createPlanOpen, setCreatePlanOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [isLinking, setIsLinking] = useState(false);

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
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (athlete === null) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate("/athletes")}
      >
        <ArrowLeft className="size-4" />
        Back to athletes
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <Avatar className="size-14">
                <AvatarFallback className="bg-secondary text-lg">
                  {athlete.firstName[0]}
                  {athlete.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="font-display text-xl">
                  {athlete.firstName} {athlete.lastName}
                </CardTitle>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {athlete.sport && (
                    <Badge variant="secondary">{athlete.sport}</Badge>
                  )}
                  <Badge
                    variant={
                      athlete.status === "active" ? "secondary" : "outline"
                    }
                  >
                    {athlete.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                  {athlete.userId ? (
                    <Badge
                      variant="outline"
                      className="border-primary/40 text-primary gap-1"
                    >
                      <Link2 className="size-3" />
                      Login Linked
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground gap-1"
                    >
                      <Unlink className="size-3" />
                      No Login Linked
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {canManage && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMessageAthlete}
                  className="gap-1.5"
                >
                  <MessageSquare className="size-4" />
                  Message
                </Button>
                {athlete.userId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleUnlinkAccount}
                    disabled={isLinking}
                  >
                    <Unlink className="size-4" />
                    Unlink login
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLinkEmail(athlete.email ?? "");
                      setLinkOpen(true);
                    }}
                  >
                    <Link2 className="size-4" />
                    Link login
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleToggleStatus}
                >
                  {athlete.status === "active" ? (
                    <ShieldOff className="size-4" />
                  ) : (
                    <ShieldCheck className="size-4" />
                  )}
                  {athlete.status === "active" ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Separator />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat
              icon={Cake}
              label="Age"
              value={age !== null ? `${age} yrs` : "—"}
            />
            <Stat
              icon={Ruler}
              label="Height"
              value={
                athlete.heightCm !== undefined ? `${athlete.heightCm} cm` : "—"
              }
            />
            <Stat
              icon={Weight}
              label="Weight"
              value={
                athlete.weightKg !== undefined ? `${athlete.weightKg} kg` : "—"
              }
            />
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Contact
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="size-4 text-muted-foreground" />
                {athlete.email ?? "No email on file"}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="size-4 text-muted-foreground" />
                {athlete.phone ?? "No phone on file"}
              </div>
            </div>
            {(athlete.guardianName ||
              athlete.guardianPhone ||
              athlete.guardianEmail) && (
              <div className="mt-1 rounded-lg border bg-muted/40 p-3 text-sm">
                <span className="font-medium">Guardian:</span>{" "}
                {athlete.guardianName ?? "—"}
                {athlete.guardianPhone ? ` · ${athlete.guardianPhone}` : ""}
                {athlete.guardianEmail ? ` · ${athlete.guardianEmail}` : ""}
                {athlete.guardianEmail && (
                  <span className="text-muted-foreground">
                    {athlete.guardianUserId
                      ? " (account linked)"
                      : " (not signed up yet)"}
                  </span>
                )}
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-sm">
              <span className="font-medium">Kiosk check-in PIN:</span>
              {athlete.checkInPin ? (
                <span className="rounded bg-muted px-2 py-0.5 font-mono font-bold">
                  {athlete.checkInPin}
                </span>
              ) : (
                <span className="text-muted-foreground">Not assigned</span>
              )}
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={async () => {
                    try {
                      const pin = await regeneratePin({ athleteId: athlete._id });
                      toast.success(`New check-in PIN: ${pin}`);
                    } catch {
                      toast.error("Failed to generate PIN");
                    }
                  }}
                >
                  {athlete.checkInPin ? "New PIN" : "Assign PIN"}
                </Button>
              )}
            </div>
          </div>

          {athlete.notes && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  Notes
                </h3>
                <p className="whitespace-pre-wrap text-sm">{athlete.notes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <AthleteFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          athlete={athlete}
        />
      )}

      {/* Training Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Training plans</CardTitle>
            {canManage && (
              <Button size="sm" onClick={() => setCreatePlanOpen(true)}>
                <Plus className="size-4" />
                New plan
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {plans === undefined ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
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
                    ? "Create a personalised plan to track this athlete's exercises and results."
                    : "No training plans have been created for you yet."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setCreatePlanOpen(true)}>
                    <Plus className="size-4" />
                    New plan
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="flex flex-col gap-2">
              {plans.map((plan) => (
                <PlanCard key={plan._id} plan={plan} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && athlete && (
        <CreatePlanDialog
          open={createPlanOpen}
          onOpenChange={setCreatePlanOpen}
          athleteId={athlete._id}
        />
      )}

      {/* Attendance */}
      <AthleteAttendanceCard athleteId={athlete._id} />

      {/* Performance Analytics & Radar Profile */}
      <AthletePerformanceAnalytics
        athleteName={`${athlete.firstName} ${athlete.lastName}`}
        assessmentData={assessmentData}
      />

      {/* Performance Assessments */}
      <AthleteAssessments
        athleteId={athlete._id}
        assessmentData={assessmentData}
        canManage={canManage}
        isLoading={assessmentData === undefined}
      />

      {/* AI Video Analysis */}
      <VideoAnalysisSection
        athleteId={athlete._id}
        analyses={videoAnalyses}
        canManage={canManage}
        isLoading={videoAnalyses === undefined}
      />

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
  active: "bg-secondary text-secondary-foreground",
  completed: "bg-accent/20 text-accent-foreground",
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
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{plan.title}</span>
          <Badge
            className={cn("shrink-0 text-xs", PLAN_STATUS_STYLES[plan.status])}
          >
            {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {(plan.startDate || plan.endDate) && (
            <span className="flex items-center gap-1">
              <CalendarRange className="size-3.5" />
              {plan.startDate && plan.endDate
                ? `${plan.startDate} – ${plan.endDate}`
                : (plan.startDate ?? plan.endDate)}
            </span>
          )}
          {plan.itemCount > 0 && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3.5" />
              {plan.completedCount}/{plan.itemCount} exercises
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
    <div className="flex flex-col gap-1 rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <span className="font-display text-lg font-semibold">{value}</span>
    </div>
  );
}
