import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { StatCard } from "./shared/stat-card.tsx";

export type AccountingData = {
  role: "accounting";
  totalInvoiced: number;
  totalPaidRevenue: number;
  totalOverdueBalance: number;
  paidInvoiceCount: number;
  totalInvoiceCount: number;
  overdueFeeCount: number;
  currency: string;
  recentInvoices: Array<{
    _id: string;
    invoiceNumber: string;
    description: string;
    amount: number;
    currency: string;
    dueDate: string;
    status: string;
    athleteName: string;
  }>;
  recentOverdueFees: Array<{
    _id: string;
    label: string;
    amountDue: number;
    remainingBalance: number;
    dueDate: string;
    status: string;
    athleteName: string;
    athleteId: string;
  }>;
};

export function AccountingDashboard({ data }: { data: AccountingData }) {
  const currency = data.currency || "USD";
  const formatMoney = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <div className="flex flex-col gap-6">
      {/* Quick Actions & Overview Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CreditCard className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Finance & Billing Command Center
            </p>
            <p className="text-base font-bold text-foreground">
              Collections, invoices, and athlete fee tracking
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" asChild>
            <Link to="/invoices">
              <FileText className="size-3.5 mr-1.5" />
              All Invoices
            </Link>
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link to="/finance">
              <DollarSign className="size-3.5" />
              Fee Management
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total invoiced"
          value={formatMoney(data.totalInvoiced)}
          icon={Receipt}
          to="/invoices"
        />
        <StatCard
          label="Collected revenue"
          value={formatMoney(data.totalPaidRevenue)}
          icon={DollarSign}
          to="/finance"
        />
        <StatCard
          label="Outstanding balance"
          value={formatMoney(data.totalOverdueBalance)}
          icon={AlertTriangle}
          to="/finance"
        />
        <StatCard
          label="Paid invoices"
          value={`${data.paidInvoiceCount} / ${data.totalInvoiceCount}`}
          icon={CheckCircle2}
          to="/invoices"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                Recent Invoices
              </CardTitle>
              <Link
                to="/invoices"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                View all
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentInvoices.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Receipt />
                  </EmptyMedia>
                  <EmptyTitle>No invoices generated</EmptyTitle>
                  <EmptyDescription>
                    Invoices created for academy athletes will appear here.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {data.recentInvoices.map((inv) => (
                  <Link
                    key={inv._id}
                    to="/invoices"
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/30"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold truncate">
                        {inv.invoiceNumber} — {inv.athleteName}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {inv.description || "Academy Program Fee"}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono text-sm font-bold">
                        {formatMoney(inv.amount)}
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-semibold uppercase px-1.5 py-0",
                          inv.status === "paid"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : inv.status === "overdue"
                              ? "bg-destructive/10 text-destructive border border-destructive/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                        )}
                      >
                        {inv.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue / Outstanding Fees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="size-4 text-amber-500" />
                Overdue & Pending Fees
              </CardTitle>
              <Link
                to="/finance"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Manage fees
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {data.recentOverdueFees.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CheckCircle2 className="text-emerald-500" />
                  </EmptyMedia>
                  <EmptyTitle>No pending or overdue fees</EmptyTitle>
                  <EmptyDescription>
                    All scheduled academy fees are up to date!
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="flex flex-col gap-2">
                {data.recentOverdueFees.map((fee) => (
                  <Link
                    key={fee._id}
                    to="/finance"
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:border-destructive/40 hover:bg-muted/30"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-medium truncate">
                        {fee.athleteName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {fee.label} · Due {fee.dueDate}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="font-mono text-sm font-bold text-destructive">
                        {formatMoney(fee.remainingBalance)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        of {formatMoney(fee.amountDue)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
