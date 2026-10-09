import { Link } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  description?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  colorVariant?: "primary" | "blue" | "emerald" | "amber" | "purple";
  className?: string;
}

const COLOR_MAP = {
  primary: "bg-primary/10 text-primary border-primary/20",
  blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  emerald: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  to,
  description,
  trend,
  colorVariant = "primary",
  className,
}: StatCardProps) {
  const inner = (
    <Card className={cn(
      "group relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-primary/40 bg-card/60 backdrop-blur-sm",
      className,
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
            {label}
          </span>
          <div className={cn(
            "flex size-9 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105",
            COLOR_MAP[colorVariant] || COLOR_MAP.primary,
          )}>
            <Icon className="size-4.5" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {value === undefined ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-display text-3xl font-bold tracking-tight text-foreground">{value}</span>
            {trend && (
              <Badge
                variant="outline"
                className={cn(
                  "gap-0.5 text-[10px] font-mono font-semibold px-1.5 py-0.5 shrink-0",
                  trend.isPositive !== false
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
                )}
              >
                {trend.isPositive !== false ? (
                  <ArrowUpRight className="size-3" />
                ) : (
                  <ArrowDownRight className="size-3" />
                )}
                {trend.value}
              </Badge>
            )}
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );

  if (to) {
    return <Link to={to} className="block transition-transform hover:-translate-y-0.5">{inner}</Link>;
  }
  return inner;
}
