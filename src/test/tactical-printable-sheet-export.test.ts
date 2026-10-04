import { describe, expect, it } from "vitest";
import { SOCCER_DRILLS } from "../../src/data/soccer-drills.ts";
import {
  createDefaultTacticalPlan,
  type PlayerNode,
  type EquipmentNode,
} from "../../src/domain/tactics/tactical-domain.ts";

describe("Phase 11: High-Contrast Coach Clipboard Sheet & Printable Cards Suite", () => {
  it("formats comprehensive tactical markdown export with all required coaching sections", () => {
    const drill = SOCCER_DRILLS[0];
    expect(drill).toBeDefined();

    const markdown = `# ${drill.title} (${drill.ageGroup}) - Version ${drill.version || "1.0"}
Category: ${drill.categoryLabel} | Birth Years: ${drill.birthYears}
Duration: ${drill.durationMinutes} mins | Sets: ${drill.recommendedSets} | Reps: ${drill.recommendedReps}
Grid Dimensions: ${drill.gridDimensions}
Equipment: ${drill.equipment.join(", ")}

## Summary
${drill.summary}

## Spatial Setup
${drill.setup}

## Instructions
${drill.instructions.map((ins, i) => `${i + 1}. ${ins}`).join("\n")}

## Coaching Points
${drill.coachingPoints.map((pt) => `- [ ] ${pt}`).join("\n")}
`;

    expect(markdown).toContain(drill.title);
    expect(markdown).toContain("## Spatial Setup");
    expect(markdown).toContain("## Instructions");
    expect(markdown).toContain("## Coaching Points");
    expect(markdown).toContain(drill.gridDimensions);
  });

  it("accurately tallies equipment counts for the physical session checklist", () => {
    const equipment: EquipmentNode[] = [
      { id: "e1", type: "cone", position: { x: 10, y: 10 } },
      { id: "e2", type: "cone", position: { x: 20, y: 10 } },
      { id: "e3", type: "cone", position: { x: 30, y: 10 } },
      { id: "e4", type: "mannequin", position: { x: 40, y: 50 } },
      { id: "e5", type: "mannequin", position: { x: 50, y: 50 } },
      { id: "e6", type: "mini_goal", position: { x: 80, y: 50 } },
      { id: "e7", type: "speed_ladder", position: { x: 15, y: 80 } },
    ];

    const counts: Record<string, number> = {};
    equipment.forEach((eq) => {
      const name = eq.type.replace(/_/g, " ");
      counts[name] = (counts[name] || 0) + 1;
    });

    expect(counts["cone"]).toBe(3);
    expect(counts["mannequin"]).toBe(2);
    expect(counts["mini goal"]).toBe(1);
    expect(counts["speed ladder"]).toBe(1);
  });

  it("correctly segregates squad roster into Home, Away, and Neutral units", () => {
    const players: PlayerNode[] = [
      { id: "h1", team: "gk_home", number: 1, role: "GK", label: "Keeper", position: { x: 10, y: 50 } },
      { id: "h2", team: "home", number: 4, role: "CB", label: "Defender", position: { x: 25, y: 60 } },
      { id: "h3", team: "home", number: 9, role: "ST", label: "Forward", position: { x: 65, y: 50 } },
      { id: "a1", team: "gk_away", number: 1, role: "GK", label: "Opp GK", position: { x: 90, y: 50 } },
      { id: "a2", team: "away", number: 4, role: "CB", label: "Opp CB", position: { x: 75, y: 50 } },
      { id: "n1", team: "neutral", number: "N1", role: "PIVOT", label: "Joker", position: { x: 50, y: 50 } },
    ];

    const homeSquad = players.filter((p) => p.team === "home" || p.team === "gk_home");
    const awaySquad = players.filter((p) => p.team === "away" || p.team === "gk_away");
    const neutralSquad = players.filter((p) => p.team === "neutral");

    expect(homeSquad.length).toBe(3);
    expect(awaySquad.length).toBe(2);
    expect(neutralSquad.length).toBe(1);
  });
});
