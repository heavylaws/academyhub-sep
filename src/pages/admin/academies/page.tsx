import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  Building2,
  MoreHorizontal,
  Plus,
  ShieldOff,
  ShieldCheck as ShieldCheckIcon,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import CreateAcademyDialog from "./_components/create-academy-dialog.tsx";
import InviteAcademyAdminDialog from "./_components/invite-academy-admin-dialog.tsx";

export default function Academies() {
  const academies = useQuery(api.academies.platformOverview, {});
  const navigate = useNavigate();
  const setStatus = useMutation(api.academies.setAcademyStatus);
  const deleteAcademy = useMutation(api.academies.deleteAcademy);
  const setActiveAcademy = useMutation(api.academies.setActiveAcademy);
  const { user } = useCurrentUser();
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteAcademy, setInviteAcademy] = useState<{
    id: Id<"academies">;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: Id<"academies">;
    name: string;
  } | null>(null);

  const handleToggleStatus = async (
    academyId: Id<"academies">,
    nextStatus: "active" | "suspended",
  ) => {
    try {
      await setStatus({ academyId, status: nextStatus });
      toast.success(
        nextStatus === "suspended"
          ? "Academy suspended"
          : "Academy reactivated",
      );
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to update academy",
      );
    }
  };

  const handleSetActive = async (academyId: Id<"academies">, name: string) => {
    try {
      await setActiveAcademy({ academyId });
      toast.success(`Now working in "${name}"`);
      navigate("/athletes");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to switch academy",
      );
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAcademy({ academyId: deleteTarget.id });
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to delete academy",
      );
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Academies
          </h1>
          <p className="text-muted-foreground">
            Create and manage every academy workspace on the platform.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          New academy
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All academies</CardTitle>
        </CardHeader>
        <CardContent>
          {academies === undefined ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : academies.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Building2 />
                </EmptyMedia>
                <EmptyTitle>No academies yet</EmptyTitle>
                <EmptyDescription>
                  Create the first academy workspace to get started.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  New academy
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Academy</TableHead>
                  <TableHead className="text-right">Athletes</TableHead>
                  <TableHead className="text-right">Managers</TableHead>
                  <TableHead className="text-right">Coaches</TableHead>
                  <TableHead className="text-right">Parents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {academies.map((academy) => (
                  <TableRow key={academy._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {academy.name}
                          {user?.academyId === academy._id && (
                            <Badge variant="outline" className="ml-2">
                              Working in
                            </Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {academy.slug}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {academy.activeAthletes}
                      {academy.totalAthletes > academy.activeAthletes && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          / {academy.totalAthletes}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {academy.managers}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {academy.coaches}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {academy.guardians}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          academy.status === "active"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {academy.status === "active" ? "Active" : "Suspended"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(academy.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          user?.academyId === academy._id
                            ? navigate("/athletes")
                            : handleSetActive(academy._id, academy.name)
                        }
                      >
                        Open
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={user?.academyId === academy._id}
                            onClick={() =>
                              handleSetActive(academy._id, academy.name)
                            }
                          >
                            Work in this academy
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              setInviteAcademy({
                                id: academy._id,
                                name: academy.name,
                              })
                            }
                          >
                            Invite academy admin
                          </DropdownMenuItem>
                          {academy.status === "active" ? (
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleStatus(academy._id, "suspended")
                              }
                            >
                              <ShieldOff className="size-4" />
                              Suspend academy
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleStatus(academy._id, "active")
                              }
                            >
                              <ShieldCheckIcon className="size-4" />
                              Reactivate academy
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() =>
                              setDeleteTarget({
                                id: academy._id,
                                name: academy.name,
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                            Delete academy
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateAcademyDialog open={createOpen} onOpenChange={setCreateOpen} />
      <InviteAcademyAdminDialog
        academy={inviteAcademy}
        onOpenChange={(open) => {
          if (!open) setInviteAcademy(null);
        }}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the academy and all its data — athletes,
              teams, sessions, training plans, and staff accounts. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete academy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
