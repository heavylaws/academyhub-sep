import { useState } from "react";
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
  description: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  phase: z
    .enum([
      "pre_season",
      "in_season_early",
      "in_season_peak",
      "transition_off_season",
      "rehab_return_to_play",
    ])
    .optional(),
  microcycleTag: z.string().optional(),
  targetAgeGroup: z.string().optional(),
});

export default function CreatePlanDialog({
  open,
  onOpenChange,
  athleteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: Id<"athletes">;
}) {
  const createPlan = useMutation(api.trainingPlans.createPlan);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      phase: undefined,
      microcycleTag: "",
      targetAgeGroup: "",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setSubmitting(true);
    try {
      await createPlan({
        athleteId,
        title: values.title,
        description: values.description || undefined,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        phase: values.phase,
        microcycleTag: values.microcycleTag?.trim() || undefined,
        targetAgeGroup: values.targetAgeGroup?.trim() || undefined,
      });
      toast.success("Training plan created");
      form.reset();
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to create plan",
      );
    } finally {
      setSubmitting(false);
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
          <DialogTitle>New training plan</DialogTitle>
          <DialogDescription>
            Create a personalised plan for this athlete.
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
                  <FormLabel>Plan name</FormLabel>
                  <FormControl>
                    <Input placeholder="Speed & Power – Week 1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Goals or focus areas…"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Macrocycle Phase (optional)</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(val) =>
                        field.onChange(val === "none" ? undefined : val)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select phase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None / Unspecified</SelectItem>
                        <SelectItem value="pre_season">Pre-Season</SelectItem>
                        <SelectItem value="in_season_early">In-Season (Early)</SelectItem>
                        <SelectItem value="in_season_peak">In-Season (Peak)</SelectItem>
                        <SelectItem value="transition_off_season">Off-Season / Transition</SelectItem>
                        <SelectItem value="rehab_return_to_play">Rehab & Return to Play</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="microcycleTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Microcycle Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MD-3, Block A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Spinner className="size-4" />}
                Create plan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit plan dialog (re-exported from same file for simplicity) ──────────────

import type { Doc } from "@/convex/_generated/dataModel.d.ts";

const editFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string(),
  status: z.enum(["active", "completed", "archived"]),
  startDate: z.string(),
  endDate: z.string(),
  phase: z
    .enum([
      "pre_season",
      "in_season_early",
      "in_season_peak",
      "transition_off_season",
      "rehab_return_to_play",
    ])
    .optional(),
  microcycleTag: z.string().optional(),
  targetAgeGroup: z.string().optional(),
});

export function EditPlanDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: Doc<"trainingPlans">;
}) {
  const updatePlan = useMutation(api.trainingPlans.updatePlan);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      title: plan.title,
      description: plan.description ?? "",
      status: plan.status,
      startDate: plan.startDate ?? "",
      endDate: plan.endDate ?? "",
      phase: plan.phase,
      microcycleTag: plan.microcycleTag ?? "",
      targetAgeGroup: plan.targetAgeGroup ?? "",
    },
  });

  // Sync when plan changes
  useState(() => {
    form.reset({
      title: plan.title,
      description: plan.description ?? "",
      status: plan.status,
      startDate: plan.startDate ?? "",
      endDate: plan.endDate ?? "",
      phase: plan.phase,
      microcycleTag: plan.microcycleTag ?? "",
      targetAgeGroup: plan.targetAgeGroup ?? "",
    });
  });

  const handleSubmit = async (values: z.infer<typeof editFormSchema>) => {
    setSubmitting(true);
    try {
      await updatePlan({
        planId: plan._id,
        title: values.title,
        description: values.description || undefined,
        status: values.status,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        phase: values.phase,
        microcycleTag: values.microcycleTag?.trim() || undefined,
        targetAgeGroup: values.targetAgeGroup?.trim() || undefined,
      });
      toast.success("Plan updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to update plan",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit plan</DialogTitle>
          <DialogDescription>
            Update this training plan's details.
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
                  <FormLabel>Plan name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Macrocycle Phase (optional)</FormLabel>
                    <Select
                      value={field.value ?? "none"}
                      onValueChange={(val) =>
                        field.onChange(val === "none" ? undefined : val)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select phase" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None / Unspecified</SelectItem>
                        <SelectItem value="pre_season">Pre-Season</SelectItem>
                        <SelectItem value="in_season_early">In-Season (Early)</SelectItem>
                        <SelectItem value="in_season_peak">In-Season (Peak)</SelectItem>
                        <SelectItem value="transition_off_season">Off-Season / Transition</SelectItem>
                        <SelectItem value="rehab_return_to_play">Rehab & Return to Play</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="microcycleTag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Microcycle Tag</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. MD-3, Block A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
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
