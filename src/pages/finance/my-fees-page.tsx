import { useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  MinusCircle,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

type FeeStatus = "unpaid" | "partially_paid" | "paid" | "overdue" | "waived";

const STATUS_CONFIG: Record<
  FeeStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    className: string;
  }
> = {
  unpaid: {
    label: "Unpaid",
    icon: Clock,
    className: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  },
  partially_paid: {
    label: "Partially Paid",
    icon: Clock,
    className: "bg-blue-500/15 text-blue-500 border-blue-500/30",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle2,
    className: "bg-secondary text-secondary-foreground border-transparent",
  },
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    className: "bg-destructive/10 text-destructive border-destructive/30",
  },
  waived: {
    label: "Waived",
    icon: MinusCircle,
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

export default function MyFeesPage() {
  const { user } = useCurrentUser();

  const { isAuthenticated } = useConvexAuth();
  // athlete: use their own athleteId from profile; for others, use param
  const { athleteId } = useParams<{ athleteId?: string }>();
  const myAthletes = useQuery(
    api.athletes.listMyAthletes,
    isAuthenticated && (user?.role === "athlete" || user?.role === "guardian") ? {} : "skip",
  );
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>();

  const resolvedAthleteId =
    (athleteId as Id<"athletes"> | undefined) ??
    (myAthletes?.find((a) => a._id === selectedAthleteId) ?? myAthletes?.[0])
      ?._id;

  const fees = useQuery(
    api.fees.listFeesForAthlete,
    isAuthenticated && resolvedAthleteId ? { athleteId: resolvedAthleteId } : "skip",
  );

  if (!athleteId && myAthletes && myAthletes.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          My Fees
        </h1>
        <p className="text-muted-foreground">
          No athlete record is linked to your account yet. Ask your academy
          admin to link it.
        </p>
      </div>
    );
  }

  if (fees === undefined || resolvedAthleteId === undefined) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const unpaidTotal = fees
    .filter(
      (f) =>
        f.status === "unpaid" ||
        f.status === "overdue" ||
        f.status === "partially_paid",
    )
    .reduce((sum, f) => sum + (f.remainingBalance ?? f.amountDue), 0);
  const currency = fees[0]?.currency ?? "USD";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          My Fees
        </h1>
        <p className="text-muted-foreground">
          Your current and past membership fee records.
        </p>
        {!athleteId && myAthletes && myAthletes.length > 1 && (
          <select
            className="mt-3 rounded-md border bg-background px-3 py-2 text-sm"
            value={resolvedAthleteId}
            onChange={(e) => setSelectedAthleteId(e.target.value)}
            aria-label="Athlete"
          >
            {myAthletes.map((a) => (
              <option key={a._id} value={a._id}>
                {a.firstName} {a.lastName}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Outstanding balance banner */}
      {unpaidTotal > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <AlertTriangle className="size-5 text-destructive shrink-0" />
          <div>
            <p className="font-semibold text-destructive">
              Outstanding balance
            </p>
            <p className="text-sm text-destructive/80">
              You have {currency} {unpaidTotal.toFixed(2)} in unpaid or overdue
              fees. Please contact your academy admin.
            </p>
          </div>
        </div>
      )}

      {fees.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DollarSign />
            </EmptyMedia>
            <EmptyTitle>No fees on record</EmptyTitle>
            <EmptyDescription>
              You don't have any fee records yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-3">
          {fees.map((fee) => {
            const cfg = STATUS_CONFIG[fee.status as FeeStatus];
            const Icon = cfg.icon;
            return (
              <Card key={fee._id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{fee.label}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Due: {fee.dueDate}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="font-display text-xl font-bold">
                        {fee.currency} {fee.amountDue.toFixed(2)}
                      </span>
                      {fee.status === "partially_paid" &&
                        fee.remainingBalance !== undefined && (
                          <span className="text-xs text-muted-foreground">
                            ({fee.currency} {fee.remainingBalance.toFixed(2)}{" "}
                            remaining)
                          </span>
                        )}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          cfg.className,
                        )}
                      >
                        <Icon className="size-3" />
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                {(fee.notes || fee.payments.length > 0) && (
                  <CardContent className="flex flex-col gap-3 pt-0">
                    {fee.notes && (
                      <p className="text-sm text-muted-foreground italic">
                        "{fee.notes}"
                      </p>
                    )}
                    {fee.payments.length > 0 && (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-medium text-muted-foreground">
                          Payment history
                        </p>
                        {fee.payments.map((p) => (
                          <div
                            key={p._id}
                            className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {fee.currency} {p.amountPaid.toFixed(2)}
                                {p.method ? ` · ${p.method}` : ""}
                              </span>
                              {p.note && (
                                <span className="text-xs text-muted-foreground">
                                  {p.note}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {p.paidOn}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
