import { ShieldCheck, AlertTriangle, ShieldAlert, HeartPulse } from "lucide-react";

export const AVAILABILITY_CONFIG: Record<
  string,
  { label: string; badgeClass: string; icon: typeof ShieldCheck; borderClass: string }
> = {
  fit: {
    label: "Fit to Train",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    borderClass: "border-emerald-500/30",
    icon: ShieldCheck,
  },
  modified_training: {
    label: "Modified Training",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    borderClass: "border-amber-500/30",
    icon: AlertTriangle,
  },
  injured_out: {
    label: "Injured - Sidelined",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    borderClass: "border-rose-500/30",
    icon: ShieldAlert,
  },
  illness: {
    label: "Illness / Inactive",
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
    borderClass: "border-purple-500/30",
    icon: HeartPulse,
  },
};

export const RISK_ZONE_CONFIG: Record<
  string,
  { label: string; badgeClass: string; textClass: string; desc: string }
> = {
  optimal: {
    label: "Optimal Range",
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    textClass: "text-emerald-600 dark:text-emerald-400",
    desc: "Sweet spot (0.8–1.3 ACWR): Maximizes fitness with minimal injury risk",
  },
  caution: {
    label: "Caution Zone",
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    textClass: "text-amber-600 dark:text-amber-400",
    desc: "Elevated workload (1.3–1.5 ACWR): Monitor fatigue and ensure recovery",
  },
  danger_high_spike: {
    label: "Danger: High Spike",
    badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
    textClass: "text-rose-600 dark:text-rose-400",
    desc: "Acute workload spike (>1.5 ACWR): High risk of soft tissue injury",
  },
  undertraining: {
    label: "Undertraining",
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
    textClass: "text-blue-600 dark:text-blue-400",
    desc: "Low acute stimulus (<0.8 ACWR): Potential fitness loss",
  },
  insufficient_data: {
    label: "Building Baseline",
    badgeClass: "bg-muted text-muted-foreground border-border",
    textClass: "text-muted-foreground",
    desc: "Awaiting 28 days of session history for full ACWR chronic baseline",
  },
};
