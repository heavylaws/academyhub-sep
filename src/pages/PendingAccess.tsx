import { Building2, Mail, ShieldCheck, Users } from "lucide-react";
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
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { SignInButton } from "@/components/ui/signin.tsx";

/** Shown to a signed-in user with no role/academy assignment yet. */
export default function PendingAccess() {
  const { user } = useCurrentUser();

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Waiting for access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck />
              </EmptyMedia>
              <EmptyTitle>No workspace assigned yet</EmptyTitle>
              <EmptyDescription>
                {user?.email ? `Signed in as ${user.email}. ` : ""}
                Ask your academy administrator to invite this email address, or
                contact the platform admin if you believe this is an error.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Building2 className="size-3.5" />
                  Academies are created by the platform admin
                </div>
                <div className="flex items-center gap-2">
                  <Users className="size-3.5" />
                  Staff are invited by their academy admin
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="size-3.5" />
                  Invites are matched by your sign-in email
                </div>
              </div>
              <SignInButton
                variant="secondary"
                signOutText="Sign out"
                signInText="Sign in"
              />
            </EmptyContent>
          </Empty>
        </CardContent>
      </Card>
    </div>
  );
}
