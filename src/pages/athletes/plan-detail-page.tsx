import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarRange,
  CheckCircle2,
  Circle,
  ClipboardList,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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
import { EditPlanDialog } from "./_components/plan-dialogs.tsx";
import PlanItemDialog from "./_components/plan-item-dialog.tsx";

const STATUS_STYLES: Record<string, string> = {
  active: "bg-secondary text-secondary-foreground",
  completed: "bg-accent/20 text-accent-foreground",
  archived: "bg-muted text-muted-foreground",
};

function formatDate(d: string | undefined) {
  if (!d) return null;
  try {
    return format(new Date(d + "T00:00:00"), "MMM d, yyyy");
  } catch {
    return d;
  }
}

/** Inline result entry row for a single plan item. */
function PlanItemRow({
  item,
  canManage,
  onEdit,
  onDelete,
}: {
  item: Doc<"planItems">;
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const recordResult = useMutation(api.trainingPlans.recordItemResult);
  const [resultDraft, setResultDraft] = useState(item.result ?? "");
  const [saving, setSaving] = useState(false);
  const isDone = item.completedAt !== undefined;

  const handleSaveResult = async () => {
    setSaving(true);
    try {
      await recordResult({ itemId: item._id, result: resultDraft });
      toast.success(resultDraft ? "Result recorded" : "Result cleared");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to save result",
      );
    } finally {
      setSaving(false);
    }
  };

  // Prescription summary
  const parts: string[] = [];
  if (item.sets) parts.push(`${item.sets} sets`);
  if (item.reps) parts.push(`${item.reps} reps`);
  if (item.durationSeconds) {
    const mins = Math.floor(item.durationSeconds / 60);
    const secs = item.durationSeconds % 60;
    parts.push(
      mins > 0 ? `${mins}m ${secs > 0 ? secs + "s" : ""}`.trim() : `${secs}s`,
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        isDone && "border-accent/30 bg-accent/5",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isDone ? (
            <CheckCircle2 className="size-5 text-accent" />
          ) : (
            <Circle className="size-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <span className="font-medium">{item.name}</span>
              {parts.length > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {parts.join(" · ")}
                </span>
              )}
            </div>
            {canManage && (
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  onClick={onEdit}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove exercise?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes "{item.name}" and any recorded result. This
                        cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={onDelete}
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
          {item.notes && (
            <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p>
          )}
          {canManage && (
            <div className="mt-3 flex items-end gap-2">
              <Textarea
                rows={2}
                placeholder="Enter result or notes…"
                value={resultDraft}
                onChange={(e) => setResultDraft(e.target.value)}
                className="flex-1 text-sm"
              />
              <Button
                size="sm"
                variant={
                  resultDraft !== (item.result ?? "") ? "default" : "secondary"
                }
                disabled={saving || resultDraft === (item.result ?? "")}
                onClick={handleSaveResult}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          )}
          {!canManage && item.result && (
            <div className="mt-2 rounded-md bg-muted/60 px-3 py-2 text-sm">
              <span className="font-medium text-muted-foreground">
                Result:{" "}
              </span>
              {item.result}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const canManage =
    user?.role === "academy_admin" ||
    user?.role === "coach" ||
    user?.role === "platform_admin";

  const data = useQuery(
    api.trainingPlans.getPlan,
    planId ? { planId: planId as Id<"trainingPlans"> } : "skip",
  );
  const deletePlan = useMutation(api.trainingPlans.deletePlan);
  const deleteItem = useMutation(api.trainingPlans.deletePlanItem);

  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Doc<"planItems"> | undefined>(
    undefined,
  );

  const handleDeletePlan = async () => {
    if (!planId) return;
    try {
      await deletePlan({ planId: planId as Id<"trainingPlans"> });
      toast.success("Plan deleted");
      if (data?.athlete) {
        navigate(`/athletes/${data.athlete._id}`);
      } else {
        navigate("/athletes");
      }
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to delete plan",
      );
    }
  };

  const handleDeleteItem = async (itemId: Id<"planItems">) => {
    try {
      await deleteItem({ itemId });
      toast.success("Exercise removed");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to remove exercise",
      );
    }
  };

  if (data === undefined) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <ErrorState>
          <ErrorStateHeader>
            <ErrorStateMedia variant="icon">
              <ClipboardList />
            </ErrorStateMedia>
            <ErrorStateTitle>Plan not found</ErrorStateTitle>
            <ErrorStateDescription>
              This training plan doesn't exist or you don't have access.
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

  const { plan, items, athlete } = data;
  const completedCount = items.filter(
    (i) => i.completedAt !== undefined,
  ).length;
  const startFmt = formatDate(plan.startDate);
  const endFmt = formatDate(plan.endDate);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={() => navigate(`/athletes/${athlete._id}`)}
      >
        <ArrowLeft className="size-4" />
        Back to {athlete.firstName} {athlete.lastName}
      </Button>

      {/* Plan header card */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="font-display text-xl">
                  {plan.title}
                </CardTitle>
                <Badge className={cn("text-xs", STATUS_STYLES[plan.status])}>
                  {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Link
                  to={`/athletes/${athlete._id}`}
                  className="hover:text-foreground transition-colors"
                >
                  {athlete.firstName} {athlete.lastName}
                </Link>
                {(startFmt || endFmt) && (
                  <span className="flex items-center gap-1">
                    <CalendarRange className="size-3.5" />
                    {startFmt && endFmt
                      ? `${startFmt} – ${endFmt}`
                      : startFmt
                        ? `From ${startFmt}`
                        : `Until ${endFmt}`}
                  </span>
                )}
              </div>
              {plan.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.description}
                </p>
              )}
            </div>
            {canManage && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditPlanOpen(true)}
                >
                  <Pencil className="size-4" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" size="sm">
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the plan and all its exercises. This cannot
                        be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={handleDeletePlan}
                      >
                        Delete plan
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Exercises card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Exercises</CardTitle>
              {items.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {completedCount}/{items.length} completed
                </p>
              )}
            </div>
            {canManage && (
              <Button size="sm" onClick={() => setAddItemOpen(true)}>
                <Plus className="size-4" />
                Add exercise
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardList />
                </EmptyMedia>
                <EmptyTitle>No exercises yet</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? "Add exercises, drills, and conditioning work to this plan."
                    : "No exercises have been added to this plan yet."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setAddItemOpen(true)}>
                    <Plus className="size-4" />
                    Add exercise
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {items.map((item) => (
                <PlanItemRow
                  key={item._id}
                  item={item}
                  canManage={canManage}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => handleDeleteItem(item._id)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <>
          <EditPlanDialog
            open={editPlanOpen}
            onOpenChange={setEditPlanOpen}
            plan={plan}
          />
          <PlanItemDialog
            open={addItemOpen}
            onOpenChange={setAddItemOpen}
            planId={plan._id}
          />
          <PlanItemDialog
            open={editingItem !== undefined}
            onOpenChange={(next) => {
              if (!next) setEditingItem(undefined);
            }}
            planId={plan._id}
            item={editingItem}
          />
        </>
      )}
    </div>
  );
}
