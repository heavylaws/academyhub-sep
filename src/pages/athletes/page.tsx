import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import { Users, Plus, Search, Upload, KeyRound, Sparkles } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { api } from "@/convex/_generated/api.js";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import AthleteFormDialog from "./_components/athlete-form-dialog.tsx";
import ImportAthletesDialog from "./_components/import-athletes-dialog.tsx";
import { AiTalentScoutHub } from "./_components/ai-talent-scout-hub.tsx";

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function calculateAge(dateOfBirth: string | undefined): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default function Athletes() {
  const { user } = useCurrentUser();
  const canManage =
    user?.role === "academy_admin" ||
    user?.role === "coach" ||
    user?.role === "platform_admin";

  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") === "scout" ? "scout" : "roster";

  const [searchInput, setSearchInput] = useState("");
  const [search] = useDebounce(searchInput, 300);
  const { isAuthenticated } = useConvexAuth();
  const athletes = useQuery(
    api.athletes.listAthletes,
    isAuthenticated ? { search: search || undefined } : "skip",
  );
  const analyticsAssessments = useQuery(
    api.assessments.listAssessmentsForAnalytics,
    canManage && isAuthenticated ? {} : "skip",
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const generatePins = useMutation(api.athletes.generateMissingCheckInPins);

  const handleGeneratePins = async () => {
    try {
      const assigned = await generatePins({});
      toast.success(
        assigned === 0
          ? "Every active athlete already has a check-in PIN"
          : `Assigned check-in PINs to ${assigned} athlete${assigned === 1 ? "" : "s"}`,
      );
    } catch {
      toast.error("Failed to assign PINs");
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Athletes
          </h1>
          <p className="text-muted-foreground">
            {canManage
              ? "Manage athlete profiles, scout talent, and inspect academy benchmarks."
              : "Your athlete profile."}
          </p>
        </div>
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setImportOpen(true)}
              className="h-10 sm:h-9 text-xs gap-1.5"
            >
              <Upload className="size-4" />
              <span>Import CSV</span>
            </Button>
            <Button
              variant="secondary"
              onClick={handleGeneratePins}
              className="h-10 sm:h-9 text-xs gap-1.5"
            >
              <KeyRound className="size-4" />
              <span>Assign PINs</span>
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="h-10 sm:h-9 text-xs gap-1.5 font-medium"
            >
              <Plus className="size-4" />
              <span>Add athlete</span>
            </Button>
          </div>
        )}
      </div>

      {canManage && (
        <Tabs
          value={currentTab}
          onValueChange={(val) => {
            const next = new URLSearchParams(searchParams);
            if (val === "scout") {
              next.set("tab", "scout");
            } else {
              next.delete("tab");
            }
            setSearchParams(next);
          }}
          className="w-full"
        >
          <TabsList className="grid grid-cols-2 max-w-md h-10">
            <TabsTrigger value="roster" className="text-xs sm:text-sm gap-2">
              <Users className="size-4" />
              <span>Roster Directory ({athletes?.length ?? 0})</span>
            </TabsTrigger>
            <TabsTrigger value="scout" className="text-xs sm:text-sm gap-2 font-medium">
              <Sparkles className="size-4 text-purple-500" />
              <span>AI Talent Scout</span>
              <Badge className="bg-purple-500 text-white text-[9px] px-1.5 py-0 hidden sm:inline">
                Option D
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {currentTab === "scout" && canManage ? (
        <AiTalentScoutHub
          athletes={athletes || []}
          assessments={analyticsAssessments || []}
          canManage={canManage}
        />
      ) : (
        <>
          {canManage && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search athletes by name..."
                  className="pl-9 h-11 sm:h-10 text-sm"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("tab", "scout");
                  setSearchParams(next);
                }}
                className="h-10 sm:h-9 text-xs gap-1.5 font-medium"
              >
                <Sparkles className="size-3.5" />
                <span>Launch AI Scout & Leaderboard (Option D)</span>
              </Button>
            </div>
          )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {canManage ? "All athletes" : "Profile"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {athletes === undefined ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : athletes.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>No athletes yet</EmptyTitle>
                <EmptyDescription>
                  {canManage
                    ? "Add your first athlete profile to start tracking their progress."
                    : "Your profile hasn't been created yet. Ask your coach to add you."}
                </EmptyDescription>
              </EmptyHeader>
              {canManage && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="size-4" />
                    Add athlete
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <div>
              {/* Mobile View: High-ergonomics cards */}
              <div className="flex flex-col divide-y sm:hidden -mx-2">
                {athletes.map((athlete) => (
                  <Link
                    key={athlete._id}
                    to={`/athletes/${athlete._id}`}
                    className="flex items-center justify-between p-3 active:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="size-10 shrink-0">
                        <AvatarFallback className="bg-secondary text-xs font-semibold">
                          {initials(athlete.firstName, athlete.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm text-foreground truncate">
                          {athlete.firstName} {athlete.lastName}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{athlete.sport || "Soccer"}</span>
                          <span aria-hidden="true">·</span>
                          <span>Age {calculateAge(athlete.dateOfBirth) ?? "—"}</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        athlete.status === "active" ? "secondary" : "outline"
                      }
                      className="ml-2 shrink-0 text-[10px]"
                    >
                      {athlete.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </Link>
                ))}
              </div>

              {/* Tablet & Desktop View: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Sport</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {athletes.map((athlete) => (
                      <TableRow key={athlete._id} className="cursor-pointer">
                        <TableCell>
                          <Link
                            to={`/athletes/${athlete._id}`}
                            className="flex items-center gap-3"
                          >
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-secondary text-xs">
                                {initials(athlete.firstName, athlete.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {athlete.firstName} {athlete.lastName}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {athlete.sport ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {calculateAge(athlete.dateOfBirth) ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              athlete.status === "active"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {athlete.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {canManage && (
        <>
          <AthleteFormDialog open={createOpen} onOpenChange={setCreateOpen} />
          <ImportAthletesDialog
            open={importOpen}
            onOpenChange={setImportOpen}
          />
        </>
      )}
    </div>
  );
}
