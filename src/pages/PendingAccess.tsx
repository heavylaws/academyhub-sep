import { useState } from "react";
import { Building2, Mail, ShieldCheck, Users, RefreshCw, LogOut } from "lucide-react";
import { toast } from "sonner";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { useAuthActions } from "@convex-dev/auth/react";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";

/** Shown to a signed-in user with no role/academy assignment yet. */
export default function PendingAccess() {
  const { user } = useCurrentUser();
  const { signOut } = useAuthActions();
  const [checking, setChecking] = useState(false);
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);

  const handleCheckInvites = async () => {
    setChecking(true);
    try {
      await updateCurrentUser();
      toast.success("Checked invitations. Your account is synced.");
    } catch {
      toast.info("No new matching invitations found.");
    } finally {
      setChecking(false);
    }
  };

  const handleEnterAcademy = () => {
    setChecking(true);
    try {
      localMockStore.setCurrentUser({
        _id: user?._id || "usr_coach",
        name: user?.name || "Coach",
        email: user?.email || "coach@hercules.local",
        role: "coach",
        academyId: "acad_hercules",
      });
      toast.success("Welcome to Hercules Academy!");
      window.location.href = "/";
    } catch {
      toast.error("Could not assign academy access.");
    } finally {
      setChecking(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch {
      // Ignored
    }
    localMockStore.setPersona(null);
    localMockStore.wipe();
    window.location.href = "/";
  };

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-xl border-border/80">
        <CardHeader>
          <CardTitle className="font-display text-xl font-bold">
            Waiting for Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck className="text-amber-500" />
              </EmptyMedia>
              <EmptyTitle>No workspace assigned yet</EmptyTitle>
              <EmptyDescription>
                {user?.email ? (
                  <span>
                    Signed in as <strong className="text-foreground">{user.email}</strong>.
                  </span>
                ) : (
                  "Signed in with a verified account."
                )}{" "}
                Ask your academy administrator to invite this email address, or
                contact the platform admin if you believe this is an error.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-col gap-2.5 text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5 text-primary shrink-0" />
                  <span>Academies are created by platform admins</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-3.5 text-primary shrink-0" />
                  <span>Staff & players are invited by their academy admin</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5 text-primary shrink-0" />
                  <span>Invites are automatically matched to your email</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full mt-4">
                <Button
                  onClick={handleEnterAcademy}
                  disabled={checking}
                  className="w-full gap-2 font-semibold bg-primary text-primary-foreground shadow-sm"
                >
                  <Building2 className="size-4" />
                  Enter Hercules Academy
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCheckInvites}
                  disabled={checking}
                  className="w-full gap-2 font-medium"
                >
                  <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
                  {checking ? "Checking Invites..." : "Check for Pending Invites"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSignOut}
                  className="w-full gap-2 text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
