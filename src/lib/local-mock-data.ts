// Clean mock seed data — Platform admin comes only from /admins/{uid}

export interface MockAcademy {
  _id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  nextInvoiceNumber?: number;
  createdAt: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
}

export interface MockUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role?:
    | "platform_admin"
    | "academy_admin"
    | "sporting_director"
    | "medical_staff"
    | "coach"
    | "athlete"
    | "accounting"
    | "guardian";
  academyId?: string;
  tokenIdentifier: string;
}

export interface MockAthlete {
  _id: string;
  academyId: string;
  userId?: string;
  guardianUserId?: string;
  guardianEmail?: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  sport?: string;
  heightCm?: number;
  weightKg?: number;
  email?: string;
  phone?: string;
  guardianName?: string;
  guardianPhone?: string;
  notes?: string;
  status: "active" | "inactive";
  checkInPin?: string;
  createdBy?: string;
  createdAt: string;
}

export interface MockTeam {
  _id: string;
  academyId: string;
  name: string;
  sport?: string;
  createdBy?: string;
  createdAt: string;
}

export interface MockTeamMember {
  _id: string;
  teamId: string;
  athleteId: string;
  joinedAt: string;
}

export interface MockFacility {
  _id: string;
  academyId: string;
  name: string;
  type: "pitch" | "court" | "gym" | "pool" | "classroom" | "other";
  surfaceType?: string;
  capacity?: number;
  status: "available" | "maintenance" | "closed";
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MockTrainingSession {
  _id: string;
  academyId: string;
  teamId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  location?: string;
  notes?: string;
  tacticalPlanId?: string;
  drillIds?: string[];
  facilityId?: string;
  sessionType?: "training" | "match_competitive" | "match_friendly" | "recovery" | "testing";
  microcycleDay?: "MD-4" | "MD-3" | "MD-2" | "MD-1" | "MD" | "MD+1" | "MD+2" | "general";
  matchDetails?: {
    opponentName: string;
    homeAway: "home" | "away" | "neutral";
    competitionName?: string;
    goalsFor?: number;
    goalsAgainst?: number;
    formation?: string;
    matchSummary?: string;
  };
  createdBy: string;
  createdAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface MockAttendanceRecord {
  _id: string;
  sessionId: string;
  athleteId: string;
  academyId?: string;
  status: "present" | "late" | "excused" | "absent";
  markedAt?: string;
  markedBy?: string;
  recordedAt?: string;
  recordedBy?: string;
  durationMinutes?: number;
  rpe?: number;
  sessionLoad?: number;
  wellnessFatigue?: number;
  wellnessSoreness?: number;
  loggedAt?: number;
  matchStats?: {
    started: boolean;
    minutesPlayed: number;
    goalsOrPoints?: number;
    assists?: number;
    yellowCards?: number;
    redCards?: number;
    coachRating?: number;
  };
}

export interface MockInjury {
  _id: string;
  academyId: string;
  athleteId: string;
  availabilityStatus: "fit" | "modified_training" | "injured_out" | "illness";
  bodyPart: string;
  laterality?: "left" | "right" | "bilateral" | "midline" | "not_applicable";
  mechanism: "contact" | "non_contact_overload" | "non_contact_acute" | "illness" | "other";
  severity: "minor_1_7_days" | "moderate_8_28_days" | "severe_28_plus_days";
  injuryDate: number;
  expectedReturnDate?: number;
  actualReturnDate?: number;
  isResolved: boolean;
  coachingRestrictions?: string;
  clinicalNotes?: string;
  recordedByUserId: string;
  updatedAt: number;
}

export interface MockWorkoutLog {
  _id: string;
  academyId: string;
  athleteId: string;
  trainingPlanId: string;
  completedAt: number;
  durationMinutes: number;
  rpe: number;
  calculatedLoad: number;
  completedExercises: {
    exerciseName: string;
    setsCompleted: number;
    repsCompleted: string;
    weightKg?: number;
  }[];
  athleteNotes?: string;
  loggedByUserId: string;
}


export interface MockTrainingPlan {
  _id: string;
  academyId: string;
  athleteId?: string;
  title: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  endDate?: string;
  status: "active" | "completed" | "archived";
  assignedBy?: string;
  createdBy?: string;
  createdAt: string;
  phase?: "pre_season" | "in_season_early" | "in_season_peak" | "transition_off_season" | "rehab_return_to_play";
  microcycleTag?: string;
  targetAgeGroup?: string;
  sourceTemplateId?: string;
  isTemplate?: boolean;
}

export interface MockPlanItem {
  _id: string;
  planId: string;
  order: number;
  exercise: string;
  target?: string;
  notes?: string;
  result?: string;
  completed: boolean;
  completedAt?: string;
}

export interface MockAssessment {
  _id: string;
  academyId: string;
  athleteId: string;
  sessionId?: string;
  metric: string;
  value: number;
  unit: string;
  notes?: string;
  corner?: "physical" | "technical" | "tactical" | "psychological";
  optimizationDirection?: "higher_is_better" | "lower_is_better";
  ageGroupSnapshot?: string;
  assessedOn: string;
  assessedBy?: string;
  conductedBy?: string;
  createdAt: string;
}

export interface MockAthleteGoal {
  _id: string;
  academyId: string;
  athleteId: string;
  createdByUserId: string;
  title: string;
  corner: "physical" | "technical" | "tactical" | "psychological";
  linkedMetricName?: string;
  baselineValue?: number;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  optimizationDirection?: "higher_is_better" | "lower_is_better";
  targetDate: string;
  status: "in_progress" | "achieved" | "at_risk" | "archived";
  actionPlanNotes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MockVideoAnalysis {
  _id: string;
  academyId: string;
  athleteId: string;
  storageId: string;
  filename: string;
  context?: string;
  status:
    | "pending"
    | "analyzing"
    | "complete"
    | "completed"
    | "failed"
    | "uploading"
    | "queued"
    | "processing";
  requestedAt: string;
  completedAt?: string;
  feedback?: {
    summary: string;
    strengths: string[];
    improvements: string[];
    metrics: { label: string; value: string; note?: string }[];
    recommendations: string[];
  };
  errorMessage?: string;
  retryCount?: number;
  lastError?: string;
  structuredTelemetry?: {
    overallBiomechanicsScore: number;
    keyframeObservations: {
      timestampSec: number;
      phase: string;
      observation: string;
      riskLevel: "low" | "moderate" | "high";
    }[];
    jointAngles: {
      jointName: string;
      measuredAngleDeg: number;
      idealRangeDeg: string;
      deviationStatus: "optimal" | "suboptimal" | "critical";
    }[];
    detectedFlaws: string[];
    recommendedCorrectiveDrills: {
      name: string;
      sets: number;
      reps: string;
      focusArea: string;
      coachingCue: string;
    }[];
  };
  appliedToPlanId?: string;
  appliedAt?: number;
  createdBy: string;
}

export interface MockAthleteFee {
  _id: string;
  academyId: string;
  athleteId: string;
  label?: string;
  title?: string;
  amountDue: number;
  currency: string;
  dueDate: string;
  period?: string;
  notes?: string;
  status: "unpaid" | "partially_paid" | "paid" | "overdue" | "pending" | "partial";
  createdBy?: string;
  createdAt: string;
}

export interface MockFeePayment {
  _id: string;
  feeId: string;
  amountPaid: number;
  paidAt: string;
  recordedBy: string;
  paymentMethod?: "cash" | "card" | "bank_transfer" | "other";
  notes?: string;
  note?: string;
}

export interface MockInvoice {
  _id: string;
  academyId: string;
  athleteId?: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  note?: string;
  issuedAt: string;
  paidAt?: string;
  createdBy: string;
}

export interface MockInvite {
  _id: string;
  academyId: string;
  email: string;
  role: "academy_admin" | "coach" | "athlete" | "accounting" | "guardian";
  password?: string;
  status: "pending" | "accepted" | "expired" | "cancelled";
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}

export interface MockAnnouncement {
  _id: string;
  academyId: string;
  title: string;
  content: string;
  category: "weather" | "meet_schedule" | "facility" | "fees" | "general";
  priority: "urgent" | "important" | "normal";
  targetTeamId?: string;
  targetRole?: string;
  isPinned: boolean;
  expiresAt?: string;
  createdBy: string;
  authorName?: string;
  createdAt: string;
}

export interface MockConversation {
  _id: string;
  academyId: string;
  participantIds: string[];
  participantUids?: string[];
  athleteId?: string;
  title?: string;
  contextType?: "session" | "video" | "general";
  contextId?: string;
  contextTitle?: string;
  lastMessageText?: string;
  lastMessageAt?: string;
  lastSenderId?: string;
  createdAt: string;
}

export interface MockMessage {
  _id: string;
  conversationId: string;
  academyId: string;
  senderId: string;
  content: string;
  readBy: string[];
  createdAt: string;
}

export interface MockDrill {
  _id: string;
  academyId: string;
  title: string;
  ageGroup: "U6-U8" | "U9-U10" | "U11-U12" | "U13-U14" | "U15-U16" | "All U16";
  birthYears: string;
  category: string;
  categoryLabel: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  durationMinutes: number;
  durationSeconds?: number;
  recommendedSets: number;
  recommendedReps: number;
  gridDimensions: string;
  equipment: string[];
  summary: string;
  setup: string;
  instructions: string[];
  coachingPoints: string[];
  variations: string[];
  metricName: string;
  metricUnit: string;
  benchmark: number;
  isLowerBetter: boolean;
  targetAttribute:
    | "Speed"
    | "Power"
    | "Agility"
    | "Strength"
    | "Endurance"
    | "Mobility"
    | "Technical"
    | "Tactical";
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string;
}

// Clean Initial Academies — only Hercules Sports Academy is allowed
export const SEED_ACADEMIES: MockAcademy[] = [
  {
    _id: "acad_hercules",
    name: "Hercules Sports Academy",
    slug: "hercules-sports",
    status: "active",
    nextInvoiceNumber: 101,
    createdAt: "2026-09-29T12:00:00.000Z",
  },
];

// Clean user list for mock authentication
export const SEED_USERS: MockUser[] = [
  // Head Coach (Hercules Academy) - Primary demo account
  {
    _id: "usr_coach_hercules",
    name: "Dave Miller",
    email: "adminhercules@academieshub.com",
    password: "hercules2026!",
    role: "coach",
    academyId: "acad_hercules",
    tokenIdentifier: "mock|usr_coach_hercules",
  },
  // Coach (Dave Miller)
  {
    _id: "usr_coach",
    name: "Dave Miller",
    email: "dave.miller@test.local",
    password: "hercules2026!",
    role: "coach",
    academyId: "acad_hercules",
    tokenIdentifier: "mock|usr_coach",
  },
  // Academy Admin (Alex Thorne)
  {
    _id: "usr_admin",
    name: "Alex Thorne",
    email: "alex.admin@test.local",
    password: "Admin-123456",
    role: "academy_admin",
    academyId: "acad_hercules",
    tokenIdentifier: "mock|usr_admin",
  },
  // Athlete (Marcus Vance)
  {
    _id: "usr_athlete",
    name: "Marcus Vance",
    email: "marcus.vance@test.local",
    password: "Athlete-123456",
    role: "athlete",
    academyId: "acad_hercules",
    tokenIdentifier: "mock|usr_athlete",
  },
  // Guardian (Sarah Vance)
  {
    _id: "usr_guardian",
    name: "Sarah Vance",
    email: "sarah.guardian@test.local",
    password: "Guardian-123456",
    role: "guardian",
    academyId: "acad_hercules",
    tokenIdentifier: "mock|usr_guardian",
  },
  // Accounting (Finance Manager)
  {
    _id: "usr_accounting",
    name: "Finance Manager",
    email: "finance@test.local",
    password: "Finance-123456",
    role: "accounting",
    academyId: "acad_hercules",
    tokenIdentifier: "mock|usr_accounting",
  },
  // Platform Admin (system test account)
  {
    _id: "usr_superadmin",
    name: "Platform Admin",
    email: "ah.baalbaki@gmail.com",
    password: "A!t3r3g0",
    role: "platform_admin",
    academyId: "acad_hercules",
    tokenIdentifier: "mock|usr_superadmin",
  },
];

// All other collections wiped clean for testing
export const SEED_ATHLETES: MockAthlete[] = [];
export const SEED_TEAMS: MockTeam[] = [];
export const SEED_TEAM_MEMBERS: MockTeamMember[] = [];
export const SEED_TRAINING_SESSIONS: MockTrainingSession[] = [];
export const SEED_ATTENDANCE: MockAttendanceRecord[] = [];
export const SEED_TRAINING_PLANS: MockTrainingPlan[] = [];
export const SEED_PLAN_ITEMS: MockPlanItem[] = [];
export const SEED_ASSESSMENTS: MockAssessment[] = [];
export const SEED_FEES: MockAthleteFee[] = [];
export const SEED_FEE_PAYMENTS: MockFeePayment[] = [];
export const SEED_INVOICES: MockInvoice[] = [];
export const SEED_INVITES: MockInvite[] = [];
export const SEED_ANNOUNCEMENTS: MockAnnouncement[] = [];
export const SEED_CONVERSATIONS: MockConversation[] = [];
export const SEED_MESSAGES: MockMessage[] = [];
export const SEED_FACILITIES: MockFacility[] = [
  {
    _id: "fac_pitch_1",
    academyId: "acad_hercules",
    name: "Main Stadium Pitch 1",
    type: "pitch",
    surfaceType: "Natural Hybrid Grass",
    capacity: 500,
    status: "available",
    notes: "Full size FIFA standard pitch with floodlights",
    createdAt: 1729000000000,
    updatedAt: 1729000000000,
  },
  {
    _id: "fac_pitch_2",
    academyId: "acad_hercules",
    name: "Training Turf 2",
    type: "pitch",
    surfaceType: "4G Artificial Turf",
    capacity: 100,
    status: "available",
    notes: "All-weather training field",
    createdAt: 1729000000000,
    updatedAt: 1729000000000,
  },
  {
    _id: "fac_gym_1",
    academyId: "acad_hercules",
    name: "Performance Conditioning Gym",
    type: "gym",
    surfaceType: "High-density Rubber",
    capacity: 40,
    status: "available",
    notes: "Strength & conditioning zone",
    createdAt: 1729000000000,
    updatedAt: 1729000000000,
  },
  {
    _id: "fac_pitch_maint",
    academyId: "acad_hercules",
    name: "Indoor Training Pitch B",
    type: "pitch",
    surfaceType: "Artificial Turf",
    capacity: 80,
    status: "maintenance",
    notes: "Closed for seasonal surface aeration and repairs",
    createdAt: 1729000000000,
    updatedAt: 1729000000000,
  },
];
export const SEED_DRILLS: MockDrill[] = [];
export const SEED_INJURIES: MockInjury[] = [];
export const SEED_WORKOUT_LOGS: MockWorkoutLog[] = [];
export const SEED_ATHLETE_GOALS: MockAthleteGoal[] = [];
export const SEED_VIDEO_ANALYSES: MockVideoAnalysis[] = [];

