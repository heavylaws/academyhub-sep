import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

export default function ManageRosterDialog({
  open,
  onOpenChange,
  teamId,
  currentRoster,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamId: Id<"teams">;
  currentRoster: Doc<"athletes">[];
}) {
  const allAthletes = useQuery(api.athletes.listAthletes, open ? {} : "skip");
  const setTeamRoster = useMutation(api.teams.setTeamRoster);

  const [selected, setSelected] = useState<Set<Id<"athletes">>>(
    () => new Set(currentRoster.map((a) => a._id)),
  );
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastOpen, setLastOpen] = useState(open);

  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setSelected(new Set(currentRoster.map((a) => a._id)));
      setSearch("");
    }
  }

  const toggle = (athleteId: Id<"athletes">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(athleteId)) {
        next.delete(athleteId);
      } else {
        next.add(athleteId);
      }
      return next;
    });
  };

  const filtered = (allAthletes ?? []).filter((a) =>
    `${a.firstName} ${a.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await setTeamRoster({ teamId, athleteIds: Array.from(selected) });
      toast.success("Roster updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to update roster",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage roster</DialogTitle>
          <DialogDescription>
            Select which athletes belong to this team.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search athletes..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
          {allAthletes === undefined ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No athletes found.
            </p>
          ) : (
            filtered.map((athlete) => (
              <label
                key={athlete._id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-accent"
              >
                <Checkbox
                  checked={selected.has(athlete._id)}
                  onCheckedChange={() => toggle(athlete._id)}
                />
                <span className="text-sm font-medium">
                  {athlete.firstName} {athlete.lastName}
                </span>
                {athlete.sport && (
                  <span className="text-xs text-muted-foreground">
                    {athlete.sport}
                  </span>
                )}
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={submitting}>
            {submitting && <Spinner className="size-4" />}
            Save roster
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
