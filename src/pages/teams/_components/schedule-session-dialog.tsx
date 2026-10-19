import { useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Compass, Timer, Building2, Trophy, Swords, Calendar } from "lucide-react";
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
import { FacilityManagementDialog } from "@/pages/sessions/_components/facility-management-dialog.tsx";

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
  initialDrillId: z.string().optional(),
  // Match fixture fields
  opponentName: z.string().optional(),
  homeAway: z.enum(["home", "away", "neutral"]),
  competitionName: z.string().optional(),
  formation: z.string().optional(),
  matchSummary: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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
  const facilities = useQuery(api.facilities.listFacilities, open ? {} : "skip");
  const [submitting, setSubmitting] = useState(false);
  const [manageFacilitiesOpen, setManageFacilitiesOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      startsAtLocal: "",
      durationMinutes: "60",
      location: "",
      notes: "",
      sessionType: "training",
      microcycleDay: "general",
      facilityId: "none",
      tacticalPlanId: "none",
      initialDrillId: "none",
      opponentName: "",
      homeAway: "home",
      competitionName: "",
      formation: "",
      matchSummary: "",
    },
  });

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
      const drillIds =
        values.initialDrillId && values.initialDrillId !== "none"
          ? [values.initialDrillId]
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
            formation: values.formation?.trim() || undefined,
            matchSummary: values.matchSummary?.trim() || undefined,
          }
        : undefined;

      await createSession({
        teamId,
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
        drillIds,
      });

      toast.success(isMatch ? "Match fixture scheduled" : "Training session scheduled");
      form.reset();
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
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) form.reset();
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" />
              <span>Schedule Session or Match Fixture</span>
            </DialogTitle>
            <DialogDescription>
              Schedule pitch bookings, periodized microcycles, and match fixtures.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Session / Fixture Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={isMatch ? "League Match vs Westside Academy" : "Speed and agility microcycle"}
                        className="h-10 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Session Type & Microcycle Day */}
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
                            <SelectValue placeholder="Select type" />
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

              {/* Start Time & Duration */}
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

              {/* Facility Conflict Detection Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <FormLabel className="flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary" />
                    <span>Facility / Pitch Allocation</span>
                  </FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto text-xs text-primary"
                    onClick={() => setManageFacilitiesOpen(true)}
                  >
                    Manage Facilities
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name="facilityId"
                  render={({ field }) => (
                    <FormItem>
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
                              disabled={fac.status !== "available"}
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
              </div>

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
                            <Input placeholder="e.g. National Youth League" className="h-9 text-sm" {...field} />
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
                          <FormLabel>Tactical Formation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. 4-3-3, 4-2-3-1, 3-5-2" className="h-9 text-sm" {...field} />
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
                      <span>Tactical Routine / Playbook Plan (Optional)</span>
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

              {/* Starter Drill Selector */}
              <FormField
                control={form.control}
                name="initialDrillId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Timer className="size-3.5 text-primary" />
                      <span>Starter Drill / Warm-up Rondo (Optional)</span>
                    </FormLabel>
                    <Select value={field.value || "none"} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 text-sm">
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
                    <FormLabel>Location / Meeting Point (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Locker Room 2 / Pitch Entry" className="h-10 text-sm" {...field} />
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
                    <FormLabel>Coaching Points / Tactical Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Session goals, workload instructions..." className="min-h-[70px] text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="mt-2">
                <Button type="submit" disabled={submitting} className="h-10 font-semibold w-full sm:w-auto">
                  {submitting && <Spinner className="size-4" />}
                  {isMatch ? "Schedule Match Fixture" : "Schedule Session"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <FacilityManagementDialog
        open={manageFacilitiesOpen}
        onOpenChange={setManageFacilitiesOpen}
      />
    </>
  );
}
