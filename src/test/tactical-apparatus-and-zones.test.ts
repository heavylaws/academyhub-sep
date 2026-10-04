import { describe, expect, it } from "vitest";
import {
  createDefaultTacticalPlan,
  validateTacticalPlan,
  type EquipmentNode,
  type EquipmentType,
  type TacticalAnnotation,
  type AnnotationType,
} from "../../src/domain/tactics/tactical-domain.ts";

describe("Phase 9: Field Apparatus & Tactical Zones Suite", () => {
  it("validates all 9 field training apparatus types without domain errors", () => {
    const apparatusTypes: EquipmentType[] = [
      "cone",
      "mannequin",
      "mini_goal",
      "agility_pole",
      "hurdle",
      "speed_ladder",
      "passing_gate",
      "rebounder_board",
      "ball_cart",
    ];

    const plan = createDefaultTacticalPlan("Apparatus Verification");
    plan.phases[0].equipment = apparatusTypes.map((type, i) => ({
      id: `eq_${type}_${i}`,
      type,
      position: { x: 10 + i * 9, y: 50 },
      rotation: i * 45,
      label: type.replace(/_/g, " "),
    }));

    const val = validateTacticalPlan(plan);
    expect(val.valid).toBe(true);
    expect(val.errors.length).toBe(0);
    expect(val.normalizedPlan?.phases[0].equipment.length).toBe(9);

    // Verify all types are preserved exactly
    const normalizedTypes = val.normalizedPlan?.phases[0].equipment.map((e) => e.type);
    expect(normalizedTypes).toEqual(apparatusTypes);
  });

  it("validates all 8 tactical annotation types including cover_shadow and defensive_block", () => {
    const annotationTypes: AnnotationType[] = [
      "pass_line",
      "run_arrow",
      "dribble_wave",
      "press_zone",
      "cover_shadow",
      "defensive_block",
      "freehand",
      "text",
    ];

    const plan = createDefaultTacticalPlan("Tactical Zones Verification");
    plan.phases[0].annotations = annotationTypes.map((type, i) => ({
      id: `ann_${type}_${i}`,
      type,
      points: [
        { x: 20 + i * 5, y: 30 },
        { x: 30 + i * 5, y: 60 },
      ],
      color: "#EF4444",
      width: 2,
      label: type,
    }));

    const val = validateTacticalPlan(plan);
    expect(val.valid).toBe(true);
    expect(val.errors.length).toBe(0);
    expect(val.normalizedPlan?.phases[0].annotations.length).toBe(8);

    const verifiedTypes = val.normalizedPlan?.phases[0].annotations.map((a) => a.type);
    expect(verifiedTypes).toEqual(annotationTypes);
  });

  it("normalizes and bounds apparatus coordinates within field limits", () => {
    const plan = createDefaultTacticalPlan("Apparatus Bounds Check");
    plan.phases[0].equipment = [
      {
        id: "eq_out_of_bounds",
        type: "rebounder_board",
        position: { x: 150, y: -20 }, // coordinates exceeding [0, 100]
      },
    ];

    const val = validateTacticalPlan(plan);
    expect(val.valid).toBe(true);
    const normalizedEq = val.normalizedPlan?.phases[0].equipment[0];
    expect(normalizedEq?.position.x).toBe(100);
    expect(normalizedEq?.position.y).toBe(0);
  });
});
