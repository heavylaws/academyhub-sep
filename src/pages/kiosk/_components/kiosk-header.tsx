import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { format } from "date-fns";
import {
  Calendar,
  ChevronDown,
  Clock,
  DoorOpen,
  Layers,
  Shield,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  subscribeOfflineQueue,
  type QueuedCheckIn,
} from "@/lib/kiosk-offline-queue.ts";

interface KioskHeaderProps {
  currentSessionId: string;
  sessions: Array<{
    _id: string;
    title: string;
    teamName: string;
    startsAt: string;
    checkedInCount?: number;
    rosterCount?: number;
  }>;
  onSelectSession: (sessionId: string) => void;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onSyncOffline?: () => Promise<void>;
  isSyncing?: boolean;
}

export function KioskHeader({
  currentSessionId,
  sessions,
  onSelectSession,
  audioEnabled,
  onToggleAudio,
  onSyncOffline,
  isSyncing = false,
}: KioskHeaderProps) {
  const academy = useQuery(api.academies.getMyAcademy, {});
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [offlineQueue, setOfflineQueue] = useState<QueuedCheckIn[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("fullscreenchange", handleFullscreen);

    const unsubQueue = subscribeOfflineQueue((q) => setOfflineQueue(q));

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("fullscreenchange", handleFullscreen);
      unsubQueue();
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.error("Fullscreen error", e);
    }
  };

  const activeSession = sessions.find((s) => s._id === currentSessionId);

  return (
    <header className="flex flex-col sm:flex-row h-auto sm:h-20 shrink-0 sm:items-center justify-between gap-3 border-b border-border/80 bg-card/80 p-3 sm:px-6 backdrop-blur-xl">
      {/* Brand & Station Info */}
      <div className="flex items-center justify-between sm:justify-start gap-3.5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 sm:size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/20 shrink-0">
            <Shield className="size-5 sm:size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-base sm:text-lg font-black tracking-tight text-foreground">
                PeakForm
              </span>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-primary">
                Kiosk
              </span>
            </div>
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate max-w-[200px] sm:max-w-none">
              {academy?.name ? `${academy.name} · ` : ""}Terminal
            </p>
          </div>
        </div>
      </div>

      {/* Center: Session Switcher (if multiple) */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        {sessions.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-10 sm:h-11 gap-2 rounded-xl px-3 sm:px-4 font-semibold text-xs sm:text-sm border-border hover:bg-muted w-full sm:w-auto justify-between"
              >
                <div className="flex items-center gap-2 truncate">
                  <Layers className="size-4 text-primary shrink-0" />
                  <span className="max-w-[200px] sm:max-w-[220px] truncate">
                    {activeSession ? activeSession.title : "Select Training Session"}
                  </span>
                </div>
                <ChevronDown className="size-3.5 opacity-60 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-80 p-1.5">
              {sessions.map((s) => (
                <DropdownMenuItem
                  key={s._id}
                  onClick={() => onSelectSession(s._id)}
                  className={`flex flex-col items-start gap-1 p-2.5 rounded-lg cursor-pointer ${
                    s._id === currentSessionId ? "bg-primary/10 font-semibold" : ""
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-foreground truncate">
                      {s.title}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {new Date(s.startsAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{s.teamName}</span>
                    <span>•</span>
                    <span>
                      {s.checkedInCount ?? 0} / {s.rosterCount ?? 0} checked in
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : activeSession ? (
          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3.5 py-1.5">
            <Layers className="size-4 text-primary" />
            <span className="text-xs font-semibold text-foreground">
              {activeSession.title} ({activeSession.teamName})
            </span>
          </div>
        ) : null}
      </div>

      {/* Right Controls: Connection, Sync, Audio, Fullscreen, Clock & Exit */}
      <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap w-full sm:w-auto">
        {/* Network & Queue status */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            offlineQueue.length > 0 ? (
              <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs py-1">
                <Wifi className="size-3.5" />
                <span>{offlineQueue.length} Queued</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-xs py-1">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </Badge>
            )
          ) : (
            <Badge variant="outline" className="gap-1 bg-destructive/10 text-destructive border-destructive/20 text-xs py-1">
              <WifiOff className="size-3.5" />
              <span>Offline ({offlineQueue.length})</span>
            </Badge>
          )}

          {/* Sync Button (if queued) */}
          {offlineQueue.length > 0 && onSyncOffline && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSyncOffline}
              disabled={isSyncing || !isOnline}
              className="h-8 gap-1.5 text-xs font-semibold"
              title="Sync queued check-ins now"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>Sync</span>
            </Button>
          )}
        </div>

        {/* Action icons group */}
        <div className="flex items-center gap-1">
          {/* Audio feedback toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleAudio}
            className="size-10 rounded-xl text-muted-foreground hover:text-foreground active:scale-95"
            title={audioEnabled ? "Audio chimes enabled" : "Audio chimes muted"}
          >
            {audioEnabled ? (
              <Volume2 className="size-5 text-primary" />
            ) : (
              <VolumeX className="size-5" />
            )}
          </Button>

          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="size-10 rounded-xl text-muted-foreground hover:text-foreground active:scale-95"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen kiosk mode"}
          >
            {isFullscreen ? (
              <Minimize2 className="size-5 text-primary" />
            ) : (
              <Maximize2 className="size-5" />
            )}
          </Button>
        </div>

        {/* Live Clock */}
        <div className="hidden md:flex flex-col items-end text-right">
          <div className="flex items-center gap-1.5 font-mono text-base font-bold tracking-tight text-foreground">
            <Clock className="size-3.5 text-primary" />
            <span>{format(time, "HH:mm:ss")}</span>
          </div>
          <span className="text-[10px] font-medium text-muted-foreground">
            {format(time, "EEE, MMM d")}
          </span>
        </div>

        {/* Exit Kiosk */}
        <Button
          variant="outline"
          onClick={() => navigate(currentSessionId ? `/sessions/${currentSessionId}` : "/schedule")}
          className="h-10 sm:h-9 gap-1.5 rounded-xl px-3.5 text-xs font-semibold border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 ml-auto sm:ml-0"
        >
          <DoorOpen className="size-3.5" />
          <span>Exit</span>
        </Button>
      </div>
    </header>
  );
}
