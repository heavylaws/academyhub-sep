import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  BarChart2,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
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
import AddAssessmentDialog from "./add-assessment-dialog.tsx";

type AssessmentGroup = {
  metric: string;
  unit: string | undefined;
  points: Array<{
    _id: string;
    assessedOn: string;
    value: number;
    notes: string | undefined;
  }>;
};

function formatAssessedOn(dateStr: string) {
  try {
    return format(new Date(dateStr + "T00:00:00"), "MMM d");
  } catch {
    return dateStr;
  }
}

/** Trend indicator comparing last two data points. */
function TrendBadge({ points }: { points: AssessmentGroup["points"] }) {
  if (points.length < 2) return null;
  const prev = points[points.length - 2].value;
  const curr = points[points.length - 1].value;
  const diff = curr - prev;
  const pct = Math.abs((diff / prev) * 100).toFixed(1);
  if (Math.abs(diff) < 0.001) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3" /> No change
      </span>
    );
  }
  const up = diff > 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${up ? "text-accent-foreground" : "text-destructive"}`}
    >
      {up ? (
        <TrendingUp className="size-3.5" />
      ) : (
        <TrendingDown className="size-3.5" />
      )}
      {up ? "+" : ""}
      {diff > 0 ? "+" : ""}
      {diff.toFixed(2)} ({pct}%)
    </span>
  );
}

function MetricChart({
  group,
  canManage,
}: {
  group: AssessmentGroup;
  canManage: boolean;
}) {
  const deleteAssessment = useMutation(api.assessments.deleteAssessment);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const latest = group.points[group.points.length - 1];

  const handleDelete = async (id: string) => {
    try {
      await deleteAssessment({ assessmentId: id as Id<"assessments"> });
      toast.success("Assessment deleted");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to delete",
      );
    }
    setConfirmId(null);
  };

  const chartData = group.points.map((p) => ({
    date: formatAssessedOn(p.assessedOn),
    value: p.value,
    rawId: p._id,
    notes: p.notes,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm font-semibold">
              {group.metric}
              {group.unit && (
                <span className="ml-1 font-normal text-muted-foreground">
                  ({group.unit})
                </span>
              )}
            </CardTitle>
            <div className="mt-0.5 flex items-center gap-3">
              <span className="font-display text-2xl font-bold">
                {latest.value}
                {group.unit && (
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    {group.unit}
                  </span>
                )}
              </span>
              <TrendBadge points={group.points} />
            </div>
          </div>
          {/* Latest point delete */}
          {canManage && (
            <AlertDialog
              open={confirmId !== null}
              onOpenChange={(o) => {
                if (!o) setConfirmId(null);
              }}
            >
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmId(latest._id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this data point?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Remove the assessment recorded on{" "}
                    {confirmId
                      ? group.points.find((p) => p._id === confirmId)
                          ?.assessedOn
                      : ""}
                    . This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => confirmId && handleDelete(confirmId)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      {group.points.length >= 2 && (
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={140}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickLine={false}
                axisLine={false}
                domain={["auto", "auto"]}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  borderRadius: "0.5rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                }}
                formatter={(v: unknown) => [
                  `${v as number}${group.unit ? " " + group.unit : ""}`,
                  group.metric,
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                className="stroke-primary dark:stroke-primary"
                stroke="currentColor"
              />
            </LineChart>
          </ResponsiveContainer>
          {/* Scrollable data table */}
          <div className="mt-3 max-h-32 overflow-y-auto rounded-md border text-xs">
            <table className="w-full">
              <thead className="sticky top-0 bg-muted/60">
                <tr>
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                    Date
                  </th>
                  <th className="px-3 py-1.5 text-right font-medium text-muted-foreground">
                    Value
                  </th>
                  <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                    Notes
                  </th>
                  {canManage && <th className="w-8" />}
                </tr>
              </thead>
              <tbody>
                {[...group.points].reverse().map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {format(
                        new Date(p.assessedOn + "T00:00:00"),
                        "MMM d, yyyy",
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right font-medium">
                      {p.value}
                      {group.unit && (
                        <span className="ml-0.5 text-muted-foreground">
                          {group.unit}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[140px]">
                      {p.notes ?? "—"}
                    </td>
                    {canManage && (
                      <td className="px-1 py-1">
                        <button
                          type="button"
                          onClick={() => setConfirmId(p._id)}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      )}
      {group.points.length === 1 && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">
            Add more data points to see a trend chart.
          </p>
          <div className="mt-2 rounded-md border px-3 py-2 text-xs">
            <span className="text-muted-foreground">
              {format(new Date(latest.assessedOn + "T00:00:00"), "MMM d, yyyy")}
            </span>
            {latest.notes && <span className="ml-2">{latest.notes}</span>}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function AthleteAssessments({
  athleteId,
  assessmentData,
  canManage,
  isLoading,
}: {
  athleteId: Id<"athletes">;
  assessmentData: AssessmentGroup[] | undefined;
  canManage: boolean;
  isLoading: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold">
            Performance assessments
          </h2>
          <p className="text-sm text-muted-foreground">
            Track metrics over time and visualise trends.
          </p>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Record assessment
          </Button>
        )}
      </div>

      {isLoading || assessmentData === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : assessmentData.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BarChart2 />
                </EmptyMedia>
                <EmptyTitle>No assessments yet</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? "Record speed, strength, flexibility, and other metrics to track this athlete's progress."
                    : "No performance assessments have been recorded yet."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setAddOpen(true)}>
                    <Plus className="size-4" />
                    Record assessment
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {assessmentData.map((group) => (
            <MetricChart
              key={group.metric}
              group={group}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {canManage && (
        <AddAssessmentDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          athleteId={athleteId}
        />
      )}
    </div>
  );
}
