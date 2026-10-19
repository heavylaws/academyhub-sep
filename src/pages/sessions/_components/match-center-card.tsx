import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Trophy, Swords, Medal, Star, Shield, Clock, Plus, Edit3 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
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
import { Spinner } from "@/components/ui/spinner.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.tsx";

interface MatchCenterCardProps {
  session: Doc<"trainingSessions">;
  roster: Doc<"athletes">[];
  attendance: Doc<"attendanceRecords">[];
  canManage: boolean;
}

export function MatchCenterCard({
  session,
  roster,
  attendance,
  canManage,
}: MatchCenterCardProps) {
  const recordMatchResultAndStats = useMutation(api.trainingSessions.recordMatchResultAndStats);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const matchDetails = session.matchDetails;
  const isMatch =
    session.sessionType === "match_competitive" ||
    session.sessionType === "match_friendly" ||
    Boolean(matchDetails);

  // Local state for the match scoreline & stats recording dialog
  const [goalsFor, setGoalsFor] = useState<string>(
    matchDetails?.goalsFor !== undefined ? String(matchDetails.goalsFor) : "0",
  );
  const [goalsAgainst, setGoalsAgainst] = useState<string>(
    matchDetails?.goalsAgainst !== undefined ? String(matchDetails.goalsAgainst) : "0",
  );
  const [formation, setFormation] = useState<string>(matchDetails?.formation ?? "");
  const [matchSummary, setMatchSummary] = useState<string>(matchDetails?.matchSummary ?? "");

  const [playerStatsDraft, setPlayerStatsDraft] = useState<
    Record<
      string,
      {
        started: boolean;
        minutesPlayed: number;
        goalsOrPoints: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        coachRating: number;
      }
    >
  >({});

  if (!isMatch) return null;

  const attendanceMap = new Map(attendance.map((a) => [a.athleteId, a]));

  const handleOpenDialog = () => {
    setGoalsFor(matchDetails?.goalsFor !== undefined ? String(matchDetails.goalsFor) : "0");
    setGoalsAgainst(matchDetails?.goalsAgainst !== undefined ? String(matchDetails.goalsAgainst) : "0");
    setFormation(matchDetails?.formation ?? "");
    setMatchSummary(matchDetails?.matchSummary ?? "");

    const draft: typeof playerStatsDraft = {};
    for (const athlete of roster) {
      const att = attendanceMap.get(athlete._id);
      const ms = att?.matchStats;
      draft[athlete._id] = {
        started: ms?.started ?? false,
        minutesPlayed: ms?.minutesPlayed ?? (session.durationMinutes || 90),
        goalsOrPoints: ms?.goalsOrPoints ?? 0,
        assists: ms?.assists ?? 0,
        yellowCards: ms?.yellowCards ?? 0,
        redCards: ms?.redCards ?? 0,
        coachRating: ms?.coachRating ?? 7,
      };
    }
    setPlayerStatsDraft(draft);
    setDialogOpen(true);
  };

  const handleSaveMatchStats = async () => {
    setSubmitting(true);
    try {
      const playerStats = Object.entries(playerStatsDraft).map(([athleteId, stats]) => ({
        athleteId: athleteId as Id<"athletes">,
        started: stats.started,
        minutesPlayed: Number(stats.minutesPlayed),
        goalsOrPoints: Number(stats.goalsOrPoints),
        assists: Number(stats.assists),
        yellowCards: Number(stats.yellowCards),
        redCards: Number(stats.redCards),
        coachRating: Number(stats.coachRating),
      }));

      await recordMatchResultAndStats({
        sessionId: session._id,
        matchDetails: {
          opponentName: matchDetails?.opponentName ?? "Opponent",
          homeAway: matchDetails?.homeAway ?? "home",
          competitionName: matchDetails?.competitionName,
          goalsFor: goalsFor !== "" ? Number(goalsFor) : undefined,
          goalsAgainst: goalsAgainst !== "" ? Number(goalsAgainst) : undefined,
          formation: formation.trim() || undefined,
          matchSummary: matchSummary.trim() || undefined,
        },
        playerStats,
      });

      toast.success("Match scoreline and player ratings saved");
      setDialogOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to record match stats",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const hasScore = matchDetails?.goalsFor !== undefined && matchDetails?.goalsAgainst !== undefined;

  return (
    <>
      <Card className="border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/50 bg-primary/5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-amber-500" />
              <CardTitle className="text-base font-bold tracking-tight">
                Match Center: Fixture & Player Ratings
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize text-xs font-semibold">
                {matchDetails?.homeAway ? `${matchDetails.homeAway} Match` : "Fixture"}
              </Badge>
              {matchDetails?.competitionName && (
                <Badge variant="secondary" className="text-xs font-semibold">
                  {matchDetails.competitionName}
                </Badge>
              )}
              {canManage && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
                  onClick={handleOpenDialog}
                >
                  <Edit3 className="size-3.5" />
                  <span>Record Result & Ratings</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-5">
          {/* Main Scoreboard display */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border bg-card/60 gap-4">
            <div className="flex-1 text-center sm:text-left">
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                Our Academy XI
              </span>
              <p className="font-display text-lg font-bold text-foreground">
                {session.title}
              </p>
              {matchDetails?.formation && (
                <span className="text-xs text-muted-foreground">
                  Formation: <strong className="text-foreground">{matchDetails.formation}</strong>
                </span>
              )}
            </div>

            <div className="flex flex-col items-center justify-center px-6 py-2 rounded-lg bg-background border shadow-inner">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                {hasScore ? "Final Score" : "Match Fixture"}
              </span>
              <div className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-primary">
                {hasScore ? (
                  <span>
                    {matchDetails.goalsFor} - {matchDetails.goalsAgainst}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-muted-foreground uppercase">vs</span>
                )}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-right">
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                Opponent Club
              </span>
              <p className="font-display text-lg font-bold text-foreground">
                {matchDetails?.opponentName || "Scheduled Opponent"}
              </p>
              <span className="text-xs text-muted-foreground">
                Venue: <strong className="capitalize text-foreground">{matchDetails?.homeAway || "Neutral"}</strong>
              </span>
            </div>
          </div>

          {/* Match Summary Note if present */}
          {matchDetails?.matchSummary && (
            <div className="text-xs rounded-lg p-3 bg-muted/30 border text-muted-foreground">
              <strong className="text-foreground font-semibold mr-1">Match Analysis:</strong>
              {matchDetails.matchSummary}
            </div>
          )}

          {/* Per-player Performance Ratings Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Squad Match Contributions ({roster.length} Players)
              </h4>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-[11px] text-muted-foreground bg-muted/10">
                    <TableHead className="w-48">Athlete</TableHead>
                    <TableHead className="text-center w-16">Role</TableHead>
                    <TableHead className="text-center w-16">Mins</TableHead>
                    <TableHead className="text-center w-16">Goals</TableHead>
                    <TableHead className="text-center w-16">Assists</TableHead>
                    <TableHead className="text-center w-16">Cards</TableHead>
                    <TableHead className="text-center w-20">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.map((ath) => {
                    const att = attendanceMap.get(ath._id);
                    const stats = att?.matchStats;
                    return (
                      <TableRow key={ath._id} className="text-xs">
                        <TableCell className="font-medium">
                          {ath.firstName} {ath.lastName}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={stats?.started ? "default" : "secondary"}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {stats?.started ? "Starter" : "Sub"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono">
                          {stats?.minutesPlayed !== undefined ? `${stats.minutesPlayed}'` : "—"}
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {stats?.goalsOrPoints ?? 0}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {stats?.assists ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {stats?.yellowCards ? (
                              <span className="inline-block size-3 bg-amber-400 rounded-xs" title={`${stats.yellowCards} yellow card(s)`} />
                            ) : null}
                            {stats?.redCards ? (
                              <span className="inline-block size-3 bg-red-600 rounded-xs" title={`${stats.redCards} red card(s)`} />
                            ) : null}
                            {!stats?.yellowCards && !stats?.redCards && <span className="text-muted-foreground">—</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {stats?.coachRating !== undefined ? (
                            <Badge
                              variant="outline"
                              className={`font-mono font-bold text-[11px] ${
                                stats.coachRating >= 8
                                  ? "border-emerald-500 text-emerald-600 bg-emerald-500/10"
                                  : stats.coachRating >= 6
                                    ? "border-primary text-primary bg-primary/10"
                                    : "border-muted-foreground text-muted-foreground"
                              }`}
                            >
                              ★ {stats.coachRating}/10
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Record Match Stats Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <span>Record Match Result & Player Ratings</span>
            </DialogTitle>
            <DialogDescription>
              Enter the final match scoreline and individual minutes, goals, assists, and coach ratings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Scoreline inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/20">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Goals For (Us)</label>
                <Input
                  type="number"
                  min={0}
                  value={goalsFor}
                  onChange={(e) => setGoalsFor(e.target.value)}
                  className="h-9 mt-1 text-base font-bold font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Goals Against</label>
                <Input
                  type="number"
                  min={0}
                  value={goalsAgainst}
                  onChange={(e) => setGoalsAgainst(e.target.value)}
                  className="h-9 mt-1 text-base font-bold font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Formation Deployed</label>
                <Input
                  placeholder="e.g. 4-3-3 Attacking"
                  value={formation}
                  onChange={(e) => setFormation(e.target.value)}
                  className="h-9 mt-1 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Tactical Summary / Debrief</label>
              <Textarea
                placeholder="Key moments, tactical adjustments, pressing performance..."
                value={matchSummary}
                onChange={(e) => setMatchSummary(e.target.value)}
                className="min-h-[70px] mt-1 text-sm"
              />
            </div>

            {/* Per-athlete stats editable grid */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide">
                Player Match Ratings & Statistics
              </h4>

              <div className="border rounded-lg overflow-x-auto max-h-72">
                <Table>
                  <TableHeader>
                    <TableRow className="text-[11px] bg-muted/30">
                      <TableHead className="w-40">Player</TableHead>
                      <TableHead className="text-center w-16">Starter</TableHead>
                      <TableHead className="text-center w-20">Mins</TableHead>
                      <TableHead className="text-center w-16">Goals</TableHead>
                      <TableHead className="text-center w-16">Assists</TableHead>
                      <TableHead className="text-center w-16">Y / R</TableHead>
                      <TableHead className="text-center w-24">Rating (1-10)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map((ath) => {
                      const cur = playerStatsDraft[ath._id] || {
                        started: false,
                        minutesPlayed: 90,
                        goalsOrPoints: 0,
                        assists: 0,
                        yellowCards: 0,
                        redCards: 0,
                        coachRating: 7,
                      };

                      return (
                        <TableRow key={ath._id} className="text-xs">
                          <TableCell className="font-semibold text-xs py-1.5">
                            {ath.firstName} {ath.lastName}
                          </TableCell>
                          <TableCell className="text-center py-1.5">
                            <Switch
                              checked={cur.started}
                              onCheckedChange={(checked) =>
                                setPlayerStatsDraft((prev) => ({
                                  ...prev,
                                  [ath._id]: { ...cur, started: checked },
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell className="text-center py-1.5">
                            <Input
                              type="number"
                              min={0}
                              max={120}
                              value={cur.minutesPlayed}
                              onChange={(e) =>
                                setPlayerStatsDraft((prev) => ({
                                  ...prev,
                                  [ath._id]: {
                                    ...cur,
                                    minutesPlayed: Number(e.target.value),
                                  },
                                }))
                              }
                              className="h-8 text-xs text-center font-mono w-16 mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center py-1.5">
                            <Input
                              type="number"
                              min={0}
                              value={cur.goalsOrPoints}
                              onChange={(e) =>
                                setPlayerStatsDraft((prev) => ({
                                  ...prev,
                                  [ath._id]: {
                                    ...cur,
                                    goalsOrPoints: Number(e.target.value),
                                  },
                                }))
                              }
                              className="h-8 text-xs text-center font-mono w-14 mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center py-1.5">
                            <Input
                              type="number"
                              min={0}
                              value={cur.assists}
                              onChange={(e) =>
                                setPlayerStatsDraft((prev) => ({
                                  ...prev,
                                  [ath._id]: {
                                    ...cur,
                                    assists: Number(e.target.value),
                                  },
                                }))
                              }
                              className="h-8 text-xs text-center font-mono w-14 mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center py-1.5">
                            <div className="flex items-center justify-center gap-1">
                              <Input
                                type="number"
                                min={0}
                                max={2}
                                value={cur.yellowCards}
                                title="Yellow cards"
                                onChange={(e) =>
                                  setPlayerStatsDraft((prev) => ({
                                    ...prev,
                                    [ath._id]: {
                                      ...cur,
                                      yellowCards: Number(e.target.value),
                                    },
                                  }))
                                }
                                className="h-8 text-xs text-center font-mono w-10 bg-amber-400/10 border-amber-400/40"
                              />
                              <Input
                                type="number"
                                min={0}
                                max={1}
                                value={cur.redCards}
                                title="Red cards"
                                onChange={(e) =>
                                  setPlayerStatsDraft((prev) => ({
                                    ...prev,
                                    [ath._id]: {
                                      ...cur,
                                      redCards: Number(e.target.value),
                                    },
                                  }))
                                }
                                className="h-8 text-xs text-center font-mono w-10 bg-red-500/10 border-red-500/40"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-1.5">
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={cur.coachRating}
                              onChange={(e) =>
                                setPlayerStatsDraft((prev) => ({
                                  ...prev,
                                  [ath._id]: {
                                    ...cur,
                                    coachRating: Number(e.target.value),
                                  },
                                }))
                              }
                              className="h-8 text-xs text-center font-mono font-bold w-16 mx-auto text-primary"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMatchStats} disabled={submitting} className="font-semibold">
              {submitting && <Spinner className="size-4" />}
              Save Match Stats
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
