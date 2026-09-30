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
import { useFirebaseAuth } from "@/components/providers/auth-context.ts";

/** Shown to a signed-in user with no role/academy assignment yet. */
export default function PendingAccess() {
  const { user } = useCurrentUser();
  const { refreshMembership, signOut } = useFirebaseAuth();
  const [checking, setChecking] = useState(false);

  const handleCheckInvites = async () => {
    setChecking(true);
    try {
      await refreshMembership();
      toast.info("Checked for pending invitations.");
    } catch {
      toast.error("Could not refresh invitations at this time.");
    } finally {
      setChecking(false);
    }
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
                  onClick={handleCheckInvites}
                  disabled={checking}
                  className="w-full gap-2 font-semibold"
                >
                  <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} />
                  {checking ? "Checking Invites..." : "Check for Pending Invites"}
                </Button>

                <Button
                  variant="outline"
                  onClick={signOut}
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
