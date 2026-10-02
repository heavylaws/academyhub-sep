import { useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Search, Users } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import type { UserRole } from "@/hooks/use-current-user.ts";

const ROLE_LABEL: Record<UserRole, string> = {
  platform_admin: "Super admin",
  academy_admin: "Academy manager",
  coach: "Coach",
  accounting: "Accounting",
  athlete: "Athlete",
  guardian: "Parent / Guardian",
};

const ALL = "all";
const NO_ACADEMY = "none";

export default function AllUsers() {
  const { isAuthenticated } = useConvexAuth();
  const users = useQuery(api.users.listAllUsers, isAuthenticated ? {} : "skip");
  const academies = useQuery(api.academies.listAcademies, isAuthenticated ? {} : "skip");
  const setActiveAcademy = useMutation(api.academies.setActiveAcademy);
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>(ALL);
  const [academy, setAcademy] = useState<string>(ALL);

  const filtered = useMemo(() => {
    if (!users) return undefined;
    const term = search.trim().toLowerCase();
    return users
      .filter((u) => role === ALL || (u.role ?? "none") === role)
      .filter((u) =>
        academy === ALL
          ? true
          : academy === NO_ACADEMY
            ? !u.academyName
            : u.academyName !== undefined && u.academyId === academy,
      )
      .filter(
        (u) =>
          !term ||
          (u.name ?? "").toLowerCase().includes(term) ||
          (u.email ?? "").toLowerCase().includes(term),
      )
      .sort((a, b) =>
        (a.academyName ?? "").localeCompare(b.academyName ?? "") ||
        (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""),
      );
  }, [users, search, role, academy]);

  const openAcademy = async (academyId: Id<"academies">, name: string) => {
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

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          All users
        </h1>
        <p className="text-muted-foreground">
          Every account on the platform, across all academies.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3">
          <CardTitle className="text-base">
            {filtered ? `${filtered.length} users` : "Users"}
          </CardTitle>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email"
                className="pl-8"
              />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="sm:w-44" aria-label="Filter by role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All roles</SelectItem>
                {(Object.keys(ROLE_LABEL) as UserRole[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </SelectItem>
                ))}
                <SelectItem value="none">No role yet</SelectItem>
              </SelectContent>
            </Select>
            <Select value={academy} onValueChange={setAcademy}>
              <SelectTrigger className="sm:w-56" aria-label="Filter by academy">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All academies</SelectItem>
                {academies?.map((a: Doc<"academies">) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
                <SelectItem value={NO_ACADEMY}>No academy</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered === undefined ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>No users found</EmptyTitle>
                <EmptyDescription>
                  Try a different search or filter.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Academy</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {u.name ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {u.email}
                          {!u.emailVerified && " · not verified"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.role ? (
                        <Badge variant="secondary">
                          {ROLE_LABEL[u.role as UserRole]}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No role yet
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.academyId && u.academyName ? (
                        <Button
                          variant="link"
                          className="h-auto p-0"
                          onClick={() =>
                            openAcademy(u.academyId!, u.academyName!)
                          }
                        >
                          {u.academyName}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
