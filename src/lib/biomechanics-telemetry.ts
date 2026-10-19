export interface KeyframeObservation {
  timestampSec: number;
  phase: string;
  observation: string;
  riskLevel: "low" | "moderate" | "high";
}

export interface JointAngle {
  jointName: string;
  measuredAngleDeg: number;
  idealRangeDeg: string;
  deviationStatus: "optimal" | "suboptimal" | "critical";
}

export interface RecommendedCorrectiveDrill {
  name: string;
  sets: number;
  reps: string;
  focusArea: string;
  coachingCue: string;
}

export interface StructuredTelemetry {
  overallBiomechanicsScore: number;
  keyframeObservations: KeyframeObservation[];
  jointAngles: JointAngle[];
  detectedFlaws: string[];
  recommendedCorrectiveDrills: RecommendedCorrectiveDrill[];
}

export function generateDeterministicTelemetry(
  athleteName: string,
  context?: string,
): {
  feedback: {
    summary: string;
    strengths: string[];
    improvements: string[];
    metrics: { label: string; value: string; note?: string }[];
    recommendations: string[];
  };
  structuredTelemetry: StructuredTelemetry;
} {
  const ctxLower = (context || "").toLowerCase();
  const isSprint =
    ctxLower.includes("sprint") ||
    ctxLower.includes("speed") ||
    ctxLower.includes("run") ||
    ctxLower.includes("acceleration");
  const isJump =
    ctxLower.includes("jump") ||
    ctxLower.includes("landing") ||
    ctxLower.includes("vertical") ||
    ctxLower.includes("hop");

  let overallScore: number;
  let keyframeObservations: KeyframeObservation[];
  let jointAngles: JointAngle[];
  let detectedFlaws: string[];
  let recommendedCorrectiveDrills: RecommendedCorrectiveDrill[];
  let strengths: string[];
  let improvements: string[];
  let metrics: { label: string; value: string; note?: string }[];

  if (isSprint) {
    overallScore = 84;
    keyframeObservations = [
      {
        timestampSec: 0.12,
        phase: "Start / Block Clearance",
        observation:
          "Low center of mass preserved with positive shin angles upon first 2 steps.",
        riskLevel: "low",
      },
      {
        timestampSec: 0.42,
        phase: "Drive Phase (Steps 3-5)",
        observation:
          "Adequate torso lean maintained (~42°); slight contralateral pelvic tilt on right foot plant.",
        riskLevel: "low",
      },
      {
        timestampSec: 0.88,
        phase: "Max Velocity Transition",
        observation:
          "Backside leg recovery slightly delayed, causing premature ground contact ahead of center of mass.",
        riskLevel: "moderate",
      },
      {
        timestampSec: 1.25,
        phase: "Terminal Stride Cycle",
        observation:
          "Ankle dorsiflexion remains rigid at pre-activation; good horizontal braking mitigation.",
        riskLevel: "low",
      },
    ];

    jointAngles = [
      {
        jointName: "Shin Angle (Ground Strike)",
        measuredAngleDeg: 46,
        idealRangeDeg: "42° - 48°",
        deviationStatus: "optimal",
      },
      {
        jointName: "Knee Flexion (Mid-Stance)",
        measuredAngleDeg: 144,
        idealRangeDeg: "148° - 160°",
        deviationStatus: "suboptimal",
      },
      {
        jointName: "Hip Extension (Late Stance)",
        measuredAngleDeg: 182,
        idealRangeDeg: "180° - 190°",
        deviationStatus: "optimal",
      },
      {
        jointName: "Torso Incline (Drive Phase)",
        measuredAngleDeg: 41,
        idealRangeDeg: "40° - 45°",
        deviationStatus: "optimal",
      },
      {
        jointName: "Contralateral Pelvic Drop",
        measuredAngleDeg: 8,
        idealRangeDeg: "0° - 4°",
        deviationStatus: "critical",
      },
    ];

    detectedFlaws = [
      "Pelvic drop (Trendelenburg sign) on right stance phase",
      "Overstriding on stride 6 with minor braking deceleration",
      "Delayed dorsiflexion pre-activation during swing recovery",
    ];

    recommendedCorrectiveDrills = [
      {
        name: "Single-Leg Pogo Hops with Dorsiflexion Lock",
        sets: 3,
        reps: "15 reps/side",
        focusArea: "Achilles Tendon Stiffness & Reactive Ankle Stiffness",
        coachingCue:
          "Stiff spring off ball of foot, toes pulled actively toward shin.",
      },
      {
        name: "Wicket Run Acceleration Series",
        sets: 4,
        reps: "20m sprint",
        focusArea: "Frontside Stride Mechanics & Overstriding Prevention",
        coachingCue:
          "Step down over the wickets, do not reach; cycle heel under pelvis.",
      },
      {
        name: "Side Plank with Abductor Hip Pulse",
        sets: 3,
        reps: "12 reps/side",
        focusArea: "Gluteus Medius Strength & Lateral Pelvic Stability",
        coachingCue:
          "Keep ribs tucked, avoid hip sag, pulse top leg toward ceiling under control.",
      },
    ];

    strengths = [
      "Aggressive projection angle during initial acceleration steps",
      "Sustained posture through mid-drive transition",
      "Rapid ground contact time (<110ms) during upright sprint phase",
    ];
    improvements = [
      "Right gluteus medius stabilization to eliminate lateral pelvic sway",
      "Frontside knee drive amplitude to prevent backside recovery drag",
    ];
    metrics = [
      { label: "Ground Contact Time", value: "108 ms", note: "Target: <115 ms" },
      { label: "Drive Angle", value: "41.5°", note: "Ideal range: 40°–45°" },
      { label: "Step Cadence", value: "4.3 steps/s", note: "Elite benchmark: 4.2–4.5" },
    ];
  } else if (isJump) {
    overallScore = 76;
    keyframeObservations = [
      {
        timestampSec: 0.18,
        phase: "Countermovement Descent",
        observation: "Smooth eccentric loading with symmetrical bilateral hip hinge.",
        riskLevel: "low",
      },
      {
        timestampSec: 0.44,
        phase: "Amortization & Peak Bottom Depth",
        observation:
          "Dynamic bilateral knee valgus collapse noted as knee flexes past 90 degrees.",
        riskLevel: "high",
      },
      {
        timestampSec: 0.72,
        phase: "Takeoff Propulsion",
        observation: "Powerful vertical extension; head neutral with full plantarflexion.",
        riskLevel: "low",
      },
      {
        timestampSec: 1.15,
        phase: "Deceleration & Landing Absorption",
        observation:
          "Stiff landing with dominant quad load and reduced ankle-knee flexion excursion.",
        riskLevel: "moderate",
      },
    ];

    jointAngles = [
      {
        jointName: "Knee Valgus (Amortization)",
        measuredAngleDeg: 14,
        idealRangeDeg: "0° - 5°",
        deviationStatus: "critical",
      },
      {
        jointName: "Peak Knee Flexion Depth",
        measuredAngleDeg: 88,
        idealRangeDeg: "85° - 95°",
        deviationStatus: "optimal",
      },
      {
        jointName: "Trunk Forward Inclination",
        measuredAngleDeg: 28,
        idealRangeDeg: "25° - 35°",
        deviationStatus: "optimal",
      },
      {
        jointName: "Ankle Landing Dorsiflexion",
        measuredAngleDeg: 22,
        idealRangeDeg: "30° - 40°",
        deviationStatus: "suboptimal",
      },
    ];

    detectedFlaws = [
      "Dynamic bilateral knee valgus during rapid eccentric amortization",
      "Stiff landing mechanics with high peak vertical ground reaction forces",
      "Suboptimal posterior chain engagement on landing deceleration",
    ];

    recommendedCorrectiveDrills = [
      {
        name: "Depth Drop to Symmetrical Athletic Stick",
        sets: 4,
        reps: "6 reps",
        focusArea: "Eccentric Deceleration & Landing Force Absorption",
        coachingCue:
          "Land as quiet as a feather, hips back, knees tracking directly over 2nd toes.",
      },
      {
        name: "Band-Resisted Spanish Squats with Iso Hold",
        sets: 3,
        reps: "10 reps",
        focusArea: "Quadriceps Tendon Loading & Tibiofemoral Alignment",
        coachingCue:
          "Vertical shins against heavy loop band, 3-second isometric pause at 90°.",
      },
      {
        name: "Single-Leg Roman Chair Romanian Deadlift",
        sets: 3,
        reps: "8 reps/side",
        focusArea: "Hamstring-to-Quad Co-Contraction Ratio",
        coachingCue: "Hinge from hip, flat back, squeeze glute at lockout.",
      },
    ];

    strengths = [
      "Explosive concentric rate of force development",
      "Full triple-extension achieved at takeoff",
    ];
    improvements = [
      "Valgus elimination through active external hip rotator recruitment",
      "Soft, biomechanically compliant landing progression",
    ];
    metrics = [
      { label: "Peak Jump Height", value: "54.2 cm", note: "Cohort mean: 49.8 cm" },
      { label: "RSI-Modified", value: "0.41", note: "Reactive Strength Index" },
      { label: "Landing Asymmetry", value: "4.2%", note: "Target: <8%" },
    ];
  } else {
    overallScore = 80;
    keyframeObservations = [
      {
        timestampSec: 0.15,
        phase: "Preparation & Approach",
        observation:
          "Controlled decelerating strides lowering center of mass into cutting zone.",
        riskLevel: "low",
      },
      {
        timestampSec: 0.50,
        phase: "Penultimate Foot Contact",
        observation:
          "Good braking redistribution to unload final redirection plant step.",
        riskLevel: "low",
      },
      {
        timestampSec: 0.82,
        phase: "Plant & Redirection Step",
        observation:
          "Lateral trunk lean exceeds optimal boundary; elevated knee valgus stress on plant leg.",
        riskLevel: "moderate",
      },
      {
        timestampSec: 1.10,
        phase: "Re-Acceleration Exit",
        observation: "Crisp first crossover step with rapid arm drive redirection.",
        riskLevel: "low",
      },
    ];

    jointAngles = [
      {
        jointName: "Plant Knee Valgus Angle",
        measuredAngleDeg: 11,
        idealRangeDeg: "0° - 6°",
        deviationStatus: "critical",
      },
      {
        jointName: "Penultimate Braking Knee Flexion",
        measuredAngleDeg: 52,
        idealRangeDeg: "45° - 60°",
        deviationStatus: "optimal",
      },
      {
        jointName: "Lateral Trunk Lean",
        measuredAngleDeg: 19,
        idealRangeDeg: "5° - 12°",
        deviationStatus: "suboptimal",
      },
      {
        jointName: "Exit Stride Hip Extension",
        measuredAngleDeg: 174,
        idealRangeDeg: "170° - 185°",
        deviationStatus: "optimal",
      },
    ];

    detectedFlaws = [
      "Excessive lateral trunk tilt compensating for hip abductor weakness",
      "Plant foot angled outwards >30° increasing medial knee shear",
    ];

    recommendedCorrectiveDrills = [
      {
        name: "505 Agility Plant & Redirect Deceleration Drill",
        sets: 4,
        reps: "4 reps/side",
        focusArea: "Cutting Biomechanics & Knee Shear Force Attenuation",
        coachingCue: "Load the penultimate foot heavily; turn shoulders before hips.",
      },
      {
        name: "Lateral Bounds with 2-Second Isometric Stick",
        sets: 3,
        reps: "6 reps/side",
        focusArea: "Frontal Plane Ground Reaction Force Absorption",
        coachingCue: "Explode laterally, stick the landing with knee soft and square.",
      },
      {
        name: "Half-Kneeling Pallof Press with Lateral Cable Pull",
        sets: 3,
        reps: "10 reps/side",
        focusArea: "Anti-Lateral Flexion Core & Trunk Control",
        coachingCue:
          "Lock down pelvis and ribcage; resist rotational torque from cable.",
      },
    ];

    strengths = [
      "Aggressive penultimate foot braking deceleration",
      "Rapid re-acceleration kinematics out of the turn",
    ];
    improvements = [
      "Frontal plane trunk stabilization on sharp directional changes",
      "Plant foot alignment relative to vector of travel",
    ];
    metrics = [
      { label: "Cutting Angle", value: "72°", note: "Target: 70°–80°" },
      { label: "Deceleration Time", value: "0.38 s", note: "Penultimate to plant" },
      { label: "Exit Velocity", value: "5.6 m/s", note: "First 5m post-cut" },
    ];
  }

  const feedback = {
    summary: `${athleteName} demonstrated solid athletic movement foundations with an overall biomechanics score of ${overallScore}/100. Key areas for technical refinement center on controlling dynamic joint angles during maximum deceleration and load absorption.`,
    strengths,
    improvements,
    metrics,
    recommendations: recommendedCorrectiveDrills.map(
      (d) => `${d.name} (${d.sets} sets × ${d.reps}): ${d.coachingCue}`,
    ),
  };

  const structuredTelemetry: StructuredTelemetry = {
    overallBiomechanicsScore: overallScore,
    keyframeObservations,
    jointAngles,
    detectedFlaws,
    recommendedCorrectiveDrills,
  };

  return { feedback, structuredTelemetry };
}
