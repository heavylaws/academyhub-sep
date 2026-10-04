import { describe, expect, it } from "vitest";
import {
  createDefaultTacticalPlan,
  createBasketballTacticalPlan,
  createFutsalTacticalPlan,
  createHandballTacticalPlan,
  createVolleyballTacticalPlan,
  createRugbyTacticalPlan,
  validateTacticalPlan,
} from "../../src/domain/tactics/tactical-domain.ts";

describe("Multi-Sport Tactical Board Integration Suite", () => {
  it("generates and validates a basketball tactical plan", () => {
    const plan = createBasketballTacticalPlan();
    expect(plan.pitchType).toBe("basketball_half");
    expect(plan.sport).toBe("basketball");
    expect(plan.phases.length).toBeGreaterThanOrEqual(1);

    const validation = validateTacticalPlan(plan);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);

    const players = plan.phases[0].players;
    const pg = players.find((p) => p.role === "PG");
    expect(pg).toBeDefined();
    expect(pg?.hasBall).toBe(true);
  });

  it("generates and validates a futsal tactical plan", () => {
    const plan = createFutsalTacticalPlan();
    expect(plan.pitchType).toBe("futsal_court");
    expect(plan.sport).toBe("futsal");

    const validation = validateTacticalPlan(plan);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);

    const roles = plan.phases[0].players.map((p) => p.role);
    expect(roles).toContain("Fixo");
    expect(roles).toContain("Pivô");
  });

  it("generates and validates a handball tactical plan", () => {
    const plan = createHandballTacticalPlan();
    expect(plan.pitchType).toBe("handball_court");
    expect(plan.sport).toBe("handball");

    const validation = validateTacticalPlan(plan);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);
  });

  it("generates and validates a volleyball tactical plan", () => {
    const plan = createVolleyballTacticalPlan();
    expect(plan.pitchType).toBe("volleyball_court");
    expect(plan.sport).toBe("volleyball");

    const validation = validateTacticalPlan(plan);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);

    const roles = plan.phases[0].players.map((p) => p.role);
    expect(roles).toContain("S");
    expect(roles).toContain("L");
  });

  it("generates and validates a rugby tactical plan", () => {
    const plan = createRugbyTacticalPlan();
    expect(plan.pitchType).toBe("rugby_pitch");
    expect(plan.sport).toBe("rugby");

    const validation = validateTacticalPlan(plan);
    expect(validation.valid).toBe(true);
    expect(validation.errors.length).toBe(0);

    const roles = plan.phases[0].players.map((p) => p.role);
    expect(roles).toContain("SH");
    expect(roles).toContain("FH");
  });

  it("validates pitch types across all sports without rejecting multi-sport courts", () => {
    const sportsPitches = [
      "full",
      "attacking_half",
      "defending_half",
      "penalty_box",
      "rondo_grid",
      "basketball_full",
      "basketball_half",
      "futsal_court",
      "handball_court",
      "volleyball_court",
      "rugby_pitch",
    ] as const;

    sportsPitches.forEach((pitchType) => {
      const plan = createDefaultTacticalPlan(`Test for ${pitchType}`);
      plan.pitchType = pitchType;
      const res = validateTacticalPlan(plan);
      expect(res.valid).toBe(true);
      expect(res.normalizedPlan?.pitchType).toBe(pitchType);
    });
  });
});
