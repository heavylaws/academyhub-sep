import { useState, useEffect } from "react";
import { Cloud, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import {
  academyFirestoreService,
  type AcademyFirestoreSyncStatus,
} from "@/services/academy-firestore-service.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover.tsx";
import { toast } from "sonner";

export function CloudSyncIndicator() {
  const [status, setStatus] = useState<AcademyFirestoreSyncStatus>({
    isConnected: true,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  });
  const [isManualSyncing, setIsManualSyncing] = useState(false);

  useEffect(() => {
    return academyFirestoreService.subscribeStatus((newStatus) => {
      setStatus(newStatus);
    });
  }, []);

  const handleManualSync = async () => {
    setIsManualSyncing(true);
    try {
      const user = localMockStore.getCurrentUser();
      const academyId = user?.academyId || "acad_hercules";
      await academyFirestoreService.forceSync(academyId);
      toast.success("Academy data synchronized with Cloud Firestore!");
    } catch {
      toast.error("Failed to sync data with cloud database.");
    } finally {
      setIsManualSyncing(false);
    }
  };

  const isWorking = status.isSyncing || isManualSyncing;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={
            status.isConnected
              ? "Cloud Firestore real-time sync active"
              : "Cloud Firestore syncing"
          }
          className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors hover:bg-muted/60 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-border/40"
        >
          {isWorking ? (
            <RefreshCw className="size-3.5 text-primary animate-spin" />
          ) : status.error ? (
            <AlertCircle className="size-3.5 text-amber-500" />
          ) : (
            <Cloud className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          )}
          <span className="hidden sm:inline text-[11px] text-muted-foreground">
            {isWorking
              ? "Syncing..."
              : status.error
                ? "Offline"
                : "Cloud Live"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 text-xs space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-3.5" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-xs">Cloud Multi-Device Sync</p>
              <p className="text-[10px] text-muted-foreground">Powered by Google Cloud Firestore</p>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-muted-foreground text-[11px]">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {status.isConnected ? "Live Connected" : "Connecting..."}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Last Synced:</span>
            <span className="font-medium text-foreground">
              {status.lastSyncedAt
                ? status.lastSyncedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                : "Initial session"}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground pt-1 leading-relaxed">
            Changes made on this screen automatically synchronize across all coaches, athletes, kiosks, and phones.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs h-7 gap-1.5"
          onClick={handleManualSync}
          disabled={isWorking}
        >
          <RefreshCw className={`size-3 ${isWorking ? "animate-spin" : ""}`} />
          {isWorking ? "Syncing changes..." : "Force Sync Now"}
        </Button>
      </PopoverContent>
    </Popover>
  );
}
