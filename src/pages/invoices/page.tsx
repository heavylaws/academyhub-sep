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
  Clock,
  FileText,
  MinusCircle,
  MoreHorizontal,
  Plus,
  Send,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import AppLayout from "@/components/layout/app-layout.tsx";
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
import { Textarea } from "@/components/ui/textarea.tsx";
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

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

const STATUS_CONFIG: Record<
  InvoiceStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  draft: {
    label: "Draft",
    icon: FileText,
    className: "bg-muted text-muted-foreground border-transparent",
  },
  sent: {
    label: "Sent",
    icon: Send,
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
};

// ─── Create invoice schema ───────────────────────────────────────────────────

const newInvoiceSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z
    .number({ error: "Amount must be a number" })
    .positive("Amount must be positive"),
  currency: z.string().min(1),
  dueDate: z.string().min(1, "Due date is required"),
  athleteId: z.string().optional(),
  note: z.string().optional(),
});
type NewInvoiceValues = z.infer<typeof newInvoiceSchema>;

// ─── Mark-status dialog schema ───────────────────────────────────────────────

const markStatusSchema = z.object({ note: z.string().optional() });
type MarkStatusValues = z.infer<typeof markStatusSchema>;

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 text-xs", cfg.className)}>
      <Icon className="size-3" />
      {cfg.label}
    </Badge>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  icon: Icon,
  className,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:ring-2 hover:ring-primary/40",
        active && "ring-2 ring-primary",
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={cn("size-4", className)} />
      </CardHeader>
      <CardContent>
        <span className={cn("text-2xl font-bold font-display", className)}>
          {value}
        </span>
      </CardContent>
    </Card>
  );
}

// ─── Create invoice dialog ────────────────────────────────────────────────────

function CreateInvoiceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const createInvoice = useMutation(api.invoices.createInvoice);
  const athletes = useQuery(api.athletes.listAthletes, {});

  const form = useForm<NewInvoiceValues>({
    resolver: zodResolver(newInvoiceSchema),
    defaultValues: {
      description: "",
      amount: 0,
      currency: "USD",
      dueDate: "",
      athleteId: "",
      note: "",
    },
  });

  const onSubmit = async (values: NewInvoiceValues) => {
    try {
      await createInvoice({
        description: values.description,
        amount: values.amount,
        currency: values.currency,
        dueDate: values.dueDate,
        athleteId: values.athleteId
          ? (values.athleteId as Id<"athletes">)
          : undefined,
        note: values.note || undefined,
      });
      toast.success("Invoice created");
      form.reset();
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to create invoice");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Invoice</DialogTitle>
          <DialogDescription>
            Create a new invoice for your academy.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="athleteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Recipient{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="General / Academy-wide" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">
                        General / Academy-wide
                      </SelectItem>
                      {(athletes ?? []).map((a) => (
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Monthly training fees – October 2026"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {["USD", "EUR", "GBP", "AED", "SAR", "CAD", "AUD"].map(
                          (c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ),
                        )}
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
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Note{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Any additional notes…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : "Create Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Mark status dialog ───────────────────────────────────────────────────────

function MarkStatusDialog({
  invoiceId,
  newStatus,
  onClose,
}: {
  invoiceId: Id<"invoices"> | null;
  newStatus: InvoiceStatus | null;
  onClose: () => void;
}) {
  const updateStatus = useMutation(api.invoices.updateInvoiceStatus);

  const form = useForm<MarkStatusValues>({
    resolver: zodResolver(markStatusSchema),
    defaultValues: { note: "" },
  });

  const onSubmit = async (values: MarkStatusValues) => {
    if (!invoiceId || !newStatus) return;
    try {
      await updateStatus({
        invoiceId,
        status: newStatus,
        note: values.note || undefined,
      });
      toast.success(`Invoice marked as ${STATUS_CONFIG[newStatus].label}`);
      form.reset();
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("Failed to update invoice");
      }
    }
  };

  return (
    <Dialog open={!!invoiceId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            Mark as {newStatus ? STATUS_CONFIG[newStatus].label : ""}
          </DialogTitle>
          <DialogDescription>
            Optionally add a note for this status change.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Note{" "}
                    <span className="text-muted-foreground text-xs">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="e.g. Payment received via bank transfer"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Spinner /> : "Confirm"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>();
  const [createOpen, setCreateOpen] = useState(false);
  const [markStatus, setMarkStatus] = useState<{
    id: Id<"invoices">;
    status: InvoiceStatus;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Id<"invoices"> | null>(null);

  const invoices = useQuery(api.invoices.listInvoicesForAcademy, {
    status: statusFilter,
  });
  const deleteInvoice = useMutation(api.invoices.deleteInvoice);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInvoice({ invoiceId: deleteTarget });
      toast.success("Invoice deleted");
    } catch {
      toast.error("Failed to delete invoice");
    }
    setDeleteTarget(null);
  };

  const allInvoices = invoices ?? [];
  const counts = {
    draft: allInvoices.filter((i) => i.status === "draft").length,
    sent: allInvoices.filter((i) => i.status === "sent").length,
    paid: allInvoices.filter((i) => i.status === "paid").length,
    overdue: allInvoices.filter((i) => i.status === "overdue").length,
  };

  // When filtering, fetch all for counts on the unfiltered side
  const allQuery = useQuery(api.invoices.listInvoicesForAcademy, {});
  const allForCounts = allQuery ?? [];
  const totalCounts = {
    draft: allForCounts.filter((i) => i.status === "draft").length,
    sent: allForCounts.filter((i) => i.status === "sent").length,
    paid: allForCounts.filter((i) => i.status === "paid").length,
    overdue: allForCounts.filter((i) => i.status === "overdue").length,
  };

  const toggleFilter = (s: InvoiceStatus) =>
    setStatusFilter((prev) => (prev === s ? undefined : s));

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Invoices</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create and manage invoices for your academy
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            New Invoice
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard
            label="Draft"
            value={totalCounts.draft}
            icon={FileText}
            className="text-muted-foreground"
            active={statusFilter === "draft"}
            onClick={() => toggleFilter("draft")}
          />
          <SummaryCard
            label="Sent"
            value={totalCounts.sent}
            icon={Send}
            className="text-blue-500"
            active={statusFilter === "sent"}
            onClick={() => toggleFilter("sent")}
          />
          <SummaryCard
            label="Paid"
            value={totalCounts.paid}
            icon={CheckCircle2}
            className="text-primary"
            active={statusFilter === "paid"}
            onClick={() => toggleFilter("paid")}
          />
          <SummaryCard
            label="Overdue"
            value={totalCounts.overdue}
            icon={AlertTriangle}
            className="text-destructive"
            active={statusFilter === "overdue"}
            onClick={() => toggleFilter("overdue")}
          />
        </div>

        {/* Filter chip */}
        {statusFilter && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Showing:</span>
            <Badge
              variant="outline"
              className={cn(
                "cursor-pointer gap-1",
                STATUS_CONFIG[statusFilter].className,
              )}
              onClick={() => setStatusFilter(undefined)}
            >
              {STATUS_CONFIG[statusFilter].label}
              <MinusCircle className="size-3" />
            </Badge>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {invoices === undefined ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : allInvoices.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText />
                  </EmptyMedia>
                  <EmptyTitle>No invoices yet</EmptyTitle>
                  <EmptyDescription>
                    {statusFilter
                      ? `No ${STATUS_CONFIG[statusFilter].label.toLowerCase()} invoices found.`
                      : "Create your first invoice to get started."}
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  {!statusFilter && (
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <Plus className="size-4" />
                      New Invoice
                    </Button>
                  )}
                </EmptyContent>
              </Empty>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allInvoices.map((inv) => (
                      <TableRow key={inv._id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {inv.description}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {inv.athleteName ?? "General"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {inv.currency}{" "}
                          {inv.amount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(inv.dueDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} />
                        </TableCell>
                        <TableCell>
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
                              {(
                                [
                                  "draft",
                                  "sent",
                                  "paid",
                                  "overdue",
                                ] as InvoiceStatus[]
                              )
                                .filter((s) => s !== inv.status)
                                .map((s) => {
                                  const Icon = STATUS_CONFIG[s].icon;
                                  return (
                                    <DropdownMenuItem
                                      key={s}
                                      onClick={() =>
                                        setMarkStatus({
                                          id: inv._id,
                                          status: s,
                                        })
                                      }
                                    >
                                      <Icon className="size-4" />
                                      Mark as {STATUS_CONFIG[s].label}
                                    </DropdownMenuItem>
                                  );
                                })}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget(inv._id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateInvoiceDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />

      <MarkStatusDialog
        invoiceId={markStatus?.id ?? null}
        newStatus={markStatus?.status ?? null}
        onClose={() => setMarkStatus(null)}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
