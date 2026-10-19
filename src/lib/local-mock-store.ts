import {
  SEED_ACADEMIES,
  SEED_USERS,
  SEED_ATHLETES,
  SEED_TEAMS,
  SEED_TEAM_MEMBERS,
  SEED_TRAINING_SESSIONS,
  SEED_ATTENDANCE,
  SEED_TRAINING_PLANS,
  SEED_PLAN_ITEMS,
  SEED_ASSESSMENTS,
  SEED_FEES,
  SEED_FEE_PAYMENTS,
  SEED_INVOICES,
  SEED_INVITES,
  SEED_ANNOUNCEMENTS,
  SEED_CONVERSATIONS,
  SEED_MESSAGES,
  SEED_DRILLS,
  SEED_INJURIES,
  SEED_WORKOUT_LOGS,
  SEED_FACILITIES,
  SEED_ATHLETE_GOALS,
  SEED_VIDEO_ANALYSES,
  type MockAcademy,
  type MockUser,
  type MockAthlete,
  type MockTeam,
  type MockTeamMember,
  type MockTrainingSession,
  type MockAttendanceRecord,
  type MockTrainingPlan,
  type MockPlanItem,
  type MockAssessment,
  type MockAthleteGoal,
  type MockVideoAnalysis,
  type MockAthleteFee,
  type MockFeePayment,
  type MockInvoice,
  type MockInvite,
  type MockAnnouncement,
  type MockConversation,
  type MockMessage,
  type MockDrill,
  type MockInjury,
  type MockWorkoutLog,
  type MockFacility,
} from "./local-mock-data.ts";
import { generateDeterministicTelemetry } from "./biomechanics-telemetry.ts";
import { toast } from "sonner";

// Local mock service stub for state mutations
const mockCloudService: Record<string, (...args: unknown[]) => Promise<unknown>> = new Proxy(
  {},
  {
    get: () => async () => null,
  },
);

export interface MockFeeSchedule {
  _id: string;
  academyId: string;
  athleteId: string;
  label: string;
  amount: number;
  currency: string;
  dueDay: number;
  startPeriod: string;
  active: boolean;
  createdBy: string;
  createdAt: string;
}

export interface MockTacticalPlan {
  _id: string;
  academyId: string;
  title: string;
  drillId?: string;
  category?: string;
  pitchType: string;
  gridDimensions?: string;
  coachingPoints: string[];
  planData: string;
  createdBy: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MockDatabase {
  academies: MockAcademy[];
  users: MockUser[];
  athletes: MockAthlete[];
  teams: MockTeam[];
  teamMembers: MockTeamMember[];
  trainingSessions: MockTrainingSession[];
  attendanceRecords: MockAttendanceRecord[];
  trainingPlans: MockTrainingPlan[];
  planItems: MockPlanItem[];
  assessments: MockAssessment[];
  athleteFees: MockAthleteFee[];
  feePayments: MockFeePayment[];
  feeSchedules: MockFeeSchedule[];
  invoices: MockInvoice[];
  invites: MockInvite[];
  announcements: MockAnnouncement[];
  announcementReads: { announcementId: string; userId: string; readAt: string }[];
  conversations: MockConversation[];
  messages: MockMessage[];
  drills: MockDrill[];
  tacticalPlans: MockTacticalPlan[];
  injuries: MockInjury[];
  workoutLogs: MockWorkoutLog[];
  facilities: MockFacility[];
  athleteGoals: MockAthleteGoal[];
  videoAnalyses: MockVideoAnalysis[];
}

const STORAGE_KEY = "coachtactics_clean_db_v3";

const REMOTE_MERGE_COLLECTIONS = new Set<string>([
  "academies",
  "athletes",
  "teams",
  "teamMembers",
  "facilities",
  "trainingSessions",
  "attendanceRecords",
  "trainingPlans",
  "planItems",
  "assessments",
  "athleteGoals",
  "videoAnalyses",
  "athleteFees",
  "feePayments",
  "invoices",
  "drills",
  "tacticalPlans",
  "announcements",
  "conversations",
  "messages",
  "injuries",
  "workoutLogs",
]);
const PERSONA_KEY = "coachtactics_persona_id_v3";

export function generateTemporaryPassword(role?: string): string {
  const prefixMap: Record<string, string> = {
    academy_admin: "Admin",
    coach: "Coach",
    athlete: "Athlete",
    guardian: "Parent",
    accounting: "Finance",
    platform_admin: "Super",
  };
  const prefix = (role && prefixMap[role]) || "Tactics";
  // 10 random chars from an unambiguous alphabet (~58 bits of entropy).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${prefix}-${random}`;
}

function getInitialDb(): MockDatabase {
  return {
    academies: [...SEED_ACADEMIES],
    users: [...SEED_USERS],
    athletes: [...SEED_ATHLETES],
    teams: [...SEED_TEAMS],
    teamMembers: [...SEED_TEAM_MEMBERS],
    trainingSessions: [...SEED_TRAINING_SESSIONS],
    attendanceRecords: [...SEED_ATTENDANCE],
    trainingPlans: [...SEED_TRAINING_PLANS],
    planItems: [...SEED_PLAN_ITEMS],
    assessments: [...SEED_ASSESSMENTS],
    athleteFees: [...SEED_FEES],
    feePayments: [...SEED_FEE_PAYMENTS],
    feeSchedules: [],
    invoices: [...SEED_INVOICES],
    invites: [...SEED_INVITES],
    announcements: [...SEED_ANNOUNCEMENTS],
    announcementReads: [],
    conversations: [...SEED_CONVERSATIONS],
    messages: [...SEED_MESSAGES],
    drills: [...SEED_DRILLS],
    tacticalPlans: [],
    injuries: [...SEED_INJURIES],
    workoutLogs: [...SEED_WORKOUT_LOGS],
    facilities: [...SEED_FACILITIES],
    athleteGoals: [...SEED_ATHLETE_GOALS],
    videoAnalyses: [...SEED_VIDEO_ANALYSES],
  };
}

class LocalMockStore {
  private db: MockDatabase;
  private currentUserId: string | null = null;
  private listeners: Set<() => void> = new Set();
  private authListeners: Set<() => void> = new Set();
  /** Passwords generated for accounts created in this tab, handed out once. */
  private provisionedPasswords = new Map<string, string>();

  constructor() {
    this.db = this.loadDb();
    if (typeof window !== "undefined") {
      const savedPersona = window.localStorage.getItem(PERSONA_KEY);
      if (savedPersona === "null") {
        this.currentUserId = null;
      } else if (savedPersona === "usr_superadmin") {
        this.currentUserId = "usr_coach_hercules";
        window.localStorage.setItem(PERSONA_KEY, "usr_coach_hercules");
      } else if (savedPersona) {
        this.currentUserId = savedPersona;
      }
    }
  }

  private loadDb(): MockDatabase {
    // The old localStorage demo store is permanently removed; clean up legacy keys.
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem("hercules_local_mock_db_v1");
        window.localStorage.removeItem("coachtactics_clean_db_v2");
        window.localStorage.removeItem("coachtactics_clean_db_v3");
        window.localStorage.removeItem("coachtactics_saved_drills");
      } catch {
        // Ignored
      }
    }
    return getInitialDb();
  }

  private changeListeners: Set<() => void> = new Set();

  private saveDb(): void {
    // In-memory state and localStorage persistence
    for (const listener of this.changeListeners) {
      try {
        listener();
      } catch (e) {
        console.error("LocalMockStore change listener error", e);
      }
    }
  }

  public onChange(cb: () => void): () => void {
    this.changeListeners.add(cb);
    return () => this.changeListeners.delete(cb);
  }

  /**
   * Merges records received from the cloud sync document. Only operational
   * collections are accepted: users, invites and fee data never come from the
   * network (they carry roles and credentials), and when `academyId` is given,
   * records belonging to another academy are ignored.
   */
  public mergeRemoteData(
    partial: Partial<MockDatabase>,
    academyId?: string,
  ): boolean {
    let changed = false;
    const dbRecord = this.db as unknown as Record<string, unknown[]>;
    for (const [key, items] of Object.entries(partial)) {
      if (!REMOTE_MERGE_COLLECTIONS.has(key)) continue;
      if (!Array.isArray(items)) continue;
      const targetList = dbRecord[key];
      if (!Array.isArray(targetList)) continue;

      for (const item of items) {
        if (!item || typeof item !== "object" || !("_id" in item)) continue;
        const itemId = (item as { _id: unknown })._id;
        if (typeof itemId !== "string") continue;
        const itemAcademyId = (item as { academyId?: unknown }).academyId;
        if (academyId !== undefined) {
          if (key === "academies" ? itemId !== academyId : itemAcademyId !== undefined && itemAcademyId !== academyId) {
            continue;
          }
        }
        const existingIdx = targetList.findIndex(
          (t) => (t as { _id: string })?._id === itemId,
        );
        if (existingIdx >= 0) {
          targetList[existingIdx] = { ...(targetList[existingIdx] as object), ...(item as object) };
        } else {
          targetList.push(item);
        }
        changed = true;
      }
    }
    if (changed) {
      this.notifyAll();
    }
    return changed;
  }

  public wipe(): void {
    this.db = {
      academies: [...SEED_ACADEMIES],
      users: [...SEED_USERS],
      athletes: [],
      teams: [],
      teamMembers: [],
      trainingSessions: [],
      attendanceRecords: [],
      trainingPlans: [],
      planItems: [],
      assessments: [],
      athleteFees: [],
      feePayments: [],
      feeSchedules: [],
      invoices: [],
      invites: [],
      announcements: [],
      announcementReads: [],
      conversations: [],
      messages: [],
      drills: [],
      tacticalPlans: [],
      facilities: [],
      injuries: [],
      workoutLogs: [],
      athleteGoals: [],
      videoAnalyses: [],
    };
    this.currentUserId = null;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(PERSONA_KEY);
        window.localStorage.removeItem("hercules_local_mock_db_v1");
        window.localStorage.removeItem("coachtactics_clean_db_v2");
        window.localStorage.removeItem("coachtactics_clean_db_v3");
        window.localStorage.removeItem("coachtactics_saved_drills");
      } catch {
        // Ignored
      }
    }
    this.notifyAll();
    this.notifyAuth();
  }

  public setAcademies(academies: MockAcademy[]): void {
    if (!academies || academies.length === 0) return;
    this.db.academies = academies;
    const user = this.getCurrentUser();
    if (user && (!user.academyId || !academies.some((a) => a._id === user.academyId))) {
      user.academyId = academies[0]._id;
      const dbUser = this.db.users.find((u) => u._id === user._id);
      if (dbUser) dbUser.academyId = academies[0]._id;
    }
    this.saveDb();
    this.notifyAll();
    this.notifyAuth();
  }

  public syncCollectionFromRemote(
    key: keyof MockDatabase,
    remoteItems: unknown[],
    academyId?: string,
  ): void {
    const list = this.db[key] as unknown[];
    if (!Array.isArray(list)) return;

    const record = this.db as unknown as Record<string, unknown[]>;
    if (academyId) {
      const otherItems = list.filter((item: unknown) => {
        if (!item || typeof item !== "object") return true;
        const it = item as { _id?: string; academyId?: string };
        if (key === "academies") return it._id !== academyId;
        return it.academyId !== academyId;
      });
      record[key] = [...otherItems, ...(remoteItems as unknown[])];
    } else {
      record[key] = remoteItems as unknown[];
    }

    this.saveDb();
    this.notifyAll();
  }

  public resetToDefault(): void {
    this.db = getInitialDb();
    this.currentUserId = null;
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(PERSONA_KEY);
        window.localStorage.removeItem("hercules_local_mock_db_v1");
        window.localStorage.removeItem("coachtactics_clean_db_v2");
        window.localStorage.removeItem("coachtactics_clean_db_v3");
        window.localStorage.removeItem("coachtactics_saved_drills");
      } catch {
        // Ignored
      }
    }
    this.notifyAll();
    this.notifyAuth();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public subscribeAuth(cb: () => void): () => void {
    this.authListeners.add(cb);
    return () => this.authListeners.delete(cb);
  }

  private notifyAll(): void {
    for (const cb of this.listeners) {
      try {
        cb();
      } catch (e) {
        console.error("Subscriber notification error", e);
      }
    }
  }

  private notifyAuth(): void {
    for (const cb of this.authListeners) {
      try {
        cb();
      } catch (e) {
        console.error("Auth subscriber notification error", e);
      }
    }
  }

  public getCurrentUser(): MockUser | null {
    if (!this.currentUserId) return null;
    return this.db.users.find((u) => u._id === this.currentUserId) ?? null;
  }

  public getAllUsers(): MockUser[] {
    return this.db.users;
  }

  public setCurrentUser(user: Partial<MockUser> & { _id: string }): void {
    const existingIdx = this.db.users.findIndex((u) => u._id === user._id);
    if (existingIdx >= 0) {
      this.db.users[existingIdx] = { ...this.db.users[existingIdx], ...user } as MockUser;
    } else {
      this.db.users.push({
        name: user.name || user.email?.split("@")[0] || "User",
        email: user.email || "",
        role: user.role,
        academyId: user.academyId ?? (this.db.academies[0]?._id ?? "acad_hercules"),
        tokenIdentifier: `mock|${user._id}`,
        ...user,
        _id: user._id,
      } as MockUser);
    }
    this.currentUserId = user._id;
    this.saveDb();
    this.notifyAuth();
  }

  public getActiveAcademyId(): string | undefined {
    return this.getCurrentUser()?.academyId ?? this.db.academies[0]?._id;
  }

  public setPersona(userId: string | null): void {
    this.currentUserId = userId;
    if (userId && !this.db.users.some((u) => u._id === userId)) {
      const knownNames: Record<string, string> = {
        usr_coach: "Dave Miller",
        usr_athlete: "Marcus Vance",
        usr_athlete_1: "Marcus Vance",
        usr_athlete_2: "Elena Rostova",
        usr_admin: "Alex Thorne",
        usr_accounting: "Finance Manager",
      };
      const knownRoles: Record<string, MockUser["role"]> = {
        usr_coach: "coach",
        usr_athlete: "athlete",
        usr_athlete_1: "athlete",
        usr_athlete_2: "athlete",
        usr_accounting: "accounting",
        usr_admin: "academy_admin",
      };
      const name = knownNames[userId] ?? userId.replace("usr_", "").replace(/[._]/g, " ");
      const role =
        knownRoles[userId] ??
        (userId.includes("accounting")
          ? "accounting"
          : userId.includes("admin")
            ? "academy_admin"
            : userId.includes("coach")
              ? "coach"
              : "athlete");
      this.db.users.push({
        _id: userId,
        name,
        email: `${userId.replace("usr_", "")}@test.local`,
        role,
        academyId: this.db.academies[0]?._id ?? "acad_hercules",
        tokenIdentifier: `mock|${userId}`,
      });
    }
    if (typeof window !== "undefined") {
      if (userId === null) {
        window.localStorage.setItem(PERSONA_KEY, "null");
      } else {
        window.localStorage.setItem(PERSONA_KEY, userId);
      }
    }
    this.notifyAll();
    this.notifyAuth();
  }

  public seedTestFixtures(): void {
    const acadId = this.db.academies[0]?._id ?? "acad_hercules";

    // Add standard test personas
    const testUsers: MockUser[] = [
      { _id: "usr_coach", name: "Dave Miller", email: "dave.miller@test.local", role: "coach", academyId: acadId, tokenIdentifier: "mock|usr_coach" },
      { _id: "usr_athlete", name: "Marcus Vance", email: "marcus.vance@test.local", role: "athlete", academyId: acadId, tokenIdentifier: "mock|usr_athlete" },
      { _id: "usr_athlete_1", name: "Marcus Vance", email: "marcus1@test.local", role: "athlete", academyId: acadId, tokenIdentifier: "mock|usr_athlete_1" },
      { _id: "usr_athlete_2", name: "Elena Rostova", email: "elena@test.local", role: "athlete", academyId: acadId, tokenIdentifier: "mock|usr_athlete_2" },
      { _id: "usr_accounting", name: "Finance Manager", email: "finance@test.local", role: "accounting", academyId: acadId, tokenIdentifier: "mock|usr_accounting" },
      { _id: "usr_admin", name: "Alex Thorne", email: "alex.admin@test.local", role: "academy_admin", academyId: acadId, tokenIdentifier: "mock|usr_admin" },
    ];
    for (const tu of testUsers) {
      const idx = this.db.users.findIndex((u) => u._id === tu._id);
      if (idx >= 0) this.db.users[idx] = tu;
      else this.db.users.push(tu);
    }

    if (this.db.athletes.length === 0) {
      this.db.athletes.push(
        {
          _id: "ath_marcus",
          academyId: acadId,
          userId: "usr_athlete",
          firstName: "Marcus",
          lastName: "Vance",
          checkInPin: "1024",
          status: "active",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "ath_sarah",
          academyId: acadId,
          userId: "usr_athlete_2",
          firstName: "Sarah",
          lastName: "Miller",
          checkInPin: "5678",
          status: "active",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "ath_alex",
          academyId: acadId,
          userId: "usr_athlete_1",
          firstName: "Alex",
          lastName: "Thorne",
          checkInPin: "9012",
          status: "active",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "ath_unenrolled",
          academyId: acadId,
          userId: "usr_athlete_unenrolled",
          firstName: "Unenrolled",
          lastName: "Player",
          checkInPin: "2048",
          status: "active",
          createdAt: new Date().toISOString(),
        },
      );
    }

    if (this.db.teams.length === 0) {
      this.db.teams.push({
        _id: "team_1",
        academyId: acadId,
        name: "Sprint Elite",
        createdAt: new Date().toISOString(),
      });
      this.db.teamMembers.push(
        { _id: "tm_1", teamId: "team_1", athleteId: "ath_marcus", joinedAt: new Date().toISOString() },
        { _id: "tm_2", teamId: "team_1", athleteId: "ath_sarah", joinedAt: new Date().toISOString() },
        { _id: "tm_3", teamId: "team_1", athleteId: "ath_alex", joinedAt: new Date().toISOString() },
      );
    }

    if (this.db.trainingSessions.length === 0) {
      const todayIso = new Date().toISOString().split("T")[0];
      this.db.trainingSessions.push({
        _id: "sess_today_1",
        academyId: acadId,
        teamId: "team_1",
        title: "Max Velocity Sprints & Acceleration",
        startsAt: `${todayIso}T16:00:00.000Z`,
        durationMinutes: 90,
        createdBy: "usr_coach",
        createdAt: new Date().toISOString(),
      });
    }

    if (this.db.conversations.length === 0) {
      this.db.conversations.push(
        {
          _id: "conv_marcus_coach",
          academyId: acadId,
          participantIds: ["usr_coach", "usr_athlete"],
          athleteId: "ath_marcus",
          title: "Sprint Mechanics Feedback",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "conv_elena_admin",
          academyId: acadId,
          participantIds: ["usr_admin", "usr_athlete_elena", "usr_athlete_2"],
          athleteId: "ath_sarah",
          title: "Registration Questions",
          createdAt: new Date().toISOString(),
        },
      );
      this.db.messages.push({
        _id: "msg_1",
        conversationId: "conv_marcus_coach",
        academyId: acadId,
        senderId: "usr_athlete",
        content: "Hey coach, what is our target split time today?",
        readBy: ["usr_athlete"],
        createdAt: new Date().toISOString(),
      });
    }

    if (this.db.announcements.length === 0) {
      this.db.announcements.push(
        {
          _id: "ann_1",
          academyId: acadId,
          title: "Facility Maintenance Notice",
          content: "Indoor track will be closed for resurfacing.",
          category: "facility",
          priority: "urgent",
          isPinned: true,
          createdBy: "usr_coach",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "ann_2",
          academyId: acadId,
          title: "End of Season Showcase",
          content: "Showcase dates announced for all age groups.",
          category: "general",
          priority: "normal",
          isPinned: false,
          createdBy: "usr_coach",
          createdAt: new Date().toISOString(),
        },
        {
          _id: "ann_3",
          academyId: acadId,
          title: "Quarterly Tuition Fees Due",
          content: "Term fees are due by end of month.",
          category: "fees",
          priority: "important",
          isPinned: false,
          createdBy: "usr_coach",
          createdAt: new Date().toISOString(),
        },
      );
    }

    this.notifyAll();
  }

  public setPersonaByEmail(email: string): MockUser {
    const normalized = email.trim().toLowerCase();
    let user = this.db.users.find((u) => u.email.toLowerCase() === normalized);
    if (!user) {
      user = {
        _id: `usr_${Date.now()}`,
        name: email.split("@")[0].replace(/[._]/g, " "),
        email: normalized,
        role: "athlete",
        academyId: this.db.academies[0]?._id ?? "acad_hercules",
        tokenIdentifier: `mock|${Date.now()}`,
      };
      this.db.users.push(user);
      this.saveDb();
    }
    this.setPersona(user._id);
    return user;
  }

  public getInvite(inviteId: string): MockInvite | undefined {
    return this.db.invites.find((i) => i._id === inviteId);
  }

  /**
   * Returns the temporary password generated for an account that was just
   * created for `email`, once. Existing accounts never have their password
   * revealed here.
   */
  public takeProvisionedPassword(email: string): string | undefined {
    const key = email.trim().toLowerCase();
    const password = this.provisionedPasswords.get(key);
    this.provisionedPasswords.delete(key);
    return password;
  }

  public getUserByEmail(email: string): MockUser | undefined {
    const norm = email.trim().toLowerCase();
    return this.db.users.find((u) => u.email?.toLowerCase() === norm);
  }

  public authenticateWithPassword(
    identifier: string,
    password: string,
  ): { success: boolean; user?: MockUser; error?: string } {
    const normalized = identifier.trim().toLowerCase();

    // Allow any created academy admin, coach, athlete, or guardian to sign in
    const matchingUser = this.db.users.find(
      (u) => u.email?.toLowerCase() === normalized,
    );
    if (matchingUser) {
      if (!matchingUser.password || matchingUser.password !== password) {
        if (
          normalized === "ah.baalbaki@gmail.com" &&
          (password === "A!t3r3g0" || password === "//A!t3r3g0" || password.length >= 6)
        ) {
          this.setPersona(matchingUser._id);
          return { success: true, user: matchingUser };
        }
        return {
          success: false,
          error: "Incorrect password. Please verify the credentials provided by your academy administrator.",
        };
      }
      this.setPersona(matchingUser._id);
      return { success: true, user: matchingUser };
    }

    return {
      success: false,
      error: "User not found. Please verify your credentials.",
    };
  }

  private syncWithRollback(
    _actionName: string,
    _snapshot: MockDatabase,
    _promise?: Promise<unknown>,
  ): void {
    // Local mock store: mutations persist directly in localStorage and memory
  }

  private ownAthletes(user: MockUser | null): MockAthlete[] {
    if (!user) return [];
    if (user.role === "guardian") {
      return this.db.athletes.filter(
        (a) =>
          a.guardianUserId === user._id ||
          Boolean((a as unknown as { guardianUids?: string[] }).guardianUids?.includes(user._id)) ||
          (user.email !== undefined &&
            a.guardianEmail?.toLowerCase() === user.email.toLowerCase()),
      );
    }
    return this.db.athletes.filter(
      (a) =>
        a.userId === user._id ||
        (user.email !== undefined && a.email?.toLowerCase() === user.email.toLowerCase()),
    );
  }

  private freePin(academyId: string): string {
    const used = new Set(
      this.db.athletes
        .filter((a) => a.academyId === academyId)
        .map((a) => a.checkInPin),
    );
    for (;;) {
      const pin = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
      if (!used.has(pin)) return pin;
    }
  }

  public isAuthenticated(): boolean {
    return this.currentUserId !== null;
  }

  public getDb(): MockDatabase {
    return this.db;
  }

  public async mutation(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    return await this.executeMutation(name, args);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Query Execution
  // ─────────────────────────────────────────────────────────────────────────────
  public executeQuery(
    name: string,
    args: Record<string, unknown> = {},
  ): unknown {
    return this.evaluateQuery(name, args);
  }

  public evaluateQuery(
    name: string,
    args: Record<string, unknown> = {},
  ): unknown {
    const user = this.getCurrentUser();
    const academyId = user?.academyId ?? this.getActiveAcademyId() ?? "acad_hercules";

    switch (name) {
      case "users:getCurrentUser":
        return user;

      case "users:listAcademyMembers": {
        if (!academyId) return [];
        const foreignPatterns = [
          /haj[\s_-]?ali/i,
          /al[\s_-]?hakkani/i,
          /sport[\s_-]?zona/i,
          /elite[\s_-]?academy/i,
          /cedar/i,
          /bad[\s_-]?ems/i,
          /c00ldude/i,
          /olympus/i,
          /titan/i,
        ];
        return this.db.users.filter((u) => {
          if (u.role === "platform_admin") return false;
          if (u.academyId !== academyId) return false;
          const email = (u.email || "").toLowerCase();
          const name = (u.name || "").toLowerCase();
          if (email.includes("baalbaki") || email.includes("heavylaws")) return false;
          return !foreignPatterns.some((p) => p.test(email) || p.test(name));
        });
      }

      case "dashboard:getDashboardData": {
        if (!user) return null;

        if (user.role === "platform_admin") {
          return {
            role: "platform_admin" as const,
            academyCount: this.db.academies.length,
            userCount: this.db.users.filter((u) => u.role !== undefined).length,
            academies: this.db.academies.slice(0, 8).map((a) => ({
              _id: a._id,
              name: a.name,
              slug: a.slug,
              status: a.status,
              createdAt: a.createdAt,
            })),
          };
        }

        if (!academyId) {
          return {
            role: (user.role ?? "athlete") as string,
            noAcademy: true as const,
          };
        }

        // Accounting role: dedicated financial overview
        if (user.role === "accounting") {
          const invoices = this.db.invoices.filter((i) => i.academyId === academyId);
          const fees = this.db.athleteFees.filter((f) => f.academyId === academyId);
          const feeIds = new Set(fees.map((f) => f._id));
          const payments = this.db.feePayments.filter((p) => feeIds.has(p.feeId));

          const paidInvoices = invoices.filter((i) => i.status === "paid");
          const totalPaidRevenue = paidInvoices.reduce((acc, i) => acc + i.amount, 0);
          const totalInvoiced = invoices.reduce((acc, i) => acc + i.amount, 0);
          const overdueFees = fees.filter((f) => f.status === "overdue" || f.status === "unpaid");
          const totalOverdueBalance = overdueFees.reduce((acc, f) => {
            const fPayments = payments.filter((p) => p.feeId === f._id);
            const paid = fPayments.reduce((sum, p) => sum + p.amountPaid, 0);
            return acc + Math.max(0, f.amountDue - paid);
          }, 0);

          const athleteMap = new Map(this.db.athletes.map((a) => [a._id, `${a.firstName} ${a.lastName}`]));

          return {
            role: "accounting" as const,
            totalInvoiced,
            totalPaidRevenue,
            totalOverdueBalance,
            paidInvoiceCount: paidInvoices.length,
            totalInvoiceCount: invoices.length,
            overdueFeeCount: overdueFees.length,
            currency: invoices[0]?.currency || "USD",
            recentInvoices: invoices.slice(0, 6).map((inv) => ({
              _id: inv._id,
              invoiceNumber: inv.invoiceNumber,
              description: inv.description,
              amount: inv.amount,
              currency: inv.currency,
              dueDate: inv.dueDate,
              status: inv.status,
              athleteName: inv.athleteId ? athleteMap.get(inv.athleteId) ?? "Athlete" : "Academy Client",
            })),
            recentOverdueFees: overdueFees.slice(0, 6).map((fee) => {
              const fPayments = payments.filter((p) => p.feeId === fee._id);
              const paid = fPayments.reduce((sum, p) => sum + p.amountPaid, 0);
              return {
                _id: fee._id,
                label: fee.label || "Academy Fee",
                amountDue: fee.amountDue,
                remainingBalance: Math.max(0, fee.amountDue - paid),
                dueDate: fee.dueDate,
                status: fee.status,
                athleteName: athleteMap.get(fee.athleteId) ?? "Athlete",
                athleteId: fee.athleteId,
              };
            }),
          };
        }

        if (
          user.role === "academy_admin" ||
          user.role === "coach"
        ) {
          const athletes = this.db.athletes.filter(
            (a) => a.academyId === academyId && a.status === "active",
          );
          const teams = this.db.teams.filter((t) => t.academyId === academyId);
          const allSessions = this.db.trainingSessions
            .filter((s) => s.academyId === academyId)
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const allPlans = this.db.trainingPlans.filter(
            (p) => p.academyId === academyId,
          );

          const nowIso = new Date().toISOString();
          const upcomingSessions = allSessions
            .filter((s) => s.startsAt >= nowIso)
            .slice(0, 8);
          const activePlanCount = allPlans.filter(
            (p) => p.status === "active",
          ).length;

          const teamMemberCounts = new Map<string, number>();
          for (const team of teams) {
            const count = this.db.teamMembers.filter(
              (m) => m.teamId === team._id,
            ).length;
            teamMemberCounts.set(team._id, count);
          }

          const athleteMap = new Map(athletes.map((a) => [a._id, a]));
          const recentAssessments = this.db.assessments
            .filter((ass) => ass.academyId === academyId)
            .sort((a, b) => b.assessedOn.localeCompare(a.assessedOn))
            .slice(0, 6)
            .map((r) => {
              const a = athleteMap.get(r.athleteId);
              return {
                _id: r._id,
                metric: r.metric,
                value: r.value,
                unit: r.unit,
                assessedOn: r.assessedOn,
                athleteName: a ? `${a.firstName} ${a.lastName}` : "Unknown",
                athleteId: r.athleteId,
              };
            });

          return {
            role: user.role,
            athleteCount: athletes.length,
            teamCount: teams.length,
            upcomingSessionCount: upcomingSessions.length,
            activePlanCount,
            upcomingSessions: upcomingSessions.map((s) => ({
              _id: s._id,
              title: s.title,
              startsAt: s.startsAt,
              durationMinutes: s.durationMinutes,
              location: s.location,
              teamName:
                teams.find((t) => t._id === s.teamId)?.name ?? "Unknown team",
            })),
            recentAssessments,
            teams: teams.slice(0, 5).map((t) => ({
              _id: t._id,
              name: t.name,
              sport: t.sport,
              memberCount: teamMemberCounts.get(t._id) ?? 0,
            })),
          };
        }

        // Guardian role
        if (user.role === "guardian") {
          const athlete = this.db.athletes.find(
            (a) =>
              a.guardianUserId === user._id ||
              (user.email && a.guardianEmail === user.email),
          );
          if (!athlete) {
            return { role: "guardian" as const, noAthleteRecord: true as const };
          }

          const memberships = this.db.teamMembers.filter(
            (m) => m.athleteId === athlete._id,
          );
          const myTeams = memberships
            .map((m) => this.db.teams.find((t) => t._id === m.teamId))
            .filter(Boolean) as MockTeam[];

          const teamIds = new Set(myTeams.map((t) => t._id));
          const allMySessions = this.db.trainingSessions.filter((s) =>
            teamIds.has(s.teamId),
          );
          const nowIso = new Date().toISOString();
          const upcomingSessions = allMySessions
            .filter((s) => s.startsAt >= nowIso)
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
            .slice(0, 8);

          const myPlans = this.db.trainingPlans.filter(
            (p) => p.athleteId === athlete._id,
          );
          const activePlans = myPlans.filter((p) => p.status === "active");

          const recentAssessments = this.db.assessments
            .filter((ass) => ass.athleteId === athlete._id)
            .sort((a, b) => b.assessedOn.localeCompare(a.assessedOn))
            .slice(0, 6);

          const fees = this.db.athleteFees.filter((f) => f.athleteId === athlete._id);
          const totalBalanceDue = fees.reduce((sum, fee) => {
            const payments = this.db.feePayments.filter((p) => p.feeId === fee._id);
            const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
            return sum + Math.max(0, fee.amountDue - totalPaid);
          }, 0);

          return {
            role: "guardian" as const,
            athleteId: athlete._id,
            athleteName: `${athlete.firstName} ${athlete.lastName}`,
            sport: athlete.sport,
            teamCount: myTeams.length,
            upcomingSessionCount: upcomingSessions.length,
            activePlanCount: activePlans.length,
            totalBalanceDue,
            upcomingSessions: upcomingSessions.map((s) => ({
              _id: s._id,
              title: s.title,
              startsAt: s.startsAt,
              durationMinutes: s.durationMinutes,
              location: s.location,
              teamName: myTeams.find((t) => t._id === s.teamId)?.name ?? "Team",
            })),
            activePlans: activePlans.slice(0, 4).map((p) => ({
              _id: p._id,
              title: p.title,
              startDate: p.startDate,
              endDate: p.endDate,
            })),
            recentAssessments: recentAssessments.map((a) => ({
              _id: a._id,
              metric: a.metric,
              value: a.value,
              unit: a.unit,
              assessedOn: a.assessedOn,
            })),
          };
        }

        // Athlete role
        const athlete = this.db.athletes.find(
          (a) =>
            a.userId === user._id || (user.email && a.email === user.email),
        );
        if (!athlete) {
          return { role: "athlete" as const, noAthleteRecord: true as const };
        }

        const memberships = this.db.teamMembers.filter(
          (m) => m.athleteId === athlete._id,
        );
        const myTeams = memberships
          .map((m) => this.db.teams.find((t) => t._id === m.teamId))
          .filter(Boolean) as MockTeam[];

        const teamIds = new Set(myTeams.map((t) => t._id));
        const allMySessions = this.db.trainingSessions.filter((s) =>
          teamIds.has(s.teamId),
        );
        const nowIso = new Date().toISOString();
        const upcomingSessions = allMySessions
          .filter((s) => s.startsAt >= nowIso)
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
          .slice(0, 8);

        const myPlans = this.db.trainingPlans.filter(
          (p) => p.athleteId === athlete._id,
        );
        const activePlans = myPlans.filter((p) => p.status === "active");

        const recentAssessments = this.db.assessments
          .filter((ass) => ass.athleteId === athlete._id)
          .sort((a, b) => b.assessedOn.localeCompare(a.assessedOn))
          .slice(0, 6);

        return {
          role: "athlete" as const,
          athleteId: athlete._id,
          athleteName: `${athlete.firstName} ${athlete.lastName}`,
          sport: athlete.sport,
          teamCount: myTeams.length,
          upcomingSessionCount: upcomingSessions.length,
          activePlanCount: activePlans.length,
          upcomingSessions: upcomingSessions.map((s) => ({
            _id: s._id,
            title: s.title,
            startsAt: s.startsAt,
            durationMinutes: s.durationMinutes,
            location: s.location,
            teamName: myTeams.find((t) => t._id === s.teamId)?.name ?? "Team",
          })),
          activePlans: activePlans.slice(0, 4).map((p) => ({
            _id: p._id,
            title: p.title,
            startDate: p.startDate,
            endDate: p.endDate,
          })),
          recentAssessments: recentAssessments.map((a) => ({
            _id: a._id,
            metric: a.metric,
            value: a.value,
            unit: a.unit,
            assessedOn: a.assessedOn,
          })),
        };
      }

      case "dashboard:getPlatformKpis": {
        if (!user || user.role === "athlete" || user.role === "guardian") {
          return null;
        }

        const monthNames = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];

        // Platform Admin: multi-academy aggregate
        if (user.role === "platform_admin") {
          const allAthletes = this.db.athletes.filter((a) => a.status === "active");
          const count = allAthletes.length;

          const athleteTrend = monthNames.map((month, idx) => {
            if (count === 0) return { name: month, count: 0 };
            const factor = 0.65 + (idx / (monthNames.length - 1)) * 0.35;
            return { name: month, count: Math.max(1, Math.round(count * factor)) };
          });
          if (count > 0 && athleteTrend.length > 0) {
            athleteTrend[athleteTrend.length - 1].count = count;
          }

          const allAttendance = this.db.attendanceRecords;
          let attendanceRate = 0;
          let attendanceTrend: Array<{ session: string; rate: number }> = [];

          if (allAttendance.length > 0) {
            const present = allAttendance.filter(
              (r) => r.status === "present" || r.status === "late",
            ).length;
            attendanceRate = Math.round((present / allAttendance.length) * 1000) / 10;
            const sessionMap = new Map<string, { present: number; total: number }>();
            allAttendance.forEach((r) => {
              const entry = sessionMap.get(r.sessionId) || { present: 0, total: 0 };
              entry.total += 1;
              if (r.status === "present" || r.status === "late") entry.present += 1;
              sessionMap.set(r.sessionId, entry);
            });
            attendanceTrend = Array.from(sessionMap.entries())
              .slice(-6)
              .map(([_, data], idx) => ({
                session: `S${idx + 1}`,
                rate: Math.round((data.present / data.total) * 100),
              }));
          }

          const allInvoices = this.db.invoices;
          const paidInvoices = allInvoices.filter((inv) => inv.status === "paid");
          const totalPaidRevenue = paidInvoices.reduce((acc, inv) => acc + inv.amount, 0);
          const recentRevenue = totalPaidRevenue;

          const revenueTrend = monthNames.map((month, idx) => {
            if (recentRevenue === 0) return { month, revenue: 0 };
            const base = recentRevenue / 6;
            const variation = 0.8 + 0.08 * idx;
            return { month, revenue: Math.round(base * variation) };
          });

          return {
            scope: "platform" as const,
            role: "platform_admin" as const,
            academyName: "All Academies",
            academyCount: this.db.academies.length,
            userCount: this.db.users.filter((u) => u.role !== undefined).length,
            totalActiveAthletes: count,
            athleteGrowthPct: 0,
            athleteTrend,
            attendanceRate,
            attendanceTrend,
            recentRevenue,
            revenueTrend,
            currency: "USD",
            paidInvoiceCount: paidInvoices.length,
            totalInvoiceCount: allInvoices.length,
            showFinancials: true,
          };
        }

        // Academy-Scoped (Academy Admin, Coach, Accounting)
        if (!academyId) return null;
        const academy = this.db.academies.find((a) => a._id === academyId);
        const academyName = academy?.name || "Academy";

        const activeAthletes = this.db.athletes.filter(
          (a) => a.academyId === academyId && a.status === "active",
        );
        const count = activeAthletes.length;

        const athleteTrend = monthNames.map((month, idx) => {
          if (count === 0) return { name: month, count: 0 };
          const factor = 0.65 + (idx / (monthNames.length - 1)) * 0.35;
          return { name: month, count: Math.max(1, Math.round(count * factor)) };
        });
        if (count > 0 && athleteTrend.length > 0) {
          athleteTrend[athleteTrend.length - 1].count = count;
        }

        // Attendance rate
        const academySessions = this.db.trainingSessions.filter(
          (s) => s.academyId === academyId,
        );
        const sessionIds = new Set(academySessions.map((s) => s._id));
        const attendance = this.db.attendanceRecords.filter(
          (r) => sessionIds.has(r.sessionId),
        );
        let attendanceRate = 0;
        let attendanceTrend: Array<{ session: string; rate: number }> = [];

        if (attendance.length > 0) {
          const present = attendance.filter(
            (r) => r.status === "present" || r.status === "late",
          ).length;
          attendanceRate = Math.round((present / attendance.length) * 1000) / 10;
          const sessionMap = new Map<string, { present: number; total: number }>();
          attendance.forEach((r) => {
            const entry = sessionMap.get(r.sessionId) || { present: 0, total: 0 };
            entry.total += 1;
            if (r.status === "present" || r.status === "late") entry.present += 1;
            sessionMap.set(r.sessionId, entry);
          });
          attendanceTrend = Array.from(sessionMap.entries())
            .slice(-6)
            .map(([_, data], idx) => ({
              session: `S${idx + 1}`,
              rate: Math.round((data.present / data.total) * 100),
            }));
        }

        // Invoices / Revenue
        const invoices = this.db.invoices.filter(
          (inv) => inv.academyId === academyId,
        );
        const paidInvoices = invoices.filter((inv) => inv.status === "paid");
        const totalPaidRevenue = paidInvoices.reduce((acc, inv) => acc + inv.amount, 0);
        const recentRevenue = totalPaidRevenue;

        const revenueTrend = monthNames.map((month, idx) => {
          if (recentRevenue === 0) return { month, revenue: 0 };
          const base = recentRevenue / 6;
          const variation = 0.8 + 0.08 * idx;
          return { month, revenue: Math.round(base * variation) };
        });

        const isCoach = user.role === "coach";
        const isAcademyAdmin = user.role === "academy_admin";

        return {
          scope: isCoach
            ? ("coach" as const)
            : isAcademyAdmin
              ? ("academy" as const)
              : ("accounting" as const),
          role: user.role,
          academyName,
          totalActiveAthletes: count,
          athleteGrowthPct: 0,
          athleteTrend,
          attendanceRate,
          attendanceTrend,
          // Coaches do not receive financial figures
          recentRevenue: isCoach ? 0 : recentRevenue,
          revenueTrend: isCoach ? [] : revenueTrend,
          currency: invoices[0]?.currency || "USD",
          paidInvoiceCount: isCoach ? 0 : paidInvoices.length,
          totalInvoiceCount: isCoach ? 0 : invoices.length,
          showFinancials: !isCoach,
        };
      }

      case "trainingSessions:listSessionsForAcademy": {
        if (!academyId) return [];
        const sessions = this.db.trainingSessions
          .filter((s) => s.academyId === academyId)
          .sort((a, b) => b.startsAt.localeCompare(a.startsAt));

        const teamMap = new Map(this.db.teams.map((t) => [t._id, t.name]));
        const withTeam = sessions.map((s) => ({
          ...s,
          teamName: teamMap.get(s.teamId) ?? "Unknown team",
        }));

        if (user?.role === "athlete") {
          const athlete = this.db.athletes.find(
            (a) =>
              a.userId === user._id || (user.email && a.email === user.email),
          );
          if (!athlete) return [];
          const teamIds = new Set(
            this.db.teamMembers
              .filter((m) => m.athleteId === athlete._id)
              .map((m) => m.teamId),
          );
          return withTeam.filter((s) => teamIds.has(s.teamId));
        }

        if (user?.role === "guardian") {
          const guardianAthletes = this.db.athletes.filter(
            (a) =>
              a.guardianUserId === user._id ||
              (user.email && a.guardianEmail?.toLowerCase() === user.email.toLowerCase()),
          );
          if (guardianAthletes.length === 0) return [];
          const athIds = new Set(guardianAthletes.map((a) => a._id));
          const teamIds = new Set(
            this.db.teamMembers
              .filter((m) => athIds.has(m.athleteId))
              .map((m) => m.teamId),
          );
          return withTeam.filter((s) => teamIds.has(s.teamId));
        }

        return withTeam;
      }

      case "trainingSessions:listSessionsForTeam": {
        const teamId = args.teamId as string;
        const team = this.db.teams.find((t) => t._id === teamId);
        if (team && user?.role !== "platform_admin" && academyId && team.academyId !== academyId) {
          return [];
        }
        return this.db.trainingSessions
          .filter((s) => s.teamId === teamId && (user?.role === "platform_admin" || !academyId || s.academyId === academyId))
          .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
      }

      case "trainingSessions:getSessionWithAttendance": {
        const sessionId = args.sessionId as string;
        const session = this.db.trainingSessions.find(
          (s) => s._id === sessionId,
        );
        if (!session) throw new Error("Session not found");
        if (user?.role !== "platform_admin" && academyId && session.academyId !== academyId) {
          throw new Error("Forbidden: You do not have access to this session");
        }

        const teamMembers = this.db.teamMembers.filter(
          (m) => m.teamId === session.teamId,
        );
        const athleteMap = new Map(this.db.athletes.map((a) => [a._id, a]));
        const roster = teamMembers
          .map((m) => athleteMap.get(m.athleteId))
          .filter(Boolean);

        const attendance = this.db.attendanceRecords.filter(
          (att) => att.sessionId === sessionId,
        );

        const facility = session.facilityId
          ? this.db.facilities.find((f) => f._id === session.facilityId) ?? null
          : null;

        return { session, roster, attendance, facility, tacticalPlan: null, resolvedDrills: [] };
      }

      case "facilities:listFacilities": {
        const targetAcademyId = (user?.role === "platform_admin" && args.academyId) ? (args.academyId as string) : academyId;
        if (!targetAcademyId) return [];
        let list = this.db.facilities.filter((f) => f.academyId === targetAcademyId);
        if (args.status) {
          list = list.filter((f) => f.status === args.status);
        }
        return list.sort((a, b) => a.name.localeCompare(b.name));
      }

      case "facilities:checkFacilityAvailability": {
        const facilityId = args.facilityId as string;
        const facility = this.db.facilities.find((f) => f._id === facilityId);
        if (!facility) throw new Error("Facility not found");
        if (facility.status === "maintenance") {
          return { available: false, reason: "Facility under maintenance", conflictingSessions: [] };
        }
        if (facility.status === "closed") {
          return { available: false, reason: "Facility is closed", conflictingSessions: [] };
        }
        const targetStart = new Date(args.startsAt as string).getTime();
        const targetEnd = targetStart + Number(args.durationMinutes) * 60 * 1000;
        const excludeSessionId = args.excludeSessionId as string | undefined;

        const conflictingSessions = this.db.trainingSessions.filter((s) => {
          if (s.facilityId !== facilityId || s.deletedAt) return false;
          if (excludeSessionId && s._id === excludeSessionId) return false;
          const sStart = new Date(s.startsAt).getTime();
          const sEnd = sStart + s.durationMinutes * 60 * 1000;
          return targetStart < sEnd && targetEnd > sStart;
        });

        return {
          available: conflictingSessions.length === 0,
          reason:
            conflictingSessions.length > 0
              ? `Facility '${facility.name}' is booked by ${conflictingSessions.length} other session(s).`
              : undefined,
          conflictingSessions: conflictingSessions.map((s) => ({
            _id: s._id,
            title: s.title,
            startsAt: s.startsAt,
            durationMinutes: s.durationMinutes,
          })),
        };
      }

      case "trainingSessions:listTodaySessions": {
        if (!academyId) return [];
        const now = new Date();
        const startOfDay = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0),
        ).toISOString();
        const endOfDay = new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
        ).toISOString();

        const todaySessions = this.db.trainingSessions.filter(
          (s) =>
            s.academyId === academyId &&
            s.startsAt >= startOfDay &&
            s.startsAt <= endOfDay,
        );

        const teamMap = new Map(this.db.teams.map((t) => [t._id, t]));
        return todaySessions
          .map((session) => {
            const team = teamMap.get(session.teamId);
            const rosterCount = this.db.teamMembers.filter(
              (m) => m.teamId === session.teamId,
            ).length;
            const checkedInCount = this.db.attendanceRecords.filter(
              (a) =>
                a.sessionId === session._id &&
                (a.status === "present" || a.status === "late"),
            ).length;
            return {
              ...session,
              teamName: team?.name ?? "Team",
              teamSport: team?.sport,
              rosterCount,
              checkedInCount,
            };
          })
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      }

      case "trainingSessions:getSessionKioskRoster": {
        const sessionId = args.sessionId as string;
        const session = this.db.trainingSessions.find((s) => s._id === sessionId);
        if (!session) throw new Error("Session not found");

        const team = this.db.teams.find((t) => t._id === session.teamId);
        const memberships = this.db.teamMembers.filter(
          (m) => m.teamId === session.teamId,
        );
        const athleteMap = new Map(this.db.athletes.map((a) => [a._id, a]));
        const athletes = memberships
          .map((m) => athleteMap.get(m.athleteId))
          .filter(Boolean) as MockAthlete[];

        const records = this.db.attendanceRecords.filter(
          (r) => r.sessionId === sessionId,
        );
        const recordMap = new Map(records.map((r) => [r.athleteId, r]));

        const roster = athletes.map((a) => {
          const rec = recordMap.get(a._id);
          return {
            _id: a._id,
            firstName: a.firstName,
            lastName: a.lastName,
            sport: a.sport,
            email: a.email,
            hasPin: a.checkInPin !== undefined,
            status: (rec?.status ?? "unrecorded") as
              | "present"
              | "late"
              | "absent"
              | "excused"
              | "unrecorded",
            recordedAt: rec?.markedAt,
          };
        });

        roster.sort((a, b) => {
          if (a.status === "unrecorded" && b.status !== "unrecorded") return -1;
          if (a.status !== "unrecorded" && b.status === "unrecorded") return 1;
          return a.lastName.localeCompare(b.lastName);
        });

        const total = roster.length;
        const present = records.filter((r) => r.status === "present").length;
        const late = records.filter((r) => r.status === "late").length;
        const excused = records.filter((r) => r.status === "excused").length;
        const absent = records.filter((r) => r.status === "absent").length;
        const unrecorded = Math.max(0, total - (present + late + excused + absent));
        const percentCheckedIn =
          total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return {
          session: {
            ...session,
            teamName: team?.name ?? "Team",
            teamSport: team?.sport,
          },
          roster,
          stats: {
            total,
            present,
            late,
            excused,
            absent,
            unrecorded,
            percentCheckedIn,
          },
        };
      }

      case "trainingSessions:getAthleteAttendanceStats": {
        const athleteId = args.athleteId as string;
        const memberships = this.db.teamMembers.filter(
          (m) => m.athleteId === athleteId,
        );
        const teamIds = new Set(memberships.map((m) => m.teamId));

        const sessions = this.db.trainingSessions.filter((s) =>
          teamIds.has(s.teamId),
        );
        const sessionIds = new Set(sessions.map((s) => s._id));

        const records = this.db.attendanceRecords.filter(
          (r) => r.athleteId === athleteId && sessionIds.has(r.sessionId),
        );

        const present = records.filter((r) => r.status === "present").length;
        const late = records.filter((r) => r.status === "late").length;
        const excused = records.filter((r) => r.status === "excused").length;
        const absent = records.filter((r) => r.status === "absent").length;
        const total = present + late + excused + absent;
        const attended = present + late;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

        const sessionMap = new Map(sessions.map((s) => [s._id, s]));
        const recentSessions = records
          .map((r) => {
            const s = sessionMap.get(r.sessionId);
            if (!s) return null;
            return {
              sessionId: r.sessionId,
              title: s.title,
              startsAt: s.startsAt,
              status: r.status as "present" | "absent" | "excused" | "late" | "unrecorded",
            };
          })
          .filter(Boolean)
          .slice(0, 5);

        return {
          totalSessions: total,
          present,
          late,
          excused,
          absent,
          unrecorded: 0,
          attendanceRate: rate,
          recentSessions,
        };
      }

      case "trainingSessions:getAcademyAttendanceLeaderboard": {
        if (!academyId) return { top: [], bottom: [] };
        const athletes = this.db.athletes.filter(
          (a) => a.academyId === academyId && a.status === "active",
        );
        const top = athletes.slice(0, 3).map((a, idx) => ({
          athleteId: a._id,
          name: `${a.firstName} ${a.lastName}`,
          rate: 95 - idx * 4,
          total: 12 + idx * 2,
        }));
        const bottom = athletes.slice(3, 5).map((a, idx) => ({
          athleteId: a._id,
          name: `${a.firstName} ${a.lastName}`,
          rate: 68 + idx * 5,
          total: 10 + idx,
        }));
        return { top, bottom };
      }

      case "teams:listTeams": {
        if (!academyId) return [];
        const teams = this.db.teams.filter((t) => t.academyId === academyId);
        return teams.map((team) => {
          const memberCount = this.db.teamMembers.filter(
            (m) => m.teamId === team._id,
          ).length;
          return {
            ...team,
            memberCount,
          };
        });
      }

      case "teams:getTeam": {
        const teamId = args.teamId as string;
        const team = this.db.teams.find((t) => t._id === teamId);
        if (!team) throw new Error("Team not found");
        if (user?.role !== "platform_admin" && academyId && team.academyId !== academyId) {
          throw new Error("Forbidden: You do not have access to this team");
        }

        const members = this.db.teamMembers.filter((m) => m.teamId === teamId);
        const athleteMap = new Map(this.db.athletes.map((a) => [a._id, a]));
        const roster = members
          .map((m) => athleteMap.get(m.athleteId))
          .filter(Boolean);

        return { team, roster };
      }

      case "athletes:listAthletes": {
        if (!academyId) return [];
        let list = this.db.athletes.filter((a) => a.academyId === academyId);
        if (
          args.search &&
          typeof args.search === "string" &&
          args.search.trim()
        ) {
          const q = args.search.toLowerCase();
          list = list.filter(
            (a) =>
              a.firstName.toLowerCase().includes(q) ||
              a.lastName.toLowerCase().includes(q) ||
              (a.email && a.email.toLowerCase().includes(q)) ||
              (a.sport && a.sport.toLowerCase().includes(q)),
          );
        }
        return list;
      }

      case "athletes:getAthlete": {
        const athleteId = args.athleteId as string;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (!athlete) throw new Error("Athlete not found");
        if (user?.role !== "platform_admin" && academyId && athlete.academyId !== academyId) {
          throw new Error("Forbidden: You do not have access to this athlete");
        }
        return athlete;
      }

      case "injuries:getAthleteInjuries": {
        const athleteId = args.athleteId as string;
        const canViewClinical =
          user?.role === "platform_admin" ||
          user?.role === "sporting_director" ||
          user?.role === "medical_staff";
        const records = this.db.injuries
          .filter((i) => i.athleteId === athleteId)
          .sort((a, b) => b.injuryDate - a.injuryDate);

        return records.map((rec) => ({
          ...rec,
          clinicalNotes: canViewClinical ? rec.clinicalNotes : undefined,
        }));
      }

      case "injuries:getAcademyMedicalRoomSummary": {
        const targetAcademyId = (args.academyId as string) || academyId;
        const canViewClinical =
          user?.role === "platform_admin" ||
          user?.role === "sporting_director" ||
          user?.role === "medical_staff";

        const activeInjuries = this.db.injuries.filter(
          (i) => i.academyId === targetAcademyId && !i.isResolved,
        );

        return activeInjuries.map((injury) => {
          const athlete = this.db.athletes.find((a) => a._id === injury.athleteId);
          const memberTeams = this.db.teamMembers
            .filter((tm) => tm.athleteId === injury.athleteId)
            .map((tm) => this.db.teams.find((t) => t._id === tm.teamId)?.name ?? "Unknown Team");

          return {
            _id: injury._id,
            academyId: injury.academyId,
            athleteId: injury.athleteId,
            athleteFirstName: athlete?.firstName ?? "Unknown",
            athleteLastName: athlete?.lastName ?? "Athlete",
            teams: memberTeams,
            availabilityStatus: injury.availabilityStatus,
            bodyPart: injury.bodyPart,
            laterality: injury.laterality,
            mechanism: injury.mechanism,
            severity: injury.severity,
            injuryDate: injury.injuryDate,
            expectedReturnDate: injury.expectedReturnDate,
            isResolved: injury.isResolved,
            coachingRestrictions: injury.coachingRestrictions,
            clinicalNotes: canViewClinical ? injury.clinicalNotes : undefined,
            updatedAt: injury.updatedAt,
          };
        });
      }

      case "workload:getAthleteWorkloadAndACWR": {
        const athleteId = args.athleteId as string;
        const now = Date.now();
        const msInDay = 86_400_000;
        const sevenDaysAgo = now - 7 * msInDay;
        const twentyEightDaysAgo = now - 28 * msInDay;

        const dailyLoadsMap = new Map<string, number>();
        for (let i = 27; i >= 0; i--) {
          const d = new Date(now - i * msInDay);
          const key = d.toISOString().split("T")[0];
          dailyLoadsMap.set(key, 0);
        }

        let acuteLoad7d = 0;
        let total28dLoad = 0;
        let totalSessions28d = 0;

        for (const record of this.db.attendanceRecords) {
          if (record.athleteId !== athleteId) continue;
          if (record.status !== "present" && record.status !== "late") continue;
          const load = record.sessionLoad ?? 0;
          if (load <= 0) continue;

          let time = record.loggedAt;
          if (!time && record.markedAt) {
            time = new Date(record.markedAt).getTime();
          }
          if (!time || time < twentyEightDaysAgo || time > now + msInDay) continue;

          totalSessions28d++;
          total28dLoad += load;
          if (time >= sevenDaysAgo) {
            acuteLoad7d += load;
          }

          const dateKey = new Date(time).toISOString().split("T")[0];
          if (dailyLoadsMap.has(dateKey)) {
            dailyLoadsMap.set(dateKey, (dailyLoadsMap.get(dateKey) ?? 0) + load);
          }
        }

        for (const log of this.db.workoutLogs) {
          if (log.athleteId !== athleteId) continue;
          const load = log.calculatedLoad ?? 0;
          if (load <= 0) continue;
          const time = log.completedAt;
          if (time < twentyEightDaysAgo || time > now + msInDay) continue;

          totalSessions28d++;
          total28dLoad += load;
          if (time >= sevenDaysAgo) {
            acuteLoad7d += load;
          }

          const dateKey = new Date(time).toISOString().split("T")[0];
          if (dailyLoadsMap.has(dateKey)) {
            dailyLoadsMap.set(dateKey, (dailyLoadsMap.get(dateKey) ?? 0) + load);
          }
        }

        const chronicLoadWeeklyAvg28d = Number((total28dLoad / 4).toFixed(1));
        let acwr: number | null = null;
        let riskZone: string = "insufficient_data";

        if (chronicLoadWeeklyAvg28d > 0) {
          acwr = Number((acuteLoad7d / chronicLoadWeeklyAvg28d).toFixed(2));
          if (acwr < 0.8) {
            riskZone = "undertraining";
          } else if (acwr <= 1.3) {
            riskZone = "optimal";
          } else if (acwr <= 1.5) {
            riskZone = "caution";
          } else {
            riskZone = "danger_high_spike";
          }
        }

        const activeInjuries = this.db.injuries
          .filter((i) => i.athleteId === athleteId && !i.isResolved)
          .sort((a, b) => b.injuryDate - a.injuryDate);

        let availabilityStatus = "fit";
        let coachingRestrictions: string | undefined = undefined;
        let activeInjuryId: string | undefined = undefined;

        if (activeInjuries.length > 0) {
          availabilityStatus = activeInjuries[0].availabilityStatus;
          coachingRestrictions = activeInjuries[0].coachingRestrictions;
          activeInjuryId = activeInjuries[0]._id;
        }

        const dailyLoads = Array.from(dailyLoadsMap.entries()).map(([date, load]) => {
          const d = new Date(date + "T00:00:00");
          const dayOfWeek = d.toLocaleDateString("en-US", { weekday: "short" });
          return { date, dayOfWeek, load };
        });

        return {
          athleteId,
          availabilityStatus,
          coachingRestrictions,
          activeInjuryId,
          acuteLoad7d,
          chronicLoadWeeklyAvg28d,
          total28dLoad,
          totalSessions28d,
          acwr,
          riskZone,
          dailyLoads,
        };
      }

      case "academies:getMyAcademy": {
        return this.db.academies.find((a) => a._id === academyId) ?? null;
      }

      case "feeAutomation:listFeeSchedules": {
        return this.db.feeSchedules
          .filter((s) => s.academyId === academyId)
          .map((s) => {
            const a = this.db.athletes.find((x) => x._id === s.athleteId);
            return {
              ...s,
              athleteName: a ? `${a.firstName} ${a.lastName}` : "Unknown athlete",
            };
          });
      }

      case "athletes:listMyAthletes": {
        return this.ownAthletes(user);
      }

      case "athletes:listMyAthletesOverview": {
        const now = new Date().toISOString();
        return this.ownAthletes(user).map((athlete) => {
          const teamIds = new Set(
            this.db.teamMembers
              .filter((m) => m.athleteId === athlete._id)
              .map((m) => m.teamId),
          );
          const teams = this.db.teams.filter((t) => teamIds.has(t._id));
          const next = this.db.trainingSessions
            .filter((s) => teamIds.has(s.teamId) && s.startsAt >= now)
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
          const records = this.db.attendanceRecords.filter(
            (r) => r.athleteId === athlete._id,
          );
          const attended = records.filter(
            (r) => r.status === "present" || r.status === "late",
          ).length;
          return {
            athlete,
            teams: teams.map((t) => ({ _id: t._id, name: t.name })),
            nextSession: next
              ? {
                  title: next.title,
                  startsAt: next.startsAt,
                  teamName: teams.find((t) => t._id === next.teamId)?.name,
                }
              : null,
            recordedSessions: records.length,
            attendanceRate:
              records.length > 0
                ? Math.round((attended / records.length) * 100)
                : null,
            metricsTracked: new Set(
              this.db.assessments
                .filter((a) => a.athleteId === athlete._id)
                .map((a) => a.metric),
            ).size,
          };
        });
      }

      case "athletes:getAthleteByUserId": {
        if (!user) return null;
        if (user.role === "guardian") {
          return (
            this.db.athletes.find(
              (a) =>
                a.guardianUserId === user._id ||
                (user.email && a.guardianEmail?.toLowerCase() === user.email.toLowerCase()),
            ) ?? null
          );
        }
        return (
          this.db.athletes.find(
            (a) =>
              a.userId === user._id || (user.email && a.email === user.email),
          ) ?? null
        );
      }

      case "trainingPlans:listPlansForAthlete": {
        const athleteId = args.athleteId as string;
        if (user?.role === "athlete" || user?.role === "guardian") {
          const myAthletes = this.ownAthletes(user);
          if (!myAthletes.some((a) => a._id === athleteId)) {
            return [];
          }
        }
        return this.db.trainingPlans.filter((p) => p.athleteId === athleteId);
      }

      case "trainingPlans:getPlan": {
        const planId = args.planId as string;
        const plan = this.db.trainingPlans.find((p) => p._id === planId);
        if (!plan) throw new Error("Plan not found");
        if (user?.role === "athlete" || user?.role === "guardian") {
          const myAthletes = this.ownAthletes(user);
          if (!myAthletes.some((a) => a._id === plan.athleteId)) {
            throw new Error("Access denied: Not your athlete's plan");
          }
        }
        const athlete =
          this.db.athletes.find((a) => a._id === plan.athleteId) ?? null;
        const items = this.db.planItems
          .filter((item) => item.planId === planId)
          .sort((a, b) => a.order - b.order);
        return { plan, athlete, items };
      }

      case "assessments:listAssessmentsForAthlete": {
        const athleteId = args.athleteId as string;
        if (user?.role === "athlete" || user?.role === "guardian") {
          const myAthletes = this.ownAthletes(user);
          if (!myAthletes.some((a) => a._id === athleteId)) {
            return [];
          }
        }
        const records = this.db.assessments
          .filter((ass) => ass.athleteId === athleteId)
          .sort((a, b) => a.assessedOn.localeCompare(b.assessedOn));

        const byMetric = new Map<
          string,
          { unit: string | undefined; points: typeof records }
        >();
        for (const r of records) {
          const entry = byMetric.get(r.metric);
          if (entry) {
            entry.points.push(r);
            if (r.unit) entry.unit = r.unit;
          } else {
            byMetric.set(r.metric, { unit: r.unit, points: [r] });
          }
        }

        return Array.from(byMetric.entries()).map(([metric, { unit, points }]) => ({
          metric,
          unit,
          points: points.map((p) => ({
            _id: p._id,
            assessedOn: p.assessedOn,
            value: p.value,
            notes: p.notes,
          })),
        }));
      }

      case "assessments:getAthleteBenchmarkReport": {
        const athleteId = args.athleteId as string;
        const targetTeamId = args.teamId as string | undefined;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (!athlete) return null;

        let activeTeamId = targetTeamId;
        let activeTeamName: string | undefined;

        if (activeTeamId) {
          const t = this.db.teams.find((tm) => tm._id === activeTeamId);
          activeTeamName = t?.name;
        }

        let cohortAthleteIds: Set<string>;
        if (activeTeamId) {
          const members = this.db.teamMembers.filter((tm) => tm.teamId === activeTeamId);
          cohortAthleteIds = new Set(members.map((m) => m.athleteId));
        } else {
          const myMemberships = this.db.teamMembers.filter((tm) => tm.athleteId === athleteId);
          if (myMemberships.length > 0) {
            activeTeamId = myMemberships[0].teamId;
            const t = this.db.teams.find((tm) => tm._id === activeTeamId);
            activeTeamName = t?.name;
            const members = this.db.teamMembers.filter((tm) => tm.teamId === activeTeamId);
            cohortAthleteIds = new Set(members.map((m) => m.athleteId));
          } else {
            const activeAthletes = this.db.athletes.filter(
              (a) => a.academyId === athlete.academyId && a.status === "active",
            );
            cohortAthleteIds = new Set(activeAthletes.map((a) => a._id));
          }
        }
        cohortAthleteIds.add(athleteId);
        const cohortSize = cohortAthleteIds.size;

        const athleteAssessments = this.db.assessments.filter((a) => a.athleteId === athleteId);
        const latestByMetric = new Map<string, MockAssessment>();
        for (const ass of athleteAssessments) {
          const existing = latestByMetric.get(ass.metric);
          if (!existing) {
            latestByMetric.set(ass.metric, ass);
          } else {
            if (
              ass.assessedOn > existing.assessedOn ||
              (ass.assessedOn === existing.assessedOn && ass.createdAt > existing.createdAt)
            ) {
              latestByMetric.set(ass.metric, ass);
            }
          }
        }

        const defaultComposites = {
          physical: 50,
          technical: 50,
          tactical: 50,
          psychological: 50,
        };

        if (latestByMetric.size === 0) {
          return {
            athleteId,
            athleteName: `${athlete.firstName} ${athlete.lastName}`,
            cohortSize,
            teamId: activeTeamId,
            teamName: activeTeamName,
            metrics: [],
            cornerComposites: defaultComposites,
          };
        }

        const normalCdf = (z: number): number => {
          const t = 1 / (1 + 0.2316419 * Math.abs(z));
          const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
          const prob =
            d *
            t *
            (0.31938153 +
              t *
                (-0.356563782 +
                  t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
          return z > 0 ? 1 - prob : prob;
        };

        const inferDirection = (explicit?: string, unit?: string): "higher_is_better" | "lower_is_better" => {
          if (explicit === "lower_is_better" || explicit === "higher_is_better") return explicit;
          if (!unit) return "higher_is_better";
          const u = unit.trim().toLowerCase();
          if (u === "s" || u === "sec" || u === "seconds" || u === "ms") return "lower_is_better";
          return "higher_is_better";
        };

        const metricResults: Array<{
          metric: string;
          corner: "physical" | "technical" | "tactical" | "psychological";
          optimizationDirection: "higher_is_better" | "lower_is_better";
          athleteValue: number;
          unit: string | undefined;
          assessedOn: string;
          cohortMean: number;
          cohortStdDev: number;
          zScore: number;
          percentile: number;
          cohortSampleCount: number;
        }> = [];

        const cornerPercentiles: Record<"physical" | "technical" | "tactical" | "psychological", number[]> = {
          physical: [],
          technical: [],
          tactical: [],
          psychological: [],
        };

        for (const [metricName, targetAss] of latestByMetric.entries()) {
          const cohortValues: number[] = [];
          for (const cAthleteId of cohortAthleteIds) {
            const memberAss = this.db.assessments.filter(
              (a) => a.athleteId === cAthleteId && a.metric === metricName,
            );
            if (memberAss.length > 0) {
              memberAss.sort(
                (a, b) =>
                  b.assessedOn.localeCompare(a.assessedOn) ||
                  b.createdAt.localeCompare(a.createdAt),
              );
              cohortValues.push(memberAss[0].value);
            }
          }
          if (cohortValues.length === 0) {
            cohortValues.push(targetAss.value);
          }

          const count = cohortValues.length;
          const mean = cohortValues.reduce((a, b) => a + b, 0) / count;
          const variance =
            cohortValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / count;
          const stdDev = Math.sqrt(variance);

          let zRaw = 0;
          if (stdDev > 0.000001) {
            zRaw = (targetAss.value - mean) / stdDev;
          }

          const optDirection = inferDirection(targetAss.optimizationDirection, targetAss.unit);
          const zNormalized = optDirection === "lower_is_better" ? -zRaw : zRaw;
          const roundedZ = Math.round(zNormalized * 100) / 100;
          const percentile = Math.min(99, Math.max(1, Math.round(normalCdf(roundedZ) * 100)));
          const corner = targetAss.corner ?? "physical";
          cornerPercentiles[corner].push(percentile);

          metricResults.push({
            metric: metricName,
            corner,
            optimizationDirection: optDirection,
            athleteValue: targetAss.value,
            unit: targetAss.unit,
            assessedOn: targetAss.assessedOn,
            cohortMean: Math.round(mean * 100) / 100,
            cohortStdDev: Math.round(stdDev * 100) / 100,
            zScore: roundedZ,
            percentile,
            cohortSampleCount: count,
          });
        }

        metricResults.sort((a, b) => {
          if (a.corner !== b.corner) return a.corner.localeCompare(b.corner);
          return a.metric.localeCompare(b.metric);
        });

        const computeCorner = (c: "physical" | "technical" | "tactical" | "psychological") => {
          const arr = cornerPercentiles[c];
          if (arr.length === 0) return 50;
          return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
        };

        return {
          athleteId,
          athleteName: `${athlete.firstName} ${athlete.lastName}`,
          cohortSize,
          teamId: activeTeamId,
          teamName: activeTeamName,
          metrics: metricResults,
          cornerComposites: {
            physical: computeCorner("physical"),
            technical: computeCorner("technical"),
            tactical: computeCorner("tactical"),
            psychological: computeCorner("psychological"),
          },
        };
      }

      case "athleteGoals:listAthleteGoals": {
        const athleteId = args.athleteId as string;
        const status = args.status as string | undefined;
        let goals = (this.db.athleteGoals || []).filter((g) => g.athleteId === athleteId);
        if (status) {
          goals = goals.filter((g) => g.status === status);
        }
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        const enriched = goals.map((goal) => {
          const creator = this.db.users.find((u) => u._id === goal.createdByUserId);
          return {
            ...goal,
            creatorName: creator?.name ?? "Coach",
            athleteName: athlete ? `${athlete.firstName} ${athlete.lastName}` : "Athlete",
          };
        });

        const statusWeight: Record<string, number> = {
          at_risk: 1,
          in_progress: 2,
          achieved: 3,
          archived: 4,
        };
        enriched.sort((a, b) => {
          const wa = statusWeight[a.status] ?? 99;
          const wb = statusWeight[b.status] ?? 99;
          if (wa !== wb) return wa - wb;
          return a.targetDate.localeCompare(b.targetDate);
        });
        return enriched;
      }

      case "drills:listDrills": {
        const drills = this.db.drills || [];
        const ageGroup = args.ageGroup as string | undefined;
        const category = args.category as string | undefined;
        return drills.filter((d) => {
          if (academyId && d.academyId !== academyId) return false;
          if (ageGroup && ageGroup !== "all" && d.ageGroup !== ageGroup) return false;
          if (category && category !== "all" && d.category !== category) return false;
          return true;
        });
      }

      case "tacticalPlans:listTacticalPlans": {
        const plans = this.db.tacticalPlans || [];
        const drillId = args.drillId as string | undefined;
        return plans.filter((p) => {
          if (academyId && p.academyId !== academyId) return false;
          if (drillId && p.drillId !== drillId) return false;
          return true;
        });
      }

      case "tacticalPlans:getTacticalPlan": {
        const planId = args.id as string;
        const plans = this.db.tacticalPlans || [];
        return plans.find((p) => p._id === planId) || null;
      }

      case "assessments:listAssessmentsForSession": {
        const sessionId = args.sessionId as string;
        let records = this.db.assessments.filter((ass) => ass.sessionId === sessionId);
        if (user?.role === "athlete" || user?.role === "guardian") {
          const myAthletes = this.ownAthletes(user);
          const myAthleteIds = new Set(myAthletes.map((a) => a._id));
          records = records.filter((r) => myAthleteIds.has(r.athleteId));
        }
        records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        const athleteMap = new Map(this.db.athletes.map((a) => [a._id, a]));
        return records.map((r) => {
          const athlete = athleteMap.get(r.athleteId);
          return {
            ...r,
            athleteName: athlete
              ? `${athlete.firstName} ${athlete.lastName}`
              : "Unknown Athlete",
          };
        });
      }

      case "assessments:listAssessmentsForAnalytics": {
        let records = this.db.assessments || [];
        if (academyId) {
          records = records.filter((r) => r.academyId === academyId);
        }
        if (user?.role === "athlete" || user?.role === "guardian") {
          const myAthletes = this.ownAthletes(user);
          const myAthleteIds = new Set(myAthletes.map((a) => a._id));
          records = records.filter((r) => myAthleteIds.has(r.athleteId));
        }
        const metric = args.metric as string | undefined;
        if (metric) {
          const term = metric.toLowerCase();
          records = records.filter((r) => r.metric.toLowerCase().includes(term));
        }
        return records.map((r) => ({
          _id: r._id,
          athleteId: r.athleteId,
          sessionId: r.sessionId,
          metric: r.metric,
          value: r.value,
          unit: r.unit,
          assessedOn: r.assessedOn,
          notes: r.notes,
        }));
      }

      case "fees:listFees":
      case "fees:listFeesForAcademy": {
        const myAthletes = (user?.role === "athlete" || user?.role === "guardian") ? this.ownAthletes(user) : [];
        const targetAcademyId = (args.academyId as string) || academyId || myAthletes[0]?.academyId;
        if (!targetAcademyId && myAthletes.length === 0) return [];
        let fees = targetAcademyId ? this.db.athleteFees.filter((f) => f.academyId === targetAcademyId) : this.db.athleteFees;
        if (args.status) {
          fees = fees.filter((f) => f.status === args.status);
        }

        if (user?.role === "athlete" || user?.role === "guardian") {
          const myAthleteIds = new Set(myAthletes.map((a) => a._id));
          fees = fees.filter((f) => myAthleteIds.has(f.athleteId));
        }

        const athleteMap = new Map(this.db.athletes.map((a) => [a._id, a]));
        return fees.map((fee) => {
          const athlete = athleteMap.get(fee.athleteId);
          const payments = this.db.feePayments.filter(
            (p) => p.feeId === fee._id,
          );
          const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
          return {
            ...fee,
            currency: fee.currency || "USD",
            athleteName: athlete
              ? `${athlete.firstName} ${athlete.lastName}`
              : "Unknown",
            athleteSport: athlete?.sport,
            totalPaid,
            remainingBalance: Math.max(0, fee.amountDue - totalPaid),
          };
        });
      }

      case "fees:listFeesForAthlete": {
        const athleteId = args.athleteId as string;
        if (user?.role === "athlete" || user?.role === "guardian") {
          const myAthletes = this.ownAthletes(user);
          if (!myAthletes.some((a) => a._id === athleteId)) {
            return [];
          }
        }

        const fees = this.db.athleteFees.filter(
          (f) => f.athleteId === athleteId,
        );
        return fees.map((fee) => {
          const payments = this.db.feePayments
            .filter((p) => p.feeId === fee._id)
            .sort((a, b) => b.paidAt.localeCompare(a.paidAt));
          const totalPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
          return {
            ...fee,
            currency: fee.currency || "USD",
            payments,
            totalPaid,
            remainingBalance: Math.max(0, fee.amountDue - totalPaid),
          };
        });
      }

      case "invoices:listInvoicesForAcademy": {
        const myAthletes = (user?.role === "athlete" || user?.role === "guardian") ? this.ownAthletes(user) : [];
        const targetAcademyId = (args.academyId as string) || academyId || myAthletes[0]?.academyId;
        if (!targetAcademyId && myAthletes.length === 0) return [];
        let invoices = targetAcademyId ? this.db.invoices.filter(
          (i) => i.academyId === targetAcademyId,
        ) : this.db.invoices;
        if (args.status) {
          invoices = invoices.filter((i) => i.status === args.status);
        }

        if (user?.role === "athlete" || user?.role === "guardian") {
          const myAthleteIds = new Set(myAthletes.map((a) => a._id));
          invoices = invoices.filter((i) => i.athleteId && myAthleteIds.has(i.athleteId));
        }

        const athleteMap = new Map(this.db.athletes.map((a) => [a._id, a]));
        return invoices.map((inv) => ({
          ...inv,
          currency: inv.currency || "USD",
          athleteName: inv.athleteId
            ? athleteMap.get(inv.athleteId)
              ? `${athleteMap.get(inv.athleteId)!.firstName} ${athleteMap.get(inv.athleteId)!.lastName}`
              : "Unknown"
            : null,
        }));
      }

      case "invoices:adminBillingOverview": {
        if (user?.role !== "platform_admin") {
          return {
            academies: [],
            grandTotal: 0,
            paidTotal: 0,
            currencyTotals: {},
            totalInvoices: 0,
          };
        }
        const allInvoices = this.db.invoices;
        const academyIds = [...new Set(allInvoices.map((i) => i.academyId))];
        const academyMap = new Map(this.db.academies.map((a) => [a._id, a]));

        const academies = academyIds.map((id) => {
          const academy = academyMap.get(id);
          const invs = allInvoices.filter((i) => i.academyId === id);
          const totalAmount = invs.reduce((s, i) => s + i.amount, 0);
          return {
            academyId: id,
            academyName: academy?.name ?? "Unknown",
            totalInvoices: invs.length,
            totalAmount,
            currency: invs[0]?.currency ?? "USD",
            statusCounts: {
              draft: invs.filter((i) => i.status === "draft").length,
              sent: invs.filter((i) => i.status === "sent").length,
              paid: invs.filter((i) => i.status === "paid").length,
              overdue: invs.filter((i) => i.status === "overdue").length,
            },
          };
        });

        const grandTotal = allInvoices.reduce((s, i) => s + i.amount, 0);
        const paidTotal = allInvoices
          .filter((i) => i.status === "paid")
          .reduce((s, i) => s + i.amount, 0);

        return {
          academies,
          grandTotal,
          paidTotal,
          currencyTotals: {
            USD: { invoiced: grandTotal, paid: paidTotal },
          },
          totalInvoices: allInvoices.length,
        };
      }

      case "academies:listAcademies": {
        if (user?.role !== "platform_admin") {
          return this.db.academies.filter((a) => a._id === academyId);
        }
        return this.db.academies;
      }

      case "academies:platformOverview": {
        if (user?.role !== "platform_admin") {
          return [];
        }
        return this.db.academies.map((academy) => {
          const athletes = this.db.athletes.filter(
            (a) => a.academyId === academy._id,
          );
          const members = this.db.users.filter(
            (u) => u.academyId === academy._id,
          );
          const count = (role: string) =>
            members.filter((m) => m.role === role).length;
          return {
            ...academy,
            activeAthletes: athletes.filter((a) => a.status === "active").length,
            totalAthletes: athletes.length,
            managers: count("academy_admin"),
            coaches: count("coach"),
            accounting: count("accounting"),
            guardians: count("guardian"),
          };
        });
      }

      case "users:listAllUsers": {
        if (user?.role !== "platform_admin") {
          return [];
        }
        const names = new Map(this.db.academies.map((a) => [a._id, a.name]));
        const sourceUsers = this.db.users;
        return sourceUsers.map((u) => ({
          _id: u._id,
          name: u.name,
          email: u.email,
          role: u.role,
          emailVerified: true,
          academyId: u.academyId,
          academyName:
            u.role === "platform_admin" || !u.academyId
              ? undefined
              : names.get(u.academyId),
          createdAt: 0,
        }));
      }

      case "invites:listInvites": {
        if (!academyId) return [];
        return this.db.invites.filter((inv) => inv.academyId === academyId);
      }

      case "videoAnalyses:listAnalysesForAthlete": {
        const athleteId = args.athleteId as string;
        if (!athleteId) return [];
        return (this.db.videoAnalyses || [])
          .filter((va) => va.athleteId === athleteId)
          .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
          .map((va) => ({
            ...va,
            videoUrl: null,
          }));
      }

      case "videoAnalyses:getAnalysis": {
        const analysisId = args.analysisId as string;
        const va = (this.db.videoAnalyses || []).find((v) => v._id === analysisId);
        if (!va) return null;
        return {
          ...va,
          videoUrl: null,
        };
      }

      case "announcements:listAnnouncements": {
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId) return [];
        const all = this.db.announcements.filter((a) => a.academyId === targetAcademyId);
        const reads = new Set(
          (this.db.announcementReads || [])
            .filter((r) => r.userId === user?._id)
            .map((r) => r.announcementId),
        );

        let filtered = all.filter((a) => {
          if (args.category && a.category !== args.category) return false;
          if (a.targetTeamId && args.teamId && a.targetTeamId !== args.teamId) {
            if (user?.role === "athlete") return false;
          }
          if (a.targetRole && a.targetRole !== user?.role && user?.role !== "academy_admin" && user?.role !== "platform_admin") {
            return false;
          }
          return true;
        });

        const priorityWeight = { urgent: 3, important: 2, normal: 1 };
        filtered.sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          const pDiff = (priorityWeight[b.priority] ?? 1) - (priorityWeight[a.priority] ?? 1);
          if (pDiff !== 0) return pDiff;
          return b.createdAt.localeCompare(a.createdAt);
        });

        return filtered.map((a) => ({
          ...a,
          isRead: reads.has(a._id),
          authorName: a.authorName ?? "Academy Staff",
        }));
      }

      case "announcements:getUnreadCount": {
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId || !user) return 0;
        const all = this.db.announcements.filter((a) => a.academyId === targetAcademyId);
        const reads = new Set(
          (this.db.announcementReads || [])
            .filter((r) => r.userId === user._id)
            .map((r) => r.announcementId),
        );
        return all.filter((a) => !reads.has(a._id)).length;
      }

      case "messages:listConversations": {
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId || !user) return [];
        const allConvs = this.db.conversations.filter(
          (c) =>
            c.academyId === targetAcademyId &&
            ((c.participantUids || c.participantIds).includes(user._id)),
        );

        const userMap = new Map(this.db.users.map((u) => [u._id, u]));

        const results = allConvs.map((c) => {
          const parts = c.participantUids || c.participantIds;
          const otherId = parts.find((id) => id !== user._id);
          const otherUser = otherId ? userMap.get(otherId) : user;
          const unreadCount = this.db.messages.filter(
            (m) => m.conversationId === c._id && !m.readBy.includes(user._id),
          ).length;

          return {
            ...c,
            otherParticipant: {
              _id: otherUser?._id ?? "",
              name: otherUser?.name ?? otherUser?.email ?? "User",
              email: otherUser?.email,
              role: otherUser?.role,
            },
            unreadCount,
          };
        });

        results.sort((a, b) => {
          const timeA = a.lastMessageAt ?? a.createdAt;
          const timeB = b.lastMessageAt ?? b.createdAt;
          return timeB.localeCompare(timeA);
        });

        return results;
      }

      case "messages:getConversation": {
        const conversationId = args.conversationId as string;
        const conv = this.db.conversations.find((c) => c._id === conversationId);
        if (!conv) throw new Error("Conversation not found");
        const parts = conv.participantUids || conv.participantIds;
        if (
          !parts.includes(user?._id ?? "") &&
          user?.role !== "academy_admin" &&
          user?.role !== "platform_admin"
        ) {
          throw new Error("Forbidden: not a participant");
        }
        const userMap = new Map(this.db.users.map((u) => [u._id, u]));
        const participants = parts
          .map((id) => userMap.get(id))
          .filter(Boolean);
        return {
          ...conv,
          participants,
        };
      }

      case "messages:listMessages": {
        const conversationId = args.conversationId as string;
        const conv = this.db.conversations.find((c) => c._id === conversationId);
        if (!conv) throw new Error("Conversation not found");
        const parts = conv.participantUids || conv.participantIds;
        if (
          !parts.includes(user?._id ?? "") &&
          user?.role !== "academy_admin" &&
          user?.role !== "platform_admin"
        ) {
          throw new Error("Forbidden: not a participant");
        }

        const msgs = this.db.messages
          .filter((m) => m.conversationId === conversationId)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        const userMap = new Map(this.db.users.map((u) => [u._id, u]));
        return msgs.map((m) => ({
          ...m,
          senderName: userMap.get(m.senderId)?.name ?? "User",
          senderRole: userMap.get(m.senderId)?.role,
          isOutgoing: m.senderId === user?._id,
        }));
      }

      case "messages:getUnreadMessagesCount": {
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId || !user) return 0;
        const userConvs = this.db.conversations.filter(
          (c) =>
            c.academyId === targetAcademyId &&
            ((c.participantUids || c.participantIds).includes(user._id)),
        );
        const convIds = new Set(userConvs.map((c) => c._id));
        return this.db.messages.filter(
          (m) => convIds.has(m.conversationId) && !m.readBy.includes(user._id),
        ).length;
      }

      default:
        console.warn(`[LocalMock] Unhandled query: ${name}`);
        return undefined;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Mutation Execution
  // ─────────────────────────────────────────────────────────────────────────────
  public async executeMutation(
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<unknown> {
    const user = this.getCurrentUser();
    const academyId = user?.academyId ?? this.getActiveAcademyId() ?? "acad_hercules";
    const nowIso = new Date().toISOString();
    const snapshotDb: MockDatabase = JSON.parse(JSON.stringify(this.db));

    switch (name) {
      case "users:updateCurrentUser": {
        return user?._id ?? "usr_admin";
      }

      case "users:updateMemberRole": {
        const targetUserId = args.targetUserId as string;
        const newRole = args.newRole as MockUser["role"];
        const target = this.db.users.find((u) => u._id === targetUserId);
        if (target) {
          target.role = newRole;
          this.saveDb();
          this.notifyAll();
        }
        return null;
      }

      case "users:removeAcademyMember": {
        const targetUserId = args.targetUserId as string;
        const target = this.db.users.find((u) => u._id === targetUserId);
        if (target) {
          target.academyId = undefined;
          target.role = undefined;
          this.saveDb();
          this.notifyAll();
        }
        return null;
      }

      case "trainingSessions:scheduleSession":
      case "trainingSessions:createSession": {
        if (!academyId) throw new Error("No academy");
        const facilityId = args.facilityId as string | undefined;
        if (facilityId) {
          const fac = this.db.facilities.find((f) => f._id === facilityId);
          if (!fac) throw new Error("Facility not found in academy");
          if (fac.status === "maintenance") {
            throw new Error(`Facility conflict: ${fac.name} is currently under maintenance and cannot be booked.`);
          }
          if (fac.status === "closed") {
            throw new Error(`Facility conflict: ${fac.name} is currently closed and cannot be booked.`);
          }
          const targetStart = new Date(args.startsAt as string).getTime();
          const targetEnd = targetStart + Number(args.durationMinutes) * 60 * 1000;
          const conflict = this.db.trainingSessions.find((s) => {
            if (s.facilityId !== facilityId || s.deletedAt) return false;
            const sStart = new Date(s.startsAt).getTime();
            const sEnd = sStart + s.durationMinutes * 60 * 1000;
            return targetStart < sEnd && targetEnd > sStart;
          });
          if (conflict) {
            throw new Error(`Facility conflict: ${fac.name} is already booked by another session during this time window.`);
          }
        }

        const newSession: MockTrainingSession = {
          _id: `sess_${Date.now()}`,
          academyId,
          teamId: args.teamId as string,
          title: (args.title as string).trim(),
          startsAt: args.startsAt as string,
          durationMinutes: Number(args.durationMinutes),
          location: args.location as string | undefined,
          notes: args.notes as string | undefined,
          facilityId,
          sessionType: (args.sessionType as MockTrainingSession["sessionType"]) ?? "training",
          microcycleDay: args.microcycleDay as MockTrainingSession["microcycleDay"],
          matchDetails: args.matchDetails as MockTrainingSession["matchDetails"],
          tacticalPlanId: args.tacticalPlanId as string | undefined,
          drillIds: args.drillIds as string[] | undefined,
          createdBy: user?._id || "system",
          createdAt: nowIso,
        };
        this.db.trainingSessions.unshift(newSession);
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("createSession", snapshotDb, mockCloudService.createSession(academyId, newSession));
        return newSession._id;
      }

      case "trainingSessions:updateSession": {
        const sessionId = args.sessionId as string;
        const session = this.db.trainingSessions.find(
          (s) => s._id === sessionId,
        );
        if (!session) throw new Error("Session not found");

        const targetFacilityId =
          args.facilityId !== undefined ? (args.facilityId as string) : session.facilityId;

        if (targetFacilityId) {
          const fac = this.db.facilities.find((f) => f._id === targetFacilityId);
          if (!fac) throw new Error("Facility not found in academy");
          if (fac.status === "maintenance") {
            throw new Error(`Facility conflict: ${fac.name} is currently under maintenance and cannot be booked.`);
          }
          if (fac.status === "closed") {
            throw new Error(`Facility conflict: ${fac.name} is currently closed and cannot be booked.`);
          }
          const targetStart = new Date((args.startsAt as string) ?? session.startsAt).getTime();
          const targetEnd =
            targetStart + Number(args.durationMinutes ?? session.durationMinutes) * 60 * 1000;
          const conflict = this.db.trainingSessions.find((s) => {
            if (s._id === sessionId || s.facilityId !== targetFacilityId || s.deletedAt) return false;
            const sStart = new Date(s.startsAt).getTime();
            const sEnd = sStart + s.durationMinutes * 60 * 1000;
            return targetStart < sEnd && targetEnd > sStart;
          });
          if (conflict) {
            throw new Error(`Facility conflict: ${fac.name} is already booked by another session during this time window.`);
          }
        }

        session.title = (args.title as string).trim();
        session.startsAt = args.startsAt as string;
        session.durationMinutes = Number(args.durationMinutes);
        session.location = args.location as string | undefined;
        session.notes = args.notes as string | undefined;
        if (args.facilityId !== undefined) session.facilityId = args.facilityId as string;
        if (args.sessionType !== undefined) session.sessionType = args.sessionType as MockTrainingSession["sessionType"];
        if (args.microcycleDay !== undefined) session.microcycleDay = args.microcycleDay as MockTrainingSession["microcycleDay"];
        if (args.matchDetails !== undefined) session.matchDetails = args.matchDetails as MockTrainingSession["matchDetails"];
        if (args.tacticalPlanId !== undefined) session.tacticalPlanId = args.tacticalPlanId as string;
        if (args.drillIds !== undefined) session.drillIds = args.drillIds as string[];

        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("updateSession", snapshotDb, mockCloudService.updateSession(session.academyId, sessionId, session));
        return null;
      }

      case "trainingSessions:recordMatchResultAndStats": {
        const sessionId = args.sessionId as string;
        const session = this.db.trainingSessions.find((s) => s._id === sessionId);
        if (!session) throw new Error("Session not found");
        if (args.matchDetails) {
          session.matchDetails = args.matchDetails as MockTrainingSession["matchDetails"];
        }
        const playerStats = (args.playerStats as Array<{
          athleteId: string;
          started?: boolean;
          minutesPlayed?: number;
          goalsOrPoints?: number;
          assists?: number;
          yellowCards?: number;
          redCards?: number;
          coachRating?: number;
        }>) ?? [];
        for (const stat of playerStats) {
          const existing = this.db.attendanceRecords.find(
            (a) => a.sessionId === sessionId && a.athleteId === stat.athleteId,
          );
          if (existing) {
            existing.matchStats = {
              started: Boolean(stat.started),
              minutesPlayed: Number(stat.minutesPlayed ?? 0),
              goalsOrPoints: stat.goalsOrPoints,
              assists: stat.assists,
              yellowCards: stat.yellowCards,
              redCards: stat.redCards,
              coachRating: stat.coachRating,
            };
          } else {
            this.db.attendanceRecords.push({
              _id: `att_${Date.now()}_${stat.athleteId}`,
              sessionId,
              athleteId: stat.athleteId,
              academyId: session.academyId,
              status: "present",
              recordedAt: nowIso,
              recordedBy: user?._id || "system",
              matchStats: {
                started: Boolean(stat.started),
                minutesPlayed: Number(stat.minutesPlayed ?? 0),
                goalsOrPoints: stat.goalsOrPoints,
                assists: stat.assists,
                yellowCards: stat.yellowCards,
                redCards: stat.redCards,
                coachRating: stat.coachRating,
              },
            });
          }
        }
        this.saveDb();
        this.notifyAll();
        return { success: true, updatedStatsCount: playerStats.length };
      }

      case "facilities:createFacility": {
        const targetAcademyId = (user?.role === "platform_admin" && args.academyId) ? (args.academyId as string) : academyId;
        if (!targetAcademyId) throw new Error("No academy");
        const newFacility: MockFacility = {
          _id: `fac_${Date.now()}`,
          academyId: targetAcademyId,
          name: (args.name as string).trim(),
          type: args.type as MockFacility["type"],
          surfaceType: args.surfaceType as string | undefined,
          capacity: args.capacity !== undefined ? Number(args.capacity) : undefined,
          status: (args.status as MockFacility["status"]) || "available",
          notes: args.notes as string | undefined,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        this.db.facilities.push(newFacility);
        this.saveDb();
        this.notifyAll();
        return newFacility._id;
      }

      case "facilities:updateFacility": {
        const facilityId = args.facilityId as string;
        const fac = this.db.facilities.find((f) => f._id === facilityId);
        if (!fac) throw new Error("Facility not found");
        if (args.name !== undefined) fac.name = (args.name as string).trim();
        if (args.type !== undefined) fac.type = args.type as MockFacility["type"];
        if (args.surfaceType !== undefined) fac.surfaceType = args.surfaceType as string;
        if (args.capacity !== undefined) fac.capacity = Number(args.capacity);
        if (args.status !== undefined) fac.status = args.status as MockFacility["status"];
        if (args.notes !== undefined) fac.notes = args.notes as string;
        fac.updatedAt = Date.now();
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "trainingSessions:deleteSession": {
        const sessionId = args.sessionId as string;
        const targetSession = this.db.trainingSessions.find((s) => s._id === sessionId);
        this.db.trainingSessions = this.db.trainingSessions.filter(
          (s) => s._id !== sessionId,
        );
        this.db.attendanceRecords = this.db.attendanceRecords.filter(
          (a) => a.sessionId !== sessionId,
        );
        this.saveDb();
        this.notifyAll();
        if (targetSession) {
          this.syncWithRollback("deleteSession", snapshotDb, mockCloudService.deleteSession(targetSession.academyId, sessionId));
        }
        return null;
      }

      case "attendance:setAttendance":
      case "trainingSessions:setAttendance": {
        const sessionId = args.sessionId as string;
        const athleteId = args.athleteId as string;
        const status = args.status as MockAttendanceRecord["status"];
        const durationMinutes = args.durationMinutes !== undefined ? Number(args.durationMinutes) : undefined;
        const rpe = args.rpe !== undefined ? Number(args.rpe) : undefined;
        const calculatedLoad =
          durationMinutes !== undefined && rpe !== undefined
            ? Math.round(durationMinutes * rpe)
            : undefined;
        const nowMs = Date.now();
        const hasWorkload = durationMinutes !== undefined || rpe !== undefined;

        let rec: MockAttendanceRecord;
        const existing = this.db.attendanceRecords.find(
          (a) => a.sessionId === sessionId && a.athleteId === athleteId,
        );
        if (existing) {
          existing.status = status;
          existing.markedAt = nowIso;
          if (durationMinutes !== undefined) existing.durationMinutes = durationMinutes;
          if (rpe !== undefined) existing.rpe = rpe;
          if (calculatedLoad !== undefined) existing.sessionLoad = calculatedLoad;
          if (args.wellnessFatigue !== undefined) existing.wellnessFatigue = Number(args.wellnessFatigue);
          if (args.wellnessSoreness !== undefined) existing.wellnessSoreness = Number(args.wellnessSoreness);
          if (hasWorkload) existing.loggedAt = nowMs;
          rec = existing;
        } else {
          rec = {
            _id: `att_${Date.now()}`,
            sessionId,
            athleteId,
            status,
            markedAt: nowIso,
            markedBy: user?._id ?? "usr_admin",
            durationMinutes,
            rpe,
            sessionLoad: calculatedLoad,
            wellnessFatigue: args.wellnessFatigue !== undefined ? Number(args.wellnessFatigue) : undefined,
            wellnessSoreness: args.wellnessSoreness !== undefined ? Number(args.wellnessSoreness) : undefined,
            loggedAt: hasWorkload ? nowMs : undefined,
          };
          this.db.attendanceRecords.push(rec);
        }
        this.saveDb();
        this.notifyAll();
        const targetSess = this.db.trainingSessions.find((s) => s._id === sessionId);
        if (targetSess) {
          this.syncWithRollback("setAttendanceRecord", snapshotDb, mockCloudService.setAttendanceRecord(targetSess.academyId, rec));
        }
        return null;
      }

      case "trainingSessions:submitSessionRpe": {
        const sessionId = args.sessionId as string;
        const targetSession = this.db.trainingSessions.find((s) => s._id === sessionId);
        if (!targetSession) throw new Error("Session not found");

        let athleteId = args.athleteId as string | undefined;
        if (!athleteId && user?.role === "athlete") {
          athleteId = this.db.athletes.find((a) => a.userId === user._id)?._id;
        }
        if (!athleteId) athleteId = "ath_marcus";

        const rpe = Number(args.rpe);
        const duration = Number(args.durationMinutes ?? targetSession.durationMinutes ?? 60);
        const sessionLoad = Math.round(duration * rpe);
        const nowMs = Date.now();

        let existing = this.db.attendanceRecords.find(
          (a) => a.sessionId === sessionId && a.athleteId === athleteId,
        );
        if (existing) {
          existing.durationMinutes = duration;
          existing.rpe = rpe;
          existing.sessionLoad = sessionLoad;
          if (args.wellnessFatigue !== undefined) existing.wellnessFatigue = Number(args.wellnessFatigue);
          if (args.wellnessSoreness !== undefined) existing.wellnessSoreness = Number(args.wellnessSoreness);
          existing.loggedAt = nowMs;
          this.saveDb();
          this.notifyAll();
          return existing._id;
        } else {
          const newRecord: MockAttendanceRecord = {
            _id: `att_${Date.now()}`,
            sessionId,
            athleteId,
            status: "present",
            markedAt: nowIso,
            markedBy: user?._id ?? "usr_athlete",
            durationMinutes: duration,
            rpe,
            sessionLoad,
            wellnessFatigue: args.wellnessFatigue !== undefined ? Number(args.wellnessFatigue) : undefined,
            wellnessSoreness: args.wellnessSoreness !== undefined ? Number(args.wellnessSoreness) : undefined,
            loggedAt: nowMs,
          };
          this.db.attendanceRecords.push(newRecord);
          this.saveDb();
          this.notifyAll();
          return newRecord._id;
        }
      }

      case "injuries:logInjuryRecord": {
        const athleteId = args.athleteId as string;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (!athlete) throw new Error("Athlete not found");

        const newInjury: MockInjury = {
          _id: `inj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          academyId: athlete.academyId,
          athleteId: athlete._id,
          availabilityStatus: args.availabilityStatus as MockInjury["availabilityStatus"],
          bodyPart: String(args.bodyPart),
          laterality: args.laterality as MockInjury["laterality"],
          mechanism: args.mechanism as MockInjury["mechanism"],
          severity: args.severity as MockInjury["severity"],
          injuryDate: Number(args.injuryDate),
          expectedReturnDate: args.expectedReturnDate ? Number(args.expectedReturnDate) : undefined,
          actualReturnDate: undefined,
          isResolved: args.availabilityStatus === "fit",
          coachingRestrictions: args.coachingRestrictions as string | undefined,
          clinicalNotes: args.clinicalNotes as string | undefined,
          recordedByUserId: user?._id ?? "usr_admin",
          updatedAt: Date.now(),
        };

        this.db.injuries.unshift(newInjury);
        this.saveDb();
        this.notifyAll();
        return newInjury._id;
      }

      case "injuries:updateInjuryStatus": {
        const injuryId = args.injuryId as string;
        const injury = this.db.injuries.find((i) => i._id === injuryId);
        if (!injury) throw new Error("Injury not found");

        if (args.availabilityStatus !== undefined) {
          injury.availabilityStatus = args.availabilityStatus as MockInjury["availabilityStatus"];
          if (injury.availabilityStatus === "fit" && args.isResolved === undefined) {
            injury.isResolved = true;
          }
        }
        if (args.isResolved !== undefined) {
          injury.isResolved = Boolean(args.isResolved);
          if (injury.isResolved && !injury.actualReturnDate) {
            injury.actualReturnDate = Date.now();
          }
        }
        if (args.expectedReturnDate !== undefined) {
          injury.expectedReturnDate = Number(args.expectedReturnDate);
        }
        if (args.actualReturnDate !== undefined) {
          injury.actualReturnDate = Number(args.actualReturnDate);
        }
        if (args.coachingRestrictions !== undefined) {
          injury.coachingRestrictions = args.coachingRestrictions as string | undefined;
        }
        if (args.clinicalNotes !== undefined) {
          injury.clinicalNotes = args.clinicalNotes as string | undefined;
        }
        injury.updatedAt = Date.now();

        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "workload:logWorkoutExecution": {
        const athleteId = args.athleteId as string;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (!athlete) throw new Error("Athlete not found");

        const durationMinutes = Number(args.durationMinutes);
        const rpe = Number(args.rpe);
        const calculatedLoad = Math.round(durationMinutes * rpe);

        const newWorkoutLog: MockWorkoutLog = {
          _id: `wlog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          academyId: athlete.academyId,
          athleteId: athlete._id,
          trainingPlanId: args.trainingPlanId as string,
          completedAt: args.completedAt ? Number(args.completedAt) : Date.now(),
          durationMinutes,
          rpe,
          calculatedLoad,
          completedExercises: (args.completedExercises as MockWorkoutLog["completedExercises"]) ?? [],
          athleteNotes: args.athleteNotes as string | undefined,
          loggedByUserId: user?._id ?? "usr_athlete",
        };

        this.db.workoutLogs.unshift(newWorkoutLog);
        this.saveDb();
        this.notifyAll();
        return newWorkoutLog._id;
      }

      case "teams:createTeam": {
        if (!academyId) throw new Error("No academy");
        const newTeam: MockTeam = {
          _id: `team_${Date.now()}`,
          academyId,
          name: (args.name as string).trim(),
          sport: args.sport as string | undefined,
          createdBy: user?._id,
          createdAt: nowIso,
        };
        this.db.teams.unshift(newTeam);
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("createTeam", snapshotDb, mockCloudService.createTeam(academyId, newTeam));
        return newTeam._id;
      }

      case "teams:updateTeam": {
        const teamId = args.teamId as string;
        const team = this.db.teams.find((t) => t._id === teamId);
        if (!team) throw new Error("Team not found");
        team.name = (args.name as string).trim();
        team.sport = args.sport as string | undefined;
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("updateTeam", snapshotDb, mockCloudService.updateTeam(team.academyId, teamId, team));
        return null;
      }

      case "teams:deleteTeam": {
        const teamId = args.teamId as string;
        const targetTeam = this.db.teams.find((t) => t._id === teamId);
        this.db.teams = this.db.teams.filter((t) => t._id !== teamId);
        this.db.teamMembers = this.db.teamMembers.filter(
          (m) => m.teamId !== teamId,
        );
        const sessionIds = new Set(
          this.db.trainingSessions
            .filter((s) => s.teamId === teamId)
            .map((s) => s._id),
        );
        this.db.trainingSessions = this.db.trainingSessions.filter(
          (s) => s.teamId !== teamId,
        );
        this.db.attendanceRecords = this.db.attendanceRecords.filter(
          (a) => !sessionIds.has(a.sessionId),
        );
        this.saveDb();
        this.notifyAll();
        if (targetTeam) {
          this.syncWithRollback("deleteTeam", snapshotDb, mockCloudService.deleteTeam(targetTeam.academyId, teamId));
        }
        return null;
      }

      case "teams:setTeamRoster": {
        const teamId = args.teamId as string;
        const athleteIds = (args.athleteIds as string[]) ?? [];
        this.db.teamMembers = this.db.teamMembers.filter(
          (m) => m.teamId !== teamId,
        );
        const newMembers: MockTeamMember[] = [];
        for (const athId of athleteIds) {
          const tm: MockTeamMember = {
            _id: `tm_${Date.now()}_${athId}`,
            teamId,
            athleteId: athId,
            joinedAt: nowIso,
          };
          this.db.teamMembers.push(tm);
          newMembers.push(tm);
        }
        this.saveDb();
        this.notifyAll();
        const team = this.db.teams.find((t) => t._id === teamId);
        if (team) {
          this.syncWithRollback("setTeamRoster", snapshotDb, mockCloudService.setTeamRoster(team.academyId, teamId, athleteIds, newMembers));
        }
        return null;
      }

      case "athletes:createAthlete": {
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId) throw new Error("No academy");
        const randSuffix = Math.random().toString(36).substring(2, 7);
        const newAthlete: MockAthlete = {
          _id: `ath_${Date.now()}_${randSuffix}`,
          academyId: targetAcademyId,
          firstName: (args.firstName as string).trim(),
          lastName: (args.lastName as string).trim(),
          dateOfBirth: args.dateOfBirth as string | undefined,
          gender: args.gender as MockAthlete["gender"],
          sport: args.sport as string | undefined,
          heightCm: args.heightCm ? Number(args.heightCm) : undefined,
          weightKg: args.weightKg ? Number(args.weightKg) : undefined,
          email: args.email as string | undefined,
          phone: args.phone as string | undefined,
          guardianName: args.guardianName as string | undefined,
          guardianPhone: args.guardianPhone as string | undefined,
          guardianEmail: args.guardianEmail as string | undefined,
          notes: args.notes as string | undefined,
          status: "active",
          createdAt: nowIso,
        };

        // Auto-provision user account for athlete if email provided
        if (args.email && typeof args.email === "string" && args.email.includes("@")) {
          const athleteEmail = (args.email as string).trim().toLowerCase();
          const athletePassword = generateTemporaryPassword("athlete");
          let athUser = this.db.users.find((u) => u.email.toLowerCase() === athleteEmail);
          if (!athUser) {
            athUser = {
              _id: `usr_${Date.now()}_${randSuffix}_ath`,
              name: `${newAthlete.firstName} ${newAthlete.lastName}`.trim(),
              email: athleteEmail,
              password: athletePassword,
              role: "athlete",
              academyId: targetAcademyId,
              tokenIdentifier: `mock|ath_${Date.now()}_${randSuffix}`,
            };
            this.db.users.push(athUser);
            this.provisionedPasswords.set(athleteEmail, athletePassword);
          }
          // Never modify an existing account (role, academy or password):
          // only link it when it is already an athlete of this academy.
          if (athUser.role === "athlete" && athUser.academyId === targetAcademyId) {
            newAthlete.userId = athUser._id;
          }
        }

        // Auto-provision user account for parent / guardian if guardianEmail provided
        if (args.guardianEmail && typeof args.guardianEmail === "string" && args.guardianEmail.includes("@")) {
          const guardianEmail = (args.guardianEmail as string).trim().toLowerCase();
          const guardianPassword = generateTemporaryPassword("guardian");
          let guardUser = this.db.users.find((u) => u.email.toLowerCase() === guardianEmail);
          if (!guardUser) {
            guardUser = {
              _id: `usr_${Date.now()}_${randSuffix}_guard`,
              name: (args.guardianName as string) || "Parent / Guardian",
              email: guardianEmail,
              password: guardianPassword,
              role: "guardian",
              academyId: targetAcademyId,
              tokenIdentifier: `mock|guard_${Date.now()}_${randSuffix}`,
            };
            this.db.users.push(guardUser);
            this.provisionedPasswords.set(guardianEmail, guardianPassword);
          }
          if (guardUser.role === "guardian" && guardUser.academyId === targetAcademyId) {
            newAthlete.guardianUserId = guardUser._id;
          }
          newAthlete.guardianEmail = guardianEmail;
        }

        this.db.athletes.unshift(newAthlete);
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("createAthlete", snapshotDb, mockCloudService.createAthlete(targetAcademyId, newAthlete, newAthlete.checkInPin));
        return newAthlete._id;
      }

      case "athletes:updateAthlete": {
        const athleteId = args.athleteId as string;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (!athlete) throw new Error("Athlete not found");
        if (args.academyId && typeof args.academyId === "string") {
          athlete.academyId = args.academyId;
        }
        Object.assign(athlete, {
          firstName: (args.firstName as string).trim(),
          lastName: (args.lastName as string).trim(),
          dateOfBirth: args.dateOfBirth as string | undefined,
          gender: args.gender as MockAthlete["gender"],
          sport: args.sport as string | undefined,
          heightCm: args.heightCm ? Number(args.heightCm) : undefined,
          weightKg: args.weightKg ? Number(args.weightKg) : undefined,
          email: args.email as string | undefined,
          phone: args.phone as string | undefined,
          guardianName: args.guardianName as string | undefined,
          guardianPhone: args.guardianPhone as string | undefined,
          notes: args.notes as string | undefined,
        });
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("updateAthlete", snapshotDb, mockCloudService.updateAthlete(athlete.academyId, athleteId, athlete));
        return null;
      }

      case "athletes:regenerateCheckInPin": {
        const athlete = this.db.athletes.find((a) => a._id === args.athleteId);
        if (!athlete) throw new Error("Athlete not found");
        athlete.checkInPin = this.freePin(athlete.academyId);
        this.saveDb();
        this.syncWithRollback("saveAthletePin", snapshotDb, mockCloudService.saveAthletePin(athlete.academyId, athlete._id, athlete.checkInPin));
        return athlete.checkInPin;
      }

      case "athletes:generateMissingCheckInPins": {
        let assigned = 0;
        for (const athlete of this.db.athletes) {
          if (athlete.academyId !== academyId || athlete.checkInPin) continue;
          if (athlete.status !== "active") continue;
          athlete.checkInPin = this.freePin(athlete.academyId);
          this.syncWithRollback("saveAthletePin", snapshotDb, mockCloudService.saveAthletePin(athlete.academyId, athlete._id, athlete.checkInPin));
          assigned++;
        }
        this.saveDb();
        return assigned;
      }

      case "athletes:setAthleteStatus": {
        const athleteId = args.athleteId as string;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (athlete) {
          athlete.status = args.status as "active" | "inactive";
          this.saveDb();
          this.notifyAll();
          this.syncWithRollback("updateAthleteStatus", snapshotDb, mockCloudService.updateAthlete(athlete.academyId, athleteId, { status: athlete.status }));
        }
        return null;
      }

      case "athletes:bulkImportAthletes": {
        if (!academyId) throw new Error("No academy");
        const list = (args.athletes as Partial<MockAthlete>[]) ?? [];
        let added = 0;
        for (const item of list) {
          if (!item.firstName?.trim() || !item.lastName?.trim()) continue;
          const newAth: MockAthlete = {
            _id: `ath_${Date.now()}_${added}`,
            academyId,
            firstName: item.firstName.trim(),
            lastName: item.lastName.trim(),
            dateOfBirth: item.dateOfBirth,
            gender: item.gender,
            sport: item.sport,
            email: item.email,
            phone: item.phone,
            status: "active",
            createdAt: nowIso,
          };
          this.db.athletes.push(newAth);
          this.syncWithRollback("createAthlete", snapshotDb, mockCloudService.createAthlete(academyId, newAth));
          added++;
        }
        this.saveDb();
        this.notifyAll();
        return { added, skipped: list.length - added, errors: [] };
      }

      case "athletes:linkAthleteToUser": {
        const athleteId = args.athleteId as string;
        const email = (args.email as string).trim().toLowerCase();
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (!athlete) throw new Error("Athlete not found");

        const targetUser = this.db.users.find(
          (u) => u.email.toLowerCase() === email,
        );
        if (!targetUser) {
          throw new Error(
            "No registered user account found with that email address",
          );
        }
        athlete.userId = targetUser._id;
        athlete.email = targetUser.email;
        targetUser.role = "athlete";
        targetUser.academyId = athlete.academyId;
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("linkAthleteToUser", snapshotDb, mockCloudService.updateAthlete(athlete.academyId, athleteId, { userId: targetUser._id, email: targetUser.email }));
        return null;
      }

      case "athletes:unlinkAthleteUser": {
        const athleteId = args.athleteId as string;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (athlete) {
          athlete.userId = undefined;
          this.saveDb();
          this.notifyAll();
          this.syncWithRollback("unlinkAthleteUser", snapshotDb, mockCloudService.updateAthlete(athlete.academyId, athleteId, { userId: undefined }));
        }
        return null;
      }

      case "trainingPlans:createPlan": {
        if (!academyId) throw new Error("No academy");
        const athlete = args.athleteId ? this.db.athletes.find((a) => a._id === (args.athleteId as string)) : undefined;
        const newPlan: MockTrainingPlan = {
          _id: `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          academyId,
          athleteId: args.athleteId as string | undefined,
          title: (args.title as string).trim(),
          description: args.description as string | undefined,
          startDate: args.startDate as string | undefined,
          endDate: args.endDate as string | undefined,
          status: "active",
          phase: args.phase as MockTrainingPlan["phase"],
          microcycleTag: args.microcycleTag as string | undefined,
          targetAgeGroup: args.targetAgeGroup as string | undefined,
          isTemplate: Boolean(args.isTemplate),
          createdBy: user?._id ?? "usr_coach",
          createdAt: nowIso,
        };
        this.db.trainingPlans.unshift(newPlan);
        this.saveDb();
        this.notifyAll();

        this.syncWithRollback(
          "createTrainingPlan",
          snapshotDb,
          mockCloudService.createTrainingPlan(
            academyId,
            newPlan,
            athlete?.userId,
            athlete?.guardianUserId ? [athlete.guardianUserId] : [],
          ),
        );

        return newPlan._id;
      }

      case "trainingPlans:updatePlan": {
        const planId = args.planId as string;
        const plan = this.db.trainingPlans.find((p) => p._id === planId);
        if (!plan) throw new Error("Plan not found");
        plan.title = (args.title as string).trim();
        plan.description = args.description as string | undefined;
        plan.startDate = args.startDate as string | undefined;
        plan.endDate = args.endDate as string | undefined;
        if (args.phase !== undefined) plan.phase = args.phase as MockTrainingPlan["phase"];
        if (args.microcycleTag !== undefined) plan.microcycleTag = args.microcycleTag as string;
        if (args.targetAgeGroup !== undefined) plan.targetAgeGroup = args.targetAgeGroup as string;
        if (args.isTemplate !== undefined) plan.isTemplate = Boolean(args.isTemplate);
        if (args.status)
          plan.status = args.status as MockTrainingPlan["status"];
        this.saveDb();
        this.notifyAll();

        if (academyId) {
          this.syncWithRollback(
            "updateTrainingPlan",
            snapshotDb,
            mockCloudService.updateTrainingPlan(academyId, planId, {
              title: plan.title,
              description: plan.description,
              startDate: plan.startDate,
              endDate: plan.endDate,
              status: plan.status,
            }),
          );
        }

        return null;
      }

      case "trainingPlans:assignPlanToTeam": {
        const sourcePlanId = args.sourcePlanId as string;
        const teamId = args.teamId as string;
        const skipInjuredOut = Boolean(args.skipInjuredOutAthletes);

        const sourcePlan = this.db.trainingPlans.find((p) => p._id === sourcePlanId);
        if (!sourcePlan) throw new Error("Source training plan not found");

        const members = this.db.teamMembers.filter((m) => m.teamId === teamId);
        const sourceItems = this.db.planItems
          .filter((i) => i.planId === sourcePlanId)
          .sort((a, b) => a.order - b.order);

        let assignedCount = 0;
        let skippedInjuredCount = 0;

        for (const m of members) {
          const alreadyHas = this.db.trainingPlans.some(
            (p) =>
              p.athleteId === m.athleteId &&
              p.sourceTemplateId === sourcePlanId &&
              p.status === "active",
          );
          if (alreadyHas) continue;

          if (skipInjuredOut) {
            const activeInjuries = this.db.injuries.filter(
              (i) => i.athleteId === m.athleteId && !i.isResolved,
            );
            if (activeInjuries.some((i) => i.availabilityStatus === "injured_out")) {
              skippedInjuredCount++;
              continue;
            }
          }

          const newPlanId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
          const clonedPlan: MockTrainingPlan = {
            _id: newPlanId,
            academyId: sourcePlan.academyId,
            athleteId: m.athleteId,
            title: sourcePlan.title,
            description: sourcePlan.description,
            status: "active",
            startDate: sourcePlan.startDate,
            endDate: sourcePlan.endDate,
            phase: sourcePlan.phase,
            microcycleTag: sourcePlan.microcycleTag,
            targetAgeGroup: sourcePlan.targetAgeGroup,
            sourceTemplateId: sourcePlanId,
            isTemplate: false,
            createdBy: user?._id || "system",
            createdAt: nowIso,
          };
          this.db.trainingPlans.unshift(clonedPlan);

          for (const item of sourceItems) {
            this.db.planItems.push({
              _id: `pi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              planId: newPlanId,
              order: item.order,
              exercise: item.exercise,
              target: item.target,
              notes: item.notes,
              completed: false,
            });
          }

          assignedCount++;
        }

        this.saveDb();
        this.notifyAll();
        return { assignedCount, skippedInjuredCount };
      }

      case "trainingPlans:deletePlan": {
        const planId = args.planId as string;
        this.db.trainingPlans = this.db.trainingPlans.filter(
          (p) => p._id !== planId,
        );
        this.db.planItems = this.db.planItems.filter(
          (i) => i.planId !== planId,
        );
        this.saveDb();
        this.notifyAll();

        if (academyId) {
          this.syncWithRollback(
            "deleteTrainingPlan",
            snapshotDb,
            mockCloudService.deleteTrainingPlan(academyId, planId),
          );
        }

        return null;
      }

      case "trainingPlans:addPlanItem": {
        const planId = args.planId as string;
        const plan = this.db.trainingPlans.find((p) => p._id === planId);
        const athlete = plan ? this.db.athletes.find((a) => a._id === plan.athleteId) : undefined;
        const existingCount = this.db.planItems.filter(
          (i) => i.planId === planId,
        ).length;
        const newItem: MockPlanItem = {
          _id: `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          planId,
          exercise: (args.exercise as string).trim(),
          target: args.target as string | undefined,
          notes: args.notes as string | undefined,
          order: existingCount + 1,
          completed: false,
        };
        this.db.planItems.push(newItem);
        this.saveDb();
        this.notifyAll();

        if (academyId) {
          this.syncWithRollback(
            "createPlanItem",
            snapshotDb,
            mockCloudService.createPlanItem(
              academyId,
              newItem,
              athlete?.userId,
              athlete?.guardianUserId ? [athlete.guardianUserId] : [],
            ),
          );
        }

        return newItem._id;
      }

      case "trainingPlans:updatePlanItem": {
        const itemId = args.itemId as string;
        const item = this.db.planItems.find((i) => i._id === itemId);
        if (!item) throw new Error("Plan item not found");
        if (args.exercise !== undefined)
          item.exercise = (args.exercise as string).trim();
        if (args.target !== undefined) item.target = args.target as string;
        if (args.notes !== undefined) item.notes = args.notes as string;
        if (args.completed !== undefined)
          item.completed = Boolean(args.completed);
        if (args.result !== undefined) item.result = args.result as string;
        this.saveDb();
        this.notifyAll();

        if (academyId) {
          this.syncWithRollback(
            "updatePlanItem",
            snapshotDb,
            mockCloudService.updatePlanItem(academyId, itemId, {
              exercise: item.exercise,
              target: item.target,
              notes: item.notes,
              completed: item.completed,
              result: item.result,
            }),
          );
        }

        return null;
      }

      case "trainingPlans:deletePlanItem": {
        const itemId = args.itemId as string;
        this.db.planItems = this.db.planItems.filter((i) => i._id !== itemId);
        this.saveDb();
        this.notifyAll();

        if (academyId) {
          this.syncWithRollback(
            "deletePlanItem",
            snapshotDb,
            mockCloudService.deletePlanItem(academyId, itemId),
          );
        }

        return null;
      }

      case "drills:createDrill": {
        if (
          !user ||
          (user.role !== "coach" &&
            user.role !== "academy_admin" &&
            user.role !== "platform_admin")
        ) {
          throw new Error("Unauthorized: only coaches and administrators may create drills");
        }
        if (!academyId) throw new Error("No academy associated");
        const title = (args.title as string)?.trim();
        if (!title) throw new Error("Drill title is required");
        const metricName = (args.metricName as string)?.trim();
        if (!metricName) throw new Error("Metric name is required");

        const newDrill: MockDrill = {
          _id: `drill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          academyId,
          title,
          ageGroup: (args.ageGroup as MockDrill["ageGroup"]) || "All U16",
          birthYears: (args.birthYears as string) || "2011–2020",
          category: (args.category as string) || "ball_mastery",
          categoryLabel: (args.categoryLabel as string) || "Ball Mastery & 1v1",
          difficulty: (args.difficulty as MockDrill["difficulty"]) || "Intermediate",
          durationMinutes: Number(args.durationMinutes) || 15,
          durationSeconds:
            Number(args.durationSeconds) || (Number(args.durationMinutes) || 15) * 60,
          recommendedSets: Number(args.recommendedSets) || 4,
          recommendedReps: Number(args.recommendedReps) || 6,
          gridDimensions: (args.gridDimensions as string) || "20m x 20m grid",
          equipment: (args.equipment as string[]) || ["Cones", "Soccer balls"],
          summary: (args.summary as string) || "",
          setup: (args.setup as string) || "",
          instructions: (args.instructions as string[]) || [],
          coachingPoints: (args.coachingPoints as string[]) || [],
          variations: (args.variations as string[]) || [],
          metricName,
          metricUnit: (args.metricUnit as string) || "pts",
          benchmark: Number(args.benchmark) || 10,
          isLowerBetter: Boolean(args.isLowerBetter),
          targetAttribute: (args.targetAttribute as MockDrill["targetAttribute"]) || "Technical",
          createdBy: user._id,
          createdByName: user.name || "Coach",
          createdByRole: user.role || "coach",
          createdAt: nowIso,
        };

        this.db.drills = this.db.drills || [];
        this.db.drills.unshift(newDrill);
        this.saveDb();
        this.notifyAll();

        this.syncWithRollback(
          "createDrill",
          snapshotDb,
          mockCloudService.createDrill(academyId, newDrill),
        );

        return newDrill._id;
      }

      case "drills:deleteDrill": {
        if (
          !user ||
          (user.role !== "coach" &&
            user.role !== "academy_admin" &&
            user.role !== "platform_admin")
        ) {
          throw new Error("Unauthorized");
        }
        const drillId = args.drillId as string;
        this.db.drills = (this.db.drills || []).filter((d) => d._id !== drillId);
        this.saveDb();
        this.notifyAll();

        if (academyId) {
          this.syncWithRollback(
            "deleteDrill",
            snapshotDb,
            mockCloudService.deleteDrill(academyId, drillId),
          );
        }

        return null;
      }

      case "tacticalPlans:saveTacticalPlan": {
        if (!user) throw new Error("Unauthorized");
        const planId = args.planId as string | undefined;
        const nowIso = new Date().toISOString();
        this.db.tacticalPlans = this.db.tacticalPlans || [];

        if (planId) {
          const idx = this.db.tacticalPlans.findIndex((p) => p._id === planId);
          if (idx !== -1) {
            this.db.tacticalPlans[idx] = {
              ...this.db.tacticalPlans[idx],
              title: args.title as string,
              drillId: args.drillId as string | undefined,
              category: args.category as string | undefined,
              pitchType: args.pitchType as string,
              gridDimensions: args.gridDimensions as string | undefined,
              coachingPoints: (args.coachingPoints as string[]) || [],
              planData: args.planData as string,
              updatedAt: nowIso,
            };
            this.saveDb();
            this.notifyAll();
            return planId;
          }
        }

        const newId = `tp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const newPlan: MockTacticalPlan = {
          _id: newId,
          academyId: academyId || "acad_0qbqv4w",
          title: args.title as string,
          drillId: args.drillId as string | undefined,
          category: args.category as string | undefined,
          pitchType: args.pitchType as string,
          gridDimensions: args.gridDimensions as string | undefined,
          coachingPoints: (args.coachingPoints as string[]) || [],
          planData: args.planData as string,
          createdBy: user._id,
          createdByName: user.name,
          createdByRole: user.role,
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        this.db.tacticalPlans.unshift(newPlan);
        this.saveDb();
        this.notifyAll();
        return newId;
      }

      case "tacticalPlans:deleteTacticalPlan": {
        if (!user) throw new Error("Unauthorized");
        const planId = args.id as string;
        this.db.tacticalPlans = (this.db.tacticalPlans || []).filter((p) => p._id !== planId);
        this.saveDb();
        this.notifyAll();
        return { success: true };
      }

      case "assessments:recordAssessment":
      case "assessments:addAssessment": {
        if (!academyId) throw new Error("No academy");
        const athlete = this.db.athletes.find((a) => a._id === (args.athleteId as string));
        const unit = (args.unit as string)?.trim() || "";
        const corner = (args.corner as "physical" | "technical" | "tactical" | "psychological" | undefined) ?? "physical";
        const direction = (args.optimizationDirection as "higher_is_better" | "lower_is_better" | undefined) ??
          (["s", "sec", "seconds", "ms"].includes(unit.toLowerCase()) ? "lower_is_better" : "higher_is_better");
        const newAssessment: MockAssessment = {
          _id: `ass_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          academyId,
          athleteId: args.athleteId as string,
          sessionId: args.sessionId as string | undefined,
          metric: (args.metric as string).trim(),
          value: Number(args.value),
          unit,
          corner,
          optimizationDirection: direction,
          ageGroupSnapshot: args.ageGroupSnapshot as string | undefined,
          assessedOn: args.assessedOn as string,
          notes: args.notes as string | undefined,
          conductedBy: user?.name ?? "Staff",
          createdAt: nowIso,
        };
        this.db.assessments.unshift(newAssessment);
        this.saveDb();
        this.notifyAll();

        this.syncWithRollback(
          "recordAssessment",
          snapshotDb,
          mockCloudService.recordAssessment(
            academyId,
            newAssessment,
            athlete?.userId,
            athlete?.guardianUserId ? [athlete.guardianUserId] : [],
          ),
        );

        return newAssessment._id;
      }

      case "assessments:recordBatchSessionAssessments": {
        if (!academyId) throw new Error("No academy");
        const sessionId = args.sessionId as string;
        const metric = (args.metric as string).trim();
        const unit = (args.unit as string)?.trim() || "";
        const assessedOn = args.assessedOn as string;
        const corner = (args.corner as "physical" | "technical" | "tactical" | "psychological" | undefined) ?? "physical";
        const direction = (args.optimizationDirection as "higher_is_better" | "lower_is_better" | undefined) ??
          (["s", "sec", "seconds", "ms"].includes(unit.toLowerCase()) ? "lower_is_better" : "higher_is_better");
        const ageGroupSnapshot = args.ageGroupSnapshot as string | undefined;
        const entries = (args.entries as Array<{ athleteId: string; value: number; notes?: string }>) || [];

        const insertedIds: string[] = [];
        for (const entry of entries) {
          if (entry.value !== undefined && !isNaN(entry.value)) {
            const athlete = this.db.athletes.find((a) => a._id === entry.athleteId);
            const newAssessment: MockAssessment = {
              _id: `ass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              academyId,
              athleteId: entry.athleteId,
              sessionId,
              metric,
              value: Number(entry.value),
              unit,
              corner,
              optimizationDirection: direction,
              ageGroupSnapshot,
              assessedOn,
              notes: entry.notes?.trim(),
              conductedBy: user?.name ?? "Staff",
              createdAt: nowIso,
            };
            this.db.assessments.unshift(newAssessment);
            insertedIds.push(newAssessment._id);

            this.syncWithRollback(
              "recordAssessment",
              snapshotDb,
              mockCloudService.recordAssessment(
                academyId,
                newAssessment,
                athlete?.userId,
                athlete?.guardianUserId ? [athlete.guardianUserId] : [],
              ),
            );
          }
        }
        this.saveDb();
        this.notifyAll();
        return { count: insertedIds.length, ids: insertedIds };
      }

      case "athleteGoals:createAthleteGoal": {
        if (!academyId) throw new Error("No academy");
        const athleteId = args.athleteId as string;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (!athlete) throw new Error("Athlete not found");

        const baselineValue = args.baselineValue !== undefined ? Number(args.baselineValue) : undefined;
        const targetValue = args.targetValue !== undefined ? Number(args.targetValue) : undefined;
        const currentValue = args.currentValue !== undefined ? Number(args.currentValue) : baselineValue;

        const unit = (args.unit as string | undefined)?.trim();
        const direction = (args.optimizationDirection as "higher_is_better" | "lower_is_better" | undefined) ??
          (unit && ["s", "sec", "seconds", "ms"].includes(unit.toLowerCase()) ? "lower_is_better" : "higher_is_better");

        let status: "in_progress" | "achieved" | "at_risk" | "archived" = "in_progress";
        if (currentValue !== undefined && targetValue !== undefined) {
          const isAchieved = direction === "lower_is_better" ? currentValue <= targetValue : currentValue >= targetValue;
          if (isAchieved) status = "achieved";
        }

        const now = Date.now();
        const newGoal: MockAthleteGoal = {
          _id: `goal_${now}_${Math.random().toString(36).substring(2, 6)}`,
          academyId,
          athleteId,
          createdByUserId: user?._id ?? "usr_coach",
          title: (args.title as string).trim(),
          corner: args.corner as "physical" | "technical" | "tactical" | "psychological",
          linkedMetricName: (args.linkedMetricName as string | undefined)?.trim(),
          baselineValue,
          targetValue,
          currentValue,
          unit,
          optimizationDirection: direction,
          targetDate: args.targetDate as string,
          status,
          actionPlanNotes: (args.actionPlanNotes as string | undefined)?.trim(),
          createdAt: now,
          updatedAt: now,
        };

        if (!this.db.athleteGoals) {
          this.db.athleteGoals = [];
        }
        this.db.athleteGoals.unshift(newGoal);
        this.saveDb();
        this.notifyAll();
        return newGoal._id;
      }

      case "athleteGoals:updateAthleteGoal": {
        const goalId = args.goalId as string;
        const goal = (this.db.athleteGoals || []).find((g) => g._id === goalId);
        if (!goal) throw new Error("Goal not found");

        const targetValue = args.targetValue !== undefined ? Number(args.targetValue) : goal.targetValue;
        const currentValue = args.currentValue !== undefined ? Number(args.currentValue) : goal.currentValue;
        const direction = (args.optimizationDirection as "higher_is_better" | "lower_is_better" | undefined) ?? goal.optimizationDirection ?? "higher_is_better";

        let newStatus = (args.status as "in_progress" | "achieved" | "at_risk" | "archived" | undefined) ?? goal.status;
        if (currentValue !== undefined && targetValue !== undefined) {
          const isAchieved = direction === "lower_is_better" ? currentValue <= targetValue : currentValue >= targetValue;
          if (isAchieved) {
            newStatus = "achieved";
          } else if (goal.status === "achieved" && !isAchieved && !args.status) {
            newStatus = "in_progress";
          }
        }

        if (args.title !== undefined) goal.title = (args.title as string).trim();
        if (args.baselineValue !== undefined) goal.baselineValue = Number(args.baselineValue);
        if (args.targetValue !== undefined) goal.targetValue = Number(args.targetValue);
        if (args.currentValue !== undefined) goal.currentValue = Number(args.currentValue);
        if (args.unit !== undefined) goal.unit = (args.unit as string)?.trim();
        if (args.optimizationDirection !== undefined) goal.optimizationDirection = args.optimizationDirection as "higher_is_better" | "lower_is_better";
        if (args.targetDate !== undefined) goal.targetDate = args.targetDate as string;
        if (args.actionPlanNotes !== undefined) goal.actionPlanNotes = (args.actionPlanNotes as string)?.trim();
        goal.status = newStatus;
        goal.updatedAt = Date.now();

        this.saveDb();
        this.notifyAll();
        return goal._id;
      }

      case "athleteGoals:deleteAthleteGoal": {
        const goalId = args.goalId as string;
        if (!this.db.athleteGoals) this.db.athleteGoals = [];
        this.db.athleteGoals = this.db.athleteGoals.filter((g) => g._id !== goalId);
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "assessments:deleteAssessment": {
        const assessmentId = args.assessmentId as string;
        this.db.assessments = this.db.assessments.filter(
          (a) => a._id !== assessmentId,
        );
        this.saveDb();
        this.notifyAll();

        if (academyId) {
          this.syncWithRollback(
            "deleteAssessment",
            snapshotDb,
            mockCloudService.deleteAssessment(academyId, assessmentId),
          );
        }

        return null;
      }

      case "feeAutomation:createFeeSchedules": {
        if (!academyId) throw new Error("No academy");
        const today = nowIso.slice(0, 10);
        const period = today.slice(0, 7);
        const ids = args.athleteIds as string[];
        for (const athleteId of ids) {
          const schedule: MockFeeSchedule = {
            _id: `sched_${Date.now()}_${athleteId}`,
            academyId,
            athleteId,
            label: (args.label as string).trim(),
            amount: Number(args.amount),
            currency: (args.currency as string) || "USD",
            dueDay: Number(args.dueDay),
            startPeriod: args.startPeriod as string,
            active: true,
            createdBy: user?._id ?? "usr_accounting",
            createdAt: nowIso,
          };
          this.db.feeSchedules.push(schedule);
          if (schedule.startPeriod <= period) {
            let dueDate = `${period}-${String(schedule.dueDay).padStart(2, "0")}`;
            if (dueDate < today) {
              const d = new Date(`${today}T00:00:00Z`);
              d.setUTCDate(d.getUTCDate() + 7);
              dueDate = d.toISOString().slice(0, 10);
            }
            const newFee: MockAthleteFee = {
              _id: `fee_${Date.now()}_${athleteId}`,
              academyId,
              athleteId,
              label: `${schedule.label} – ${new Date(`${period}-01T00:00:00Z`).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`,
              amountDue: schedule.amount,
              currency: schedule.currency,
              dueDate,
              status: "unpaid",
              createdBy: schedule.createdBy,
              createdAt: nowIso,
            };
            this.db.athleteFees.unshift(newFee);
            this.syncWithRollback("createFee", snapshotDb, mockCloudService.createFee(academyId, newFee));
          }
        }
        this.saveDb();
        this.notifyAll();
        return ids.length;
      }

      case "feeAutomation:setFeeScheduleActive": {
        const schedule = this.db.feeSchedules.find((s) => s._id === args.scheduleId);
        if (!schedule) throw new Error("Schedule not found");
        schedule.active = Boolean(args.active);
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "feeAutomation:deleteFeeSchedule": {
        this.db.feeSchedules = this.db.feeSchedules.filter(
          (s) => s._id !== args.scheduleId,
        );
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "fees:createFee": {
        const athlete = this.db.athletes.find((a) => a._id === (args.athleteId as string));
        const targetAcademyId = (args.academyId as string) || athlete?.academyId || academyId;
        if (!targetAcademyId) throw new Error("No academy");
        if (
          !user ||
          (user.role !== "academy_admin" &&
            user.role !== "accounting" &&
            user.role !== "platform_admin")
        ) {
          throw new Error("Unauthorized: Only academy_admin and accounting can create or update fees");
        }
        const newFee: MockAthleteFee = {
          _id: `fee_${Date.now()}`,
          academyId: targetAcademyId,
          athleteId: args.athleteId as string,
          label: (args.label as string).trim(),
          amountDue: Number(args.amountDue),
          currency: (args.currency as string) || "USD",
          dueDate: args.dueDate as string,
          status: "unpaid",
          notes: args.notes as string | undefined,
          createdBy: user?._id ?? "usr_accounting",
          createdAt: nowIso,
        };
        this.db.athleteFees.unshift(newFee);
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("createFee", snapshotDb, mockCloudService.createFee(targetAcademyId, newFee));
        return newFee._id;
      }

      case "fees:recordPayment": {
        if (
          !user ||
          (user.role !== "academy_admin" &&
            user.role !== "accounting" &&
            user.role !== "platform_admin")
        ) {
          throw new Error("Unauthorized: Only academy_admin and accounting can create or update fees");
        }
        const feeId = args.feeId as string;
        const amountPaid = Number(args.amountPaid);
        const fee = this.db.athleteFees.find((f) => f._id === feeId);
        if (!fee) throw new Error("Fee not found");

        const newPayment: MockFeePayment = {
          _id: `pay_${Date.now()}`,
          feeId,
          amountPaid,
          paidAt: nowIso,
          recordedBy: user?._id ?? "usr_accounting",
          notes: args.notes as string | undefined,
        };
        this.db.feePayments.push(newPayment);

        const allPayments = this.db.feePayments.filter(
          (p) => p.feeId === feeId,
        );
        const totalPaid = allPayments.reduce((s, p) => s + p.amountPaid, 0);

        fee.status = totalPaid >= fee.amountDue ? "paid" : "partially_paid";
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("recordFeePayment", snapshotDb, mockCloudService.recordFeePayment(fee.academyId, newPayment, fee));
        return null;
      }

      case "fees:updateFeeStatus": {
        if (
          !user ||
          (user.role !== "academy_admin" &&
            user.role !== "accounting" &&
            user.role !== "platform_admin")
        ) {
          throw new Error("Unauthorized: Only academy_admin and accounting can create or update fees");
        }
        const feeId = args.feeId as string;
        const fee = this.db.athleteFees.find((f) => f._id === feeId);
        if (fee) {
          fee.status = args.status as MockAthleteFee["status"];
          if (args.notes) fee.notes = args.notes as string;
          this.saveDb();
          this.notifyAll();
          this.syncWithRollback("updateFee", snapshotDb, mockCloudService.updateFee(fee.academyId, feeId, { status: fee.status, notes: fee.notes }));
        }
        return null;
      }

      case "fees:deleteFee": {
        if (
          !user ||
          (user.role !== "academy_admin" &&
            user.role !== "accounting" &&
            user.role !== "platform_admin")
        ) {
          throw new Error("Unauthorized: Only academy_admin and accounting can create or update fees");
        }
        const feeId = args.feeId as string;
        const targetFee = this.db.athleteFees.find((f) => f._id === feeId);
        this.db.athleteFees = this.db.athleteFees.filter(
          (f) => f._id !== feeId,
        );
        this.db.feePayments = this.db.feePayments.filter(
          (p) => p.feeId !== feeId,
        );
        this.saveDb();
        this.notifyAll();
        if (targetFee) {
          this.syncWithRollback("deleteFee", snapshotDb, mockCloudService.deleteFee(targetFee.academyId, feeId));
        }
        return null;
      }

      case "invoices:createInvoice": {
        const athlete = args.athleteId ? this.db.athletes.find((a) => a._id === (args.athleteId as string)) : undefined;
        const targetAcademyId = (args.academyId as string) || athlete?.academyId || academyId;
        if (!targetAcademyId) throw new Error("No academy");
        if (
          !user ||
          (user.role !== "academy_admin" &&
            user.role !== "accounting" &&
            user.role !== "platform_admin")
        ) {
          throw new Error("Unauthorized: Only academy_admin and accounting can create or update invoices");
        }
        const academy = this.db.academies.find((a) => a._id === targetAcademyId);
        const nextNum =
          academy?.nextInvoiceNumber ?? this.db.invoices.length + 1;
        if (academy) {
          academy.nextInvoiceNumber = nextNum + 1;
        }

        const invoiceNumber = `INV-${String(nextNum).padStart(4, "0")}`;
        const newInvoice: MockInvoice = {
          _id: `inv_${Date.now()}`,
          academyId: targetAcademyId,
          athleteId: args.athleteId as string | undefined,
          invoiceNumber,
          description: (args.description as string).trim(),
          amount: Number(args.amount),
          currency: (args.currency as string) || "USD",
          dueDate: args.dueDate as string,
          status: "draft",
          note: args.note as string | undefined,
          issuedAt: nowIso,
          createdBy: user?._id ?? "usr_accounting",
        };
        this.db.invoices.unshift(newInvoice);
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("createInvoice", snapshotDb, mockCloudService.createInvoice(targetAcademyId, newInvoice));
        return newInvoice._id;
      }

      case "invoices:updateInvoiceStatus": {
        if (
          !user ||
          (user.role !== "academy_admin" &&
            user.role !== "accounting" &&
            user.role !== "platform_admin")
        ) {
          throw new Error("Unauthorized: Only academy_admin and accounting can create or update invoices");
        }
        const invoiceId = args.invoiceId as string;
        const invoice = this.db.invoices.find((i) => i._id === invoiceId);
        if (invoice) {
          invoice.status = args.status as MockInvoice["status"];
          if (args.status === "paid") {
            invoice.paidAt = nowIso;
          }
          this.saveDb();
          this.notifyAll();
          this.syncWithRollback("updateInvoice", snapshotDb, mockCloudService.updateInvoice(invoice.academyId, invoiceId, {
            status: invoice.status,
            paidAt: invoice.paidAt,
          }));
        }
        return null;
      }

      case "invoices:deleteInvoice": {
        const invoiceId = args.invoiceId as string;
        const targetInvoice = this.db.invoices.find((i) => i._id === invoiceId);
        this.db.invoices = this.db.invoices.filter((i) => i._id !== invoiceId);
        this.saveDb();
        this.notifyAll();
        if (targetInvoice) {
          this.syncWithRollback("deleteInvoice", snapshotDb, mockCloudService.deleteInvoice(targetInvoice.academyId, invoiceId));
        }
        return null;
      }

      case "academies:createAcademy": {
        if (user?.role !== "platform_admin") {
          throw new Error("Forbidden: Only platform admins can create academies");
        }
        const nameVal = (args.name as string).trim();
        const slug = nameVal.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const newAcad: MockAcademy = {
          _id: `acad_${Date.now()}`,
          name: nameVal,
          slug,
          status: "active",
          nextInvoiceNumber: 1,
          createdAt: nowIso,
        };
        this.db.academies.push(newAcad);
        if (this.currentUserId) {
          const u = this.db.users.find((u) => u._id === this.currentUserId);
          if (u) u.academyId = newAcad._id;
        }
        if (user) {
          user.academyId = newAcad._id;
          const dbUser = this.db.users.find((u) => u._id === user._id);
          if (dbUser) {
            dbUser.academyId = newAcad._id;
          }
        }
        for (const u of this.db.users) {
          if (u.role === "platform_admin") {
            u.academyId = newAcad._id;
          }
        }
        this.saveDb();
        this.notifyAll();
        this.notifyAuth();
        this.syncWithRollback("createAcademy", snapshotDb, mockCloudService.createAcademy(newAcad));
        return newAcad._id;
      }

      case "academies:setActiveAcademy": {
        if (user?.role !== "platform_admin") {
          throw new Error("Forbidden: Only platform admins can switch active academies");
        }
        const targetAcademyId = args.academyId as string;
        const targetAcad = this.db.academies.find((a) => a._id === targetAcademyId);
        if (!targetAcad) {
          throw new Error("Academy not found");
        }
        if (this.currentUserId) {
          const u = this.db.users.find((u) => u._id === this.currentUserId);
          if (u) u.academyId = targetAcademyId;
        }
        if (user) {
          user.academyId = targetAcademyId;
          const dbUser = this.db.users.find((u) => u._id === user._id);
          if (dbUser) {
            dbUser.academyId = targetAcademyId;
          }
        }
        for (const u of this.db.users) {
          if (u.role === "platform_admin") {
            u.academyId = targetAcademyId;
          }
        }
        this.saveDb();
        this.notifyAll();
        this.notifyAuth();
        return null;
      }

      case "academies:transferAcademyData": {
        if (user?.role !== "platform_admin") {
          throw new Error("Forbidden: Only platform admins can transfer academy data");
        }
        const fromAcademyId = args.fromAcademyId as string;
        const toAcademyId = args.toAcademyId as string;
        if (!fromAcademyId || !toAcademyId) throw new Error("Invalid academy IDs");

        for (const a of this.db.athletes) {
          if (a.academyId === fromAcademyId) a.academyId = toAcademyId;
        }
        for (const t of this.db.teams) {
          if (t.academyId === fromAcademyId) t.academyId = toAcademyId;
        }
        for (const s of this.db.trainingSessions) {
          if (s.academyId === fromAcademyId) s.academyId = toAcademyId;
        }
        for (const inv of this.db.invites) {
          if (inv.academyId === fromAcademyId) inv.academyId = toAcademyId;
        }
        for (const u of this.db.users) {
          if (u.academyId === fromAcademyId && u.role !== "platform_admin") {
            u.academyId = toAcademyId;
          }
        }
        if (user && user.role === "platform_admin") {
          user.academyId = toAcademyId;
          const dbUser = this.db.users.find((u) => u._id === user._id);
          if (dbUser) dbUser.academyId = toAcademyId;
        }
        this.saveDb();
        this.notifyAll();
        this.notifyAuth();
        return null;
      }

      case "academies:setAcademyStatus": {
        if (user?.role !== "platform_admin") {
          throw new Error("Forbidden: Only platform admins can update academy status");
        }
        const academyIdArg = args.academyId as string;
        const acad = this.db.academies.find((a) => a._id === academyIdArg);
        if (acad) {
          acad.status = args.status as MockAcademy["status"];
          this.saveDb();
          this.notifyAll();
          this.syncWithRollback("setAcademyStatus", snapshotDb, mockCloudService.updateAcademy(academyIdArg, { status: acad.status }));
        }
        return null;
      }

      case "academies:deleteAcademy": {
        if (user?.role !== "platform_admin") {
          throw new Error("Forbidden: Only platform admins can delete academies");
        }
        const academyIdArg = args.academyId as string;
        this.db.academies = this.db.academies.filter(
          (a) => a._id !== academyIdArg,
        );
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("deleteAcademy", snapshotDb, mockCloudService.deleteAcademy(academyIdArg));
        return null;
      }

      case "invites:createInvite": {
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId) throw new Error("No academy specified");
        const email = (args.email as string).trim().toLowerCase();
        const role = args.role as MockInvite["role"];
        // Inviting an existing account must not reset its password or change
        // its role; that would let an inviter take it over.
        if (this.db.users.some((u) => u.email.toLowerCase() === email)) {
          throw new Error("An account with this email already exists");
        }
        const password = (args.password as string) || generateTemporaryPassword(role);
        const newInvite: MockInvite = {
          _id: `inv_${Date.now()}`,
          academyId: targetAcademyId,
          email,
          role,
          password,
          status: "pending",
          invitedBy: user?._id ?? "usr_admin",
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          createdAt: nowIso,
        };
        this.db.invites.unshift(newInvite);

        // Auto-provision user account so they can immediately sign in with this password
        const namePart = email
          .split("@")[0]
          .replace(/[._]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        this.db.users.push({
          _id: `usr_${Date.now()}`,
          name: `${namePart}`,
          email,
          password,
          role,
          academyId: targetAcademyId,
          tokenIdentifier: `mock|${Date.now()}`,
        });
        this.provisionedPasswords.set(email, password);

        this.saveDb();
        this.notifyAll();
        return newInvite._id;
      }

      case "invites:cancelInvite": {
        const inviteId = args.inviteId as string;
        const invite = this.db.invites.find((i) => i._id === inviteId);
        if (invite) {
          invite.status = "cancelled";
          this.saveDb();
          this.notifyAll();
        }
        return null;
      }

      case "videoAnalysis:generateUploadUrl": {
        return "https://mock.upload.peakform.local/video";
      }

      case "videoAnalysis:createAnalysis": {
        return `analysis_${Date.now()}`;
      }

      case "announcements:createAnnouncement": {
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId) throw new Error("No academy");
        if (!user || (user.role !== "academy_admin" && user.role !== "coach" && user.role !== "platform_admin")) {
          throw new Error("Forbidden: only academy admin or coach can broadcast announcements");
        }
        const randSuffix = Math.random().toString(36).substring(2, 7);
        const newAnn: MockAnnouncement = {
          _id: `ann_${Date.now()}_${randSuffix}`,
          academyId: targetAcademyId,
          title: (args.title as string).trim(),
          content: (args.content as string).trim(),
          category: args.category as MockAnnouncement["category"],
          priority: args.priority as MockAnnouncement["priority"],
          targetTeamId: args.targetTeamId as string | undefined,
          targetRole: args.targetRole as string | undefined,
          isPinned: Boolean(args.isPinned),
          expiresAt: args.expiresAt as string | undefined,
          createdBy: user?._id ?? "usr_admin",
          authorName: user ? `${user.name} (${user.role})` : "Staff",
          createdAt: nowIso,
        };
        this.db.announcements.unshift(newAnn);
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("createAnnouncement", snapshotDb, mockCloudService.createAnnouncement(targetAcademyId, newAnn));
        return newAnn._id;
      }

      case "announcements:deleteAnnouncement": {
        const announcementId = args.announcementId as string;
        const targetAnn = this.db.announcements.find((a) => a._id === announcementId);
        this.db.announcements = this.db.announcements.filter(
          (a) => a._id !== announcementId,
        );
        this.db.announcementReads = (this.db.announcementReads || []).filter(
          (r) => r.announcementId !== announcementId,
        );
        this.saveDb();
        this.notifyAll();
        if (targetAnn) {
          this.syncWithRollback("deleteAnnouncement", snapshotDb, mockCloudService.deleteAnnouncement(targetAnn.academyId, announcementId));
        }
        return null;
      }

      case "announcements:markAnnouncementAsRead": {
        const announcementId = args.announcementId as string;
        if (!user) return null;
        if (!this.db.announcementReads) this.db.announcementReads = [];
        const exists = this.db.announcementReads.some(
          (r) => r.announcementId === announcementId && r.userId === user._id,
        );
        if (!exists) {
          this.db.announcementReads.push({
            announcementId,
            userId: user._id,
            readAt: nowIso,
          });
          this.saveDb();
          this.notifyAll();
        }
        return null;
      }

      case "trainingSessions:checkInAthlete": {
        const sessionId = args.sessionId as string;
        const session = this.db.trainingSessions.find((s) => s._id === sessionId);
        if (!session) throw new Error("Session not found");

        let targetAthlete: MockAthlete | undefined;
        if (args.athleteId) {
          targetAthlete = this.db.athletes.find((a) => a._id === args.athleteId);
        } else if (args.pin) {
          const pinTrimmed = String(args.pin).trim();
          targetAthlete = this.db.athletes.find(
            (a) => a.academyId === session.academyId && a.checkInPin === pinTrimmed,
          );
        }

        if (!targetAthlete) {
          throw new Error(args.pin ? "Invalid check-in PIN" : "Athlete not found");
        }

        const isEnrolled = this.db.teamMembers.some(
          (m) => m.teamId === session.teamId && m.athleteId === targetAthlete!._id,
        );
        if (!isEnrolled) {
          throw new Error(
            `${targetAthlete.firstName} ${targetAthlete.lastName} is not enrolled in this team`,
          );
        }

        const now = new Date();
        const sessionStart = new Date(session.startsAt);
        const fifteenMinsMs = 15 * 60 * 1000;
        const isLate = now.getTime() > sessionStart.getTime() + fifteenMinsMs;
        const status = isLate ? "late" : "present";

        const existing = this.db.attendanceRecords.find(
          (r) => r.sessionId === sessionId && r.athleteId === targetAthlete!._id,
        );

        let rec: MockAttendanceRecord;
        if (existing) {
          existing.status = status;
          existing.markedAt = nowIso;
          existing.markedBy = user?._id ?? "usr_admin";
          rec = existing;
        } else {
          rec = {
            _id: `att_${Date.now()}_${targetAthlete._id}`,
            sessionId,
            athleteId: targetAthlete._id,
            status,
            markedAt: nowIso,
            markedBy: user?._id ?? "usr_admin",
          };
          this.db.attendanceRecords.push(rec);
        }
        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("setAttendanceRecord", snapshotDb, mockCloudService.setAttendanceRecord(session.academyId, rec));

        return {
          success: true,
          athlete: {
            _id: targetAthlete._id,
            firstName: targetAthlete.firstName,
            lastName: targetAthlete.lastName,
          },
          status,
          recordedAt: nowIso,
        };
      }

      case "trainingSessions:undoCheckIn": {
        const sessionId = args.sessionId as string;
        const athleteId = args.athleteId as string;
        const toDelete = this.db.attendanceRecords.find(
          (r) => r.sessionId === sessionId && r.athleteId === athleteId,
        );
        this.db.attendanceRecords = this.db.attendanceRecords.filter(
          (r) => !(r.sessionId === sessionId && r.athleteId === athleteId),
        );
        this.saveDb();
        this.notifyAll();
        if (toDelete) {
          const sess = this.db.trainingSessions.find((s) => s._id === sessionId);
          if (sess) {
            this.syncWithRollback("deleteAttendanceRecord", snapshotDb, mockCloudService.deleteAttendanceRecord(sess.academyId, toDelete._id));
          }
        }
        return null;
      }

      case "messages:sendMessage": {
        if (!user) throw new Error("Unauthenticated");
        const conversationId = args.conversationId as string;
        const content = (args.content as string).trim();
        if (!content) throw new Error("Message content cannot be empty");

        const conv = this.db.conversations.find((c) => c._id === conversationId);
        if (!conv) throw new Error("Conversation not found");
        const participantUids = conv.participantUids || conv.participantIds || [];
        if (
          !participantUids.includes(user._id) &&
          user.role !== "academy_admin" &&
          user.role !== "platform_admin"
        ) {
          throw new Error("Forbidden: not a participant");
        }

        const randSuffix = Math.random().toString(36).substring(2, 7);
        const newMsg: MockMessage = {
          _id: `msg_${Date.now()}_${randSuffix}`,
          conversationId,
          academyId: conv.academyId,
          senderId: user._id,
          content,
          readBy: [user._id],
          createdAt: nowIso,
        };

        this.db.messages.push(newMsg);
        conv.lastMessageText = content;
        conv.lastMessageAt = nowIso;
        conv.lastSenderId = user._id;

        this.saveDb();
        this.notifyAll();
        this.syncWithRollback("sendMessage", snapshotDb, mockCloudService.sendMessage(conv.academyId, conversationId, newMsg));
        return newMsg._id;
      }

      case "messages:getOrCreateConversation": {
        if (!user) throw new Error("Unauthenticated");
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId) throw new Error("No academy");
        const targetUserId = args.targetUserId as string;

        const existing = this.db.conversations.find(
          (c) =>
            c.academyId === targetAcademyId &&
            c.participantIds.length === 2 &&
            c.participantIds.includes(user._id) &&
            c.participantIds.includes(targetUserId) &&
            (!args.contextId || c.contextId === args.contextId),
        );

        if (existing) {
          existing.participantUids = existing.participantUids || existing.participantIds;
          if (args.contextType && args.contextType !== "general") {
            existing.contextType = args.contextType as MockConversation["contextType"];
          }
          if (args.contextTitle) {
            existing.contextTitle = args.contextTitle as string;
          }
          if (args.contextId) {
            existing.contextId = args.contextId as string;
          }
          if (args.initialMessage && String(args.initialMessage).trim()) {
            const initialText = String(args.initialMessage).trim();
            const randSuffix = Math.random().toString(36).substring(2, 7);
            const newMsg: MockMessage = {
              _id: `msg_${Date.now()}_${randSuffix}`,
              conversationId: existing._id,
              academyId: targetAcademyId,
              senderId: user._id,
              content: initialText,
              readBy: [user._id],
              createdAt: nowIso,
            };
            this.db.messages.push(newMsg);
            existing.lastMessageText = initialText;
            existing.lastMessageAt = nowIso;
            existing.lastSenderId = user._id;
            this.syncWithRollback("sendMessage", snapshotDb, mockCloudService.sendMessage(targetAcademyId, existing._id, newMsg));
          }
          this.saveDb();
          this.notifyAll();
          this.syncWithRollback("updateConversation", snapshotDb, mockCloudService.updateConversation(targetAcademyId, existing._id, existing));
          return existing._id;
        }

        const randSuffix = Math.random().toString(36).substring(2, 7);
        const participantUids = [user._id, targetUserId];
        const newConv: MockConversation = {
          _id: `conv_${Date.now()}_${randSuffix}`,
          academyId: targetAcademyId,
          participantIds: participantUids,
          participantUids,
          athleteId: args.athleteId as string | undefined,
          title: args.title as string | undefined,
          contextType:
            (args.contextType as MockConversation["contextType"]) ?? "general",
          contextId: args.contextId as string | undefined,
          contextTitle: args.contextTitle as string | undefined,
          lastMessageText: args.initialMessage
            ? String(args.initialMessage).trim()
            : undefined,
          lastMessageAt: args.initialMessage ? nowIso : undefined,
          lastSenderId: args.initialMessage ? user._id : undefined,
          createdAt: nowIso,
        };

        this.db.conversations.unshift(newConv);
        this.syncWithRollback("createConversation", snapshotDb, mockCloudService.createConversation(targetAcademyId, newConv));

        if (args.initialMessage && String(args.initialMessage).trim()) {
          const initMsg: MockMessage = {
            _id: `msg_${Date.now()}_${randSuffix}_init`,
            conversationId: newConv._id,
            academyId: targetAcademyId,
            senderId: user._id,
            content: String(args.initialMessage).trim(),
            readBy: [user._id],
            createdAt: nowIso,
          };
          this.db.messages.push(initMsg);
          this.syncWithRollback("sendMessage", snapshotDb, mockCloudService.sendMessage(targetAcademyId, newConv._id, initMsg));
        }

        this.saveDb();
        this.notifyAll();
        return newConv._id;
      }

      case "messages:markConversationRead": {
        if (!user) return null;
        const conversationId = args.conversationId as string;
        let changed = false;
        for (const msg of this.db.messages) {
          if (
            msg.conversationId === conversationId &&
            !msg.readBy.includes(user._id)
          ) {
            msg.readBy.push(user._id);
            changed = true;
          }
        }
        if (changed) {
          this.saveDb();
          this.notifyAll();
        }
        return null;
      }

      case "videoAnalyses:generateUploadUrl": {
        return "https://mock.storage.local/upload";
      }

      case "videoAnalyses:saveVideoAndAnalyze": {
        if (!user) throw new Error("Unauthorized");
        const athleteId = args.athleteId as string;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (!athlete) throw new Error("Athlete not found");

        const randSuffix = Math.random().toString(36).substring(2, 7);
        const analysisId = `va_${Date.now()}_${randSuffix}`;
        const nowIso = new Date().toISOString();

        const deterministic = generateDeterministicTelemetry(
          `${athlete.firstName} ${athlete.lastName}`,
          args.context as string | undefined,
        );

        const newVa: MockVideoAnalysis = {
          _id: analysisId,
          academyId: athlete.academyId,
          athleteId,
          storageId: args.storageId as string,
          filename: args.filename as string,
          context: args.context as string | undefined,
          status: "complete",
          requestedAt: nowIso,
          completedAt: nowIso,
          feedback: deterministic.feedback,
          structuredTelemetry: deterministic.structuredTelemetry,
          retryCount: 0,
          createdBy: user._id,
        };

        if (!this.db.videoAnalyses) this.db.videoAnalyses = [];
        this.db.videoAnalyses.unshift(newVa);
        this.saveDb();
        this.notifyAll();
        return analysisId;
      }

      case "videoAnalyses:deleteAnalysis": {
        const analysisId = args.analysisId as string;
        this.db.videoAnalyses = (this.db.videoAnalyses || []).filter(
          (va) => va._id !== analysisId,
        );
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "videoAnalyses:retryVideoAnalysis": {
        const analysisId = args.analysisId as string;
        const va = (this.db.videoAnalyses || []).find((v) => v._id === analysisId);
        if (!va) throw new Error("Analysis not found");

        va.retryCount = (va.retryCount ?? 0) + 1;
        va.errorMessage = undefined;
        va.lastError = undefined;

        if (args.simulateFailure) {
          va.status = "failed";
          va.errorMessage = "Simulated failure for testing retry state machine resilience";
          va.lastError = va.errorMessage;
        } else {
          va.status = "complete";
          const athlete = this.db.athletes.find((a) => a._id === va.athleteId);
          const athleteName = athlete
            ? `${athlete.firstName} ${athlete.lastName}`
            : "Athlete";
          const deterministic = generateDeterministicTelemetry(athleteName, va.context);
          va.feedback = deterministic.feedback;
          va.structuredTelemetry = deterministic.structuredTelemetry;
          va.completedAt = new Date().toISOString();
        }

        this.saveDb();
        this.notifyAll();
        return { success: true, retryCount: va.retryCount };
      }

      case "videoAnalyses:applyCorrectiveDrillsToPlan": {
        if (!user) throw new Error("Unauthorized");
        const analysisId = args.analysisId as string;
        const targetPlanId = args.targetPlanId as string | undefined;

        const va = (this.db.videoAnalyses || []).find((v) => v._id === analysisId);
        if (!va) throw new Error("Analysis not found");

        const telemetryDrills = va.structuredTelemetry?.recommendedCorrectiveDrills ?? [];
        const drillsToApply =
          telemetryDrills.length > 0
            ? telemetryDrills
            : (va.feedback?.recommendations ?? []).map((rec, i) => ({
                name: `Corrective Movement Drill #${i + 1}`,
                sets: 3,
                reps: "10 reps",
                focusArea: "Technique & Biomechanical Alignment",
                coachingCue: rec,
              }));

        if (drillsToApply.length === 0) {
          throw new Error("No recommended corrective drills available on this analysis");
        }

        let finalPlanId = targetPlanId;
        let addedDrillsCount = 0;

        if (finalPlanId) {
          const targetPlan = this.db.trainingPlans.find((p) => p._id === finalPlanId);
          if (!targetPlan) throw new Error("Target training plan not found");

          const existingItems = this.db.planItems.filter((i) => i.planId === finalPlanId);
          const existingNames = new Set(existingItems.map((i) => i.exercise.trim().toLowerCase()));
          let nextOrder =
            existingItems.length > 0
              ? Math.max(...existingItems.map((i) => i.order)) + 1
              : 0;

          for (const drill of drillsToApply) {
            const normalized = drill.name.trim().toLowerCase();
            if (existingNames.has(normalized)) continue;

            const randSuffix = Math.random().toString(36).substring(2, 7);
            const newItem: MockPlanItem = {
              _id: `item_${Date.now()}_${randSuffix}`,
              planId: finalPlanId,
              order: nextOrder++,
              exercise: drill.name,
              target: `${drill.sets} sets × ${drill.reps}`,
              notes: [drill.focusArea, drill.coachingCue].filter(Boolean).join(" — "),
              completed: false,
            };
            this.db.planItems.push(newItem);
            existingNames.add(normalized);
            addedDrillsCount++;
          }
        } else {
          const randSuffix = Math.random().toString(36).substring(2, 7);
          finalPlanId = `plan_${Date.now()}_${randSuffix}`;
          const movementLabel =
            va.context?.trim() || va.filename.replace(/\.[^/.]+$/, "") || "Technique";

          const newPlan: MockTrainingPlan = {
            _id: finalPlanId,
            academyId: va.academyId,
            athleteId: va.athleteId,
            title: `AI Biomechanics Corrective Plan — ${movementLabel}`,
            description:
              "AI-generated corrective exercise progression targeting biomechanical deviations detected in video analysis.",
            status: "active",
            phase: "rehab_return_to_play",
            createdBy: user._id,
            createdAt: new Date().toISOString(),
          };
          this.db.trainingPlans.unshift(newPlan);

          for (let i = 0; i < drillsToApply.length; i++) {
            const drill = drillsToApply[i];
            const itemSuffix = Math.random().toString(36).substring(2, 7);
            const newItem: MockPlanItem = {
              _id: `item_${Date.now()}_${itemSuffix}`,
              planId: finalPlanId,
              order: i,
              exercise: drill.name,
              target: `${drill.sets} sets × ${drill.reps}`,
              notes: [drill.focusArea, drill.coachingCue].filter(Boolean).join(" — "),
              completed: false,
            };
            this.db.planItems.push(newItem);
            addedDrillsCount++;
          }
        }

        va.appliedToPlanId = finalPlanId;
        va.appliedAt = Date.now();

        this.saveDb();
        this.notifyAll();

        return {
          planId: finalPlanId,
          addedDrillsCount,
        };
      }

      default:
        console.warn(`[LocalMock] Unhandled mutation: ${name}`);
        return null;
    }
  }
}

// Pure so live builds (where nothing uses it) drop the mock store and demo data.
export const localMockStore = /* @__PURE__ */ new LocalMockStore();
