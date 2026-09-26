import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type Session = Doc<"trainingSessions">;

type Props = {
  sessions: Session[];
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SessionCalendar({ sessions }: Props) {
  const [current, setCurrent] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Build a map of ISO date string → sessions for fast lookup
  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const key = s.startsAt.slice(0, 10); // YYYY-MM-DD
      const existing = map.get(key) ?? [];
      existing.push(s);
      map.set(key, existing);
    }
    return map;
  }, [sessions]);

  // Full 6-week grid covering the current month
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(current));
    const end = endOfWeek(endOfMonth(current));
    return eachDayOfInterval({ start, end });
  }, [current]);

  const selectedSessions = useMemo(() => {
    if (!selectedDate) return null;
    return sessionsByDate.get(format(selectedDate, "yyyy-MM-dd")) ?? [];
  }, [selectedDate, sessionsByDate]);

  const now = new Date().toISOString();

  return (
    <div className="flex flex-col gap-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setCurrent((d) => subMonths(d, 1));
            setSelectedDate(null);
          }}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="font-display text-base font-semibold">
          {format(current, "MMMM yyyy")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            setCurrent((d) => addMonths(d, 1));
            setSelectedDate(null);
          }}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px">
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="py-1 text-center text-xs font-medium text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border overflow-hidden">
        {calendarDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const daySessions = sessionsByDate.get(key) ?? [];
          const isCurrentMonth = isSameMonth(day, current);
          const todayDay = isToday(day);
          const isSelected = selectedDate
            ? isSameDay(day, selectedDate)
            : false;

          return (
            <button
              key={key}
              onClick={() => {
                if (daySessions.length > 0) {
                  setSelectedDate(isSelected ? null : day);
                }
              }}
              className={cn(
                "group relative flex min-h-[68px] flex-col gap-1 bg-background p-1.5 text-left transition-colors",
                !isCurrentMonth && "bg-muted/30",
                daySessions.length > 0 && "cursor-pointer hover:bg-muted/50",
                daySessions.length === 0 && "cursor-default",
                isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30",
              )}
            >
              {/* Date number */}
              <span
                className={cn(
                  "flex size-6 items-center justify-center self-end rounded-full text-xs font-medium",
                  !isCurrentMonth && "text-muted-foreground/50",
                  isCurrentMonth && !todayDay && "text-foreground",
                  todayDay && "bg-primary text-primary-foreground font-bold",
                )}
              >
                {format(day, "d")}
              </span>

              {/* Session chips — show up to 2, then "+N more" */}
              <div className="flex flex-col gap-0.5">
                {daySessions.slice(0, 2).map((s) => {
                  const isPast = s.startsAt < now;
                  return (
                    <span
                      key={s._id}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px] leading-tight font-medium",
                        isPast
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      {format(parseISO(s.startsAt), "HH:mm")} {s.title}
                    </span>
                  );
                })}
                {daySessions.length > 2 && (
                  <span className="px-1 text-[10px] text-muted-foreground">
                    +{daySessions.length - 2} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected-day session list */}
      {selectedDate && selectedSessions && selectedSessions.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
          <p className="text-sm font-semibold">
            {format(selectedDate, "EEEE, MMMM d")}
          </p>
          {selectedSessions.map((s) => {
            const start = parseISO(s.startsAt);
            const isPast = s.startsAt < now;
            return (
              <Link
                key={s._id}
                to={`/sessions/${s._id}`}
                className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-muted/30"
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-medium truncate">{s.title}</span>
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    {format(start, "h:mm a")} · {s.durationMinutes} min
                    {s.location && (
                      <>
                        <MapPin className="size-3.5 shrink-0" />
                        <span className="truncate">{s.location}</span>
                      </>
                    )}
                  </span>
                </div>
                <Badge
                  variant={isPast ? "outline" : "secondary"}
                  className="shrink-0"
                >
                  {isPast ? "Past" : "Upcoming"}
                </Badge>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
