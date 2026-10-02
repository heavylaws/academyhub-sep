import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { Building2 } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
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
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { isLocalDev } from "@/lib/env.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { firebaseAuthService } from "@/services/firebase-auth-service.ts";
import {
  CredentialsSuccessDialog,
  type GeneratedCredentials,
} from "@/components/auth/credentials-success-dialog.tsx";

const formSchema = z.object({
  academyId: z.string().optional(),
  email: z.string().trim().email("Enter a valid email address"),
  role: z.enum(["academy_admin", "coach", "athlete", "accounting", "guardian"]),
});

export default function InviteStaffDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useCurrentUser();
  const { isAuthenticated } = useConvexAuth();
  const academies = useQuery(
    api.academies.listAcademies,
    isAuthenticated && user?.role === "platform_admin" ? {} : "skip",
  );
  const createInvite = useMutation(api.invites.createInvite);
  const [submitting, setSubmitting] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<GeneratedCredentials | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { academyId: user?.academyId ?? "", email: "", role: "coach" },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    const targetAcademyId = (values.academyId || user?.academyId) as Id<"academies"> | undefined;
    if (!targetAcademyId) {
      toast.error("Please select an academy");
      return;
    }
    setSubmitting(true);
    try {
      await createInvite({
        academyId: targetAcademyId,
        email: values.email,
        role: values.role as "academy_admin" | "coach" | "athlete" | "accounting",
      });

      try {
        await firebaseAuthService.createInvite(targetAcademyId, values.email, values.role);
      } catch (fsErr) {
        console.warn("Firestore invite sync notice:", fsErr);
      }

      const targetAcademyObj = academies?.find((a: Doc<"academies">) => a._id === targetAcademyId);
      const generatedPassword = localMockStore.takeProvisionedPassword(values.email);
      if (generatedPassword) {
        await firebaseAuthService.provisionUserAccount(values.email, generatedPassword);
      }
      form.reset({ academyId: user?.academyId ?? "", email: "", role: "coach" });
      if (!generatedPassword) {
        toast.success(`Invite sent to ${values.email}`);
        onOpenChange(false);
        return;
      }

      setGeneratedCreds({
        email: values.email,
        password: generatedPassword,
        role: values.role,
        academyName: targetAcademyObj?.name,
      });
    } catch (error) {
      toast.error(
        error instanceof ConvexError
          ? String((error.data as { message?: string }).message)
          : "Failed to send invite",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        open={open && !generatedCreds}
        onOpenChange={(next) => {
          if (!next) form.reset({ academyId: user?.academyId ?? "", email: "", role: "coach" });
          onOpenChange(next);
        }}
      >
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite staff / admin</DialogTitle>
            <DialogDescription>
              Invite an academy admin, coach, athlete, or accountant to join an academy workspace.
              A secure login password will be generated automatically and displayed for easy sharing.
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
                      Choose which academy workspace this staff or admin belongs to.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input placeholder="coach@example.com" className="h-10 sm:h-9" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full h-10 sm:h-9">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {user?.role === "platform_admin" && (
                        <SelectItem value="academy_admin">
                          Academy Admin
                        </SelectItem>
                      )}
                      <SelectItem value="coach">Coach</SelectItem>
                      <SelectItem value="athlete">Athlete</SelectItem>
                      <SelectItem value="accounting">Accounting</SelectItem>
                      <SelectItem value="guardian">Parent / Guardian</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="h-10 sm:h-9 w-full sm:w-auto">
                {submitting && <Spinner className="size-4" />}
                Generate Credentials & Invite
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
