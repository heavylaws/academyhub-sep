import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form.tsx";
import { Spinner } from "@/components/ui/spinner.tsx";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { firebaseAuthService } from "@/services/firebase-auth-service.ts";
import {
  CredentialsSuccessDialog,
  type GeneratedCredentials,
} from "@/components/auth/credentials-success-dialog.tsx";

const formSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export default function InviteAcademyAdminDialog({
  academy,
  onOpenChange,
}: {
  academy: { id: Id<"academies">; name: string } | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createInvite = useMutation(api.invites.createInvite);
  const [submitting, setSubmitting] = useState(false);
  const [generatedCreds, setGeneratedCreds] = useState<GeneratedCredentials | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!academy) return;
    setSubmitting(true);
    try {
      await createInvite({
        academyId: academy.id,
        email: values.email,
        role: "academy_admin",
      });

      try {
        await firebaseAuthService.createInvite(academy.id, values.email, "academy_admin");
      } catch (fsErr) {
        console.warn("Firestore invite sync notice:", fsErr);
      }

      const generatedPassword = localMockStore.takeProvisionedPassword(values.email);
      form.reset();
      if (!generatedPassword) {
        toast.success(`Invite sent to ${values.email}`);
        onOpenChange(false);
        return;
      }

      setGeneratedCreds({
        email: values.email,
        password: generatedPassword,
        role: "academy_admin",
        academyName: academy.name,
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
        open={academy !== null && !generatedCreds}
        onOpenChange={(next) => {
          if (!next) form.reset();
          onOpenChange(next);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite academy admin</DialogTitle>
            <DialogDescription>
              {academy
                ? `Invite someone to manage ${academy.name}. A secure temporary password will be generated automatically for their account.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
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
        onOpenChange={(open) => {
          if (!open) {
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
