import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { Button } from "@/components/ui/button.tsx";
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
import {
  Form,
  FormControl,
  FormDescription,
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
import { localMockStore } from "@/lib/local-mock-store.ts";
import {
  CredentialsSuccessDialog,
  type GeneratedCredentials,
} from "@/components/auth/credentials-success-dialog.tsx";

const formSchema = z.object({
  academyId: z.string().optional(),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dateOfBirth: z.string(),
  gender: z.enum(["none", "male", "female", "other"]),
  sport: z.string(),
  heightCm: z.string(),
  weightKg: z.string(),
  email: z.string(),
  phone: z.string(),
  guardianName: z.string(),
  guardianPhone: z.string(),
  guardianEmail: z.union([z.literal(""), z.string().trim().email("Enter a valid email")]),
  notes: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const emptyValues: FormValues = {
  academyId: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "none",
  sport: "",
  heightCm: "",
  weightKg: "",
  email: "",
  phone: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
  notes: "",
};

function athleteToFormValues(athlete: Doc<"athletes">): FormValues {
  return {
    academyId: athlete.academyId ?? "",
    firstName: athlete.firstName,
    lastName: athlete.lastName,
    dateOfBirth: athlete.dateOfBirth ?? "",
    gender: athlete.gender ?? "none",
    sport: athlete.sport ?? "",
    heightCm: athlete.heightCm !== undefined ? String(athlete.heightCm) : "",
    weightKg: athlete.weightKg !== undefined ? String(athlete.weightKg) : "",
    email: athlete.email ?? "",
    phone: athlete.phone ?? "",
    guardianName: athlete.guardianName ?? "",
    guardianPhone: athlete.guardianPhone ?? "",
    guardianEmail: athlete.guardianEmail ?? "",
    notes: athlete.notes ?? "",
  };
}

export default function AthleteFormDialog({
  open,
  onOpenChange,
  athlete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athlete?: Doc<"athletes">;
}) {
  const { user } = useCurrentUser();
  const academies = useQuery(
    api.academies.listAcademies,
    user?.role === "platform_admin" ? {} : "skip",
  );
  const createAthlete = useMutation(api.athletes.createAthlete);
  const updateAthlete = useMutation(api.athletes.updateAthlete);
  const [submitting, setSubmitting] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<GeneratedCredentials | null>(null);
  const isEditing = athlete !== undefined;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: athlete
      ? athleteToFormValues(athlete)
      : { ...emptyValues, academyId: user?.academyId ?? "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        athlete
          ? athleteToFormValues(athlete)
          : { ...emptyValues, academyId: user?.academyId ?? "" },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, athlete, user?.academyId]);

  const handleSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const targetAcademyId = (values.academyId || user?.academyId || undefined) as Id<"academies"> | undefined;
      const payload = {
        academyId: targetAcademyId,
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth || undefined,
        gender: values.gender === "none" ? undefined : values.gender,
        sport: values.sport || undefined,
        heightCm: values.heightCm ? Number(values.heightCm) : undefined,
        weightKg: values.weightKg ? Number(values.weightKg) : undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        guardianName: values.guardianName || undefined,
        guardianPhone: values.guardianPhone || undefined,
        guardianEmail: values.guardianEmail || undefined,
        notes: values.notes || undefined,
      };
      if (isEditing) {
        await updateAthlete({ athleteId: athlete._id, ...payload });
        toast.success("Athlete updated");
        onOpenChange(false);
      } else {
        await createAthlete(payload);
        toast.success("Athlete added");

        if (values.email) {
          const provisionedPassword = localMockStore.takeProvisionedPassword(values.email);
          const targetAcademyObj = academies?.find((a: Doc<"academies">) => a._id === targetAcademyId);
          if (provisionedPassword) {
            setGeneratedCreds({
              name: `${values.firstName} ${values.lastName}`,
              email: values.email,
              password: provisionedPassword,
              role: "athlete",
              academyName: targetAcademyObj?.name,
            });
            return;
          }
        }
        onOpenChange(false);
      }
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to save athlete",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open && !generatedCreds} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit athlete" : "Add athlete"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this athlete's profile details."
              : "Create a new athlete profile in your academy."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            {user?.role === "platform_admin" && academies && academies.length > 0 && (
              <FormField
                control={form.control}
                name="academyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-primary" />
                      <span>Target Academy</span>
                    </FormLabel>
                    <Select
                      value={field.value || user?.academyId || ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose academy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {academies.map((a: Doc<"academies">) => (
                          <SelectItem key={a._id} value={a._id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Choose which academy workspace this athlete belongs to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jordan" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input placeholder="Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="sport"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sport</FormLabel>
                  <FormControl>
                    <Input placeholder="Soccer" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="heightCm"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (cm)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="175"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weightKg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (kg)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="68"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact email</FormLabel>
                    <FormControl>
                      <Input placeholder="athlete@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 555 010 0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="guardianName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guardian name</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guardianPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Guardian phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="guardianEmail"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Guardian email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Optional" {...field} />
                    </FormControl>
                    <FormDescription>
                      The guardian signs up with this email to follow this
                      athlete's schedule, fees and progress.
                    </FormDescription>
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
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Injury history, goals, or other context..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting && <Spinner className="size-4" />}
                {isEditing ? "Save changes" : "Add athlete"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      </Dialog>
      <CredentialsSuccessDialog
        open={Boolean(generatedCreds)}
        onOpenChange={(op) => {
          if (!op) {
            setGeneratedCreds(null);
            onOpenChange(false);
          }
        }}
        credentials={generatedCreds}
        onDone={() => {
          setGeneratedCreds(null);
          onOpenChange(false);
        }}
      />
    </>
  );
}
