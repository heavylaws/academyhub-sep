import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
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
import { SOCCER_DRILLS } from "@/data/soccer-drills.ts";

const formSchema = z.object({
  name: z.string().trim().min(1, "Exercise name is required"),
  sets: z.string(),
  reps: z.string(),
  durationSeconds: z.string(),
  notes: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const DEFAULT_VALUES: FormValues = {
  name: "",
  sets: "",
  reps: "",
  durationSeconds: "",
  notes: "",
};

function itemToValues(item: Doc<"planItems">): FormValues {
  return {
    name: item.name,
    sets: item.sets !== undefined ? String(item.sets) : "",
    reps: item.reps !== undefined ? String(item.reps) : "",
    durationSeconds:
      item.durationSeconds !== undefined ? String(item.durationSeconds) : "",
    notes: item.notes ?? "",
  };
}

export default function PlanItemDialog({
  open,
  onOpenChange,
  planId,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planId: Id<"trainingPlans">;
  item?: Doc<"planItems">;
}) {
  const addItem = useMutation(api.trainingPlans.addPlanItem);
  const updateItem = useMutation(api.trainingPlans.updatePlanItem);
  const [submitting, setSubmitting] = useState(false);
  const isEditing = item !== undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditing ? itemToValues(item) : DEFAULT_VALUES,
  });

  useEffect(() => {
    if (open) {
      form.reset(isEditing ? itemToValues(item) : DEFAULT_VALUES);
    }
  }, [open, isEditing, item, form]);

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        sets: values.sets ? Number(values.sets) : undefined,
        reps: values.reps ? Number(values.reps) : undefined,
        durationSeconds: values.durationSeconds
          ? Number(values.durationSeconds)
          : undefined,
        notes: values.notes || undefined,
      };
      if (isEditing) {
        await updateItem({ itemId: item._id, ...payload });
        toast.success("Exercise updated");
      } else {
        await addItem({ planId, ...payload });
        toast.success("Exercise added");
      }
      form.reset(DEFAULT_VALUES);
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to save exercise",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(DEFAULT_VALUES);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit exercise" : "Add exercise"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this exercise's details."
              : "Add a new exercise to this plan."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            {!isEditing && (
              <div className="flex flex-col gap-1.5 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    ⚽ Quick Pick: U16 Soccer Drill
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Born 2011–2020
                  </span>
                </div>
                <Select
                  onValueChange={(drillId) => {
                    const drill = SOCCER_DRILLS.find((d) => d.id === drillId);
                    if (!drill) return;
                    form.setValue("name", `${drill.title} (${drill.ageGroup})`);
                    form.setValue("sets", String(drill.recommendedSets));
                    form.setValue("reps", String(drill.recommendedReps));
                    form.setValue(
                      "durationSeconds",
                      String(drill.durationSeconds || drill.durationMinutes * 60),
                    );
                    form.setValue(
                      "notes",
                      `[${drill.gridDimensions}] Coaching: ${drill.coachingPoints.slice(0, 2).join(". ")}`,
                    );
                  }}
                >
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="Select a preset soccer drill to auto-fill..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {SOCCER_DRILLS.map((d) => (
                      <SelectItem key={d.id} value={d.id} className="text-xs">
                        <span className="font-medium">{d.title}</span>{" "}
                        <span className="text-muted-foreground">
                          — {d.ageGroup} ({d.categoryLabel})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exercise name</FormLabel>
                  <FormControl>
                    <Input placeholder="Box jumps" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="sets"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sets</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} placeholder="3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reps</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="10"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (sec)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="30"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coaching notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Focus on landing mechanics…"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Spinner className="size-4" />}
                {isEditing ? "Save changes" : "Add exercise"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
