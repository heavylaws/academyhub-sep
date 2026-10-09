import { Link } from "react-router-dom";
import { format } from "date-fns";
import { CalendarClock, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";

export function SessionRow({
  session,
}: {
  session: {
    _id: string;
    title: string;
    startsAt: string;
    durationMinutes: number;
    location?: string;
    teamName: string;
  };
}) {
  const start = new Date(session.startsAt);
  return (
    <Link
      to={`/sessions/${session._id}`}
      className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{session.title}</span>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {session.teamName}
          </Badge>
        </div>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="size-3.5 shrink-0" />
          {format(start, "EEE, MMM d 'at' h:mm a")}
          {session.location && (
            <>
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{session.location}</span>
            </>
          )}
        </span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {session.durationMinutes} min
      </span>
    </Link>
  );
}
