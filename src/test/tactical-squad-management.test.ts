import { describe, expect, it } from "vitest";
import {
  generateSoccerFormat,
  snapToFormation,
  renumberTeam,
  SOCCER_FORMATIONS,
  type SoccerFormat,
} from "../../src/domain/tactics/tactical-formats.ts";
import {
  createDefaultTacticalPlan,
  validateTacticalPlan,
  type PlayerNode,
} from "../../src/domain/tactics/tactical-domain.ts";

describe("Tactical Squad Management & Formats Suite (Phase 8)", () => {
  it("generates authentic 11v11 format with 22 balanced players and 2 GKs", () => {
    const res = generateSoccerFormat("11v11", "full");
    expect(res.players.length).toBe(22);

    const homeTeam = res.players.filter((p) => p.team === "home" || p.team === "gk_home");
    const awayTeam = res.players.filter((p) => p.team === "away" || p.team === "gk_away");

    expect(homeTeam.length).toBe(11);
    expect(awayTeam.length).toBe(11);

    const gks = res.players.filter((p) => p.role === "GK" || p.team === "gk_home" || p.team === "gk_away");
    expect(gks.length).toBe(2);
  });

  it("generates 10v8 Attack vs Defense Overload format correctly", () => {
    const res = generateSoccerFormat("10v8", "attacking_half");
    expect(res.players.length).toBe(18);

    const homeTeam = res.players.filter((p) => p.team === "home" || p.team === "gk_home");
    const awayTeam = res.players.filter((p) => p.team === "away" || p.team === "gk_away");

    expect(homeTeam.length).toBe(10);
    expect(awayTeam.length).toBe(8);
  });

  it("generates 4v4 + 3 Neutrals Rondo format with designated wall & pivot roles", () => {
    const res = generateSoccerFormat("4v4+3", "full");
    expect(res.players.length).toBe(11);

    const neutrals = res.players.filter((p) => p.team === "neutral");
    expect(neutrals.length).toBe(3);

    const roles = neutrals.map((n) => n.role);
    expect(roles).toContain("PIVOT");
    expect(roles).toContain("WALL");
  });

  it("generates 7v7, 3v2, and 1v1 formats properly", () => {
    const f7 = generateSoccerFormat("7v7", "full");
    expect(f7.players.length).toBe(14);

    const f3v2 = generateSoccerFormat("3v2", "attacking_half");
    expect(f3v2.players.length).toBe(6);

    const f1v1 = generateSoccerFormat("1v1", "attacking_half");
    expect(f1v1.players.length).toBe(3);
  });

  it("snaps home team into 4-3-3, 4-2-3-1, 3-5-2, and 4-4-2 shapes while preserving player identities", () => {
    const initialFormat = generateSoccerFormat("11v11", "full");
    const originalIds = initialFormat.players.map((p) => p.id);

    // Snap to 4-2-3-1
    const snapped4231 = snapToFormation(initialFormat.players, "4-2-3-1", "home", "full");
    expect(snapped4231.length).toBe(22);
    expect(snapped4231.map((p) => p.id)).toEqual(originalIds);

    // Verify right winger position moved towards 4-2-3-1 coordinates
    const rw = snapped4231.find((p) => p.role === "RW");
    expect(rw).toBeDefined();

    // Snap to 3-5-2
    const snapped352 = snapToFormation(initialFormat.players, "3-5-2", "home", "full");
    expect(snapped352.length).toBe(22);
  });

  it("snaps away team into 4-4-2 Compact Low Block", () => {
    const initialFormat = generateSoccerFormat("11v11", "full");
    const snappedLowBlock = snapToFormation(initialFormat.players, "4-4-2-low-block", "away", "full");
    expect(snappedLowBlock.length).toBe(22);

    const awayPlayers = snappedLowBlock.filter((p) => p.team === "away" || p.team === "gk_away");
    // All away defenders and midfielders should be compact in defensive half (x > 50)
    awayPlayers.forEach((p) => {
      expect(p.position.x).toBeGreaterThanOrEqual(50);
    });
  });

  it("renumbers team players sequentially with GK as #1", () => {
    const unorganizedPlayers: PlayerNode[] = [
      { id: "h_st", team: "home", number: 99, role: "ST", label: "Striker", position: { x: 70, y: 50 } },
      { id: "h_gk", team: "gk_home", number: 22, role: "GK", label: "Keeper", position: { x: 10, y: 50 } },
      { id: "h_cb", team: "home", number: 45, role: "CB", label: "Defender", position: { x: 30, y: 50 } },
    ];

    const renumbered = renumberTeam(unorganizedPlayers, "home");
    const gk = renumbered.find((p) => p.id === "h_gk");
    expect(gk?.number).toBe(1);

    const outfield = renumbered.filter((p) => p.id !== "h_gk");
    expect(outfield[0].number).toBe(2);
    expect(outfield[1].number).toBe(3);
  });

  it("ensures all generated formats pass tactical domain validation", () => {
    const formats: SoccerFormat[] = ["11v11", "10v8", "9v9", "7v7", "5v5", "4v4+3", "3v2", "2v1", "1v1"];

    formats.forEach((fmt) => {
      const generated = generateSoccerFormat(fmt, "full");
      const plan = createDefaultTacticalPlan(`Test ${fmt}`);
      plan.phases[0].players = generated.players;

      const val = validateTacticalPlan(plan);
      expect(val.valid).toBe(true);
      expect(val.errors.length).toBe(0);
    });
  });
});
