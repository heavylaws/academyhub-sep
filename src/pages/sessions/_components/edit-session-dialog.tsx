import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Compass, Building2, Trophy, Calendar } from "lucide-react";
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
  sessionType: z.enum(["training", "match_competitive", "match_friendly", "recovery", "testing"]),
  microcycleDay: z.enum(["general", "MD-4", "MD-3", "MD-2", "MD-1", "MD", "MD+1", "MD+2"]),
  facilityId: z.string().optional(),
  tacticalPlanId: z.string().optional(),
  opponentName: z.string().optional(),
  homeAway: z.enum(["home", "away", "neutral"]),
  competitionName: z.string().optional(),
  formation: z.string().optional(),
  matchSummary: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
  const facilities = useQuery(api.facilities.listFacilities, open ? {} : "skip");
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: session.title,
      startsAtLocal: isoToDatetimeLocal(session.startsAt),
      durationMinutes: String(session.durationMinutes),
      location: session.location ?? "",
      notes: session.notes ?? "",
      sessionType: session.sessionType ?? "training",
      microcycleDay: session.microcycleDay ?? "general",
      facilityId: session.facilityId ? String(session.facilityId) : "none",
      tacticalPlanId: session.tacticalPlanId ? String(session.tacticalPlanId) : "none",
      opponentName: session.matchDetails?.opponentName ?? "",
      homeAway: session.matchDetails?.homeAway ?? "home",
      competitionName: session.matchDetails?.competitionName ?? "",
      formation: session.matchDetails?.formation ?? "",
      matchSummary: session.matchDetails?.matchSummary ?? "",
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
        sessionType: session.sessionType ?? "training",
        microcycleDay: session.microcycleDay ?? "general",
        facilityId: session.facilityId ? String(session.facilityId) : "none",
        tacticalPlanId: session.tacticalPlanId ? String(session.tacticalPlanId) : "none",
        opponentName: session.matchDetails?.opponentName ?? "",
        homeAway: session.matchDetails?.homeAway ?? "home",
        competitionName: session.matchDetails?.competitionName ?? "",
        formation: session.matchDetails?.formation ?? "",
        matchSummary: session.matchDetails?.matchSummary ?? "",
      });
    }
  }, [open, session, form]);

  const sessionType = useWatch({ control: form.control, name: "sessionType" });
  const isMatch = sessionType === "match_competitive" || sessionType === "match_friendly";

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const startsAt = new Date(values.startsAtLocal).toISOString();
      const planId =
        values.tacticalPlanId && values.tacticalPlanId !== "none"
          ? (values.tacticalPlanId as Id<"tacticalPlans">)
          : undefined;
      const facilityId =
        values.facilityId && values.facilityId !== "none"
          ? (values.facilityId as Id<"facilities">)
          : undefined;

      const matchDetails = isMatch && values.opponentName?.trim()
        ? {
            opponentName: values.opponentName.trim(),
            homeAway: values.homeAway,
            competitionName: values.competitionName?.trim() || undefined,
            goalsFor: session.matchDetails?.goalsFor,
            goalsAgainst: session.matchDetails?.goalsAgainst,
            formation: values.formation?.trim() || undefined,
            matchSummary: values.matchSummary?.trim() || undefined,
          }
        : undefined;

      await updateSession({
        sessionId: session._id,
        title: values.title,
        startsAt,
        durationMinutes: Number(values.durationMinutes),
        location: values.location || undefined,
        notes: values.notes || undefined,
        facilityId,
        sessionType: values.sessionType,
        microcycleDay: values.microcycleDay,
        matchDetails,
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
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            <span>Edit Training Session / Fixture</span>
          </DialogTitle>
          <DialogDescription>
            Update pitch allocation, periodization microcycle, or match fixture metadata.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Session title" className="h-10 text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sessionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Session Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="training">Training Session</SelectItem>
                        <SelectItem value="match_competitive">Competitive Match</SelectItem>
                        <SelectItem value="match_friendly">Friendly Match</SelectItem>
                        <SelectItem value="recovery">Recovery / Regeneration</SelectItem>
                        <SelectItem value="testing">Performance Testing</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="microcycleDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Periodization Day</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Periodization Day" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general">General Session</SelectItem>
                        <SelectItem value="MD-4">MD-4 (Strength / Hypertrophy)</SelectItem>
                        <SelectItem value="MD-3">MD-3 (High Tactical Load)</SelectItem>
                        <SelectItem value="MD-2">MD-2 (Speed & Reaction)</SelectItem>
                        <SelectItem value="MD-1">MD-1 (Activation & Primer)</SelectItem>
                        <SelectItem value="MD">MD (Match Day)</SelectItem>
                        <SelectItem value="MD+1">MD+1 (Recovery / Flush)</SelectItem>
                        <SelectItem value="MD+2">MD+2 (Aerobic Base)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startsAtLocal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="h-10 text-sm" {...field} />
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
                      <Input type="number" min={1} className="h-10 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Facility Selector */}
            <FormField
              control={form.control}
              name="facilityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary" />
                    <span>Facility / Pitch Allocation</span>
                  </FormLabel>
                  <Select value={field.value || "none"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10 text-sm">
                        <SelectValue placeholder="Choose a pitch or court" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60">
                      <SelectItem value="none">No specific facility assigned</SelectItem>
                      {(facilities || []).map((fac) => (
                        <SelectItem
                          key={fac._id}
                          value={fac._id}
                          disabled={fac.status !== "available" && fac._id !== session.facilityId}
                        >
                          {fac.name} ({fac.type} • {fac.surfaceType ?? "Standard"}
                          {fac.status !== "available" ? ` • ${fac.status.toUpperCase()}` : ""})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Match Fixture Card details if match_competitive or match_friendly */}
            {isMatch && (
              <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Trophy className="size-4" />
                  <span>Match Fixture Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="opponentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opponent Club / Academy</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Chelsea Youth Academy" className="h-9 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="homeAway"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venue</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Venue" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="home">Home</SelectItem>
                            <SelectItem value="away">Away</SelectItem>
                            <SelectItem value="neutral">Neutral Ground</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="competitionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Competition / Tournament</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Regional Youth Cup" className="h-9 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="formation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Formation</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 4-3-3" className="h-9 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Tactical Plan Selector */}
            <FormField
              control={form.control}
              name="tacticalPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    <Compass className="size-3.5 text-primary" />
                    <span>Tactical Routine / Playbook Plan</span>
                  </FormLabel>
                  <Select value={field.value || "none"} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10 text-sm">
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
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="Main field" className="h-10 text-sm" {...field} />
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Session notes..." className="min-h-[80px] text-sm" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={submitting} className="h-10 font-semibold w-full sm:w-auto">
                {submitting && <Spinner className="size-4" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
