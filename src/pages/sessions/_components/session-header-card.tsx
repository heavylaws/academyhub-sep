import {
  CalendarClock,
  MapPin,
  Pencil,
  Trash2,
  TabletSmartphone,
  Printer,
  ArrowLeft,
} from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";

interface SessionHeaderCardProps {
  session: Doc<"trainingSessions">;
  start: Date;
  end: Date;
  canManage: boolean;
  onBack: () => void;
  onPrintSheet: () => void;
  onKioskMode: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void>;
}

export function SessionHeaderCard({
  session,
  start,
  end,
  canManage,
  onBack,
  onPrintSheet,
  onKioskMode,
  onEdit,
  onDelete,
}: SessionHeaderCardProps) {
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="w-fit"
        onClick={onBack}
      >
        <ArrowLeft className="size-4" />
        Back to team
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="font-display text-xl">
                {session.title}
              </CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarClock className="size-4" />
                  {start.toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {" – "}
                  {end.toLocaleTimeString(undefined, { timeStyle: "short" })}
                </span>
                {session.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" />
                    {session.location}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={onPrintSheet}
                className="h-10 sm:h-9 text-xs sm:text-sm gap-1.5 font-semibold"
                title="Open printable clipboard practice plan sheet"
              >
                <Printer className="size-4 text-primary" />
                <span>Print Sheet</span>
              </Button>
              {canManage && (
                <>
                  <Button
                    variant="outline"
                    onClick={onKioskMode}
                    className="h-10 sm:h-9 text-xs sm:text-sm gap-1.5 border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-semibold"
                  >
                    <TabletSmartphone className="size-4" />
                    <span>Kiosk Mode</span>
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={onEdit}
                    className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5"
                  >
                    <Pencil className="size-4" />
                    <span>Edit</span>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="secondary"
                        className="h-10 sm:h-9 text-xs sm:text-sm font-semibold gap-1.5 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-4" />
                        <span>Delete</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the session and all its attendance records.
                          This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={onDelete}
                        >
                          Delete session
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        {session.notes && (
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {session.notes}
            </p>
          </CardContent>
        )}
      </Card>
    </>
  );
}
