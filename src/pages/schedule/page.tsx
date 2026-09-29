import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate } from "react-router-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Filter,
  List as ListIcon,
  MapPin,
  Plus,
  Shield,
  Users,
  TabletSmartphone,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const newSessionSchema = z.object({
  teamId: z.string().min(1, "Select a team"),
  title: z.string().trim().min(1, "Title is required"),
  startsAtLocal: z.string().min(1, "Start time is required"),
  durationMinutes: z.string().min(1, "Duration is required"),
  location: z.string().optional(),
  notes: z.string().optional(),
});

type NewSessionValues = z.infer<typeof newSessionSchema>;

export default function SchedulePage() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const canManage =
    user?.role === "academy_admin" ||
    user?.role === "coach" ||
    user?.role === "platform_admin";

  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const allSessions = useQuery(api.trainingSessions.listSessionsForAcademy, {});
  const teams = useQuery(api.teams.listTeams, {});

  // Filter sessions by team
  const filteredSessions = useMemo(() => {
    if (!allSessions) return [];
    if (selectedTeamId === "all") return allSessions;
    return allSessions.filter((s) => s.teamId === selectedTeamId);
  }, [allSessions, selectedTeamId]);

  // Index sessions by day YYYY-MM-DD
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, typeof filteredSessions>();
    for (const s of filteredSessions) {
      const key = s.startsAt.slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [filteredSessions]);

  // Calendar day grid
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const selectedSessions = useMemo(() => {
    if (!selectedDate) return [];
    const key = format(selectedDate, "yyyy-MM-dd");
    return sessionsByDate.get(key) ?? [];
  }, [selectedDate, sessionsByDate]);

  const now = new Date().toISOString();

  // Separate upcoming vs past for list view
  const { upcomingSessions, pastSessions } = useMemo(() => {
    const upcoming = filteredSessions
      .filter((s) => s.startsAt >= now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const past = filteredSessions
      .filter((s) => s.startsAt < now)
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return { upcomingSessions: upcoming, pastSessions: past };
  }, [filteredSessions, now]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Schedule
          </h1>
          <p className="text-muted-foreground">
            View and manage training sessions across all academy teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Team filter */}
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="w-[170px]">
              <Filter className="mr-2 size-3.5 text-muted-foreground" />
              <SelectValue placeholder="All teams" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All teams</SelectItem>
              {teams?.map((t) => (
                <SelectItem key={t._id} value={t._id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
            <Button
              variant={viewMode === "calendar" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("calendar")}
            >
              <CalendarIcon className="mr-1.5 size-3.5" />
              Calendar
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2.5"
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="mr-1.5 size-3.5" />
              List
            </Button>
          </div>

          {canManage && (
          <Button
            variant="outline"
            onClick={() => navigate("/kiosk")}
            className="gap-1.5 border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary font-semibold"
          >
            <TabletSmartphone className="size-4" />
            Launch Kiosk
          </Button>
          )}

          {canManage && (
            <Button onClick={() => setScheduleOpen(true)}>
              <Plus className="size-4" />
              Schedule session
            </Button>
          )}
        </div>
      </div>

      {allSessions === undefined ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : viewMode === "calendar" ? (
        /* Calendar View */
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setCurrentMonth((m) => subMonths(m, 1));
                  }}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-base font-semibold">
                    {format(currentMonth, "MMMM yyyy")}
                  </h2>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      const today = new Date();
                      setCurrentMonth(startOfMonth(today));
                      setSelectedDate(today);
                    }}
                  >
                    Today
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setCurrentMonth((m) => addMonths(m, 1));
                  }}
                  aria-label="Next month"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-px mb-1">
                {DAY_LABELS.map((d) => (
                  <div
                    key={d}
                    className="py-1 text-center text-xs font-medium text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-px rounded-lg border bg-border overflow-hidden">
                {calendarDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const daySessions = sessionsByDate.get(key) ?? [];
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const todayDay = isToday(day);
                  const isSelected = selectedDate
                    ? isSameDay(day, selectedDate)
                    : false;

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(isSelected ? null : day)}
                      className={cn(
                        "group relative flex min-h-[50px] sm:min-h-[76px] flex-col justify-between bg-background p-1 sm:p-1.5 text-left transition-colors cursor-pointer",
                        !isCurrentMonth &&
                          "bg-muted/30 text-muted-foreground/60",
                        daySessions.length > 0 && "hover:bg-muted/50",
                        isSelected &&
                          "bg-primary/10 ring-2 ring-inset ring-primary",
                      )}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span
                          className={cn(
                            "flex size-5 sm:size-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-medium ml-auto",
                            !isCurrentMonth && "text-muted-foreground/40",
                            isCurrentMonth && !todayDay && "text-foreground",
                            todayDay &&
                              "bg-primary text-primary-foreground font-bold",
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </div>

                      {/* Mobile view: Compact dot indicators */}
                      <div className="flex sm:hidden items-center justify-center gap-1 mt-auto pb-0.5">
                        {daySessions.slice(0, 3).map((s) => (
                          <span
                            key={s._id}
                            className={cn(
                              "size-1.5 rounded-full shrink-0",
                              s.startsAt < now ? "bg-muted-foreground" : "bg-primary",
                            )}
                          />
                        ))}
                        {daySessions.length > 3 && (
                          <span className="text-[9px] font-bold text-muted-foreground leading-none">
                            +
                          </span>
                        )}
                      </div>

                      {/* Tablet/Desktop view: Text chips */}
                      <div className="hidden sm:flex flex-col gap-0.5 overflow-hidden w-full">
                        {daySessions.slice(0, 2).map((s) => {
                          const isPast = s.startsAt < now;
                          return (
                            <div
                              key={s._id}
                              className={cn(
                                "truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium",
                                isPast
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-primary/15 text-primary",
                              )}
                              title={`${s.teamName} - ${s.title}`}
                            >
                              <span className="font-semibold">
                                {s.teamName}:
                              </span>{" "}
                              {s.title}
                            </div>
                          );
                        })}
                        {daySessions.length > 2 && (
                          <span className="px-1 text-[10px] font-medium text-muted-foreground">
                            +{daySessions.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Selected Date Details */}
          {selectedDate && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>
                    Sessions for {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {selectedSessions.length}{" "}
                    {selectedSessions.length === 1 ? "session" : "sessions"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    No sessions scheduled on this date.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {selectedSessions.map((s) => {
                      const start = parseISO(s.startsAt);
                      const isPast = s.startsAt < now;
                      return (
                        <Link
                          key={s._id}
                          to={`/sessions/${s._id}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-background p-3 transition-colors hover:border-primary/50 hover:bg-muted/30"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="font-medium text-xs"
                              >
                                <Shield className="mr-1 size-3" />
                                {s.teamName}
                              </Badge>
                              <span className="font-semibold text-sm truncate">
                                {s.title}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarClock className="size-3.5" />
                                {format(start, "h:mm a")} ({s.durationMinutes}{" "}
                                min)
                              </span>
                              {s.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3.5" />
                                  {s.location}
                                </span>
                              )}
                            </div>
                            {s.notes && (
                              <p className="text-xs text-muted-foreground italic mt-0.5 line-clamp-1">
                                "{s.notes}"
                              </p>
                            )}
                          </div>
                          <Badge
                            variant={isPast ? "outline" : "default"}
                            className="shrink-0"
                          >
                            {isPast ? "Past" : "Upcoming"}
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* List View */
        <div className="flex flex-col gap-6">
          {filteredSessions.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarClock />
                </EmptyMedia>
                <EmptyTitle>No sessions found</EmptyTitle>
                <EmptyDescription>
                  {selectedTeamId !== "all"
                    ? "No sessions scheduled for this team."
                    : "No training sessions have been scheduled yet."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setScheduleOpen(true)}>
                    <Plus className="size-4" /> Schedule session
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              {/* Upcoming sessions */}
              <div className="flex flex-col gap-3">
                <h2 className="font-display text-base font-semibold">
                  Upcoming sessions ({upcomingSessions.length})
                </h2>
                {upcomingSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No upcoming sessions scheduled.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {upcomingSessions.map((s) => {
                      const start = parseISO(s.startsAt);
                      return (
                        <Link
                          key={s._id}
                          to={`/sessions/${s._id}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 transition-all hover:border-primary/50 hover:shadow-sm"
                        >
                          <div className="flex flex-col gap-1.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="secondary">
                                <Shield className="mr-1 size-3" />
                                {s.teamName}
                              </Badge>
                              <span className="font-semibold">{s.title}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <CalendarClock className="size-3.5 text-primary" />
                                {format(start, "EEE, MMM d, yyyy · h:mm a")} (
                                {s.durationMinutes} min)
                              </span>
                              {s.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="size-3.5" />
                                  {s.location}
                                </span>
                              )}
                            </div>
                            {s.notes && (
                              <p className="text-xs text-muted-foreground italic line-clamp-1">
                                "{s.notes}"
                              </p>
                            )}
                          </div>
                          <Badge variant="default" className="shrink-0">
                            Upcoming
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Past sessions */}
              {pastSessions.length > 0 && (
                <div className="flex flex-col gap-3 pt-4 border-t">
                  <h2 className="font-display text-base font-semibold text-muted-foreground">
                    Past sessions ({pastSessions.length})
                  </h2>
                  <div className="flex flex-col gap-2.5">
                    {pastSessions.slice(0, 10).map((s) => {
                      const start = parseISO(s.startsAt);
                      return (
                        <Link
                          key={s._id}
                          to={`/sessions/${s._id}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-3.5 transition-colors hover:bg-muted/40"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {s.teamName}
                              </Badge>
                              <span className="font-medium text-sm">
                                {s.title}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span>
                                {format(start, "MMM d, yyyy · h:mm a")}
                              </span>
                              <span>{s.durationMinutes} min</span>
                              {s.location && <span>· {s.location}</span>}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0 text-xs">
                            Completed
                          </Badge>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Schedule session dialog */}
      {canManage && (
        <CreateAcademySessionDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          teams={teams ?? []}
          defaultTeamId={selectedTeamId !== "all" ? selectedTeamId : undefined}
        />
      )}
    </div>
  );
}

function CreateAcademySessionDialog({
  open,
  onOpenChange,
  teams,
  defaultTeamId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Array<{ _id: Id<"teams">; name: string }>;
  defaultTeamId?: string;
}) {
  const createSession = useMutation(api.trainingSessions.createSession);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<NewSessionValues>({
    resolver: zodResolver(newSessionSchema),
    defaultValues: {
      teamId: defaultTeamId ?? "",
      title: "",
      startsAtLocal: "",
      durationMinutes: "60",
      location: "",
      notes: "",
    },
  });

  const handleSubmit = async (values: NewSessionValues) => {
    setSubmitting(true);
    try {
      const startsAt = new Date(values.startsAtLocal).toISOString();
      await createSession({
        teamId: values.teamId as Id<"teams">,
        title: values.title.trim(),
        startsAt,
        durationMinutes: parseInt(values.durationMinutes, 10),
        location: values.location?.trim() || undefined,
        notes: values.notes?.trim() || undefined,
      });
      toast.success("Session scheduled");
      form.reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(
        e instanceof ConvexError
          ? String((e.data as { message?: string }).message)
          : "Failed to schedule session",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule training session</DialogTitle>
          <DialogDescription>
            Create a training session for a team. Athletes on the roster will be
            able to view it.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 sm:h-9">
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams.map((t) => (
                        <SelectItem key={t._id} value={t._id}>
                          {t.name}
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
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Tactical Drill, Strength & Conditioning"
                      className="h-10 sm:h-9"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startsAtLocal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & time</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" className="h-10 sm:h-9" {...field} />
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
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="5"
                        placeholder="60"
                        className="h-10 sm:h-9"
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Main Pitch, Weight Room"
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
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Focus areas, equipment to bring, etc."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="h-10 sm:h-9"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="h-10 sm:h-9">
                {submitting && <Spinner className="mr-2 size-4" />}
                Schedule session
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
