// Clean mock seed data — Wiped previous data; single Super Admin account: heavylaws

export interface MockAcademy {
  _id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  nextInvoiceNumber?: number;
  createdAt: string;
}

export interface MockUser {
  _id: string;
  name: string;
  email: string;
  password?: string;
  role?:
    | "platform_admin"
    | "academy_admin"
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

export interface MockTrainingSession {
  _id: string;
  academyId: string;
  teamId: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  location?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface MockAttendanceRecord {
  _id: string;
  sessionId: string;
  athleteId: string;
  status: "present" | "late" | "excused" | "absent";
  markedAt: string;
  markedBy: string;
}

export interface MockTrainingPlan {
  _id: string;
  academyId: string;
  athleteId: string;
  title: string;
  description?: string;
  startDate?: string;
  targetDate?: string;
  endDate?: string;
  status: "active" | "completed" | "archived";
  assignedBy?: string;
  createdBy?: string;
  createdAt: string;
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
  assessedOn: string;
  assessedBy?: string;
  conductedBy?: string;
  createdAt: string;
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

// Clean Initial Academies
export const SEED_ACADEMIES: MockAcademy[] = [
  {
    _id: "acad_heavylaws",
    name: "CoachTactics Academy",
    slug: "coachtactics",
    status: "active",
    nextInvoiceNumber: 1,
    createdAt: "2026-09-29T12:00:00.000Z",
  },
];

// Single Super Admin account: heavylaws
export const SEED_USERS: MockUser[] = [
  {
    _id: "usr_heavylaws",
    name: "heavylaws",
    email: "ah.baalbaki@gmail.com",
    role: "platform_admin",
    academyId: "acad_heavylaws",
    tokenIdentifier: "mock|user_heavylaws",
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
export const SEED_DRILLS: MockDrill[] = [];
