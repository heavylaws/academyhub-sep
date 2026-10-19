import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Building2, Plus, ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Pencil } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";

const facilityFormSchema = z.object({
  name: z.string().trim().min(1, "Facility name is required"),
  type: z.enum(["pitch", "court", "gym", "pool", "classroom", "other"]),
  surfaceType: z.string().optional(),
  capacity: z.string().optional(),
  status: z.enum(["available", "maintenance", "closed"]),
  notes: z.string().optional(),
});

type FacilityFormData = z.infer<typeof facilityFormSchema>;

export function FacilityManagementDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const facilities = useQuery(api.facilities.listFacilities, open ? {} : "skip");
  const createFacility = useMutation(api.facilities.createFacility);
  const updateFacility = useMutation(api.facilities.updateFacility);

  const [editingFacility, setEditingFacility] = useState<Doc<"facilities"> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const form = useForm<FacilityFormData>({
    resolver: zodResolver(facilityFormSchema),
    defaultValues: {
      name: "",
      type: "pitch",
      surfaceType: "",
      capacity: "",
      status: "available",
      notes: "",
    },
  });

  const startCreate = () => {
    setEditingFacility(null);
    setIsAddingNew(true);
    form.reset({
      name: "",
      type: "pitch",
      surfaceType: "",
      capacity: "",
      status: "available",
      notes: "",
    });
  };

  const startEdit = (fac: Doc<"facilities">) => {
    setEditingFacility(fac);
    setIsAddingNew(false);
    form.reset({
      name: fac.name,
      type: fac.type,
      surfaceType: fac.surfaceType ?? "",
      capacity: fac.capacity !== undefined ? String(fac.capacity) : "",
      status: fac.status,
      notes: fac.notes ?? "",
    });
  };

  const cancelEdit = () => {
    setEditingFacility(null);
    setIsAddingNew(false);
    form.reset();
  };

  const handleSubmit = async (values: FacilityFormData) => {
    setSubmitting(true);
    try {
      if (editingFacility) {
        await updateFacility({
          facilityId: editingFacility._id,
          name: values.name,
          type: values.type,
          surfaceType: values.surfaceType || undefined,
          capacity: values.capacity ? Number(values.capacity) : undefined,
          status: values.status,
          notes: values.notes || undefined,
        });
        toast.success(`Facility "${values.name}" updated`);
        cancelEdit();
      } else {
        await createFacility({
          name: values.name,
          type: values.type,
          surfaceType: values.surfaceType || undefined,
          capacity: values.capacity ? Number(values.capacity) : undefined,
          status: values.status,
          notes: values.notes || undefined,
        });
        toast.success(`Facility "${values.name}" created`);
        cancelEdit();
      }
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to save facility",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="size-5 text-primary" />
            <DialogTitle>Facility & Pitch Management</DialogTitle>
          </div>
          <DialogDescription>
            Configure academy pitches, training gyms, and courts with conflict prevention.
          </DialogDescription>
        </DialogHeader>

        {/* Existing facilities list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Academy Facilities ({facilities?.length ?? 0})
            </h3>
            {!isAddingNew && !editingFacility && (
              <Button size="sm" onClick={startCreate} className="h-8 gap-1.5 text-xs font-semibold">
                <Plus className="size-3.5" />
                Add Facility
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto p-1">
            {facilities?.map((fac) => (
              <div
                key={fac._id}
                className="border rounded-lg p-3 flex flex-col justify-between gap-2 bg-card hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-semibold text-sm line-clamp-1">{fac.name}</span>
                    <div className="text-xs text-muted-foreground capitalize flex items-center gap-1.5 mt-0.5">
                      <span>{fac.type}</span>
                      {fac.surfaceType && <span>• {fac.surfaceType}</span>}
                    </div>
                  </div>
                  <Badge
                    variant={
                      fac.status === "available"
                        ? "default"
                        : fac.status === "maintenance"
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-[10px] uppercase font-bold shrink-0"
                  >
                    {fac.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2 mt-1">
                  <span>{fac.capacity ? `Cap: ${fac.capacity}` : "No capacity limit"}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1 text-primary hover:text-primary"
                    onClick={() => startEdit(fac)}
                  >
                    <Pencil className="size-3" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Form for Create / Edit */}
          {(isAddingNew || editingFacility) && (
            <div className="border rounded-xl p-4 bg-muted/20 border-primary/30 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-primary">
                  {editingFacility ? `Edit "${editingFacility.name}"` : "Add New Facility"}
                </h4>
                <Button variant="ghost" size="sm" onClick={cancelEdit} className="h-7 text-xs">
                  Cancel
                </Button>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Main Grass Pitch 1" className="h-9 text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pitch">Pitch / Field</SelectItem>
                              <SelectItem value="court">Court (Indoor/Outdoor)</SelectItem>
                              <SelectItem value="gym">Gym / S&C Center</SelectItem>
                              <SelectItem value="pool">Hydrotherapy Pool</SelectItem>
                              <SelectItem value="classroom">Classroom / Tactical Room</SelectItem>
                              <SelectItem value="other">Other Space</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operational Status</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className="h-9 text-sm">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="available">Available for Bookings</SelectItem>
                              <SelectItem value="maintenance">Under Maintenance (Blocked)</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="surfaceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Surface Type (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Natural Grass, 4G Turf, Hardwood" className="h-9 text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Capacity (Athletes / Spectators)</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} placeholder="e.g. 100" className="h-9 text-sm" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes / Access Instructions</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Lighting, gate access, maintenance schedule..." className="min-h-[60px] text-sm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="sm" onClick={cancelEdit}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={submitting} className="font-semibold">
                      {submitting && <Spinner className="size-3.5" />}
                      {editingFacility ? "Save Changes" : "Create Facility"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
