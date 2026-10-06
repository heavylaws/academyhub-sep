import React, { useRef, useState, useMemo } from "react";
import {
  Printer,
  Copy,
  Check,
  FileText,
  Target,
  Layers,
  Shield,
  Timer,
  CheckSquare,
  Users,
  Sun,
  Dumbbell,
  CalendarClock,
  MapPin,
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
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import type { SoccerDrill } from "@/data/soccer-drills.ts";
import type {
  TacticalPlan,
  TacticalPhase,
  PitchType,
} from "@/domain/tactics/tactical-domain.ts";
import { TacticalPitchSvg } from "@/components/tactical-board/tactical-pitch-svg.tsx";

export interface SessionAthleteItem extends Doc<"athletes"> {
  jerseyNumber?: number;
  tacticalPosition?: string;
  tacticalRole?: string;
}

interface SessionSheetExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Doc<"trainingSessions">;
  teamName?: string;
  preferredFormation?: string;
  roster: SessionAthleteItem[];
  drills: SoccerDrill[];
  tacticalPlanDoc?: Doc<"tacticalPlans"> | null;
}

export const SessionSheetExportModal: React.FC<SessionSheetExportModalProps> = ({
  open,
  onOpenChange,
  session,
  teamName = "Squad",
  preferredFormation = "4-3-3",
  roster,
  drills,
  tacticalPlanDoc,
}) => {
  const [copied, setCopied] = useState(false);
  const [inkSaverMode, setInkSaverMode] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Parse tactical plan if available
  const parsedTacticalPlan: TacticalPlan | undefined = useMemo(() => {
    if (!tacticalPlanDoc?.planData) return undefined;
    try {
      return JSON.parse(tacticalPlanDoc.planData) as TacticalPlan;
    } catch {
      return undefined;
    }
  }, [tacticalPlanDoc]);

  const currentPhase: TacticalPhase =
    parsedTacticalPlan?.phases?.[0] || {
      id: "phase_1",
      phaseNumber: 1,
      title: "Initial Setup",
      durationSeconds: 4,
      players: [],
      ball: { x: 50, y: 50 },
      equipment: [],
      annotations: [],
    };

  // Aggregate equipment checklist across all drills in itinerary
  const aggregatedEquipment = useMemo(() => {
    const counts: Record<string, number> = {};
    drills.forEach((drill) => {
      (drill.equipment || []).forEach((item) => {
        const cleaned = item.trim();
        if (cleaned) {
          counts[cleaned] = (counts[cleaned] || 0) + 1;
        }
      });
    });
    return counts;
  }, [drills]);

  const totalDrillMinutes = useMemo(() => {
    return drills.reduce((acc, d) => acc + (d.durationMinutes || 0), 0);
  }, [drills]);

  const start = new Date(session.startsAt);
  const formattedDate = start.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = start.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    window.print();
    toast.success("Print dialog opened. Select 'Save as PDF' or choose a printer.");
  };

  const handleCopyMarkdown = () => {
    const text = `# CoachTactics Training Session Practice Sheet
## ${session.title}
- **Team**: ${teamName} (Base: ${preferredFormation})
- **Date & Time**: ${formattedDate} at ${formattedTime}
- **Duration**: ${session.durationMinutes} mins (${totalDrillMinutes} mins drills planned)
- **Location**: ${session.location || "Main Pitch"}

${session.notes ? `### Session Focus & Notes\n${session.notes}\n` : ""}

${
  tacticalPlanDoc
    ? `### Tactical Routine: ${tacticalPlanDoc.title}
- Pitch: ${tacticalPlanDoc.pitchType}
${(tacticalPlanDoc.coachingPoints || []).map((cp) => `- [ ] ${cp}`).join("\n")}
`
    : ""
}

### Practice Itinerary (${drills.length} Drills)
${drills
  .map(
    (d, i) => `#### Drill ${i + 1}: ${d.title} (${d.durationMinutes}m • ${d.categoryLabel})
- Grid: ${d.gridDimensions} | Sets/Reps: ${d.recommendedSets}x${d.recommendedReps}
- Equipment: ${d.equipment.join(", ")}
- Instructions:
${d.instructions.map((ins, idx) => `  ${idx + 1}. ${ins}`).join("\n")}
- Coaching Points:
${d.coachingPoints.map((cp) => `  - [ ] ${cp}`).join("\n")}
`,
  )
  .join("\n")}

### Squad Roll-Call (${roster.length} Athletes)
${roster
  .map(
    (a) =>
      `- [ ] #${a.jerseyNumber ?? "--"} ${a.firstName} ${a.lastName} (${a.tacticalPosition || "Sub"} • ${a.tacticalRole || "Player"})`,
  )
  .join("\n")}
`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Session sheet copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:m-0 print:p-0 print:border-none print:shadow-none print:max-h-none print:w-full">
        {/* Modal Controls Header */}
        <DialogHeader className="border-b pb-3 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <FileText className="size-4" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  Printable Pitch-Side Session Practice Sheet
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Export complete tactical setup, drill itinerary, equipment bag checklist, and squad roll-call.
                </DialogDescription>
              </div>
            </div>

            {/* Quick Style Toggles */}
            <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border text-xs">
              <button
                type="button"
                onClick={() => setInkSaverMode(false)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                  !inkSaverMode
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                ⚽ Color Pitch
              </button>
              <button
                type="button"
                onClick={() => setInkSaverMode(true)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 ${
                  inkSaverMode
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="size-3" />
                <span>Ink-Saver B&W</span>
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Area */}
        <div
          ref={printAreaRef}
          className={`space-y-6 pt-3 text-foreground ${
            inkSaverMode ? "bg-white text-black font-sans" : ""
          }`}
        >
          {/* Header Banner */}
          <div className="border-b-2 border-primary/40 pb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest uppercase text-primary">
                  CoachTactics • Official Practice Plan
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {preferredFormation} Setup
                </Badge>
              </div>
              <h1 className="text-2xl font-black tracking-tight">{session.title}</h1>
              <p className="text-sm font-semibold text-muted-foreground">
                Squad: <span className="text-foreground">{teamName}</span> • {roster.length} Athletes Rostered
              </p>
            </div>

            <div className="text-right space-y-1 text-xs">
              <div className="flex items-center justify-end gap-1.5 font-medium">
                <CalendarClock className="size-3.5 text-primary" />
                <span>{formattedDate}</span>
              </div>
              <div className="text-muted-foreground">
                {formattedTime} • {session.durationMinutes} min total ({totalDrillMinutes}m drills)
              </div>
              {session.location && (
                <div className="flex items-center justify-end gap-1.5 text-muted-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  <span>{session.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Session Focus / Notes */}
          {session.notes && (
            <div className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                Session Focus & Coaching Objectives
              </span>
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                {session.notes}
              </p>
            </div>
          )}

          {/* Tactical Pitch Setup Diagram (if tactical plan attached) */}
          {parsedTacticalPlan && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider text-primary">
                  <Target className="size-4" /> Tactical Formation & Pitch Organization
                </h2>
                <span className="text-xs text-muted-foreground">
                  {tacticalPlanDoc?.title} ({tacticalPlanDoc?.pitchType ? tacticalPlanDoc.pitchType.replace(/_/g, " ") : "full pitch"})
                </span>
              </div>

              {/* Visual Pitch Render Container */}
              <div
                className={`relative w-full aspect-[1000/650] max-h-[360px] rounded-lg overflow-hidden border-2 ${
                  inkSaverMode ? "bg-white border-zinc-900" : "bg-emerald-950 border-emerald-900"
                }`}
              >
                {/* Pitch Markings SVG */}
                {!inkSaverMode ? (
                  <TacticalPitchSvg pitchType={(tacticalPlanDoc?.pitchType as PitchType) || "full"} />
                ) : (
                  <svg viewBox="0 0 1000 650" className="w-full h-full">
                    <rect width="1000" height="650" fill="#FFFFFF" />
                    <rect x="25" y="25" width="950" height="600" fill="none" stroke="#000000" strokeWidth="3" />
                    <line x1="500" y1="25" x2="500" y2="625" stroke="#000000" strokeWidth="3" />
                    <circle cx="500" cy="325" r="88" fill="none" stroke="#000000" strokeWidth="3" />
                    <circle cx="500" cy="325" r="4" fill="#000000" />
                    <rect x="25" y="150" width="160" height="350" fill="none" stroke="#000000" strokeWidth="3" />
                    <rect x="815" y="150" width="160" height="350" fill="none" stroke="#000000" strokeWidth="3" />
                    <circle cx="135" cy="325" r="4" fill="#000000" />
                    <circle cx="865" cy="325" r="4" fill="#000000" />
                  </svg>
                )}

                {/* Vector Annotations Layer */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                  {currentPhase.annotations.map((ann) => {
                    if (ann.points.length === 0) return null;
                    const start = ann.points[0];
                    const end = ann.points[ann.points.length - 1];
                    const isDashed = ann.type === "pass_line";

                    if (ann.type === "press_zone") {
                      const minX = Math.min(start.x, end.x);
                      const minY = Math.min(start.y, end.y);
                      const w = Math.abs(end.x - start.x);
                      const h = Math.abs(end.y - start.y);
                      return (
                        <rect
                          key={ann.id}
                          x={minX}
                          y={minY}
                          width={w}
                          height={h}
                          fill={inkSaverMode ? "#000000" : ann.color}
                          fillOpacity={0.15}
                          stroke={inkSaverMode ? "#000000" : ann.color}
                          strokeWidth={0.8}
                          strokeDasharray="2 2"
                        />
                      );
                    }

                    return (
                      <line
                        key={ann.id}
                        x1={start.x}
                        y1={start.y}
                        x2={end.x}
                        y2={end.y}
                        stroke={inkSaverMode ? "#000000" : ann.color}
                        strokeWidth={1}
                        strokeDasharray={isDashed ? "2.5 1.5" : undefined}
                      />
                    );
                  })}

                  {/* Trajectory dashed lines */}
                  {currentPhase.players.map((p) => {
                    if (!p.targetPosition) return null;
                    return (
                      <line
                        key={`traj_${p.id}`}
                        x1={p.position.x}
                        y1={p.position.y}
                        x2={p.targetPosition.x}
                        y2={p.targetPosition.y}
                        stroke={inkSaverMode ? "#666666" : "rgba(255,255,255,0.7)"}
                        strokeWidth={0.8}
                        strokeDasharray="1.5 1.5"
                      />
                    );
                  })}
                </svg>

                {/* Equipment Tokens */}
                {currentPhase.equipment.map((eq) => (
                  <div
                    key={eq.id}
                    style={{
                      left: `${eq.position.x}%`,
                      top: `${eq.position.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                    className="absolute pointer-events-none"
                  >
                    {eq.type === "cone" && (
                      <div className="size-3 bg-amber-500 border border-amber-800 rounded-full" />
                    )}
                    {eq.type === "mannequin" && (
                      <div className="w-2 h-4 bg-amber-400 border border-amber-900 rounded-xs flex items-center justify-center text-[6px] font-black">
                        M
                      </div>
                    )}
                    {eq.type === "mini_goal" && (
                      <div className="w-5 h-2.5 border-2 border-red-600 bg-red-500/30 rounded-xs" />
                    )}
                    {eq.type === "agility_pole" && (
                      <div className="w-1 h-4 bg-yellow-400 border border-black rounded-full" />
                    )}
                    {eq.type === "speed_ladder" && (
                      <div className="w-3 h-8 border-x border-yellow-400 flex flex-col justify-between py-0.5">
                        <div className="h-0.5 w-full bg-yellow-400" />
                        <div className="h-0.5 w-full bg-yellow-400" />
                      </div>
                    )}
                    {eq.type === "rebounder_board" && (
                      <div className="w-5 h-2 bg-zinc-800 border border-amber-400 text-[5px] text-white font-bold flex items-center justify-center">
                        WALL
                      </div>
                    )}
                  </div>
                ))}

                {/* Ball Token */}
                <div
                  style={{
                    left: `${currentPhase.ball.x}%`,
                    top: `${currentPhase.ball.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className="absolute size-3.5 bg-white border-2 border-black rounded-full shadow-md flex items-center justify-center z-20 pointer-events-none"
                >
                  <div className="size-1 bg-black rounded-full" />
                </div>

                {/* Player Tokens */}
                {currentPhase.players.map((p) => {
                  const isHome = p.team === "home" || p.team === "gk_home";
                  const isGK = p.team === "gk_home" || p.team === "gk_away" || p.role === "GK";

                  let tokenBg = isHome ? "bg-blue-600 text-white border-white" : "bg-red-600 text-white border-white";
                  if (isGK) tokenBg = "bg-amber-400 text-black border-black font-black";
                  if (p.team === "neutral") tokenBg = "bg-orange-500 text-white border-white";

                  if (inkSaverMode) {
                    tokenBg = isHome
                      ? "bg-black text-white border-black"
                      : isGK
                      ? "bg-zinc-200 text-black border-black"
                      : "bg-white text-black border-2 border-black";
                  }

                  return (
                    <div
                      key={p.id}
                      style={{
                        left: `${p.position.x}%`,
                        top: `${p.position.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                      className="absolute flex flex-col items-center pointer-events-none z-10"
                    >
                      <div
                        className={`size-5 sm:size-6 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold shadow-md ${tokenBg}`}
                      >
                        {p.number}
                      </div>
                      <span
                        className={`text-[8px] font-black leading-none px-0.5 rounded-xs mt-0.5 ${
                          inkSaverMode
                            ? "bg-white text-black border border-black"
                            : isHome
                            ? "bg-blue-900 text-blue-100"
                            : "bg-red-900 text-red-100"
                        }`}
                      >
                        {p.role}
                      </span>
                    </div>
                  );
                })}
              </div>

              {tacticalPlanDoc?.coachingPoints && tacticalPlanDoc.coachingPoints.length > 0 && (
                <div className="p-2.5 rounded-lg border bg-primary/5 text-xs space-y-1">
                  <span className="font-bold text-[11px] text-primary">Key Tactical Cues:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                    {tacticalPlanDoc.coachingPoints.map((cp, idx) => (
                      <li key={idx}>{cp}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Equipment Checklist Strip */}
          {Object.keys(aggregatedEquipment).length > 0 && (
            <div className="p-3 rounded-xl border bg-muted/30 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Dumbbell className="size-4 text-primary" />
                <span>Aggregated Pitch Equipment Checklist</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(aggregatedEquipment).map(([item, count]) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 p-1.5 rounded-md border bg-background/80"
                  >
                    <CheckSquare className="size-3.5 text-muted-foreground" />
                    <span className="font-medium">{item}</span>
                    {count > 1 && (
                      <span className="text-[10px] text-muted-foreground ml-auto">({count} drills)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Practice Itinerary Drills */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider text-primary">
              <Timer className="size-4" /> Practice Itinerary ({drills.length} Drills • {totalDrillMinutes} mins)
            </h2>

            {drills.length === 0 ? (
              <div className="p-4 rounded-lg border text-center text-xs text-muted-foreground">
                No drills attached to this training session.
              </div>
            ) : (
              <div className="space-y-3">
                {drills.map((drill, idx) => (
                  <div
                    key={drill.id}
                    className="p-3.5 rounded-xl border bg-card/60 space-y-2 text-xs print:break-inside-avoid"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-sm">{drill.title}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {drill.categoryLabel}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                        <span>⏱️ {drill.durationMinutes} mins</span>
                        <span>📐 {drill.gridDimensions}</span>
                        <span>🔁 {drill.recommendedSets}x{drill.recommendedReps}</span>
                      </div>
                    </div>

                    <p className="text-muted-foreground leading-relaxed">
                      {drill.summary}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {drill.instructions && drill.instructions.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-semibold text-[11px] text-foreground">
                            Execution Steps:
                          </span>
                          <ol className="list-decimal list-inside space-y-0.5 text-muted-foreground text-[11px]">
                            {drill.instructions.slice(0, 4).map((ins, i) => (
                              <li key={i}>{ins}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {drill.coachingPoints && drill.coachingPoints.length > 0 && (
                        <div className="space-y-1">
                          <span className="font-semibold text-[11px] text-foreground">
                            Tactical Coaching Points:
                          </span>
                          <ul className="list-disc list-inside space-y-0.5 text-muted-foreground text-[11px]">
                            {drill.coachingPoints.slice(0, 3).map((cp, i) => (
                              <li key={i}>{cp}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Squad Pitch-Side Roll-Call Roster */}
          <div className="space-y-2 print:break-inside-avoid">
            <h2 className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider text-primary">
              <Users className="size-4" /> Squad Pitch-Side Roll-Call ({roster.length} Players)
            </h2>

            <div className="rounded-xl border overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="p-2 font-semibold w-12 text-center">#</th>
                    <th className="p-2 font-semibold">Athlete Name</th>
                    <th className="p-2 font-semibold">Pos / Role</th>
                    <th className="p-2 font-semibold w-24 text-center">Attendance</th>
                    <th className="p-2 font-semibold">Coach Pitch Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {roster.map((athlete) => (
                    <tr key={athlete._id} className="hover:bg-muted/20">
                      <td className="p-2 font-mono font-bold text-center text-primary">
                        {athlete.jerseyNumber ? `#${athlete.jerseyNumber}` : "--"}
                      </td>
                      <td className="p-2 font-medium">
                        {athlete.firstName} {athlete.lastName}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {athlete.tacticalPosition || "Sub"} • {athlete.tacticalRole || "Squad Player"}
                      </td>
                      <td className="p-2 text-center">
                        <span className="inline-block size-4 border border-foreground/40 rounded-xs" />
                      </td>
                      <td className="p-2 text-muted-foreground">
                        <span className="inline-block w-full border-b border-dashed border-border/60 h-3" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <DialogFooter className="border-t pt-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMarkdown}
              className="text-xs gap-1.5"
            >
              {copied ? <Check className="size-3.5 text-green-500" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Copied Markdown" : "Copy Text"}</span>
            </Button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground shadow-xs"
            >
              <Printer className="size-3.5" />
              <span>Print / Save as PDF</span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
export default SessionSheetExportModal;
