import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Users, Plus, Search, Upload, KeyRound } from "lucide-react";
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

  const [searchInput, setSearchInput] = useState("");
  const [search] = useDebounce(searchInput, 300);
  const athletes = useQuery(api.athletes.listAthletes, {
    search: search || undefined,
  });
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
              ? "Manage athlete profiles for your academy."
              : "Your athlete profile."}
          </p>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Import CSV
            </Button>
            <Button variant="secondary" onClick={handleGeneratePins}>
              <KeyRound className="size-4" />
              Assign missing PINs
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Add athlete
            </Button>
          </div>
        )}
      </div>

      {canManage && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search athletes by name..."
            className="pl-9"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
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
            <div className="overflow-x-auto">
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
          )}
        </CardContent>
      </Card>

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
