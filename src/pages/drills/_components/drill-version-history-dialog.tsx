import React, { useState } from "react";
import {
  History,
  GitBranch,
  Copy,
  Plus,
  Check,
  Calendar,
  User,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  createDrillVersionRecord,
  duplicateDrillAsRevision,
  type DrillVersion,
} from "@/domain/tactics/playbook-domain.ts";
import type { SoccerDrill } from "@/data/soccer-drills.ts";
import { toast } from "sonner";

interface DrillVersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drill: SoccerDrill | null;
  onDrillUpdated?: (updatedDrill: SoccerDrill) => void;
  onDrillCloned?: (newDrill: SoccerDrill) => void;
}

export const DrillVersionHistoryDialog: React.FC<DrillVersionHistoryDialogProps> = ({
  open,
  onOpenChange,
  drill,
  onDrillUpdated,
  onDrillCloned,
}) => {
  const [changeNotes, setChangeNotes] = useState("");
  const [bumpType, setBumpType] = useState<"minor" | "major">("minor");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulated version history log (stored in drill or memory)
  const [versions, setVersions] = useState<DrillVersion[]>(() => {
    return [
      {
        versionNumber: "1.0",
        createdAt: "2026-08-10T12:00:00.000Z",
        authorName: "Coach Staff",
        changeSummary: "Initial drill release & tactical baseline configuration.",
        drillSnapshot: {},
      },
    ];
  });

  if (!drill) return null;

  const handleCreateNewVersion = () => {
    if (!changeNotes.trim()) {
      toast.error("Please provide a brief changelog summary for this revision");
      return;
    }

    setIsSubmitting(true);
    try {
      const newVersionRecord = createDrillVersionRecord(
        drill,
        changeNotes,
        drill.createdByName || "Coach",
        bumpType,
      );

      const updatedDrill: SoccerDrill = {
        ...drill,
        version: newVersionRecord.versionNumber,
      };

      setVersions([newVersionRecord, ...versions]);
      setChangeNotes("");
      onDrillUpdated?.(updatedDrill);
      toast.success(`Created version v${newVersionRecord.versionNumber}!`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDuplicate = () => {
    const cloned = duplicateDrillAsRevision(drill, "Custom Revision:", drill.createdByName || "Coach");
    onDrillCloned?.(cloned);
    toast.success(`Cloned as "${cloned.title}"!`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <History className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                <span>Version History & Revisions</span>
                <Badge variant="outline" className="font-mono text-xs">
                  Current: v{drill.version || "1.0"}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Track modifications, record tactical adjustments, or clone this drill as an independent revision.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Existing Versions Timeline */}
        <div className="space-y-3 py-2">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Revision Changelog
          </h4>

          <div className="space-y-2.5">
            {versions.map((ver, idx) => (
              <div
                key={idx}
                className="bg-muted/40 border rounded-xl p-3 text-xs space-y-1 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={idx === 0 ? "default" : "secondary"} className="font-mono text-[11px]">
                      v{ver.versionNumber}
                    </Badge>
                    <span className="font-semibold text-foreground">{ver.authorName}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(ver.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1">{ver.changeSummary}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Create New Version Form */}
        <div className="border-t pt-3 space-y-3">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <GitBranch className="size-3.5 text-primary" /> Record New Revision
          </h4>

          <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bumpType"
                  value="minor"
                  checked={bumpType === "minor"}
                  onChange={() => setBumpType("minor")}
                  className="accent-primary"
                />
                <span>Minor (e.g. v1.1 — constraint/sets adjustment)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bumpType"
                  value="major"
                  checked={bumpType === "major"}
                  onChange={() => setBumpType("major")}
                  className="accent-primary"
                />
                <span>Major (e.g. v2.0 — tactical redesign)</span>
              </label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Changelog Summary</Label>
              <Textarea
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                placeholder="e.g. Reduced grid from 35m to 25m to increase pressure speed; limited attackers to 2 touches."
                className="text-xs resize-none h-16 bg-background"
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCreateNewVersion}
              disabled={isSubmitting || !changeNotes.trim()}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>Record Revision v{drill.version ? (bumpType === "major" ? "2.0" : "1.1") : "1.1"}</span>
            </Button>
          </div>
        </div>

        {/* Duplicate Drill Action */}
        <div className="border-t pt-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h5 className="text-xs font-bold text-foreground">Fork / Duplicate Drill</h5>
            <p className="text-[11px] text-muted-foreground">
              Create an editable custom copy in your academy catalog.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDuplicate}
            className="h-8 text-xs gap-1.5"
          >
            <Copy className="size-3.5" />
            <span>Duplicate as New Drill</span>
          </Button>
        </div>

        <DialogFooter className="border-t pt-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="h-8 text-xs">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
