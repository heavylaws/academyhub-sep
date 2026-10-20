import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { generateIdempotencyKey } from "@/lib/idempotency.ts";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
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
import { Spinner } from "@/components/ui/spinner.tsx";

const schema = z.object({
  amount: z
    .number({ error: "Enter a valid amount" })
    .positive("Enter a valid amount"),
  paymentMethod: z.enum([
    "cash",
    "card",
    "bank_transfer",
    "scholarship_credit",
    "other",
  ]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type Values = z.infer<typeof schema>;

export interface RecordPaymentFee {
  _id: Id<"athleteFees">;
  label: string;
  amountDue: number;
  currency: string;
  athleteName: string;
  totalPaid?: number;
  amountPaid?: number;
  remainingBalance?: number;
  effectiveAmountDue?: number;
  scholarshipDiscountPercent?: number;
  scholarshipReason?: string;
}

export default function RecordPaymentDialog({
  fee,
  open,
  onOpenChange,
}: {
  fee: RecordPaymentFee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recordTransaction = useMutation(api.fees.recordPaymentTransaction);

  const discountPercent = fee.scholarshipDiscountPercent ?? 0;
  const effectiveTotal =
    fee.effectiveAmountDue ??
    Math.round((fee.amountDue * (1 - discountPercent / 100)) * 100) / 100;
  const currentPaid = fee.amountPaid ?? fee.totalPaid ?? 0;
  const currentRemaining =
    fee.remainingBalance !== undefined
      ? fee.remainingBalance
      : Math.max(0, Math.round((effectiveTotal - currentPaid) * 100) / 100);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: currentRemaining,
      paymentMethod: "bank_transfer",
      referenceNumber: "",
      notes: "",
    },
  });

  const enteredAmount = useWatch({
    control: form.control,
    name: "amount",
    defaultValue: currentRemaining,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amount: currentRemaining,
        paymentMethod: "bank_transfer",
        referenceNumber: "",
        notes: "",
      });
    }
  }, [open, currentRemaining, form]);

  const projectedRemaining = Math.max(
    0,
    Math.round((currentRemaining - (enteredAmount || 0)) * 100) / 100,
  );
  const projectedPaid = Math.min(
    effectiveTotal,
    Math.round((currentPaid + (enteredAmount || 0)) * 100) / 100,
  );

  const handleSubmit = async (values: Values) => {
    try {
      const idempotencyKey = generateIdempotencyKey("pay");

      await recordTransaction({
        feeId: fee._id,
        amount: values.amount,
        paymentMethod: values.paymentMethod,
        referenceNumber: values.referenceNumber?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
        idempotencyKey,
      });

      toast.success("Payment recorded to ledger", {
        description: `${fee.athleteName} has been credited ${fee.currency} ${values.amount.toFixed(2)}.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof ConvexError
          ? String((e.data as { message?: string }).message)
          : "Failed to record payment",
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
          <DialogTitle>Record Payment (Partial / Full)</DialogTitle>
          <DialogDescription>
            Record an immutable ledger payment for <strong>{fee.athleteName}</strong> —{" "}
            {fee.label}.
          </DialogDescription>
        </DialogHeader>

        {/* Real-time financial summary */}
        <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2 text-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Effective fee total:</span>
            <span className="font-semibold text-foreground">
              {fee.currency} {effectiveTotal.toFixed(2)}
              {discountPercent > 0 && (
                <span className="ml-1 text-[11px] text-primary">
                  ({discountPercent}% scholarship applied)
                </span>
              )}
            </span>
          </div>

          <div className="flex justify-between items-center text-muted-foreground">
            <span>Currently paid:</span>
            <span className="font-medium text-foreground">
              {fee.currency} {currentPaid.toFixed(2)} of {fee.currency}{" "}
              {effectiveTotal.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between items-center text-muted-foreground">
            <span>Remaining balance:</span>
            <span className="font-bold text-foreground">
              {fee.currency} {currentRemaining.toFixed(2)}
            </span>
          </div>

          {/* Real-time projection preview */}
          {enteredAmount > 0 && (
            <div className="border-t border-border/40 pt-2 flex justify-between items-center font-medium">
              <span className="text-primary">After this payment:</span>
              <span className="text-foreground">
                Paid {fee.currency} {projectedPaid.toFixed(2)} | Remaining:{" "}
                <span
                  className={
                    projectedRemaining === 0
                      ? "text-emerald-600 font-bold"
                      : "text-foreground"
                  }
                >
                  {fee.currency} {projectedRemaining.toFixed(2)}
                  {projectedRemaining === 0 ? " (Fully Settled)" : ""}
                </span>
              </span>
            </div>
          )}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Amount ({fee.currency})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0.01"
                        max={currentRemaining}
                        step="0.01"
                        className="h-10 sm:h-9 font-mono"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full h-10 sm:h-9">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="scholarship_credit">
                          Scholarship Credit
                        </SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt / Reference Number (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. REC-98214 or Wire Ref #1049"
                      className="h-10 sm:h-9"
                      {...field}
                    />
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
                  <FormLabel>Ledger Notes (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Audit note, e.g. Paid in office"
                      className="h-10 sm:h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !enteredAmount || enteredAmount <= 0}
                className="h-10 sm:h-9 w-full sm:w-auto"
              >
                {form.formState.isSubmitting && <Spinner className="size-4" />}
                Record to Ledger
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
