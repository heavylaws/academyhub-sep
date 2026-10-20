import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery } from "convex/react";
import {
  CreditCard,
  Building2,
  Banknote,
  Award,
  HelpCircle,
  Search,
  Receipt,
  FileCheck2,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

type PaymentMethod =
  | "cash"
  | "card"
  | "bank_transfer"
  | "scholarship_credit"
  | "other";

const METHOD_CONFIG: Record<
  PaymentMethod,
  { label: string; icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  card: {
    label: "Card",
    icon: CreditCard,
    className: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  },
  bank_transfer: {
    label: "Bank Transfer",
    icon: Building2,
    className: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  },
  cash: {
    label: "Cash",
    icon: Banknote,
    className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  },
  scholarship_credit: {
    label: "Scholarship Credit",
    icon: Award,
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  },
  other: {
    label: "Other",
    icon: HelpCircle,
    className: "bg-muted text-muted-foreground border-transparent",
  },
};

export function PaymentLedgerTable() {
  const transactions = useQuery(api.fees.listPaymentTransactions, {});
  const [search, setSearch] = useState("");

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter(
      (tx) =>
        tx.athleteName.toLowerCase().includes(q) ||
        (tx.referenceNumber && tx.referenceNumber.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q)) ||
        tx.paymentMethod.toLowerCase().includes(q) ||
        tx.recordedByName.toLowerCase().includes(q),
    );
  }, [transactions, search]);

  const totalCollected = useMemo(() => {
    if (!transactions) return 0;
    return transactions.reduce((acc, tx) => acc + tx.amount, 0);
  }, [transactions]);

  return (
    <Card className="border-border shadow-xs">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            <CardTitle className="text-base sm:text-lg">Immutable Payment Ledger</CardTitle>
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              Append-Only Audit Log
            </Badge>
          </div>
          <CardDescription className="text-xs sm:text-sm mt-1">
            Tamper-proof financial history with timestamped receipts and operator signatures.
          </CardDescription>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Ledger Total</p>
            <p className="font-mono font-bold text-base sm:text-lg text-foreground">
              {transactions && transactions[0] ? transactions[0].currency || "USD" : "USD"}{" "}
              {totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by athlete, reference #, or staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>

        {transactions === undefined ? (
          <div className="flex flex-col gap-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileCheck2 />
              </EmptyMedia>
              <EmptyTitle>No payment transactions recorded</EmptyTitle>
              <EmptyDescription>
                {search
                  ? "No transactions match your search filter."
                  : "Payments recorded against fees or invoices will appear here in chronological order."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div>
            {/* Mobile View: High-ergonomics cards */}
            <div className="flex flex-col divide-y sm:hidden -mx-2">
              {filteredTransactions.map((tx) => {
                const method = tx.paymentMethod as PaymentMethod;
                const cfg = METHOD_CONFIG[method] ?? METHOD_CONFIG.other;
                const MethodIcon = cfg.icon;

                return (
                  <div key={tx._id} className="p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {tx.athleteName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {format(tx.paidAt || tx.createdAt, "MMM d, yyyy · h:mm a")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-base text-foreground">
                          {tx.currency || "USD"} {tx.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/40">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          cfg.className,
                        )}
                      >
                        <MethodIcon className="size-3" />
                        {cfg.label}
                      </span>
                      {tx.referenceNumber && (
                        <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          Ref: {tx.referenceNumber}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-muted-foreground flex justify-between">
                      <span>By: {tx.recordedByName}</span>
                      {tx.notes && <span className="italic truncate max-w-[150px]">{tx.notes}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference #</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const method = tx.paymentMethod as PaymentMethod;
                    const cfg = METHOD_CONFIG[method] ?? METHOD_CONFIG.other;
                    const MethodIcon = cfg.icon;

                    return (
                      <TableRow key={tx._id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(tx.paidAt || tx.createdAt, "yyyy-MM-dd HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {tx.athleteName}
                        </TableCell>
                        <TableCell className="font-mono font-bold text-foreground">
                          {tx.currency || "USD"} {tx.amount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                              cfg.className,
                            )}
                          >
                            <MethodIcon className="size-3" />
                            {cfg.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {tx.referenceNumber ? (
                            <span className="bg-muted px-1.5 py-0.5 rounded">
                              {tx.referenceNumber}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {tx.recordedByName}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate" title={tx.notes}>
                          {tx.notes || "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
