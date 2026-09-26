import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

/**
 * Platform admin only: picks the academy that the academy pages (athletes,
 * teams, fees, ...) show and manage.
 */
export function AcademySwitcher({
  currentAcademyId,
}: {
  currentAcademyId: Id<"academies"> | undefined;
}) {
  const academies = useQuery(api.academies.listAcademies, {});
  const setActiveAcademy = useMutation(api.academies.setActiveAcademy);

  if (!academies || academies.length === 0) return null;

  const handleChange = async (value: string) => {
    const academy = academies.find((a: Doc<"academies">) => a._id === value);
    try {
      await setActiveAcademy({ academyId: value as Id<"academies"> });
      toast.success(`Now working in "${academy?.name ?? "academy"}"`);
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to switch academy",
      );
    }
  };

  return (
    <Select value={currentAcademyId ?? ""} onValueChange={handleChange}>
      <SelectTrigger
        size="sm"
        className="h-8 max-w-[14rem] gap-1.5"
        aria-label="Academy you are working in"
      >
        <Building2 className="size-3.5 shrink-0 text-muted-foreground" />
        <SelectValue placeholder="Choose an academy" />
      </SelectTrigger>
      <SelectContent>
        {academies.map((academy: Doc<"academies">) => (
          <SelectItem key={academy._id} value={academy._id}>
            {academy.name}
            {academy.status === "suspended" ? " (suspended)" : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
