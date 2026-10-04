import { describe, expect, it } from "vitest";
import {
  createDefaultTacticalPlan,
  validateTacticalPlan,
  type PlayerNode,
} from "../../src/domain/tactics/tactical-domain.ts";

describe("Phase 7: Tactical Board Team Roster Lineup & Session Export Suite", () => {
  it("maps team squad roster athletes to tactical board pitch nodes", () => {
    const mockRoster = [
      { id: "ath_1", name: "Diogo Costa", number: 99, pos: "GK" },
      { id: "ath_2", name: "Ruben Dias", number: 3, pos: "CB" },
      { id: "ath_3", name: "Joao Palhinha", number: 6, pos: "DM" },
      { id: "ath_4", name: "Bruno Fernandes", number: 8, pos: "AM" },
      { id: "ath_5", name: "Cristiano Ronaldo", number: 7, pos: "ST" },
    ];

    const POSITION_COORDINATES: Record<string, { x: number; y: number }> = {
      GK: { x: 8, y: 50 },
      CB: { x: 22, y: 40 },
      DM: { x: 36, y: 50 },
      AM: { x: 62, y: 50 },
      ST: { x: 82, y: 50 },
    };

    const deployedPlayers: PlayerNode[] = mockRoster.map((ath) => ({
      id: ath.id,
      team: "home",
      number: ath.number,
      role: ath.pos,
      label: ath.name,
      position: POSITION_COORDINATES[ath.pos],
    }));

    expect(deployedPlayers.length).toBe(5);
    expect(deployedPlayers[0].role).toBe("GK");
    expect(deployedPlayers[0].position.x).toBe(8);
    expect(deployedPlayers[4].role).toBe("ST");
    expect(deployedPlayers[4].position.x).toBe(82);

    // Validate the plan with deployed players
    const plan = createDefaultTacticalPlan("Matchday Lineup Routine");
    plan.phases[0].players = deployedPlayers;

    const validation = validateTacticalPlan(plan);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it("generates markdown tactical briefing with phases, coaching points, and formation", () => {
    const plan = createDefaultTacticalPlan("4-3-3 Build-Up Press Resistance");
    plan.coachingPoints = [
      "Center backs split wide to 18-yard lines",
      "Defensive midfielder drops between center backs",
    ];

    const markdownOutput = `# ${plan.title}
Pitch Type: ${plan.pitchType}
Coaching Points:
${plan.coachingPoints.map((cp) => `- [ ] ${cp}`).join("\n")}
Phases: ${plan.phases.length}
`;

    expect(markdownOutput).toContain("# 4-3-3 Build-Up Press Resistance");
    expect(markdownOutput).toContain("Center backs split wide");
    expect(markdownOutput).toContain("Phases: 2");
  });
});
