import {
  POSE_LANDMARKS,
  SKELETON_CONNECTIONS,
  type PoseLandmark,
  type KinematicAngles,
  type JointAngleMetric,
  type BiomechanicalRating,
} from "./types.ts";

/**
 * Calculates the interior angle (in degrees) at vertex `b` formed by `a-b-c`.
 * Returns degrees between [0, 180].
 */
export function calculateAngle(
  a: PoseLandmark,
  b: PoseLandmark,
  c: PoseLandmark,
): number {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;

  const mag1 = Math.hypot(v1x, v1y);
  const mag2 = Math.hypot(v2x, v2y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const dot = v1x * v2x + v1y * v2y;
  const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return Math.round((Math.acos(cos) * 180) / Math.PI);
}

/**
 * Calculates inclination angle of vector `p1 -> p2` relative to axis.
 * 'horizontal' calculates angle relative to ground plane (0° = horizontal, 90° = vertical).
 * 'vertical' calculates angle relative to plumb line (0° = plumb vertical, 90° = horizontal).
 */
export function calculateInclination(
  p1: PoseLandmark,
  p2: PoseLandmark,
  reference: "horizontal" | "vertical",
): number {
  const dx = Math.abs(p2.x - p1.x);
  // Screen coordinates: Y increases downwards.
  const dy = Math.abs(p2.y - p1.y);

  if (reference === "horizontal") {
    // Angle relative to ground line
    return Math.round((Math.atan2(dy, dx) * 180) / Math.PI);
  } else {
    // Angle relative to vertical plumb line
    return Math.round((Math.atan2(dx, dy) * 180) / Math.PI);
  }
}

/**
 * Rates joint angles against athletic track & field sprint biomechanics standards.
 */
function evaluateRating(
  degrees: number,
  optimalRange: [number, number],
  acceptableRange: [number, number],
  labels: {
    optimal: string;
    acceptable: string;
    needsAttention: string;
    warning: string;
  },
): { rating: BiomechanicalRating; label: string } {
  const [optMin, optMax] = optimalRange;
  const [accMin, accMax] = acceptableRange;

  if (degrees >= optMin && degrees <= optMax) {
    return { rating: "optimal", label: labels.optimal };
  }
  if (degrees >= accMin && degrees <= accMax) {
    return { rating: "acceptable", label: labels.acceptable };
  }
  if (degrees < accMin) {
    return { rating: "needs_attention", label: labels.needsAttention };
  }
  return { rating: "warning", label: labels.warning };
}

/**
 * Extracts key athletic kinematic angles from 33 pose landmarks.
 */
export function extractAthleticKinematics(
  landmarks: PoseLandmark[],
): KinematicAngles | null {
  if (!landmarks || landmarks.length < 33) return null;

  // Determine active/primary side based on visibility/confidence
  const leftVis =
    ((landmarks[POSE_LANDMARKS.LEFT_HIP]?.visibility ?? 1) +
      (landmarks[POSE_LANDMARKS.LEFT_KNEE]?.visibility ?? 1) +
      (landmarks[POSE_LANDMARKS.LEFT_ANKLE]?.visibility ?? 1)) /
    3;
  const rightVis =
    ((landmarks[POSE_LANDMARKS.RIGHT_HIP]?.visibility ?? 1) +
      (landmarks[POSE_LANDMARKS.RIGHT_KNEE]?.visibility ?? 1) +
      (landmarks[POSE_LANDMARKS.RIGHT_ANKLE]?.visibility ?? 1)) /
    3;

  const primarySide: "left" | "right" = rightVis >= leftVis ? "right" : "left";

  const hip =
    primarySide === "right"
      ? landmarks[POSE_LANDMARKS.RIGHT_HIP]
      : landmarks[POSE_LANDMARKS.LEFT_HIP];
  const knee =
    primarySide === "right"
      ? landmarks[POSE_LANDMARKS.RIGHT_KNEE]
      : landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const ankle =
    primarySide === "right"
      ? landmarks[POSE_LANDMARKS.RIGHT_ANKLE]
      : landmarks[POSE_LANDMARKS.LEFT_ANKLE];
  const shoulder =
    primarySide === "right"
      ? landmarks[POSE_LANDMARKS.RIGHT_SHOULDER]
      : landmarks[POSE_LANDMARKS.LEFT_SHOULDER];
  const elbow =
    primarySide === "right"
      ? landmarks[POSE_LANDMARKS.RIGHT_ELBOW]
      : landmarks[POSE_LANDMARKS.LEFT_ELBOW];
  const wrist =
    primarySide === "right"
      ? landmarks[POSE_LANDMARKS.RIGHT_WRIST]
      : landmarks[POSE_LANDMARKS.LEFT_WRIST];

  // 1. Knee Flexion / Drive Angle (Hip -> Knee -> Ankle)
  const kneeDeg = calculateAngle(hip, knee, ankle);
  const kneeEval = evaluateRating(
    kneeDeg,
    [80, 95],
    [70, 105],
    {
      optimal: "Optimal Drive Extension (80–95°)",
      acceptable: "Moderate Extension",
      needsAttention: "Under-extended Knee Drive (<70°)",
      warning: "Reaching / Overstride (>105°)",
    },
  );

  const kneeDriveMetric: JointAngleMetric = {
    name: "Knee Drive Angle",
    degrees: kneeDeg,
    targetRange: [80, 95],
    rating: kneeEval.rating,
    ratingLabel: kneeEval.label,
    category: "power",
  };

  // 2. Shin Inclination Angle (Ankle -> Knee relative to horizontal ground)
  const shinDeg = calculateInclination(ankle, knee, "horizontal");
  const shinEval = evaluateRating(
    shinDeg,
    [40, 50],
    [34, 58],
    {
      optimal: "Aggressive Drive Angle (40–50°)",
      acceptable: "Moderate Shin Angle",
      needsAttention: "Extreme Acute (<34°)",
      warning: "Excessively Vertical / Braking (>58°)",
    },
  );

  const shinMetric: JointAngleMetric = {
    name: "Shin Inclination",
    degrees: shinDeg,
    targetRange: [40, 50],
    rating: shinEval.rating,
    ratingLabel: shinEval.label,
    category: "power",
  };

  // 3. Torso Lean (Shoulder -> Hip relative to plumb vertical)
  const torsoDeg = calculateInclination(shoulder, hip, "vertical");
  const torsoEval = evaluateRating(
    torsoDeg,
    [38, 48],
    [30, 55],
    {
      optimal: "Power Vector Line (38–48°)",
      acceptable: "Acceptable Trunk Lean",
      needsAttention: "Premature Upright Transition (<30°)",
      warning: "Excessive Forward Collapse (>55°)",
    },
  );

  const torsoMetric: JointAngleMetric = {
    name: "Torso Forward Lean",
    degrees: torsoDeg,
    targetRange: [38, 48],
    rating: torsoEval.rating,
    ratingLabel: torsoEval.label,
    category: "posture",
  };

  // 4. Arm Carriage Angle (Shoulder -> Elbow -> Wrist)
  const armDeg = calculateAngle(shoulder, elbow, wrist);
  const armEval = evaluateRating(
    armDeg,
    [85, 100],
    [75, 115],
    {
      optimal: "Compact 90° Arm Lever",
      acceptable: "Moderate Arm Carriage",
      needsAttention: "Over-flexed Arm (<75°)",
      warning: "Straight Arm Drag (>115°)",
    },
  );

  const armMetric: JointAngleMetric = {
    name: "Arm Drive Angle",
    degrees: armDeg,
    targetRange: [85, 100],
    rating: armEval.rating,
    ratingLabel: armEval.label,
    category: "transition",
  };

  return {
    kneeDriveAngle: kneeDriveMetric,
    shinInclinationAngle: shinMetric,
    torsoLeanAngle: torsoMetric,
    armDriveAngle: armMetric,
    primarySide,
  };
}

/**
 * Renders the 33-point pose skeleton onto a 2D HTML Canvas context.
 */
export function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  width: number,
  height: number,
  options?: {
    glowColor?: string;
    jointColor?: string;
    boneWidth?: number;
  },
): void {
  if (!landmarks || landmarks.length < 33) return;

  const glowColor = options?.glowColor ?? "#10b981"; // Emerald
  const jointColor = options?.jointColor ?? "#38bdf8"; // Cyan
  const boneWidth = options?.boneWidth ?? 2.5;

  ctx.save();

  // 1. Draw Bones / Connections
  ctx.lineWidth = boneWidth;
  ctx.strokeStyle = glowColor;
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 8;
  ctx.lineCap = "round";

  for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    if (!start || !end) continue;
    if ((start.visibility ?? 1) < 0.3 || (end.visibility ?? 1) < 0.3) continue;

    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
  }

  // 2. Draw Landmark Joint Nodes
  ctx.shadowBlur = 4;
  ctx.shadowColor = jointColor;
  ctx.fillStyle = jointColor;

  for (let i = 0; i < landmarks.length; i++) {
    const lm = landmarks[i];
    if (!lm || (lm.visibility ?? 1) < 0.3) continue;

    // Emphasize key athletic joints (shoulders, hips, knees, ankles)
    const isMajorJoint = [11, 12, 23, 24, 25, 26, 27, 28].includes(i);
    const radius = isMajorJoint ? 4.5 : 2.5;

    ctx.beginPath();
    ctx.arc(lm.x * width, lm.y * height, radius, 0, 2 * Math.PI);
    ctx.fill();

    if (isMajorJoint) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Draws kinematic angle callout overlays directly on the canvas.
 */
export function drawKinematicCallouts(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  kinematics: KinematicAngles,
  width: number,
  height: number,
): void {
  const isRight = kinematics.primarySide === "right";
  const knee = isRight
    ? landmarks[POSE_LANDMARKS.RIGHT_KNEE]
    : landmarks[POSE_LANDMARKS.LEFT_KNEE];
  const hip = isRight
    ? landmarks[POSE_LANDMARKS.RIGHT_HIP]
    : landmarks[POSE_LANDMARKS.LEFT_HIP];

  if (!knee || !hip) return;

  ctx.save();

  // Helper for drawing badge
  const drawBadge = (
    x: number,
    y: number,
    text: string,
    deg: number,
    color: string,
  ) => {
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    const label = `${text}: ${deg}°`;
    const textWidth = ctx.measureText(label).width;
    const paddingX = 7;
    const heightBox = 20;

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(
      x - textWidth / 2 - paddingX,
      y - heightBox / 2,
      textWidth + paddingX * 2,
      heightBox,
      6,
    );
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, x, y + 1);
  };

  // Knee Drive Callout
  drawBadge(
    knee.x * width + 40,
    knee.y * height - 10,
    "Knee",
    kinematics.kneeDriveAngle.degrees,
    "#34d399",
  );

  // Torso Lean Callout
  drawBadge(
    hip.x * width - 40,
    hip.y * height - 20,
    "Torso",
    kinematics.torsoLeanAngle.degrees,
    "#fbbf24",
  );

  ctx.restore();
}
