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
import { Spinner } from "@/components/ui/spinner.tsx";

const schema = z.object({
  discountPercent: z
    .number({ error: "Discount must be a number" })
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100%"),
  reason: z.string().min(1, "Scholarship reason is required"),
});

type Values = z.infer<typeof schema>;

export interface ScholarshipFee {
  _id: Id<"athleteFees">;
  label: string;
  amountDue: number;
  currency: string;
  athleteName: string;
  totalPaid?: number;
  amountPaid?: number;
  scholarshipDiscountPercent?: number;
  scholarshipReason?: string;
}

const PRESET_DISCOUNTS = [
  { label: "10% Sibling", percent: 10, reason: "Sibling Discount (10%)" },
  { label: "25% Merit", percent: 25, reason: "Youth Merit Scholarship (25%)" },
  { label: "50% Elite", percent: 50, reason: "Elite Talent Scholarship (50%)" },
  { label: "100% Full", percent: 100, reason: "Full Academy Scholarship (100%)" },
];

export function ApplyScholarshipDialog({
  fee,
  open,
  onOpenChange,
}: {
  fee: ScholarshipFee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const applyScholarship = useMutation(api.fees.applyScholarshipDiscount);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      discountPercent: fee.scholarshipDiscountPercent ?? 25,
      reason: fee.scholarshipReason ?? "Elite Youth Merit Scholarship",
    },
  });

  const currentPercent = useWatch({
    control: form.control,
    name: "discountPercent",
    defaultValue: fee.scholarshipDiscountPercent ?? 25,
  });

  useEffect(() => {
    if (open) {
      form.reset({
        discountPercent: fee.scholarshipDiscountPercent ?? 25,
        reason: fee.scholarshipReason ?? "Elite Youth Merit Scholarship",
      });
    }
  }, [open, fee, form]);

  const discountRate = (currentPercent ?? 0) / 100;
  const discountAmount = Math.round(fee.amountDue * discountRate * 100) / 100;
  const newEffectiveAmount = Math.max(
    0,
    Math.round((fee.amountDue - discountAmount) * 100) / 100,
  );
  const currentPaid = fee.amountPaid ?? fee.totalPaid ?? 0;
  const newRemainingBalance = Math.max(
    0,
    Math.round((newEffectiveAmount - currentPaid) * 100) / 100,
  );

  const handleSubmit = async (values: Values) => {
    try {
      await applyScholarship({
        feeId: fee._id,
        discountPercent: values.discountPercent,
        reason: values.reason.trim(),
      });

      toast.success("Scholarship discount applied", {
        description: `${values.discountPercent}% scholarship applied for ${fee.athleteName}.`,
      });
      form.reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof ConvexError
          ? String((e.data as { message?: string }).message)
          : "Failed to apply scholarship",
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
          <DialogTitle>Apply Scholarship / Discount</DialogTitle>
          <DialogDescription>
            Grant a scholarship percentage or fee waiver for{" "}
            <strong>{fee.athleteName}</strong> ({fee.label}).
          </DialogDescription>
        </DialogHeader>

        {/* Quick presets */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Quick Scholarship Presets:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {PRESET_DISCOUNTS.map((preset) => (
              <button
                key={preset.percent}
                type="button"
                onClick={() => {
                  form.setValue("discountPercent", preset.percent);
                  form.setValue("reason", preset.reason);
                }}
                className="h-8 rounded-lg border border-border text-xs font-medium transition-colors hover:bg-accent active:scale-95 text-center"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic calculation preview card */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-3 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Base fee amount:</span>
            <span className="font-mono font-medium text-foreground">
              {fee.currency} {fee.amountDue.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Discount deduction ({currentPercent}%):</span>
            <span className="font-mono font-semibold text-rose-600 dark:text-rose-400">
              -{fee.currency} {discountAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center font-bold text-foreground border-t border-border/40 pt-1.5">
            <span>New effective fee:</span>
            <span className="font-mono text-primary">
              {fee.currency} {newEffectiveAmount.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground pt-0.5">
            <span>Amount already settled:</span>
            <span className="font-mono text-foreground">
              {fee.currency} {currentPaid.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Remaining balance after grant:</span>
            <span
              className={
                newRemainingBalance === 0
                  ? "font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  : "font-mono font-semibold text-foreground"
              }
            >
              {fee.currency} {newRemainingBalance.toFixed(2)}
              {newRemainingBalance === 0 ? " (Fully Covered)" : ""}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="discountPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scholarship Discount Percentage (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Scholarship Designation / Reason</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Elite Youth Merit Scholarship or Sibling Discount"
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
                disabled={form.formState.isSubmitting}
                className="h-10 sm:h-9 w-full sm:w-auto"
              >
                {form.formState.isSubmitting && <Spinner className="size-4" />}
                Apply Scholarship
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
