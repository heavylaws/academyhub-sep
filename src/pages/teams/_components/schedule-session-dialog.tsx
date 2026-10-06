import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Compass, Timer } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
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
import { SOCCER_DRILLS } from "@/data/soccer-drills.ts";

const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  startsAtLocal: z.string().min(1, "Start time is required"),
  durationMinutes: z.string().min(1, "Duration is required"),
  location: z.string(),
  notes: z.string(),
  tacticalPlanId: z.string().optional(),
  initialDrillId: z.string().optional(),
});

export default function ScheduleSessionDialog({
  open,
  onOpenChange,
  teamId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: Id<"teams">;
}) {
  const createSession = useMutation(api.trainingSessions.createSession);
  const tacticalPlans = useQuery(api.tacticalPlans.listTacticalPlans, open ? {} : "skip");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      startsAtLocal: "",
      durationMinutes: "60",
      location: "",
      notes: "",
      tacticalPlanId: "none",
      initialDrillId: "none",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true);
    try {
      // Local datetime-local input has no timezone; interpret as the browser's local time and store as UTC ISO.
      const startsAt = new Date(values.startsAtLocal).toISOString();
      const planId =
        values.tacticalPlanId && values.tacticalPlanId !== "none"
          ? (values.tacticalPlanId as Id<"tacticalPlans">)
          : undefined;
      const drillIds =
        values.initialDrillId && values.initialDrillId !== "none"
          ? [values.initialDrillId]
          : undefined;

      await createSession({
        teamId,
        title: values.title,
        startsAt,
        durationMinutes: Number(values.durationMinutes),
        location: values.location || undefined,
        notes: values.notes || undefined,
        tacticalPlanId: planId,
        drillIds,
      });
      toast.success("Session scheduled");
      form.reset({
        title: "",
        startsAtLocal: "",
        durationMinutes: "60",
        location: "",
        notes: "",
        tacticalPlanId: "none",
        initialDrillId: "none",
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to schedule session",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset({
            title: "",
            startsAtLocal: "",
            durationMinutes: "60",
            location: "",
            notes: "",
            tacticalPlanId: "none",
          });
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule training session</DialogTitle>
          <DialogDescription>
            Add a new session to this team's calendar.
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

            {/* Starter Drill Selector */}
            <FormField
              control={form.control}
              name="initialDrillId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Timer className="size-3.5 text-primary" />
                    <span>Starter Drill / Rondo (Optional)</span>
                  </FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-11 sm:h-10 text-sm">
                        <SelectValue placeholder="Choose a starter drill" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none">No drill attached</SelectItem>
                      {SOCCER_DRILLS.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.title} ({d.durationMinutes}m • {d.categoryLabel})
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
                Schedule session
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
