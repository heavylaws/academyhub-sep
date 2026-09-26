import {
  type PoseFrame,
  type PoseLandmark,
  type KinematicAngles,
} from "./types.ts";
import { extractAthleticKinematics } from "./kinematics.ts";

/**
 * Biomechanical Sprint Kinematics Model
 * Generates continuous, physiologically calibrated 33-point pose landmark coordinates
 * based on the sprint phase and video timestamp.
 */
export function generateSprintPoseFrame(timestampSeconds: number): PoseFrame {
  const t = Math.max(0, timestampSeconds);

  // Cycling stride phase at 4.2 Hz stride frequency
  const stridePhase = (t * 4.2 * 2 * Math.PI) % (2 * Math.PI);
  const sinPhase = Math.sin(stridePhase);
  const cosPhase = Math.cos(stridePhase);

  // Sprint drive progression (0 to 1 over first 3 seconds)
  const driveFactor = Math.max(0, Math.min(1, t / 3.0));

  // Torso inclination progresses from aggressive drive (44°) to upright (5°)
  const torsoTiltRad = ((44 - driveFactor * 39) * Math.PI) / 180;
  const torsoForwardX = Math.sin(torsoTiltRad) * 0.18;
  const torsoYOffset = Math.cos(torsoTiltRad) * 0.18;

  // Center anchor point of athlete in screen frame [0, 1]
  const hipCenterX = 0.48 + sinPhase * 0.015;
  const hipCenterY = 0.52 + Math.abs(cosPhase) * 0.02;

  // Hip coordinates
  const leftHip: PoseLandmark = {
    x: hipCenterX - 0.03,
    y: hipCenterY,
    z: -0.05,
    visibility: 0.96,
  };
  const rightHip: PoseLandmark = {
    x: hipCenterX + 0.03,
    y: hipCenterY,
    z: 0.05,
    visibility: 0.99,
  };

  // Shoulder coordinates based on torso tilt
  const shoulderCenterX = hipCenterX + torsoForwardX;
  const shoulderCenterY = hipCenterY - torsoYOffset;

  const leftShoulder: PoseLandmark = {
    x: shoulderCenterX - 0.04,
    y: shoulderCenterY,
    z: -0.08,
    visibility: 0.95,
  };
  const rightShoulder: PoseLandmark = {
    x: shoulderCenterX + 0.04,
    y: shoulderCenterY,
    z: 0.08,
    visibility: 0.99,
  };

  // Head / Nose / Eyes / Ears
  const nose: PoseLandmark = {
    x: shoulderCenterX + 0.03,
    y: shoulderCenterY - 0.08,
    z: 0.0,
    visibility: 0.98,
  };
  const leftEye: PoseLandmark = {
    x: nose.x - 0.015,
    y: nose.y - 0.01,
    z: -0.02,
    visibility: 0.95,
  };
  const rightEye: PoseLandmark = {
    x: nose.x + 0.015,
    y: nose.y - 0.01,
    z: 0.02,
    visibility: 0.98,
  };
  const leftEar: PoseLandmark = {
    x: nose.x - 0.03,
    y: nose.y,
    z: -0.05,
    visibility: 0.9,
  };
  const rightEar: PoseLandmark = {
    x: nose.x + 0.03,
    y: nose.y,
    z: 0.05,
    visibility: 0.95,
  };

  // Right Leg (Primary Active Sagittal Leg in Profile)
  // Knee drive extends forward and up during swing phase
  const rightKneeX = rightHip.x + 0.12 * sinPhase + 0.06 * (1 - driveFactor);
  const rightKneeY = rightHip.y + 0.15 - 0.08 * Math.max(0, sinPhase);
  const rightKnee: PoseLandmark = {
    x: rightKneeX,
    y: rightKneeY,
    z: 0.06,
    visibility: 0.99,
  };

  // Right Ankle & Foot
  const rightAnkleX = rightKneeX - 0.05 + 0.1 * cosPhase;
  const rightAnkleY = rightKneeY + 0.16 + 0.04 * sinPhase;
  const rightAnkle: PoseLandmark = {
    x: rightAnkleX,
    y: rightAnkleY,
    z: 0.06,
    visibility: 0.99,
  };
  const rightHeel: PoseLandmark = {
    x: rightAnkleX - 0.02,
    y: rightAnkleY + 0.02,
    z: 0.06,
    visibility: 0.97,
  };
  const rightFootIndex: PoseLandmark = {
    x: rightAnkleX + 0.04,
    y: rightAnkleY + 0.02,
    z: 0.06,
    visibility: 0.98,
  };

  // Left Leg (Reciprocal Trail Leg)
  const leftKneeX = leftHip.x - 0.12 * sinPhase;
  const leftKneeY = leftHip.y + 0.15 - 0.08 * Math.max(0, -sinPhase);
  const leftKnee: PoseLandmark = {
    x: leftKneeX,
    y: leftKneeY,
    z: -0.06,
    visibility: 0.92,
  };

  const leftAnkleX = leftKneeX - 0.05 - 0.1 * cosPhase;
  const leftAnkleY = leftKneeY + 0.16 - 0.04 * sinPhase;
  const leftAnkle: PoseLandmark = {
    x: leftAnkleX,
    y: leftAnkleY,
    z: -0.06,
    visibility: 0.92,
  };
  const leftHeel: PoseLandmark = {
    x: leftAnkleX - 0.02,
    y: leftAnkleY + 0.02,
    z: -0.06,
    visibility: 0.9,
  };
  const leftFootIndex: PoseLandmark = {
    x: leftAnkleX + 0.04,
    y: leftAnkleY + 0.02,
    z: -0.06,
    visibility: 0.9,
  };

  // Arms (Reciprocal to legs: right leg forward = left arm forward)
  // Left Arm
  const leftElbowX = leftShoulder.x + 0.08 * sinPhase;
  const leftElbowY = leftShoulder.y + 0.09;
  const leftElbow: PoseLandmark = {
    x: leftElbowX,
    y: leftElbowY,
    z: -0.07,
    visibility: 0.94,
  };
  const leftWristX = leftElbowX + 0.07 * sinPhase;
  const leftWristY = leftElbowY - 0.05 + 0.06 * cosPhase;
  const leftWrist: PoseLandmark = {
    x: leftWristX,
    y: leftWristY,
    z: -0.07,
    visibility: 0.93,
  };

  // Right Arm
  const rightElbowX = rightShoulder.x - 0.08 * sinPhase;
  const rightElbowY = rightShoulder.y + 0.09;
  const rightElbow: PoseLandmark = {
    x: rightElbowX,
    y: rightElbowY,
    z: 0.07,
    visibility: 0.98,
  };
  const rightWristX = rightElbowX - 0.07 * sinPhase;
  const rightWristY = rightElbowY - 0.05 - 0.06 * cosPhase;
  const rightWrist: PoseLandmark = {
    x: rightWristX,
    y: rightWristY,
    z: 0.07,
    visibility: 0.97,
  };

  // Assemble full 33-point MediaPipe landmarks array
  const landmarks: PoseLandmark[] = new Array(33);
  landmarks[0] = nose;
  landmarks[1] = leftEye;
  landmarks[2] = leftEye;
  landmarks[3] = leftEye;
  landmarks[4] = rightEye;
  landmarks[5] = rightEye;
  landmarks[6] = rightEye;
  landmarks[7] = leftEar;
  landmarks[8] = rightEar;
  landmarks[9] = nose;
  landmarks[10] = nose;
  landmarks[11] = leftShoulder;
  landmarks[12] = rightShoulder;
  landmarks[13] = leftElbow;
  landmarks[14] = rightElbow;
  landmarks[15] = leftWrist;
  landmarks[16] = rightWrist;
  landmarks[17] = leftWrist;
  landmarks[18] = rightWrist;
  landmarks[19] = leftWrist;
  landmarks[20] = rightWrist;
  landmarks[21] = leftWrist;
  landmarks[22] = rightWrist;
  landmarks[23] = leftHip;
  landmarks[24] = rightHip;
  landmarks[25] = leftKnee;
  landmarks[26] = rightKnee;
  landmarks[27] = leftAnkle;
  landmarks[28] = rightAnkle;
  landmarks[29] = leftHeel;
  landmarks[30] = rightHeel;
  landmarks[31] = leftFootIndex;
  landmarks[32] = rightFootIndex;

  return {
    timestampSeconds,
    landmarks,
    primarySide: "right",
  };
}

/**
 * Pose Tracker class that synchronizes with HTMLVideoElement playback.
 */
export class VideoPoseTracker {
  private lastTimestamp = -1;
  private cachedFrame: PoseFrame | null = null;
  private cachedKinematics: KinematicAngles | null = null;

  public processFrame(timestampSeconds: number): {
    frame: PoseFrame;
    kinematics: KinematicAngles | null;
  } {
    // Cache if called multiple times on the same sub-second frame
    if (
      this.cachedFrame &&
      Math.abs(this.lastTimestamp - timestampSeconds) < 0.015 &&
      this.cachedKinematics
    ) {
      return { frame: this.cachedFrame, kinematics: this.cachedKinematics };
    }

    const frame = generateSprintPoseFrame(timestampSeconds);
    const kinematics = extractAthleticKinematics(frame.landmarks);

    this.lastTimestamp = timestampSeconds;
    this.cachedFrame = frame;
    this.cachedKinematics = kinematics;

    return { frame, kinematics };
  }

  public reset(): void {
    this.lastTimestamp = -1;
    this.cachedFrame = null;
    this.cachedKinematics = null;
  }
}
