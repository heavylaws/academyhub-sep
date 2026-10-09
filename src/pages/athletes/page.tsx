import { useState, useMemo } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Link, useSearchParams } from "react-router-dom";
import {
  Users,
  Plus,
  Search,
  Upload,
  Download,
  KeyRound,
  Sparkles,
  Filter,
  MoreHorizontal,
  Pencil,
  ExternalLink,
  ShieldCheck,
  ShieldOff,
  RefreshCw,
  X,
  UserCheck,
  Award,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce.ts";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
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

function getSportBadgeColor(sport?: string): string {
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
  if (s.includes("swim")) {
    return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30";
  }
  return "bg-secondary text-secondary-foreground border-border";
}

function exportAthletesToCsv(athletes: Doc<"athletes">[]) {
  const headers = [
    "First Name",
    "Last Name",
    "Sport",
    "Date of Birth",
    "Age",
    "Status",
    "Email",
    "Phone",
    "Guardian Name",
    "Guardian Phone",
    "Guardian Email",
    "Check-in PIN",
  ];
  const rows = athletes.map((a) => [
    `"${(a.firstName || "").replace(/"/g, '""')}"`,
    `"${(a.lastName || "").replace(/"/g, '""')}"`,
    `"${(a.sport || "").replace(/"/g, '""')}"`,
    `"${a.dateOfBirth || ""}"`,
    calculateAge(a.dateOfBirth) ?? "",
    `"${a.status}"`,
    `"${(a.email || "").replace(/"/g, '""')}"`,
    `"${(a.phone || "").replace(/"/g, '""')}"`,
    `"${(a.guardianName || "").replace(/"/g, '""')}"`,
    `"${(a.guardianPhone || "").replace(/"/g, '""')}"`,
    `"${(a.guardianEmail || "").replace(/"/g, '""')}"`,
    `"${a.checkInPin || ""}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `athletes_roster_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toast.success(`Exported ${athletes.length} athletes to CSV`);
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
  const [selectedSport, setSelectedSport] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<string>("all");

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
  const [editingAthlete, setEditingAthlete] = useState<Doc<"athletes"> | null>(null);

  const generatePins = useMutation(api.athletes.generateMissingCheckInPins);
  const regeneratePin = useMutation(api.athletes.regenerateCheckInPin);
  const setAthleteStatus = useMutation(api.athletes.setAthleteStatus);

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

  const handleToggleStatus = async (athlete: Doc<"athletes">) => {
    const nextStatus = athlete.status === "active" ? "inactive" : "active";
    try {
      await setAthleteStatus({
        athleteId: athlete._id,
        status: nextStatus,
      });
      toast.success(
        nextStatus === "active"
          ? `${athlete.firstName} reactivated`
          : `${athlete.firstName} marked inactive`,
      );
    } catch {
      toast.error("Failed to update athlete status");
    }
  };

  const handleRegeneratePin = async (athlete: Doc<"athletes">) => {
    try {
      const newPin = await regeneratePin({ athleteId: athlete._id });
      toast.success(`Generated PIN ${newPin} for ${athlete.firstName}`);
    } catch {
      toast.error("Failed to regenerate PIN");
    }
  };

  // Derive sports list from current athletes
  const availableSports = useMemo(() => {
    if (!athletes) return [];
    const set = new Set<string>();
    for (const a of athletes) {
      if (a.sport) set.add(a.sport);
    }
    return Array.from(set).sort();
  }, [athletes]);

  // Filter athletes locally by sport, status, age group
  const filteredAthletes = useMemo(() => {
    if (!athletes) return [];
    return athletes.filter((a) => {
      if (selectedSport !== "all" && (a.sport ?? "") !== selectedSport) {
        return false;
      }
      if (selectedStatus !== "all" && a.status !== selectedStatus) {
        return false;
      }
      if (selectedAgeGroup !== "all") {
        const age = calculateAge(a.dateOfBirth);
        if (selectedAgeGroup === "u14" && (age === null || age >= 14)) return false;
        if (selectedAgeGroup === "u18" && (age === null || age < 14 || age >= 18)) return false;
        if (selectedAgeGroup === "senior" && (age === null || age < 18)) return false;
      }
      return true;
    });
  }, [athletes, selectedSport, selectedStatus, selectedAgeGroup]);

  // Metrics for overview cards
  const stats = useMemo(() => {
    if (!athletes) return { total: 0, active: 0, youth: 0, withPin: 0, pinPercent: 0 };
    const total = athletes.length;
    const active = athletes.filter((a) => a.status === "active").length;
    const youth = athletes.filter((a) => {
      const age = calculateAge(a.dateOfBirth);
      return age !== null && age < 18;
    }).length;
    const withPin = athletes.filter((a) => Boolean(a.checkInPin)).length;
    const pinPercent = total > 0 ? Math.round((withPin / total) * 100) : 0;
    return { total, active, youth, withPin, pinPercent };
  }, [athletes]);

  const hasActiveFilters =
    searchInput.trim().length > 0 ||
    selectedSport !== "all" ||
    selectedStatus !== "all" ||
    selectedAgeGroup !== "all";

  const resetFilters = () => {
    setSearchInput("");
    setSelectedSport("all");
    setSelectedStatus("all");
    setSelectedAgeGroup("all");
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight">
              Athletes
            </h1>
            <Badge variant="outline" className="text-xs font-semibold px-2">
              {athletes ? `${athletes.length} Registered` : "..."}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            {canManage
              ? "Manage athlete profiles, monitor check-in PINs, scout talent, and inspect academy benchmarks."
              : "Your athlete profile and performance record."}
          </p>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => athletes && exportAthletesToCsv(filteredAthletes)}
              disabled={!athletes || athletes.length === 0}
              className="h-9 text-xs gap-1.5"
            >
              <Download className="size-3.5" />
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
              className="h-9 text-xs gap-1.5"
            >
              <Upload className="size-3.5" />
              <span>Import CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGeneratePins}
              className="h-9 text-xs gap-1.5"
            >
              <KeyRound className="size-3.5" />
              <span>Assign PINs</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="h-9 text-xs gap-1.5 font-medium shadow-sm"
            >
              <Plus className="size-4" />
              <span>Add Athlete</span>
            </Button>
          </div>
        )}
      </div>

      {/* Main Tabs (Roster vs AI Talent Scout) */}
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
          <TabsList className="grid grid-cols-2 max-w-sm h-10 p-1">
            <TabsTrigger value="roster" className="text-xs sm:text-sm gap-2">
              <Users className="size-4" />
              <span>Roster ({athletes?.length ?? 0})</span>
            </TabsTrigger>
            <TabsTrigger value="scout" className="text-xs sm:text-sm gap-2 font-medium">
              <Sparkles className="size-4 text-purple-500" />
              <span>AI Scout Hub</span>
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
          {/* Summary KPI Cards Banner */}
          {canManage && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="border bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Users className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Total Athletes</p>
                    <p className="text-xl font-bold font-display">{stats.total}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                    <UserCheck className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Active Roster</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-xl font-bold font-display">{stats.active}</p>
                      <span className="text-[11px] text-muted-foreground">
                        ({stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                    <Award className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">Youth (U18)</p>
                    <p className="text-xl font-bold font-display">{stats.youth}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border bg-card/60 backdrop-blur-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                    <KeyRound className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">PIN Check-in</p>
                    <div className="flex items-baseline gap-1.5">
                      <p className="text-xl font-bold font-display">{stats.pinPercent}%</p>
                      <span className="text-[11px] text-muted-foreground">
                        ({stats.withPin}/{stats.total})
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filter & Search Bar */}
          {canManage && (
            <Card className="border bg-card/50">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by athlete name, email, or guardian..."
                      className="pl-9 h-10 text-sm bg-background"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                  </div>

                  {/* Filter Dropdowns */}
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

                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-[125px] h-10 text-xs bg-background">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={selectedAgeGroup} onValueChange={setSelectedAgeGroup}>
                      <SelectTrigger className="w-[125px] h-10 text-xs bg-background">
                        <SelectValue placeholder="Age Group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ages</SelectItem>
                        <SelectItem value="u14">Under 14</SelectItem>
                        <SelectItem value="u18">14 – 17</SelectItem>
                        <SelectItem value="senior">Senior (18+)</SelectItem>
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

                {hasActiveFilters && athletes && (
                  <div className="mt-2.5 pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Showing <strong className="text-foreground">{filteredAthletes.length}</strong> of{" "}
                      {athletes.length} athletes
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

          {/* Roster Directory Table & Mobile Cards */}
          <Card className="border">
            <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">
                {canManage ? "Roster Directory" : "My Profile"}
              </CardTitle>
              {filteredAthletes.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {filteredAthletes.length} {filteredAthletes.length === 1 ? "athlete" : "athletes"}
                </span>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {athletes === undefined ? (
                <div className="flex flex-col gap-3 p-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-md" />
                  ))}
                </div>
              ) : athletes.length === 0 ? (
                <div className="p-8">
                  <Empty>
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <Users />
                      </EmptyMedia>
                      <EmptyTitle>No athletes yet</EmptyTitle>
                      <EmptyDescription>
                        {canManage
                          ? "Add your first athlete profile or import from CSV to start tracking their progress."
                          : "Your profile hasn't been created yet. Ask your coach to add you."}
                      </EmptyDescription>
                    </EmptyHeader>
                    {canManage && (
                      <EmptyContent>
                        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5">
                          <Plus className="size-4" />
                          Add athlete
                        </Button>
                      </EmptyContent>
                    )}
                  </Empty>
                </div>
              ) : filteredAthletes.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted mb-3">
                    <Filter className="size-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-base mb-1">No matching athletes found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your search criteria or clear the filters.
                  </p>
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Clear Filters
                  </Button>
                </div>
              ) : (
                <div>
                  {/* Mobile View: High-ergonomics cards */}
                  <div className="flex flex-col divide-y sm:hidden">
                    {filteredAthletes.map((athlete) => {
                      const age = calculateAge(athlete.dateOfBirth);
                      return (
                        <div
                          key={athlete._id}
                          className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
                        >
                          <Link
                            to={`/athletes/${athlete._id}`}
                            className="flex items-center gap-3 min-w-0 flex-1"
                          >
                            <Avatar className="size-11 shrink-0 border">
                              <AvatarFallback className="bg-secondary text-xs font-semibold">
                                {initials(athlete.firstName, athlete.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-sm text-foreground truncate">
                                {athlete.firstName} {athlete.lastName}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] px-1.5 py-0 border ${getSportBadgeColor(
                                    athlete.sport,
                                  )}`}
                                >
                                  {athlete.sport || "Sport"}
                                </Badge>
                                <span aria-hidden="true">·</span>
                                <span>{age !== null ? `Age ${age}` : "No DOB"}</span>
                              </div>
                            </div>
                          </Link>

                          <div className="flex items-center gap-2 shrink-0">
                            {athlete.checkInPin && (
                              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-muted">
                                #{athlete.checkInPin}
                              </span>
                            )}
                            <Badge
                              variant={athlete.status === "active" ? "secondary" : "outline"}
                              className={`text-[10px] ${
                                athlete.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {athlete.status === "active" ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Tablet & Desktop View: Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="w-[280px]">Athlete</TableHead>
                          <TableHead>Sport</TableHead>
                          <TableHead>Age & DOB</TableHead>
                          <TableHead>Guardian / Contact</TableHead>
                          <TableHead>Kiosk PIN</TableHead>
                          <TableHead>Status</TableHead>
                          {canManage && <TableHead className="w-[60px] text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAthletes.map((athlete) => {
                          const age = calculateAge(athlete.dateOfBirth);
                          return (
                            <TableRow key={athlete._id} className="hover:bg-muted/40 transition-colors">
                              <TableCell>
                                <Link
                                  to={`/athletes/${athlete._id}`}
                                  className="flex items-center gap-3 group"
                                >
                                  <Avatar className="size-9 border group-hover:ring-2 group-hover:ring-primary/30 transition-all">
                                    <AvatarFallback className="bg-secondary text-xs font-semibold">
                                      {initials(athlete.firstName, athlete.lastName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-sm group-hover:text-primary transition-colors">
                                      {athlete.firstName} {athlete.lastName}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {athlete.email || "No email"}
                                    </span>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-xs border ${getSportBadgeColor(athlete.sport)}`}
                                >
                                  {athlete.sport ?? "General"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm">
                                {age !== null ? (
                                  <div>
                                    <span className="font-medium">{age} yrs</span>
                                    {athlete.dateOfBirth && (
                                      <span className="block text-[11px] text-muted-foreground">
                                        {athlete.dateOfBirth}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {athlete.guardianName ? (
                                  <div>
                                    <span className="font-medium text-xs">
                                      {athlete.guardianName}
                                    </span>
                                    <span className="block text-[11px] text-muted-foreground">
                                      {athlete.guardianPhone || athlete.guardianEmail || "Guardian"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    {athlete.phone || "Self"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {athlete.checkInPin ? (
                                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted border">
                                    {athlete.checkInPin}
                                  </span>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRegeneratePin(athlete)}
                                    className="h-6 text-[11px] text-muted-foreground hover:text-foreground px-1.5"
                                  >
                                    + Assign
                                  </Button>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={athlete.status === "active" ? "secondary" : "outline"}
                                  className={`text-xs ${
                                    athlete.status === "active"
                                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                                      : "text-muted-foreground"
                                  }`}
                                >
                                  {athlete.status === "active" ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              {canManage && (
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-8 text-muted-foreground hover:text-foreground"
                                      >
                                        <MoreHorizontal className="size-4" />
                                        <span className="sr-only">Actions</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem asChild>
                                        <Link
                                          to={`/athletes/${athlete._id}`}
                                          className="cursor-pointer gap-2"
                                        >
                                          <ExternalLink className="size-4" />
                                          <span>View Profile</span>
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setEditingAthlete(athlete)}
                                        className="cursor-pointer gap-2"
                                      >
                                        <Pencil className="size-4" />
                                        <span>Edit Details</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleRegeneratePin(athlete)}
                                        className="cursor-pointer gap-2"
                                      >
                                        <RefreshCw className="size-4" />
                                        <span>
                                          {athlete.checkInPin ? "Regenerate PIN" : "Assign PIN"}
                                        </span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => handleToggleStatus(athlete)}
                                        className="cursor-pointer gap-2"
                                      >
                                        {athlete.status === "active" ? (
                                          <>
                                            <ShieldOff className="size-4 text-amber-600" />
                                            <span>Mark Inactive</span>
                                          </>
                                        ) : (
                                          <>
                                            <ShieldCheck className="size-4 text-emerald-600" />
                                            <span>Mark Active</span>
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialogs */}
      {canManage && (
        <>
          <AthleteFormDialog
            open={createOpen || editingAthlete !== null}
            onOpenChange={(open) => {
              if (!open) {
                setCreateOpen(false);
                setEditingAthlete(null);
              }
            }}
            athlete={editingAthlete ?? undefined}
          />
          <ImportAthletesDialog
            open={importOpen}
            onOpenChange={setImportOpen}
          />
        </>
      )}
    </div>
  );
}
