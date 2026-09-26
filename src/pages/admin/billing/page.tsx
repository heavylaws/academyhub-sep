import { useQuery } from "convex/react";
import { Building2, CheckCircle2, DollarSign, FileText } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import AppLayout from "@/components/layout/app-layout.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";

export default function AdminBillingPage() {
  const data = useQuery(api.invoices.adminBillingOverview, {});

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Billing Overview</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Invoicing activity across all academies
          </p>
        </div>

        {/* Platform-wide summary */}
        {data === undefined ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invoices
                </CardTitle>
                <FileText className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <span className="text-2xl font-bold font-display">
                  {data.totalInvoices}
                </span>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Invoiced
                </CardTitle>
                <DollarSign className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {data.currencyTotals &&
                Object.keys(data.currencyTotals).length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {Object.entries(data.currencyTotals).map(([curr, val]) => (
                      <div
                        key={curr}
                        className="text-2xl font-bold font-display"
                      >
                        <span className="text-sm font-normal text-muted-foreground mr-1.5">
                          {curr}
                        </span>
                        {val.invoiced.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-2xl font-bold font-display">
                    {data.grandTotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Paid
                </CardTitle>
                <CheckCircle2 className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                {data.currencyTotals &&
                Object.keys(data.currencyTotals).length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {Object.entries(data.currencyTotals).map(([curr, val]) => (
                      <div
                        key={curr}
                        className="text-2xl font-bold font-display text-primary"
                      >
                        <span className="text-sm font-normal text-muted-foreground mr-1.5">
                          {curr}
                        </span>
                        {val.paid.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-2xl font-bold font-display text-primary">
                    {data.paidTotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Per-academy breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Academy Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data === undefined ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data.academies.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Building2 />
                  </EmptyMedia>
                  <EmptyTitle>No invoices yet</EmptyTitle>
                  <EmptyDescription>
                    No academies have issued invoices yet.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Academy</TableHead>
                      <TableHead>Total Invoices</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Draft</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.academies.map((row) => (
                      <TableRow key={row.academyId}>
                        <TableCell className="font-medium">
                          {row.academyName}
                        </TableCell>
                        <TableCell>{row.totalInvoices}</TableCell>
                        <TableCell>
                          {row.currency}{" "}
                          {row.totalAmount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          {row.statusCounts.draft > 0 && (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground"
                            >
                              {row.statusCounts.draft}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.statusCounts.sent > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-blue-500/15 text-blue-500 border-blue-500/30"
                            >
                              {row.statusCounts.sent}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.statusCounts.paid > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-secondary text-secondary-foreground"
                            >
                              {row.statusCounts.paid}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.statusCounts.overdue > 0 && (
                            <Badge
                              variant="outline"
                              className="bg-destructive/10 text-destructive border-destructive/30"
                            >
                              {row.statusCounts.overdue}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
