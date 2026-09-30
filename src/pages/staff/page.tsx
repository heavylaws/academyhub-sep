import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import {
  Mail,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  Trash2,
  UserRound,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { firebaseAuthService } from "@/services/firebase-auth-service.ts";
import InviteStaffDialog from "./_components/invite-staff-dialog.tsx";

const ROLE_LABEL: Record<string, string> = {
  academy_admin: "Academy Admin",
  coach: "Coach",
  accounting: "Accounting",
  athlete: "Athlete",
  guardian: "Parent / Guardian",
};

export default function Staff() {
  const { user } = useCurrentUser();
  const isAdmin =
    user?.role === "academy_admin" || user?.role === "platform_admin";

  const members = useQuery(api.users.listAcademyMembers, {});
  const invites = useQuery(api.invites.listInvites, isAdmin ? {} : "skip");
  const cancelInvite = useMutation(api.invites.cancelInvite);
  const updateRole = useMutation(api.users.updateMemberRole);
  const removeMember = useMutation(api.users.removeAcademyMember);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Doc<"users"> | null>(
    null,
  );
  const [targetRole, setTargetRole] = useState<
    "academy_admin" | "coach" | "accounting" | "athlete" | "guardian"
  >("coach");
  const [editRoleOpen, setEditRoleOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pendingInvites = invites?.filter((i) => i.status === "pending") ?? [];

  // An academy_admin can never touch another academy_admin.
  const canManageMember = (targetMember: Doc<"users">) => {
    if (!isAdmin || targetMember._id === user?._id) return false;
    if (user?.role === "platform_admin") return true;
    if (user?.role === "academy_admin" && targetMember.role === "academy_admin") return false;
    return true;
  };

  const handleCancelInvite = async (inviteId: Id<"invites">) => {
    try {
      await cancelInvite({ inviteId });
      toast.success("Invite cancelled");
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to cancel invite",
      );
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;
    setIsSubmitting(true);
    try {
      await updateRole({
        targetUserId: selectedMember._id,
        newRole: targetRole as "academy_admin" | "coach" | "accounting" | "athlete",
      });

      if (user?.academyId && selectedMember._id) {
        try {
          await firebaseAuthService.updateMember(user.academyId, selectedMember._id, { role: targetRole });
        } catch (fsErr) {
          console.warn("Firestore member update notice:", fsErr);
        }
      }

      toast.success("Role updated successfully");
      setEditRoleOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to update role",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedMember) return;
    setIsSubmitting(true);
    try {
      await removeMember({ targetUserId: selectedMember._id });

      if (user?.academyId && selectedMember._id) {
        try {
          await firebaseAuthService.deleteMember(user.academyId, selectedMember._id);
        } catch (fsErr) {
          console.warn("Firestore member delete notice:", fsErr);
        }
      }

      toast.success("Member removed from academy");
      setRemoveOpen(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to remove member",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Staff
          </h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Invite and manage the coaches and athletes in your academy."
              : "Everyone in your academy."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setInviteOpen(true)} className="h-10 sm:h-9">
            <UserPlus className="size-4" />
            Invite staff
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {members === undefined ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>No members yet</EmptyTitle>
                <EmptyDescription>
                  {isAdmin
                    ? "Invite your first coach or athlete to get started."
                    : "Your academy has no other members yet."}
                </EmptyDescription>
              </EmptyHeader>
              {isAdmin && (
                <EmptyContent>
                  <Button size="sm" onClick={() => setInviteOpen(true)} className="h-10 sm:h-9">
                    <UserPlus className="size-4" />
                    Invite staff
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          ) : (
            <>
              {/* Mobile View: High-ergonomics cards */}
              <div className="flex flex-col gap-3 sm:hidden">
                {members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between rounded-xl border border-border/80 bg-background/60 p-3.5 shadow-xs gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-full bg-secondary flex items-center justify-center font-bold text-xs shrink-0 border">
                        {(member.name ? member.name.slice(0, 2) : member.email?.slice(0, 2) ?? "U").toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm text-foreground truncate">
                            {member.name ?? "—"}
                          </p>
                          {member._id === user?._id && (
                            <span className="text-[10px] text-muted-foreground font-normal">
                              (You)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {member.email ?? "—"}
                        </p>
                        <div className="mt-1">
                          <Badge variant="secondary" className="gap-1 text-[10px] py-0 px-1.5">
                            {member.role === "academy_admin" ? (
                              <ShieldCheck className="size-2.5" />
                            ) : (
                              <UserRound className="size-2.5" />
                            )}
                            {member.role ? ROLE_LABEL[member.role] : "Unassigned"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {canManageMember(member) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-9 shrink-0"
                            aria-label="Member options"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedMember(member);
                              setEditRoleOpen(true);
                            }}
                          >
                            <Pencil className="size-4 mr-2" />
                            Change role
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedMember(member);
                              setRemoveOpen(true);
                            }}
                          >
                            <Trash2 className="size-4 mr-2" />
                            Remove from academy
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>

              {/* Tablet & Desktop View: Standard Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      {isAdmin && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member._id}>
                        <TableCell className="font-medium">
                          {member.name ?? "—"}
                          {member._id === user?._id && (
                            <span className="ml-2 text-xs text-muted-foreground font-normal">
                              (You)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.email ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
                            {member.role === "academy_admin" ? (
                              <ShieldCheck className="size-2.5" />
                            ) : (
                              <UserRound className="size-2.5" />
                            )}
                            {member.role ? ROLE_LABEL[member.role] : "Unassigned"}
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="text-right">
                            {canManageMember(member) && (
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
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setEditRoleOpen(true);
                                    }}
                                  >
                                    <Pencil className="size-4 mr-2" />
                                    Change role
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setRemoveOpen(true);
                                    }}
                                  >
                                    <Trash2 className="size-4 mr-2" />
                                    Remove from academy
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invites</CardTitle>
          </CardHeader>
          <CardContent>
            {invites === undefined ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : pendingInvites.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Mail />
                  </EmptyMedia>
                  <EmptyTitle>No pending invites</EmptyTitle>
                  <EmptyDescription>
                    Invites you send will appear here until they're accepted.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <>
                {/* Mobile View: High-ergonomics pending invite cards */}
                <div className="flex flex-col gap-3 p-3 sm:hidden">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite._id}
                      className="flex items-center justify-between rounded-xl border border-border/80 bg-background/60 p-3.5 shadow-xs gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {invite.email}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {ROLE_LABEL[invite.role]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(invite.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 px-2.5 text-xs text-muted-foreground hover:text-destructive gap-1 shrink-0"
                        onClick={() => handleCancelInvite(invite._id)}
                      >
                        <X className="size-4" />
                        <span>Cancel</span>
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Tablet & Desktop View: Standard Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingInvites.map((invite) => (
                        <TableRow key={invite._id}>
                          <TableCell className="font-medium">
                            {invite.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {ROLE_LABEL[invite.role]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(invite.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
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
                                  onClick={() => handleCancelInvite(invite._id)}
                                >
                                  <X className="size-4" />
                                  Cancel invite
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <InviteStaffDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      )}

      {/* Change Role Dialog */}
      <Dialog
        open={editRoleOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null);
          setEditRoleOpen(open);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Change Member Role</DialogTitle>
            <DialogDescription>
              Update permissions for{" "}
              <strong>{selectedMember?.name ?? selectedMember?.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <label className="text-sm font-medium">Select new role</label>
            <Select
              value={targetRole}
              onValueChange={(val) =>
                setTargetRole(
                  val as "academy_admin" | "coach" | "accounting" | "athlete",
                )
              }
            >
              <SelectTrigger className="h-10 sm:h-9">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {user?.role === "platform_admin" && (
                  <SelectItem value="academy_admin">Academy Admin</SelectItem>
                )}
                <SelectItem value="coach">Coach</SelectItem>
                <SelectItem value="accounting">Accounting</SelectItem>
                <SelectItem value="athlete">Athlete</SelectItem>
                <SelectItem value="guardian">Parent / Guardian</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setEditRoleOpen(false)}
              disabled={isSubmitting}
              className="h-10 sm:h-9"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateRole} disabled={isSubmitting} className="h-10 sm:h-9">
              {isSubmitting ? "Updating..." : "Save Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Member Dialog */}
      <AlertDialog
        open={removeOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedMember(null);
          setRemoveOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>{selectedMember?.name ?? selectedMember?.email}</strong>{" "}
              from this academy? They will lose access to all academy data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
