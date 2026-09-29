import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  MinusCircle,
  MoreHorizontal,
  Plus,
  Clock,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { cn } from "@/lib/utils.ts";
import RecordPaymentDialog from "./_components/record-payment-dialog.tsx";
import RecurringFees from "./_components/recurring-fees.tsx";

type FeeStatus = "unpaid" | "partially_paid" | "paid" | "overdue" | "waived";

const STATUS_CONFIG: Record<
  FeeStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  unpaid: {
    label: "Unpaid",
    icon: Clock,
    className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  },
  partially_paid: {
    label: "Partially Paid",
    icon: Clock,
    className: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    className: "bg-secondary text-secondary-foreground border-transparent",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  waived: {
    label: "Waived",
    icon: MinusCircle,
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

const newFeeSchema = z.object({
  athleteId: z.string().min(1, "Select an athlete"),
  label: z.string().min(1, "Description is required"),
  amountDue: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be positive"),
  currency: z.string().min(1),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
});

type NewFeeValues = z.infer<typeof newFeeSchema>;

type FeeWithAthlete = {
  _id: Id<"athleteFees">;
  label: string;
  amountDue: number;
  currency: string;
  dueDate: string;
  status: FeeStatus;
  notes?: string;
  athleteId: Id<"athletes">;
  athleteName: string;
  athleteSport?: string;
  totalPaid?: number;
  remainingBalance?: number;
};

export default function FinancePage() {
  const { user } = useCurrentUser();
  const canManage =
    user?.role === "academy_admin" ||
    user?.role === "accounting" ||
    user?.role === "platform_admin";

  const [statusFilter, setStatusFilter] = useState<FeeStatus | "all">("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<FeeWithAthlete | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<FeeWithAthlete | null>(null);

  const fees = useQuery(
    api.fees.listFeesForAcademy,
    statusFilter === "all" ? {} : { status: statusFilter },
  );
  const athletes = useQuery(api.athletes.listAthletes, {});
  const updateStatus = useMutation(api.fees.updateFeeStatus);
  const deleteFee = useMutation(api.fees.deleteFee);

  const handleStatusChange = async (
    feeId: Id<"athleteFees">,
    status: FeeStatus,
  ) => {
    try {
      await updateStatus({ feeId, status });
      toast.success("Fee status updated");
    } catch (e) {
      toast.error(
        e instanceof ConvexError
          ? String((e.data as { message?: string }).message)
          : "Failed to update",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFee({ feeId: deleteTarget._id });
      toast.success("Fee deleted");
      setDeleteTarget(null);
    } catch (e) {
      toast.error(
        e instanceof ConvexError
          ? String((e.data as { message?: string }).message)
          : "Failed to delete",
      );
    }
  };

  // Summary counts
  const allFees = useQuery(api.fees.listFeesForAcademy, {});
  const counts = {
    unpaid: allFees?.filter((f) => f.status === "unpaid").length ?? 0,
    partially_paid:
      allFees?.filter((f) => f.status === "partially_paid").length ?? 0,
    overdue: allFees?.filter((f) => f.status === "overdue").length ?? 0,
    paid: allFees?.filter((f) => f.status === "paid").length ?? 0,
    waived: allFees?.filter((f) => f.status === "waived").length ?? 0,
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Finance
          </h1>
          <p className="text-muted-foreground">
            Track athlete membership fees and payment status.
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setCreateOpen(true)} className="h-10 sm:h-9">
            <Plus className="size-4" /> New fee
          </Button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 sm:grid-cols-5">
        {(
          ["unpaid", "partially_paid", "overdue", "paid", "waived"] as const
        ).map((s) => {
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
              className={cn(
                "flex flex-col gap-1.5 rounded-xl border p-3 sm:p-4 text-left transition-all cursor-pointer",
                statusFilter === s
                  ? "ring-2 ring-primary/50"
                  : "hover:border-primary/30",
              )}
            >
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="size-3.5" />
                {cfg.label}
              </div>
              <span className="font-display text-xl sm:text-2xl font-bold">
                {allFees === undefined ? "—" : counts[s]}
              </span>
            </button>
          );
        })}
      </div>

      {canManage && <RecurringFees />}

      {/* Fees list: Mobile cards + Desktop table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-base">
              {statusFilter === "all"
                ? "All fees"
                : `${STATUS_CONFIG[statusFilter].label} fees`}
            </CardTitle>
            {statusFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="h-8 text-xs"
              >
                Clear filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {fees === undefined ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : fees.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <DollarSign />
                </EmptyMedia>
                <EmptyTitle>No fees found</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? "Create a fee record to start tracking payments."
                    : "No fees have been assigned yet."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="h-10 sm:h-9">
                    <Plus className="size-4" /> New fee
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              {/* Mobile View: High-ergonomics touch cards */}
              <div className="flex flex-col gap-3 sm:hidden">
                {(fees as FeeWithAthlete[]).map((fee) => {
                  const cfg = STATUS_CONFIG[fee.status];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={fee._id}
                      className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-2.5 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {fee.athleteName}
                          </p>
                          {fee.athleteSport && (
                            <p className="text-xs text-muted-foreground">
                              {fee.athleteSport}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {fee.label}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0",
                            cfg.className,
                          )}
                        >
                          <Icon className="size-3" />
                          {cfg.label}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between border-t border-border/40 pt-2 text-xs">
                        <div className="text-muted-foreground">
                          Due: <span className="font-medium text-foreground">{fee.dueDate}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-base text-foreground">
                            {fee.currency} {fee.amountDue.toFixed(2)}
                          </span>
                          {fee.status === "partially_paid" &&
                            fee.remainingBalance !== undefined && (
                              <div className="text-[11px] text-muted-foreground">
                                {fee.currency} {fee.remainingBalance.toFixed(2)} rem.
                              </div>
                            )}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center justify-end gap-2 border-t border-border/40 pt-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-9 px-3 text-xs font-semibold gap-1.5 flex-1"
                            onClick={() => setPaymentTarget(fee)}
                          >
                            <CheckCircle2 className="size-3.5 text-primary" />
                            Record payment
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-9 shrink-0"
                                aria-label="Fee actions"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {(["unpaid", "overdue", "waived"] as const)
                                .filter((s) => s !== fee.status)
                                .map((s) => (
                                  <DropdownMenuItem
                                    key={s}
                                    onClick={() =>
                                      handleStatusChange(fee._id, s)
                                    }
                                  >
                                    {(() => {
                                      const StatusIcon = STATUS_CONFIG[s].icon;
                                      return <StatusIcon className="size-4" />;
                                    })()}
                                    Mark as {STATUS_CONFIG[s].label}
                                  </DropdownMenuItem>
                                ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(fee)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Tablet & Desktop View: Standard Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due date</TableHead>
                      <TableHead>Status</TableHead>
                      {canManage && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fees as FeeWithAthlete[]).map((fee) => {
                      const cfg = STATUS_CONFIG[fee.status];
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={fee._id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {fee.athleteName}
                              </span>
                              {fee.athleteSport && (
                                <span className="text-xs text-muted-foreground">
                                  {fee.athleteSport}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{fee.label}</TableCell>
                          <TableCell className="font-mono font-semibold">
                            <div>
                              {fee.currency} {fee.amountDue.toFixed(2)}
                            </div>
                            {fee.status === "partially_paid" &&
                              fee.remainingBalance !== undefined && (
                                <div className="text-xs font-normal text-muted-foreground">
                                  {fee.currency} {fee.remainingBalance.toFixed(2)}{" "}
                                  rem.
                                </div>
                              )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {fee.dueDate}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                                cfg.className,
                              )}
                            >
                              <Icon className="size-3" />
                              {cfg.label}
                            </span>
                          </TableCell>
                          {canManage && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                  >
                                    <MoreHorizontal className="size-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => setPaymentTarget(fee)}
                                  >
                                    <CheckCircle2 className="size-4" /> Record
                                    payment
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {(["unpaid", "overdue", "waived"] as const)
                                    .filter((s) => s !== fee.status)
                                    .map((s) => (
                                      <DropdownMenuItem
                                        key={s}
                                        onClick={() =>
                                          handleStatusChange(fee._id, s)
                                        }
                                      >
                                        {(() => {
                                          const StatusIcon = STATUS_CONFIG[s].icon;
                                          return <StatusIcon className="size-4" />;
                                        })()}
                                        Mark as {STATUS_CONFIG[s].label}
                                      </DropdownMenuItem>
                                    ))}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteTarget(fee)}
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* New fee dialog */}
      {canManage && (
        <NewFeeDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          athletes={athletes ?? []}
        />
      )}

      {/* Record payment dialog */}
      {paymentTarget && (
        <RecordPaymentDialog
          fee={paymentTarget}
          open={paymentTarget !== null}
          onOpenChange={(open) => {
            if (!open) setPaymentTarget(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this fee?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the fee record and all payment history
              for it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete fee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NewFeeDialog({
  open,
  onOpenChange,
  athletes,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athletes: Array<{ _id: Id<"athletes">; firstName: string; lastName: string }>;
}) {
  const createFee = useMutation(api.fees.createFee);
  const form = useForm<NewFeeValues>({
    resolver: zodResolver(newFeeSchema),
    defaultValues: {
      athleteId: "",
      label: "",
      amountDue: 0,
      currency: "USD",
      dueDate: "",
      notes: "",
    },
  });

  const handleSubmit = async (values: NewFeeValues) => {
    try {
      await createFee({
        athleteId: values.athleteId as Id<"athletes">,
        label: values.label,
        amountDue: values.amountDue,
        currency: values.currency,
        dueDate: values.dueDate,
        notes: values.notes || undefined,
      });
      toast.success("Fee created", {
        description: "Athlete will be notified by email.",
      });
      form.reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof ConvexError
          ? String((e.data as { message?: string }).message)
          : "Failed to create fee",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New fee</DialogTitle>
          <DialogDescription>
            Create a fee record for an athlete. They'll be notified by email
            immediately.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="athleteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Athlete</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full h-10 sm:h-9">
                        <SelectValue placeholder="Select athlete" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {athletes.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.firstName} {a.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Monthly fee – October 2026"
                      className="h-10 sm:h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amountDue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10 sm:h-9"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full h-10 sm:h-9">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="LBP">LBP</SelectItem>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due date</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-10 sm:h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Any notes for the athlete" className="h-10 sm:h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting} className="h-10 sm:h-9 w-full sm:w-auto">
                {form.formState.isSubmitting && <Spinner className="size-4" />}
                Create fee
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
