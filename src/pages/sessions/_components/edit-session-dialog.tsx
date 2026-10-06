import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Compass } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  startsAtLocal: z.string().min(1, "Start time is required"),
  durationMinutes: z.string().min(1, "Duration is required"),
  location: z.string(),
  notes: z.string(),
  tacticalPlanId: z.string().optional(),
});

/** Converts an ISO UTC string to the format expected by datetime-local inputs (YYYY-MM-DDTHH:mm). */
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EditSessionDialog({
  open,
  onOpenChange,
  session,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Doc<"trainingSessions">;
}) {
  const updateSession = useMutation(api.trainingSessions.updateSession);
  const tacticalPlans = useQuery(api.tacticalPlans.listTacticalPlans, open ? {} : "skip");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: session.title,
      startsAtLocal: isoToDatetimeLocal(session.startsAt),
      durationMinutes: String(session.durationMinutes),
      location: session.location ?? "",
      notes: session.notes ?? "",
      tacticalPlanId: session.tacticalPlanId ? String(session.tacticalPlanId) : "none",
    },
  });

  // Reset form when the session data changes or dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        title: session.title,
        startsAtLocal: isoToDatetimeLocal(session.startsAt),
        durationMinutes: String(session.durationMinutes),
        location: session.location ?? "",
        notes: session.notes ?? "",
        tacticalPlanId: session.tacticalPlanId ? String(session.tacticalPlanId) : "none",
      });
    }
  }, [open, session, form]);

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true);
    try {
      const startsAt = new Date(values.startsAtLocal).toISOString();
      const planId =
        values.tacticalPlanId && values.tacticalPlanId !== "none"
          ? (values.tacticalPlanId as Id<"tacticalPlans">)
          : undefined;

      await updateSession({
        sessionId: session._id,
        title: values.title,
        startsAt,
        durationMinutes: Number(values.durationMinutes),
        location: values.location || undefined,
        notes: values.notes || undefined,
        tacticalPlanId: planId,
        drillIds: session.drillIds,
      });
      toast.success("Session updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to update session",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit training session</DialogTitle>
          <DialogDescription>
            Update the details for this session.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Speed and agility"
                      className="h-11 sm:h-10 text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startsAtLocal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        className="h-11 sm:h-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        className="h-11 sm:h-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {/* Tactical Plan Selector */}
            <FormField
              control={form.control}
              name="tacticalPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Compass className="size-3.5 text-primary" />
                    <span>Tactical Routine / Playbook Plan (Optional)</span>
                  </FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 sm:h-10 text-sm">
                        <SelectValue placeholder="Choose a tactical plan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No tactical plan</SelectItem>
                      {(tacticalPlans || []).map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.title} ({p.pitchType.replace(/_/g, " ")})
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Main field"
                      className="h-11 sm:h-10 text-sm"
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
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Session plan or focus area..."
                      className="min-h-[80px] text-sm"
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
                disabled={submitting}
                className="h-10 sm:h-9 text-xs sm:text-sm font-semibold w-full sm:w-auto"
              >
                {submitting && <Spinner className="size-4" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
