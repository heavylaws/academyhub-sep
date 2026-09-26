import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import {
  Bell,
  Check,
  CheckCheck,
  Sparkles,
  Zap,
  AlertTriangle,
  Info,
  Calendar,
  DollarSign,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { Separator } from "@/components/ui/separator.tsx";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const unreadCount = useQuery(api.announcements.getUnreadCount) ?? 0;
  const announcements = useQuery(api.announcements.listAnnouncements, {}) ?? [];
  const markAsRead = useMutation(api.announcements.markAnnouncementAsRead);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await markAsRead({ announcementId: id as Id<"announcements"> });
    } catch {
      // Ignored in offline mock if needed
    }
  };

  const handleMarkAllRead = async () => {
    for (const a of announcements.filter((ann) => !ann.isRead)) {
      try {
        await markAsRead({ announcementId: a._id as Id<"announcements"> });
      } catch {
        // Ignored
      }
    }
  };

  const getPriorityIcon = (priority: string, category: string) => {
    if (priority === "urgent" || category === "weather") {
      return <Zap className="size-3.5 text-rose-500 fill-rose-500/20 shrink-0" />;
    }
    if (priority === "important") {
      return <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />;
    }
    if (category === "fees") {
      return <DollarSign className="size-3.5 text-purple-500 shrink-0" />;
    }
    return <Info className="size-3.5 text-blue-500 shrink-0" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-9 text-muted-foreground hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background animate-in fade-in zoom-in-75">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-80 sm:w-96 p-0 shadow-2xl border-border bg-card/95 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Noticeboard</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground gap-1"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="size-3" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {announcements.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No notices published yet.
            </div>
          ) : (
            announcements.slice(0, 5).map((ann) => (
              <div
                key={ann._id}
                className={`p-3.5 transition-colors hover:bg-muted/40 flex items-start gap-2.5 ${
                  !ann.isRead ? "bg-primary/5" : ""
                }`}
              >
                <div className="mt-0.5">
                  {getPriorityIcon(ann.priority, ann.category)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <h4
                      className={`text-xs truncate ${
                        !ann.isRead ? "font-bold text-foreground" : "font-medium text-muted-foreground"
                      }`}
                    >
                      {ann.title}
                    </h4>
                    {!ann.isRead && (
                      <button
                        onClick={(e) => handleMarkRead(ann._id, e)}
                        className="text-[10px] text-muted-foreground hover:text-primary shrink-0 flex items-center gap-0.5 p-0.5"
                        title="Mark read"
                      >
                        <Check className="size-3" />
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                    {ann.content}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground/80">
                    <span>{ann.authorName}</span>
                    <span>•</span>
                    <span>
                      {formatDistanceToNow(new Date(ann.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-2 border-t text-center bg-muted/20">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full text-xs h-7 text-primary hover:text-primary gap-1"
            onClick={() => setOpen(false)}
          >
            <Link to="/announcements">
              <span>View full noticeboard</span>
              <ArrowRight className="size-3" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
