import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

const schema = z.object({
  amountPaid: z
    .number({ error: "Enter a valid amount" })
    .positive("Enter a valid amount"),
  paidOn: z.string().min(1, "Select a date"),
  method: z.string().optional(),
  note: z.string().optional(),
});

type Values = z.infer<typeof schema>;

type Fee = {
  _id: Id<"athleteFees">;
  label: string;
  amountDue: number;
  currency: string;
  athleteName: string;
  remainingBalance?: number;
};

export default function RecordPaymentDialog({
  fee,
  open,
  onOpenChange,
}: {
  fee: Fee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recordPayment = useMutation(api.fees.recordPayment);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      amountPaid: fee.remainingBalance ?? fee.amountDue,
      paidOn: new Date().toISOString().split("T")[0],
      method: "",
      note: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        amountPaid: fee.remainingBalance ?? fee.amountDue,
        paidOn: new Date().toISOString().split("T")[0],
        method: "",
        note: "",
      });
    }
  }, [open, fee, form]);

  const handleSubmit = async (values: Values) => {
    try {
      await recordPayment({
        feeId: fee._id,
        amountPaid: values.amountPaid,
        paidOn: values.paidOn,
        method: values.method || undefined,
        note: values.note || undefined,
      });
      toast.success("Payment recorded", {
        description: `${fee.athleteName} will be notified by email.`,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            Record a payment for <strong>{fee.athleteName}</strong> —{" "}
            {fee.label}.
            {fee.remainingBalance !== undefined &&
            fee.remainingBalance < fee.amountDue ? (
              <span className="block mt-1 font-medium text-foreground">
                Remaining balance: {fee.currency}{" "}
                {fee.remainingBalance.toFixed(2)} (Total fee: {fee.currency}{" "}
                {fee.amountDue.toFixed(2)})
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount paid ({fee.currency})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
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
                name="paidOn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date paid</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment method (optional)</FormLabel>
                  <Select
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">
                        Bank Transfer
                      </SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Any notes about this payment"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner className="size-4" />}
                Record payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
