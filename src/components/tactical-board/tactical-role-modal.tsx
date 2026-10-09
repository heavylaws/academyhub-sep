import React from "react";
import { type PlayerNode } from "@/domain/tactics/tactical-domain.ts";
import { X, Sparkles, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

export interface RolePreset {
  role: string;
  category: "Forward" | "Midfield" | "Defense" | "Goalkeeper";
  duty: string;
  description: string;
  color: string;
}

export const TACTICAL_ROLE_PRESETS: RolePreset[] = [
  // Forwards
  {
    role: "Target Man",
    category: "Forward",
    duty: "Holds up ball, pins CBs, brings midfield into play with physical aerial presence",
    description: "High strength, back to goal linkup, focal point for deliveries.",
    color: "#00E5FF",
  },
  {
    role: "False 9",
    category: "Forward",
    duty: "Drops deep between lines to overload midfield, vacating space for wingers",
    description: "Drifts into pockets, draws center-backs out of position.",
    color: "#00E5FF",
  },
  {
    role: "Poacher",
    category: "Forward",
    duty: "Stays on defender shoulder, sniffs out box rebounds and near-post cuts",
    description: "Lethal penalty box instincts and rapid burst acceleration.",
    color: "#00E5FF",
  },
  {
    role: "Pressing Forward",
    category: "Forward",
    duty: "Leads front-line pressing triggers, closes down passing lanes to holding mid",
    description: "Relentless work rate to disrupt opposition build-up structure.",
    color: "#00E5FF",
  },

  // Midfielders
  {
    role: "Deep-Lying Playmaker",
    category: "Midfield",
    duty: "Operates in pivot, dictates passing rhythm, switches play with diagonal pings",
    description: "Exceptional vision, spatial scanning, and tempo control from deep.",
    color: "#69F0AE",
  },
  {
    role: "Box-to-Box",
    category: "Midfield",
    duty: "Covers whole pitch, breaks up counter-attacks, arrives late into penalty area",
    description: "Stamina powerhouse supporting both transitions seamlessly.",
    color: "#69F0AE",
  },
  {
    role: "Ball-Winning Midfielder",
    category: "Midfield",
    duty: "Aggressive tackles, intercepts half-space passes, secures second balls",
    description: "Destructive defensive screen shielding backline.",
    color: "#69F0AE",
  },
  {
    role: "Inverted Winger",
    category: "Midfield",
    duty: "Cuts inside onto stronger foot to shoot or slide reverse through-balls",
    description: "Creates underlaps or opens outside flank for overlapping fullback.",
    color: "#00E5FF",
  },
  {
    role: "Inside Forward",
    category: "Midfield",
    duty: "Attacks half-spaces diagonally, operates as secondary striker in the box",
    description: "Direct goal threat penetrating defensive channels.",
    color: "#00E5FF",
  },
  {
    role: "Trequartista",
    category: "Midfield",
    duty: "Creative spark in the hole, floats between midfield and attack without defensive duties",
    description: "Pure playmaker unlocking low blocks with finesse passes.",
    color: "#69F0AE",
  },

  // Defenders
  {
    role: "Ball-Playing Defender",
    category: "Defense",
    duty: "Steps into midfield to break lines with vertical passes and diagonal balls",
    description: "Composed on the ball, resists high pressing with calm distribution.",
    color: "#FF6E40",
  },
  {
    role: "Attacking Fullback",
    category: "Defense",
    duty: "Sprints touchline on outside overlap, whips crosses from byline",
    description: "Provides wide width in final third, rapid recovery pace.",
    color: "#FF6E40",
  },
  {
    role: "Inverted Wing-Back",
    category: "Defense",
    duty: "Steps inside into midfield pivot during build-up to create central numerical superiority",
    description: "Modern tactical inverted role controlling transition rest-defense.",
    color: "#FF6E40",
  },
  {
    role: "No-Nonsense CB",
    category: "Defense",
    duty: "Dominates aerial duels, clears danger with zero-risk clearances",
    description: "Robust stopper prioritizing defensive containment and physical dominance.",
    color: "#FF6E40",
  },

  // Goalkeeper
  {
    role: "Sweeper Keeper",
    category: "Goalkeeper",
    duty: "Aggressively sweeps outside penalty box, acts as 11th outfield player in possession",
    description: "Rushes out to clear over-the-top passes and initiates swift build-ups.",
    color: "#FFD600",
  },
];

interface TacticalRoleModalProps {
  player: PlayerNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: string, duty?: string) => void;
}

export const TacticalRoleModal: React.FC<TacticalRoleModalProps> = ({
  player,
  isOpen,
  onClose,
  onSelectRole,
}) => {
  if (!isOpen || !player) return null;

  return (
    <div
      id="tactical-role-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="tactical-role-modal-container"
        className="relative w-full max-w-lg bg-[#0E1A2B] border border-[#21374E] rounded-2xl p-5 shadow-2xl text-white max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#1E334B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#182B42] border border-[#00E5FF] flex items-center justify-center font-bold text-white text-base shadow-inner">
              {player.number}
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Assign Tactical Role</span>
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#162C44] text-[#00E5FF] border border-[#00E5FF]/30">
                  {player.label || `Player #${player.number}`}
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Current Role:{" "}
                <span className="text-[#FFD600] font-semibold">
                  {player.tacticalRole || player.role || "Standard"}
                </span>
              </p>
            </div>
          </div>
          <button
            id="close-tactical-role-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1A2F49] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Roles List */}
        <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-2">
          {TACTICAL_ROLE_PRESETS.map((preset) => {
            const isSelected = player.tacticalRole === preset.role;
            return (
              <button
                key={preset.role}
                id={`role-preset-btn-${preset.role.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
                onClick={() => {
                  onSelectRole(preset.role, preset.duty);
                  onClose();
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? "bg-[#142B46] border-[#00E5FF] ring-1 ring-[#00E5FF]/50 shadow-md"
                    : "bg-[#101F33] border-[#1C324D] hover:bg-[#15273F] hover:border-gray-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="font-bold text-xs text-white tracking-wide">
                      {preset.role}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1A2E46] text-gray-300 font-medium">
                      {preset.category}
                    </span>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#00E5FF]">
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Active</span>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-gray-300 font-medium leading-relaxed pl-3 border-l-2 border-white/10">
                  <strong className="text-white/90">Duty:</strong> {preset.duty}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-[#1E334B] flex items-center justify-between text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00E5FF]" />
            Badges appear above markers when hovered or selected on the pitch
          </span>
          <Button
            size="sm"
            onClick={onClose}
            className="h-8 px-3.5 bg-[#1C334F] hover:bg-[#254266] text-xs font-semibold text-white rounded-lg transition-colors"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
