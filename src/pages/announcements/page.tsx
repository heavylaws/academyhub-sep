import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Megaphone,
  Plus,
  Search,
  Pin,
  Trash2,
  Check,
  CheckCheck,
  Zap,
  AlertTriangle,
  Info,
  Calendar,
  DollarSign,
  Building,
  Filter,
  Users,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import AppLayout from "@/components/layout/app-layout.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import CreateAnnouncementDialog from "./_components/create-announcement-dialog.tsx";

const CATEGORIES = [
  { id: "all", label: "All Categories" },
  { id: "weather", label: "Weather & Safety", icon: Zap },
  { id: "meet_schedule", label: "Meets & Travel", icon: Calendar },
  { id: "facility", label: "Facility Updates", icon: Building },
  { id: "fees", label: "Tuition & Fees", icon: DollarSign },
  { id: "general", label: "General Announcements", icon: Megaphone },
];

export default function AnnouncementsPage() {
  const { user } = useCurrentUser();
  const canPost =
    user?.role === "academy_admin" ||
    user?.role === "coach" ||
    user?.role === "platform_admin";

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const announcementsData = useQuery(api.announcements.listAnnouncements, {});
  const teamsData = useQuery(api.teams.listTeams);
  const markAsRead = useMutation(api.announcements.markAnnouncementAsRead);
  const deleteAnnouncement = useMutation(api.announcements.deleteAnnouncement);

  const teamMap = useMemo(() => {
    return new Map((teamsData ?? []).map((t) => [t._id, t.name]));
  }, [teamsData]);

  const filteredAnnouncements = useMemo(() => {
    return (announcementsData ?? []).filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) {
        return false;
      }
      if (priorityFilter === "urgent" && item.priority !== "urgent") {
        return false;
      }
      if (priorityFilter === "pinned" && !item.isPinned) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchContent = item.content.toLowerCase().includes(q);
        const matchAuthor = item.authorName?.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchAuthor) return false;
      }
      return true;
    });
  }, [announcementsData, selectedCategory, priorityFilter, searchQuery]);

  const handleMarkRead = async (id: string) => {
    try {
      await markAsRead({ announcementId: id as Id<"announcements"> });
    } catch {
      // Ignored in offline mock
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement({ announcementId: id as Id<"announcements"> });
    } catch {
      // Ignored
    }
  };

  const getPriorityStyle = (priority: string) => {
    if (priority === "urgent") {
      return "border-rose-500/40 bg-rose-500/[0.03] shadow-rose-500/5";
    }
    if (priority === "important") {
      return "border-amber-500/40 bg-amber-500/[0.02]";
    }
    return "border-border";
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Megaphone className="size-6 text-primary" />
              Academy Noticeboard & Alerts
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live bulletin for training shifts, weather protocols, meet schedules, and administrative notices.
            </p>
          </div>

          {canPost && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="gap-1.5 font-semibold text-xs shadow-md"
            >
              <Plus className="size-4" />
              Broadcast Notice
            </Button>
          )}
        </div>

        {/* Filter Toolbar */}
        <Card className="bg-card/40 backdrop-blur-sm border-border">
          <CardContent className="p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search notices or coaches..."
                  className="pl-8 h-9 text-xs"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Priority Filters */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Button
                  variant={priorityFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 text-xs font-medium"
                  onClick={() => setPriorityFilter("all")}
                >
                  All Priorities
                </Button>
                <Button
                  variant={priorityFilter === "pinned" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 text-xs font-medium gap-1 text-amber-500 hover:text-amber-500"
                  onClick={() => setPriorityFilter("pinned")}
                >
                  <Pin className="size-3" />
                  Pinned
                </Button>
                <Button
                  variant={priorityFilter === "urgent" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8 text-xs font-medium gap-1 text-rose-500 hover:text-rose-500"
                  onClick={() => setPriorityFilter("urgent")}
                >
                  <Zap className="size-3" />
                  Urgent Only
                </Button>
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notices Stream */}
        {filteredAnnouncements.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground text-sm">
            <div className="flex flex-col items-center gap-2">
              <Megaphone className="size-8 text-muted-foreground/60" />
              <span>No announcements found matching the current filters.</span>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3.5">
            {filteredAnnouncements.map((ann) => {
              const targetTeamName = ann.targetTeamId
                ? teamMap.get(ann.targetTeamId) ?? "Target Team"
                : null;

              return (
                <Card
                  key={ann._id}
                  className={`border transition-all shadow-sm hover:shadow-md ${getPriorityStyle(
                    ann.priority,
                  )} ${!ann.isRead ? "ring-1 ring-primary/30" : ""}`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex flex-col gap-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {ann.isPinned && (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1 border-amber-500/40 text-amber-500 bg-amber-500/10"
                            >
                              <Pin className="size-2.5" />
                              Pinned Notice
                            </Badge>
                          )}

                          {ann.priority === "urgent" && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] gap-1 animate-pulse"
                            >
                              <Zap className="size-2.5" />
                              URGENT ALERT
                            </Badge>
                          )}

                          {ann.priority === "important" && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] gap-1 bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            >
                              <AlertTriangle className="size-2.5" />
                              Important
                            </Badge>
                          )}

                          {targetTeamName && (
                            <Badge variant="outline" className="text-[10px] gap-1">
                              <Users className="size-2.5" />
                              {targetTeamName}
                            </Badge>
                          )}

                          <span className="text-[11px] text-muted-foreground capitalize font-medium">
                            {ann.category.replace("_", " ")}
                          </span>
                        </div>

                        <h2 className="text-base font-bold text-foreground">
                          {ann.title}
                        </h2>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                        {!ann.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs gap-1 text-primary hover:bg-primary/10"
                            onClick={() => handleMarkRead(ann._id)}
                          >
                            <Check className="size-3" />
                            Acknowledge
                          </Button>
                        )}

                        {canPost && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="size-7 p-0 text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Notice?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This announcement will be permanently removed from all academy feeds.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  variant="destructive"
                                  onClick={() => handleDelete(ann._id)}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {ann.content}
                    </p>

                    <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-foreground">
                          {ann.authorName}
                        </span>
                        <span>•</span>
                        <span>
                          {format(new Date(ann.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>

                      <span className="text-[11px] font-mono">
                        {formatDistanceToNow(new Date(ann.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal Dialog */}
        <CreateAnnouncementDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      </div>
  );
}
