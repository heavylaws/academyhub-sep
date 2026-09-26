import { useEffect, useState } from "react";
import { Check, Clock, Sparkles, X } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";

export interface CheckInSuccessData {
  athlete: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  status: "present" | "late";
  recordedAt: string;
  sessionTitle: string;
}

interface CheckInSuccessModalProps {
  data: CheckInSuccessData | null;
  onDismiss: () => void;
}

export function CheckInSuccessModal({
  data,
  onDismiss,
}: CheckInSuccessModalProps) {
  const [countdown, setCountdown] = useState(3);
  const [currentRecordedAt, setCurrentRecordedAt] = useState<string | null>(null);

  if (data && data.recordedAt !== currentRecordedAt) {
    setCurrentRecordedAt(data.recordedAt);
    setCountdown(3);
  }

  useEffect(() => {
    if (!data) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [data, onDismiss]);

  if (!data) return null;

  const formattedTime = new Date(data.recordedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const isOnTime = data.status === "present";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card p-8 text-center shadow-2xl">
        {/* Close Button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="size-5" />
        </button>

        {/* Celebratory Icon */}
        <div className="mx-auto mb-6 flex size-24 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500 ring-8 ring-emerald-500/10 animate-bounce">
          <Check className="size-12 stroke-[3]" />
        </div>

        {/* Greeting */}
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Check-In Confirmed
          </span>
          <h2 className="text-3xl font-display font-extrabold tracking-tight text-foreground">
            {data.athlete.firstName} {data.athlete.lastName}
          </h2>
          <p className="text-sm font-medium text-muted-foreground">
            {data.sessionTitle}
          </p>
        </div>

        {/* Arrival Details Badge Card */}
        <div className="my-6 flex items-center justify-center gap-3 rounded-2xl bg-muted/50 p-4 border border-border/50">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Clock className="size-4 text-primary" />
            <span>{formattedTime}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <Badge
            variant="outline"
            className={
              isOnTime
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs font-semibold px-2.5 py-0.5"
            }
          >
            {isOnTime ? "On Time" : "Late Arrival"}
          </Badge>
        </div>

        {/* Motivational Streak / Tip */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-6">
          <Sparkles className="size-3.5 text-primary" />
          <span>Hydrate well and warm up thoroughly before starting.</span>
        </div>

        {/* Action button with countdown timer */}
        <Button
          onClick={onDismiss}
          size="lg"
          className="w-full text-base font-semibold rounded-2xl h-12 gap-2 shadow-lg shadow-primary/20"
        >
          <span>Next Athlete</span>
          <span className="flex size-5 items-center justify-center rounded-full bg-primary-foreground/20 text-xs font-bold">
            {countdown}s
          </span>
        </Button>
      </div>
    </div>
  );
}
