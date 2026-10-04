import { describe, expect, it } from "vitest";
import {
  clampCoordinate,
  type PlayerNode,
} from "../../src/domain/tactics/tactical-domain.ts";
import { generateSoccerFormat } from "../../src/domain/tactics/tactical-formats.ts";

describe("Phase 10: Pitch-Side Touch & Lasso Multi-Select Suite", () => {
  it("accurately captures defensive back 4 unit using a marquee bounding box", () => {
    const format = generateSoccerFormat("11v11", "full");

    // Marquee bounding box enclosing the home backline: x from 20 to 35, y from 10 to 90
    const minX = 20;
    const maxX = 35;
    const minY = 10;
    const maxY = 90;

    const capturedDefenders = format.players.filter(
      (p) =>
        (p.team === "home" || p.team === "gk_home") &&
        p.position.x >= minX &&
        p.position.x <= maxX &&
        p.position.y >= minY &&
        p.position.y <= maxY,
    );

    // Should capture RB (28, 86), Right CB (24, 62), Left CB (24, 38), and LB (28, 14)
    expect(capturedDefenders.length).toBe(4);
    const roles = capturedDefenders.map((d) => d.role);
    expect(roles).toContain("RB");
    expect(roles).toContain("LB");
    expect(roles).toContain("CB");
  });

  it("translates multi-selected unit in unison preserving relative spacing", () => {
    const unit: PlayerNode[] = [
      { id: "p_lb", team: "home", number: 3, role: "LB", label: "Left Back", position: { x: 25, y: 15 } },
      { id: "p_lcb", team: "home", number: 5, role: "CB", label: "Left CB", position: { x: 23, y: 38 } },
      { id: "p_rcb", team: "home", number: 4, role: "CB", label: "Right CB", position: { x: 23, y: 62 } },
      { id: "p_rb", team: "home", number: 2, role: "RB", label: "Right Back", position: { x: 25, y: 85 } },
    ];

    const initialYDist = unit[1].position.y - unit[0].position.y;

    // Move unit forward by +15% and shift right by +5%
    const deltaX = 15;
    const deltaY = 5;

    const movedUnit = unit.map((p) => ({
      ...p,
      position: {
        x: clampCoordinate(p.position.x + deltaX),
        y: clampCoordinate(p.position.y + deltaY),
      },
    }));

    expect(movedUnit[0].position.x).toBe(40);
    expect(movedUnit[0].position.y).toBe(20);
    expect(movedUnit[1].position.x).toBe(38);
    expect(movedUnit[1].position.y).toBe(43);

    // Spacing between players must be perfectly preserved
    const newYDist = movedUnit[1].position.y - movedUnit[0].position.y;
    expect(newYDist).toBe(initialYDist);
  });

  it("safely clamps unit players within [0, 100] when dragged near pitch boundary", () => {
    const unit: PlayerNode[] = [
      { id: "p_w", team: "home", number: 7, role: "RW", label: "Right Winger", position: { x: 92, y: 95 } },
    ];

    // Attempt to drag +20% beyond pitch edge
    const moved = unit.map((p) => ({
      ...p,
      position: {
        x: clampCoordinate(p.position.x + 20),
        y: clampCoordinate(p.position.y + 20),
      },
    }));

    expect(moved[0].position.x).toBe(100);
    expect(moved[0].position.y).toBe(100);
  });
});
