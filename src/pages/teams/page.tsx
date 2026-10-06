import { useMemo, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { Link, useNavigate } from "react-router-dom";
import { Compass, Plus, Search, Shield, Users } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import CreateTeamDialog from "./_components/create-team-dialog.tsx";

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
  const [search, setSearch] = useState("");

  const filteredTeams = useMemo(() => {
    if (!teams) return [];
    if (!search.trim()) return teams;
    const q = search.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.sport && t.sport.toLowerCase().includes(q)) ||
        (t.preferredFormation && t.preferredFormation.toLowerCase().includes(q)),
    );
  }, [teams, search]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Teams & Squads
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage squad rosters, tactical formations, and training schedules.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5"
          >
            <Plus className="size-4" />
            <span>New team</span>
          </Button>
        )}
      </div>

      {teams && teams.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search teams by name, sport, or formation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
      )}

      {teams === undefined ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : teams.length === 0 ? (
        <Card>
          <CardContent>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Shield />
                </EmptyMedia>
                <EmptyTitle>No teams yet</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? "Create a team to group athletes and schedule training sessions."
                    : "You haven't been assigned to a team yet."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    New team
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          </CardContent>
        </Card>
      ) : filteredTeams.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No teams match your search "{search}".
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredTeams.map((team) => (
            <div
              key={team._id}
              className="group relative rounded-xl border bg-card p-5 transition-all hover:border-primary/50 hover:shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/teams/${team._id}`}
                    className="font-display text-lg font-semibold hover:text-primary transition-colors"
                  >
                    {team.name}
                  </Link>
                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    {team.preferredFormation && (
                      <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
                        {team.preferredFormation}
                      </Badge>
                    )}
                    {team.sport && (
                      <Badge variant="secondary" className="text-xs">
                        {team.sport}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-3">
                  <Users className="size-4" />
                  <span>
                    {team.memberCount}{" "}
                    {team.memberCount === 1 ? "athlete" : "athletes"} on roster
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t">
                <Link
                  to={`/teams/${team._id}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Manage Squad & Roster →
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/tactical-board?teamId=${team._id}`)}
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  title="Deploy squad onto tactical board"
                >
                  <Compass className="size-3.5 text-primary" />
                  <span>Tactical Board</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <CreateTeamDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
    </div>
  );
}
