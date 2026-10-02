import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Pause, Play, Plus, Repeat, Trash2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Card,
  CardContent,
  CardDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";

function errorText(e: unknown, fallback: string): string {
  return e instanceof ConvexError
    ? String((e.data as { message?: string }).message ?? fallback)
    : fallback;
}

/** Recurring monthly fees: generated automatically each month by the backend. */
export default function RecurringFees() {
  const { isAuthenticated } = useConvexAuth();
  const schedules = useQuery(api.feeAutomation.listFeeSchedules, isAuthenticated ? {} : "skip");
  const setActive = useMutation(api.feeAutomation.setFeeScheduleActive);
  const remove = useMutation(api.feeAutomation.deleteFeeSchedule);
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat className="size-4" /> Recurring monthly fees
            </CardTitle>
            <CardDescription>
              Created automatically each month. Families get an email when a fee
              is created, 3 days before it is due, and once if it becomes
              overdue.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> New recurring fee
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {schedules === undefined ? (
          <Skeleton className="h-20 w-full" />
        ) : schedules.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recurring fees yet. Set one up for a team or for all active
            athletes instead of creating fees by hand every month.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Athlete</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s._id}>
                    <TableCell className="font-medium">
                      {s.athleteName}
                    </TableCell>
                    <TableCell>{s.label}</TableCell>
                    <TableCell>
                      {s.currency} {s.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>Day {s.dueDay} monthly</TableCell>
                    <TableCell>
                      <Badge variant={s.active ? "secondary" : "outline"}>
                        {s.active ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label={s.active ? "Pause" : "Resume"}
                        onClick={async () => {
                          try {
                            await setActive({
                              scheduleId: s._id,
                              active: !s.active,
                            });
                          } catch (e) {
                            toast.error(errorText(e, "Failed to update"));
                          }
                        }}
                      >
                        {s.active ? (
                          <Pause className="size-4" />
                        ) : (
                          <Play className="size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        aria-label="Delete"
                        onClick={async () => {
                          if (
                            !window.confirm(
                              `Stop the recurring fee "${s.label}" for ${s.athleteName}? Fees already created are kept.`,
                            )
                          ) {
                            return;
                          }
                          try {
                            await remove({ scheduleId: s._id });
                          } catch (e) {
                            toast.error(errorText(e, "Failed to delete"));
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <NewRecurringFeeDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function NewRecurringFeeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const athletes = useQuery(api.athletes.listAthletes, open ? {} : "skip");
  const teams = useQuery(api.teams.listTeams, open ? {} : "skip");
  const [target, setTarget] = useState("all");
  const team = useQuery(
    api.teams.getTeam,
    target.startsWith("team:")
      ? { teamId: target.slice(5) as Id<"teams"> }
      : "skip",
  );
  const create = useMutation(api.feeAutomation.createFeeSchedules);
  const [submitting, setSubmitting] = useState(false);

  const thisMonth = new Date().toISOString().slice(0, 7);

  const targetAthleteIds: Id<"athletes">[] | undefined = (() => {
    if (target === "all") {
      return athletes?.filter((a) => a.status === "active").map((a) => a._id);
    }
    if (target.startsWith("team:")) {
      return team?.roster
        .filter((a) => a.status === "active")
        .map((a) => a._id);
    }
    return [target.slice(8) as Id<"athletes">];
  })();

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (!targetAthleteIds || targetAthleteIds.length === 0) {
      toast.error("No active athletes selected");
      return;
    }
    setSubmitting(true);
    try {
      const count = await create({
        athleteIds: targetAthleteIds,
        label: String(form.get("label") ?? ""),
        amount: Number(form.get("amount")),
        currency: String(form.get("currency") ?? "USD")
          .trim()
          .toUpperCase(),
        dueDay: Number(form.get("dueDay")),
        startPeriod: String(form.get("startPeriod") ?? thisMonth),
      });
      toast.success(
        `Recurring fee set up for ${count} athlete${count === 1 ? "" : "s"}`,
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(errorText(err, "Failed to create recurring fee"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectClass = "h-9 w-full rounded-md border bg-background px-3 text-sm";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New recurring monthly fee</DialogTitle>
          <DialogDescription>
            A fee is created for each selected athlete every month, starting
            with the chosen month.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Who pays
            <select
              className={selectClass}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="all">All active athletes</option>
              {teams?.map((t) => (
                <option key={t._id} value={`team:${t._id}`}>
                  Team: {t.name}
                </option>
              ))}
              {athletes?.map((a) => (
                <option key={a._id} value={`athlete:${a._id}`}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {targetAthleteIds === undefined
                ? "Loading..."
                : `${targetAthleteIds.length} athlete${targetAthleteIds.length === 1 ? "" : "s"}`}
            </span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Description
            <Input name="label" placeholder="Monthly membership" required />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Amount
              <Input
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Currency
              <Input
                name="currency"
                defaultValue="USD"
                maxLength={3}
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Due day of month
              <Input
                name="dueDay"
                type="number"
                min="1"
                max="28"
                defaultValue="5"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              First month
              <Input
                name="startPeriod"
                type="month"
                defaultValue={thisMonth}
                required
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !targetAthleteIds}>
              {submitting ? "Saving..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
