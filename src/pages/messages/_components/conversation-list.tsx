import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { format, isToday, isYesterday } from "date-fns";
import {
  MessageSquare,
  Search,
  Plus,
  Activity,
  Video,
  User,
  CheckCheck,
  Check,
  Filter,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

interface ConversationListProps {
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onOpenNewDialog: () => void;
}

const ROLE_BADGE_STYLE: Record<
  string,
  { label: string; className: string }
> = {
  coach: {
    label: "Coach",
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
  },
  athlete: {
    label: "Athlete",
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
  academy_admin: {
    label: "Admin",
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
  },
  accounting: {
    label: "Staff",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
};

function formatTimestamp(isoStr?: string) {
  if (!isoStr) return "";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return "";
    if (isToday(d)) {
      return format(d, "h:mm a");
    }
    if (isYesterday(d)) {
      return "Yesterday";
    }
    return format(d, "MMM d");
  } catch {
    return "";
  }
}

function getInitials(name?: string, email?: string) {
  if (name) {
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return (email?.slice(0, 2) ?? "U").toUpperCase();
}

export default function ConversationList({
  activeConversationId,
  onSelectConversation,
  onOpenNewDialog,
}: ConversationListProps) {
  const conversations = useQuery(api.messages.listConversations);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");

  const filtered = useMemo(() => {
    if (!conversations) return [];
    let list = [...conversations];

    if (filterMode === "unread") {
      list = list.filter((c) => (c.unreadCount ?? 0) > 0);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((c) => {
        const nameMatch = c.otherParticipant?.name?.toLowerCase().includes(q);
        const emailMatch = c.otherParticipant?.email?.toLowerCase().includes(q);
        const roleMatch = c.otherParticipant?.role?.toLowerCase().includes(q);
        const msgMatch = c.lastMessageText?.toLowerCase().includes(q);
        const titleMatch = c.title?.toLowerCase().includes(q);
        const contextTitleMatch = c.contextTitle?.toLowerCase().includes(q);
        return (
          nameMatch ||
          emailMatch ||
          roleMatch ||
          msgMatch ||
          titleMatch ||
          contextTitleMatch
        );
      });
    }

    return list;
  }, [conversations, search, filterMode]);

  const totalUnread = useMemo(() => {
    if (!conversations) return 0;
    return conversations.reduce((acc, c) => acc + (c.unreadCount ?? 0), 0);
  }, [conversations]);

  return (
    <div className="flex h-full flex-col border-r bg-card/60 backdrop-blur-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-lg font-bold tracking-tight">
              Messages
            </h2>
            {totalUnread > 0 && (
              <Badge
                variant="default"
                className="bg-primary text-primary-foreground font-semibold px-1.5 py-0 text-xs"
              >
                {totalUnread}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            onClick={onOpenNewDialog}
            className="gap-1.5 h-8 px-2.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search messages or athletes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-full transition-colors",
              filterMode === "all"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            All chats
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("unread")}
            className={cn(
              "px-2.5 py-1 text-xs font-medium rounded-full transition-colors flex items-center gap-1",
              filterMode === "unread"
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            Unread
            {totalUnread > 0 && (
              <span className="inline-block size-1.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </div>

      {/* Conversation List Stream */}
      <ScrollArea className="flex-1">
        {conversations === undefined ? (
          <div className="space-y-3 p-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2">
                <Skeleton className="size-11 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-44" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
              <MessageSquare className="size-6 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {search || filterMode === "unread"
                ? "No matching conversations"
                : "No messages yet"}
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
              {search || filterMode === "unread"
                ? "Try clearing your search or filter"
                : "Initiate direct 1-on-1 coaching feedback with your athletes or staff"}
            </p>
            {!search && filterMode === "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNewDialog}
                className="mt-4 gap-1.5 text-xs"
              >
                <Plus className="size-3.5" />
                Start First Message
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filtered.map((c) => {
              const isSelected = activeConversationId === c._id;
              const other = c.otherParticipant;
              const hasUnread = (c.unreadCount ?? 0) > 0;
              const roleMeta = ROLE_BADGE_STYLE[other?.role ?? "athlete"] || {
                label: other?.role ?? "Member",
                className: "border-border text-muted-foreground",
              };

              return (
                <button
                  key={c._id}
                  type="button"
                  onClick={() => onSelectConversation(c._id)}
                  className={cn(
                    "flex w-full items-start gap-3 p-3.5 text-left transition-all hover:bg-muted/50",
                    isSelected &&
                      "bg-primary/10 hover:bg-primary/15 border-l-4 border-l-primary pl-2.5",
                    hasUnread && !isSelected && "bg-muted/20 font-medium",
                  )}
                >
                  <Avatar className="size-11 shrink-0 mt-0.5 border shadow-xs">
                    <AvatarFallback className="text-xs font-semibold bg-secondary/80">
                      {getInitials(other?.name, other?.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span
                        className={cn(
                          "truncate text-sm",
                          hasUnread ? "font-bold text-foreground" : "font-medium text-foreground",
                        )}
                      >
                        {other?.name || other?.email || "Direct Chat"}
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatTimestamp(c.lastMessageAt ?? c.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "px-1.5 py-0 text-[10px] font-medium leading-tight",
                          roleMeta.className,
                        )}
                      >
                        {roleMeta.label}
                      </Badge>

                      {c.contextType === "session" && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">
                          <Activity className="size-2.5" />
                          Session
                        </span>
                      )}

                      {c.contextType === "video" && (
                        <span className="flex items-center gap-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-1.5 py-0.5 rounded">
                          <Video className="size-2.5" />
                          Video
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-xs",
                          hasUnread
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {c.lastMessageText || "No messages yet"}
                      </p>

                      {hasUnread && (
                        <Badge
                          variant="default"
                          className="size-5 p-0 flex items-center justify-center rounded-full text-[10px] font-bold shrink-0 bg-primary text-primary-foreground"
                        >
                          {c.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
