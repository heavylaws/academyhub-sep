import { useMemo, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { Link, useNavigate } from "react-router-dom";
import {
  Compass,
  Plus,
  Search,
  Shield,
  Users,
  Download,
  Calendar,
  Filter,
  X,
  Activity,
  Layers,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import CreateTeamDialog from "./_components/create-team-dialog.tsx";
import ScheduleSessionDialog from "./_components/schedule-session-dialog.tsx";

function getSportBadgeStyle(sport?: string): string {
  const s = (sport || "").toLowerCase();
  if (s.includes("soccer") || s.includes("football")) {
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  }
  if (s.includes("basket")) {
    return "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30";
  }
  if (s.includes("track") || s.includes("field") || s.includes("run")) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30";
  }
  if (s.includes("fitness") || s.includes("gym")) {
    return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30";
  }
  return "bg-secondary text-secondary-foreground border-border";
}

function exportTeamsToCsv(teams: Array<Doc<"teams"> & { memberCount: number }>) {
  const headers = [
    "Team Name",
    "Sport",
    "Preferred Formation",
    "Roster Size",
    "Created Date",
  ];
  const rows = teams.map((t) => [
    `"${t.name.replace(/"/g, '""')}"`,
    `"${(t.sport || "").replace(/"/g, '""')}"`,
    `"${(t.preferredFormation || "").replace(/"/g, '""')}"`,
    t.memberCount,
    `"${t.createdAt || ""}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `academy_teams_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${teams.length} teams to CSV`);
}

export default function Teams() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const canManage =
    user?.role === "academy_admin" ||
    user?.role === "coach" ||
    user?.role === "platform_admin";

  const { isAuthenticated } = useConvexAuth();
  const teams = useQuery(api.teams.listTeams, isAuthenticated ? {} : "skip");
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleTeamId, setScheduleTeamId] = useState<Id<"teams"> | null>(null);
  const [search, setSearch] = useState("");
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedFormation, setSelectedFormation] = useState<string>("all");

  // Derive unique sports and formations
  const { availableSports, availableFormations } = useMemo(() => {
    if (!teams) return { availableSports: [], availableFormations: [] };
    const sports = new Set<string>();
    const formations = new Set<string>();
    for (const t of teams) {
      if (t.sport) sports.add(t.sport);
      if (t.preferredFormation) formations.add(t.preferredFormation);
    }
    return {
      availableSports: Array.from(sports).sort(),
      availableFormations: Array.from(formations).sort(),
    };
  }, [teams]);

  // Aggregate metrics
  const stats = useMemo(() => {
    if (!teams) return { totalTeams: 0, totalAthletes: 0, avgRoster: 0, soccerCount: 0 };
    const totalTeams = teams.length;
    const totalAthletes = teams.reduce((acc, t) => acc + (t.memberCount || 0), 0);
    const avgRoster = totalTeams > 0 ? Math.round(totalAthletes / totalTeams) : 0;
    const soccerCount = teams.filter((t) => (t.sport || "").toLowerCase().includes("soccer")).length;
    return { totalTeams, totalAthletes, avgRoster, soccerCount };
  }, [teams]);

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    return teams.filter((t) => {
      const q = search.trim().toLowerCase();
      if (
        q &&
        !t.name.toLowerCase().includes(q) &&
        !(t.sport && t.sport.toLowerCase().includes(q)) &&
        !(t.preferredFormation && t.preferredFormation.toLowerCase().includes(q))
      ) {
        return false;
      }
      if (selectedSport !== "all" && (t.sport ?? "") !== selectedSport) {
        return false;
      }
      if (selectedFormation !== "all" && (t.preferredFormation ?? "") !== selectedFormation) {
        return false;
      }
      return true;
    });
  }, [teams, search, selectedSport, selectedFormation]);

  const hasActiveFilters =
    search.trim().length > 0 ||
    selectedSport !== "all" ||
    selectedFormation !== "all";

  const resetFilters = () => {
    setSearch("");
    setSelectedSport("all");
    setSelectedFormation("all");
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Teams & Squads
            </h1>
            <Badge variant="outline" className="text-xs font-semibold px-2">
              {teams ? `${teams.length} Squads` : "..."}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage squad rosters, tactical line-ups, positional depth, and training schedules.
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => teams && exportTeamsToCsv(filteredTeams)}
              disabled={!teams || teams.length === 0}
              className="h-9 text-xs gap-1.5"
            >
              <Download className="size-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-9 text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="size-4" />
              <span>New Team</span>
            </Button>
          </div>
        )}
      </div>

      {/* KPI Stats Overview Cards */}
      {teams && teams.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Active Squads</p>
                <p className="text-xl font-bold font-display">{stats.totalTeams}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Users className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Total Enrolled</p>
                <p className="text-xl font-bold font-display">{stats.totalAthletes}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Layers className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Avg. Squad Size</p>
                <p className="text-xl font-bold font-display">{stats.avgRoster} athletes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-card/60 backdrop-blur-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Compass className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Tactical Squads</p>
                <p className="text-xl font-bold font-display">{stats.soccerCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter and Search Bar */}
      {teams && teams.length > 0 && (
        <Card className="border bg-card/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search Box */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search teams by name, sport, or formation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-10 text-sm bg-background"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selectedSport} onValueChange={setSelectedSport}>
                  <SelectTrigger className="w-[140px] h-10 text-xs bg-background">
                    <SelectValue placeholder="Sport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sports</SelectItem>
                    {availableSports.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {sport}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                  <SelectTrigger className="w-[150px] h-10 text-xs bg-background">
                    <SelectValue placeholder="Formation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Formations</SelectItem>
                    {availableFormations.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetFilters}
                    className="h-10 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
                  >
                    <X className="size-3.5" />
                    <span>Clear</span>
                  </Button>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing <strong className="text-foreground">{filteredTeams.length}</strong> of{" "}
                  {teams.length} squads
                </span>
                <button
                  onClick={resetFilters}
                  className="text-primary hover:underline font-medium"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Teams Grid */}
      {teams === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full rounded-xl" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card className="border">
          <CardContent className="p-8">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Shield />
                </EmptyMedia>
                <EmptyTitle>No teams yet</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? "Create a squad to group athletes, build positional depth, and schedule tactical sessions."
                    : "You haven't been assigned to a squad yet."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    Create First Team
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : filteredTeams.length === 0 ? (
        <Card className="border">
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted mb-3">
              <Filter className="size-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base mb-1">No matching squads found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Try adjusting your search criteria or clear your filters.
            </p>
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTeams.map((team) => {
            const hasFullLineup = team.memberCount >= 11;
            return (
              <div
                key={team._id}
                className="group relative rounded-xl border bg-card/70 backdrop-blur-sm p-5 transition-all hover:border-primary/50 hover:shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/teams/${team._id}`}
                      className="font-display text-lg font-bold hover:text-primary transition-colors truncate"
                    >
                      {team.name}
                    </Link>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                      {team.sport && (
                        <Badge
                          variant="outline"
                          className={`text-[11px] border ${getSportBadgeStyle(team.sport)}`}
                        >
                          {team.sport}
                        </Badge>
                      )}
                      {team.preferredFormation && (
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] border-primary/40 text-primary bg-primary/5"
                        >
                          {team.preferredFormation}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-3.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Users className="size-4 text-primary/70" />
                      <span>
                        {team.memberCount}{" "}
                        {team.memberCount === 1 ? "athlete" : "athletes"} on roster
                      </span>
                    </div>

                    <Badge
                      variant="secondary"
                      className={`text-[10px] ${
                        hasFullLineup
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground"
                      }`}
                    >
                      {hasFullLineup ? "Full 11+ Squad" : `${team.memberCount}/11 Lineup`}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-3.5 mt-4 border-t">
                  <Link
                    to={`/teams/${team._id}`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <span>Manage Roster</span>
                    <span>→</span>
                  </Link>

                  <div className="flex items-center gap-1">
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScheduleTeamId(team._id)}
                        className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
                        title="Schedule training session for this squad"
                      >
                        <Calendar className="size-3.5" />
                        <span>Schedule</span>
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/tactical-board?teamId=${team._id}`)}
                      className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
                      title="Deploy squad onto tactical board"
                    >
                      <Compass className="size-3.5 text-primary" />
                      <span>Tactics</span>
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      {canManage && (
        <>
          <CreateTeamDialog open={createOpen} onOpenChange={setCreateOpen} />
          {scheduleTeamId && (
            <ScheduleSessionDialog
              open={Boolean(scheduleTeamId)}
              onOpenChange={(open) => !open && setScheduleTeamId(null)}
              teamId={scheduleTeamId}
            />
          )}
        </>
      )}
    </div>
  );
}
