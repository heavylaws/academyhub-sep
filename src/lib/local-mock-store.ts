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
  type MockAthleteFee,
  type MockFeePayment,
  type MockInvoice,
  type MockInvite,
  type MockAnnouncement,
  type MockConversation,
  type MockMessage,
  type MockDrill,
} from "./local-mock-data.ts";

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
}

const STORAGE_KEY = "coachtactics_clean_db_v3";
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
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const specials = ["!", "#", "@", "$"];
  const char = specials[Math.floor(Math.random() * specials.length)];
  return `${prefix}${randomNum}${char}`;
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
  };
}

class LocalMockStore {
  private db: MockDatabase;
  private currentUserId: string | null = "usr_heavylaws";
  private listeners: Set<() => void> = new Set();
  private authListeners: Set<() => void> = new Set();

  constructor() {
    this.db = this.loadDb();
    if (typeof window !== "undefined") {
      const savedPersona = window.localStorage.getItem(PERSONA_KEY);
      if (savedPersona === "null") {
        this.currentUserId = null;
      } else if (savedPersona) {
        this.currentUserId = savedPersona;
      }
    }
  }

  private loadDb(): MockDatabase {
    if (typeof window === "undefined") return getInitialDb();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const initial = getInitialDb();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        return initial;
      }
      const parsed: MockDatabase = JSON.parse(raw);
      parsed.feeSchedules ??= [];

      parsed.drills ??= [...SEED_DRILLS];
      parsed.academies ??= [...SEED_ACADEMIES];
      parsed.users ??= [...SEED_USERS];
      parsed.athletes ??= [...SEED_ATHLETES];
      parsed.teams ??= [...SEED_TEAMS];
      parsed.teamMembers ??= [...SEED_TEAM_MEMBERS];
      parsed.trainingSessions ??= [...SEED_TRAINING_SESSIONS];
      parsed.attendanceRecords ??= [...SEED_ATTENDANCE];
      parsed.trainingPlans ??= [...SEED_TRAINING_PLANS];
      parsed.planItems ??= [...SEED_PLAN_ITEMS];
      parsed.assessments ??= [...SEED_ASSESSMENTS];
      parsed.athleteFees ??= [...SEED_FEES];
      parsed.feePayments ??= [...SEED_FEE_PAYMENTS];
      parsed.feeSchedules ??= [];
      parsed.invoices ??= [...SEED_INVOICES];
      parsed.invites ??= [...SEED_INVITES];
      parsed.announcements ??= [...SEED_ANNOUNCEMENTS];
      parsed.announcementReads ??= [];
      parsed.conversations ??= [...SEED_CONVERSATIONS];
      parsed.messages ??= [...SEED_MESSAGES];

      // Ensure platform super admin heavylaws is present
      if (!parsed.users.some((u) => u._id === "usr_heavylaws" || u.email?.toLowerCase().includes("heavylaws"))) {
        parsed.users = [...SEED_USERS];
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    } catch {
      return getInitialDb();
    }
  }

  private changeListeners: Set<() => void> = new Set();

  private saveDb(): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      for (const listener of this.changeListeners) {
        try {
          listener();
        } catch (e) {
          console.error("LocalMockStore change listener error", e);
        }
      }
    } catch (e) {
      console.error("Failed to save mock db to localStorage", e);
    }
  }

  public onChange(cb: () => void): () => void {
    this.changeListeners.add(cb);
    return () => this.changeListeners.delete(cb);
  }

  public mergeRemoteData(partial: Partial<MockDatabase>): boolean {
    let changed = false;
    const dbRecord = this.db as unknown as Record<string, unknown[]>;
    for (const [key, items] of Object.entries(partial)) {
      if (!Array.isArray(items)) continue;
      const targetList = dbRecord[key];
      if (!Array.isArray(targetList)) continue;

      for (const item of items) {
        if (!item || typeof item !== "object" || !("_id" in item)) continue;
        const itemId = (item as { _id: string })._id;
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
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      }
      this.notifyAll();
    }
    return changed;
  }

  public resetToDefault(): void {
    this.db = getInitialDb();
    this.currentUserId = "usr_heavylaws";
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
      window.localStorage.setItem(PERSONA_KEY, "usr_heavylaws");
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

  public setPersona(userId: string | null): void {
    this.currentUserId = userId;
    if (userId && !this.db.users.some((u) => u._id === userId)) {
      const knownNames: Record<string, string> = {
        usr_coach: "Dave Miller",
        usr_athlete: "Marcus Vance",
        usr_athlete_1: "Marcus Vance",
        usr_athlete_2: "Elena Rostova",
        usr_sara_awally: "Sara Awally",
        usr_admin: "Alex Thorne",
        usr_super_admin: "Ahmad Baalbaki",
        usr_heavylaws: "heavylaws",
      };
      const knownRoles: Record<string, MockUser["role"]> = {
        usr_coach: "coach",
        usr_athlete: "athlete",
        usr_athlete_1: "athlete",
        usr_athlete_2: "athlete",
        usr_sara_awally: "academy_admin",
        usr_super_admin: "platform_admin",
        usr_admin: "academy_admin",
        usr_heavylaws: "platform_admin",
      };
      const name = knownNames[userId] ?? userId.replace("usr_", "").replace(/[._]/g, " ");
      const role = knownRoles[userId] ?? (userId.includes("admin") ? "academy_admin" : userId.includes("coach") ? "coach" : "athlete");
      this.db.users.push({
        _id: userId,
        name,
        email: `${userId.replace("usr_", "")}@test.local`,
        role,
        academyId: this.db.academies[0]?._id ?? "acad_heavylaws",
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
    const acadId = this.db.academies[0]?._id ?? "acad_heavylaws";

    // Add standard test personas
    const testUsers: MockUser[] = [
      { _id: "usr_coach", name: "Dave Miller", email: "dave.miller@test.local", role: "coach", academyId: acadId, tokenIdentifier: "mock|usr_coach" },
      { _id: "usr_athlete", name: "Marcus Vance", email: "marcus.vance@test.local", role: "athlete", academyId: acadId, tokenIdentifier: "mock|usr_athlete" },
      { _id: "usr_athlete_1", name: "Marcus Vance", email: "marcus1@test.local", role: "athlete", academyId: acadId, tokenIdentifier: "mock|usr_athlete_1" },
      { _id: "usr_athlete_2", name: "Elena Rostova", email: "elena@test.local", role: "athlete", academyId: acadId, tokenIdentifier: "mock|usr_athlete_2" },
      { _id: "usr_sara_awally", name: "Sara Awally", email: "sara.awally@sportzona.com", role: "academy_admin", academyId: acadId, tokenIdentifier: "mock|usr_sara_awally" },
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
        academyId: this.db.academies[0]?._id ?? "acad_heavylaws",
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

  public getUserByEmail(email: string): MockUser | undefined {
    const norm = email.trim().toLowerCase();
    return this.db.users.find((u) => u.email?.toLowerCase() === norm);
  }

  public authenticateWithPassword(
    identifier: string,
    password: string,
  ): { success: boolean; user?: MockUser; error?: string } {
    const normalized = identifier.trim().toLowerCase();

    // Sole authorized account: heavylaws (Super Admin)
    const isHeavyLaws =
      normalized === "heavylaws" ||
      normalized === "heavylaws@gmail.com" ||
      normalized === "heavylaws@coachtactics.com";

    if (isHeavyLaws) {
      if (password !== "//A!t3r3g0") {
        return {
          success: false,
          error: "Incorrect password for heavylaws. Please enter valid credentials.",
        };
      }

      let superUser = this.db.users.find(
        (u) =>
          u._id === "usr_heavylaws" ||
          u.name.toLowerCase() === "heavylaws" ||
          u.email.toLowerCase() === "heavylaws@gmail.com",
      );

      if (!superUser) {
        superUser = {
          _id: "usr_heavylaws",
          name: "heavylaws",
          email: "heavylaws@gmail.com",
          role: "platform_admin",
          academyId: this.db.academies[0]?._id ?? "acad_heavylaws",
          tokenIdentifier: "mock|user_heavylaws",
        };
        this.db.users.unshift(superUser);
      } else {
        superUser.role = "platform_admin";
      }

      this.saveDb();
      this.setPersona(superUser._id);
      return { success: true, user: superUser };
    }

    // Allow any created academy admin, coach, athlete, or guardian to sign in
    const matchingUser = this.db.users.find(
      (u) =>
        u.email?.toLowerCase() === normalized ||
        u.name?.toLowerCase() === normalized ||
        u._id === identifier,
    );
    if (matchingUser) {
      if (matchingUser.password && password && matchingUser.password !== password) {
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
      error: "User not found. Please verify your username/email or sign in as heavylaws.",
    };
  }

  private ownAthletes(user: MockUser | null): MockAthlete[] {
    if (!user) return [];
    if (user.role === "guardian") {
      return this.db.athletes.filter(
        (a) =>
          a.guardianUserId === user._id ||
          (user.email !== undefined &&
            a.guardianEmail?.toLowerCase() === user.email.toLowerCase()),
      );
    }
    return this.db.athletes.filter((a) => a.userId === user._id);
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
    const academyId = user?.academyId;

    switch (name) {
      case "users:getCurrentUser":
        return user;

      case "users:listAcademyMembers": {
        if (!academyId) return [];
        return this.db.users.filter((u) => u.academyId === academyId);
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

        if (
          user.role === "academy_admin" ||
          user.role === "coach" ||
          user.role === "accounting"
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
        return this.db.trainingSessions
          .filter((s) => s.teamId === teamId)
          .sort((a, b) => b.startsAt.localeCompare(a.startsAt));
      }

      case "trainingSessions:getSessionWithAttendance": {
        const sessionId = args.sessionId as string;
        const session = this.db.trainingSessions.find(
          (s) => s._id === sessionId,
        );
        if (!session) throw new Error("Session not found");

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

        return { session, roster, attendance };
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
        return athlete;
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
        return this.db.trainingPlans.filter((p) => p.athleteId === athleteId);
      }

      case "trainingPlans:getPlan": {
        const planId = args.planId as string;
        const plan = this.db.trainingPlans.find((p) => p._id === planId);
        if (!plan) throw new Error("Plan not found");
        const athlete =
          this.db.athletes.find((a) => a._id === plan.athleteId) ?? null;
        const items = this.db.planItems
          .filter((item) => item.planId === planId)
          .sort((a, b) => a.order - b.order);
        return { plan, athlete, items };
      }

      case "assessments:listAssessmentsForAthlete": {
        const athleteId = args.athleteId as string;
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

      case "assessments:listAssessmentsForSession": {
        const sessionId = args.sessionId as string;
        const records = this.db.assessments
          .filter((ass) => ass.sessionId === sessionId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

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
        if (!academyId) return [];
        let fees = this.db.athleteFees.filter((f) => f.academyId === academyId);
        if (args.status) {
          fees = fees.filter((f) => f.status === args.status);
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
            payments,
            totalPaid,
            remainingBalance: Math.max(0, fee.amountDue - totalPaid),
          };
        });
      }

      case "invoices:listInvoicesForAcademy": {
        if (!academyId) return [];
        let invoices = this.db.invoices.filter(
          (i) => i.academyId === academyId,
        );
        if (args.status) {
          invoices = invoices.filter((i) => i.status === args.status);
        }

        const athleteMap = new Map(this.db.athletes.map((a) => [a._id, a]));
        return invoices.map((inv) => ({
          ...inv,
          athleteName: inv.athleteId
            ? athleteMap.get(inv.athleteId)
              ? `${athleteMap.get(inv.athleteId)!.firstName} ${athleteMap.get(inv.athleteId)!.lastName}`
              : "Unknown"
            : null,
        }));
      }

      case "invoices:adminBillingOverview": {
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
        const names = new Map(this.db.academies.map((a) => [a._id, a.name]));
        const sourceUsers =
          user?.role === "platform_admin"
            ? this.db.users
            : this.db.users.filter((u) => u.academyId === academyId);
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
        return [];
      }

      case "announcements:listAnnouncements": {
        if (!academyId) return [];
        const all = this.db.announcements.filter((a) => a.academyId === academyId);
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
          if (a.targetRole && a.targetRole !== user?.role && user?.role !== "academy_admin") {
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
        if (!academyId || !user) return 0;
        const all = this.db.announcements.filter((a) => a.academyId === academyId);
        const reads = new Set(
          (this.db.announcementReads || [])
            .filter((r) => r.userId === user._id)
            .map((r) => r.announcementId),
        );
        return all.filter((a) => !reads.has(a._id)).length;
      }

      case "messages:listConversations": {
        if (!academyId || !user) return [];
        const allConvs = this.db.conversations.filter(
          (c) =>
            c.academyId === academyId && c.participantIds.includes(user._id),
        );

        const userMap = new Map(this.db.users.map((u) => [u._id, u]));

        const results = allConvs.map((c) => {
          const otherId = c.participantIds.find((id) => id !== user._id);
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
        if (
          !conv.participantIds.includes(user?._id ?? "") &&
          user?.role !== "academy_admin"
        ) {
          throw new Error("Forbidden: not a participant");
        }
        const userMap = new Map(this.db.users.map((u) => [u._id, u]));
        const participants = conv.participantIds
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
        if (
          !conv.participantIds.includes(user?._id ?? "") &&
          user?.role !== "academy_admin"
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
        if (!academyId || !user) return 0;
        const userConvs = this.db.conversations.filter(
          (c) =>
            c.academyId === academyId && c.participantIds.includes(user._id),
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
    const academyId = user?.academyId;
    const nowIso = new Date().toISOString();

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
        const newSession: MockTrainingSession = {
          _id: `sess_${Date.now()}`,
          academyId,
          teamId: args.teamId as string,
          title: (args.title as string).trim(),
          startsAt: args.startsAt as string,
          durationMinutes: Number(args.durationMinutes),
          location: args.location as string | undefined,
          notes: args.notes as string | undefined,
          createdBy: user?._id,
          createdAt: nowIso,
        };
        this.db.trainingSessions.unshift(newSession);
        this.saveDb();
        this.notifyAll();
        return newSession._id;
      }

      case "trainingSessions:updateSession": {
        const sessionId = args.sessionId as string;
        const session = this.db.trainingSessions.find(
          (s) => s._id === sessionId,
        );
        if (!session) throw new Error("Session not found");
        session.title = (args.title as string).trim();
        session.startsAt = args.startsAt as string;
        session.durationMinutes = Number(args.durationMinutes);
        session.location = args.location as string | undefined;
        session.notes = args.notes as string | undefined;
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "trainingSessions:deleteSession": {
        const sessionId = args.sessionId as string;
        this.db.trainingSessions = this.db.trainingSessions.filter(
          (s) => s._id !== sessionId,
        );
        this.db.attendanceRecords = this.db.attendanceRecords.filter(
          (a) => a.sessionId !== sessionId,
        );
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "attendance:setAttendance":
      case "trainingSessions:setAttendance": {
        const sessionId = args.sessionId as string;
        const athleteId = args.athleteId as string;
        const status = args.status as MockAttendanceRecord["status"];

        const existing = this.db.attendanceRecords.find(
          (a) => a.sessionId === sessionId && a.athleteId === athleteId,
        );
        if (existing) {
          existing.status = status;
          existing.markedAt = nowIso;
        } else {
          this.db.attendanceRecords.push({
            _id: `att_${Date.now()}`,
            sessionId,
            athleteId,
            status,
            markedAt: nowIso,
            markedBy: user?._id ?? "usr_admin",
          });
        }
        this.saveDb();
        this.notifyAll();
        return null;
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
        return null;
      }

      case "teams:deleteTeam": {
        const teamId = args.teamId as string;
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
        return null;
      }

      case "teams:setTeamRoster": {
        const teamId = args.teamId as string;
        const athleteIds = (args.athleteIds as string[]) ?? [];
        this.db.teamMembers = this.db.teamMembers.filter(
          (m) => m.teamId !== teamId,
        );
        for (const athId of athleteIds) {
          this.db.teamMembers.push({
            _id: `tm_${Date.now()}_${athId}`,
            teamId,
            athleteId: athId,
            joinedAt: nowIso,
          });
        }
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "athletes:createAthlete": {
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId) throw new Error("No academy");
        const newAthlete: MockAthlete = {
          _id: `ath_${Date.now()}`,
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
              _id: `usr_${Date.now()}_ath`,
              name: `${newAthlete.firstName} ${newAthlete.lastName}`.trim(),
              email: athleteEmail,
              password: athletePassword,
              role: "athlete",
              academyId: targetAcademyId,
              tokenIdentifier: `mock|ath_${Date.now()}`,
            };
            this.db.users.push(athUser);
          } else {
            athUser.password = athletePassword;
            athUser.role = "athlete";
            athUser.academyId = targetAcademyId;
          }
          newAthlete.userId = athUser._id;
        }

        // Auto-provision user account for parent / guardian if guardianEmail provided
        if (args.guardianEmail && typeof args.guardianEmail === "string" && args.guardianEmail.includes("@")) {
          const guardianEmail = (args.guardianEmail as string).trim().toLowerCase();
          const guardianPassword = generateTemporaryPassword("guardian");
          let guardUser = this.db.users.find((u) => u.email.toLowerCase() === guardianEmail);
          if (!guardUser) {
            guardUser = {
              _id: `usr_${Date.now()}_guard`,
              name: (args.guardianName as string) || "Parent / Guardian",
              email: guardianEmail,
              password: guardianPassword,
              role: "guardian",
              academyId: targetAcademyId,
              tokenIdentifier: `mock|guard_${Date.now()}`,
            };
            this.db.users.push(guardUser);
          } else {
            guardUser.password = guardianPassword;
            guardUser.role = "guardian";
            guardUser.academyId = targetAcademyId;
          }
          newAthlete.guardianUserId = guardUser._id;
          newAthlete.guardianEmail = guardianEmail;
        }

        this.db.athletes.unshift(newAthlete);
        this.saveDb();
        this.notifyAll();
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
        return null;
      }

      case "athletes:regenerateCheckInPin": {
        const athlete = this.db.athletes.find((a) => a._id === args.athleteId);
        if (!athlete) throw new Error("Athlete not found");
        athlete.checkInPin = this.freePin(athlete.academyId);
        this.saveDb();
        return athlete.checkInPin;
      }

      case "athletes:generateMissingCheckInPins": {
        let assigned = 0;
        for (const athlete of this.db.athletes) {
          if (athlete.academyId !== academyId || athlete.checkInPin) continue;
          if (athlete.status !== "active") continue;
          athlete.checkInPin = this.freePin(athlete.academyId);
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
        }
        return null;
      }

      case "athletes:bulkImportAthletes": {
        if (!academyId) throw new Error("No academy");
        const list = (args.athletes as Partial<MockAthlete>[]) ?? [];
        let added = 0;
        for (const item of list) {
          if (!item.firstName?.trim() || !item.lastName?.trim()) continue;
          this.db.athletes.push({
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
          });
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
        return null;
      }

      case "athletes:unlinkAthleteUser": {
        const athleteId = args.athleteId as string;
        const athlete = this.db.athletes.find((a) => a._id === athleteId);
        if (athlete) {
          athlete.userId = undefined;
          this.saveDb();
          this.notifyAll();
        }
        return null;
      }

      case "trainingPlans:createPlan": {
        if (!academyId) throw new Error("No academy");
        const newPlan: MockTrainingPlan = {
          _id: `plan_${Date.now()}`,
          academyId,
          athleteId: args.athleteId as string,
          title: (args.title as string).trim(),
          description: args.description as string | undefined,
          startDate: args.startDate as string | undefined,
          endDate: args.endDate as string | undefined,
          status: "active",
          createdBy: user?._id ?? "usr_coach",
          createdAt: nowIso,
        };
        this.db.trainingPlans.unshift(newPlan);
        this.saveDb();
        this.notifyAll();
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
        if (args.status)
          plan.status = args.status as MockTrainingPlan["status"];
        this.saveDb();
        this.notifyAll();
        return null;
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
        return null;
      }

      case "trainingPlans:addPlanItem": {
        const planId = args.planId as string;
        const existingCount = this.db.planItems.filter(
          (i) => i.planId === planId,
        ).length;
        const newItem: MockPlanItem = {
          _id: `pitem_${Date.now()}`,
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
        return null;
      }

      case "trainingPlans:deletePlanItem": {
        const itemId = args.itemId as string;
        this.db.planItems = this.db.planItems.filter((i) => i._id !== itemId);
        this.saveDb();
        this.notifyAll();
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
        return null;
      }

      case "assessments:recordAssessment":
      case "assessments:addAssessment": {
        if (!academyId) throw new Error("No academy");
        const newAssessment: MockAssessment = {
          _id: `ass_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          academyId,
          athleteId: args.athleteId as string,
          sessionId: args.sessionId as string | undefined,
          metric: (args.metric as string).trim(),
          value: Number(args.value),
          unit: (args.unit as string)?.trim() || "",
          assessedOn: args.assessedOn as string,
          notes: args.notes as string | undefined,
          conductedBy: user?.name ?? "Staff",
          createdAt: nowIso,
        };
        this.db.assessments.unshift(newAssessment);
        this.saveDb();
        this.notifyAll();
        return newAssessment._id;
      }

      case "assessments:recordBatchSessionAssessments": {
        if (!academyId) throw new Error("No academy");
        const sessionId = args.sessionId as string;
        const metric = (args.metric as string).trim();
        const unit = (args.unit as string)?.trim() || "";
        const assessedOn = args.assessedOn as string;
        const entries = (args.entries as Array<{ athleteId: string; value: number; notes?: string }>) || [];

        const insertedIds: string[] = [];
        for (const entry of entries) {
          if (entry.value !== undefined && !isNaN(entry.value)) {
            const newAssessment: MockAssessment = {
              _id: `ass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              academyId,
              athleteId: entry.athleteId,
              sessionId,
              metric,
              value: Number(entry.value),
              unit,
              assessedOn,
              notes: entry.notes?.trim(),
              conductedBy: user?.name ?? "Staff",
              createdAt: nowIso,
            };
            this.db.assessments.unshift(newAssessment);
            insertedIds.push(newAssessment._id);
          }
        }
        this.saveDb();
        this.notifyAll();
        return { count: insertedIds.length, ids: insertedIds };
      }

      case "assessments:deleteAssessment": {
        const assessmentId = args.assessmentId as string;
        this.db.assessments = this.db.assessments.filter(
          (a) => a._id !== assessmentId,
        );
        this.saveDb();
        this.notifyAll();
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
            this.db.athleteFees.unshift({
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
            });
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
        if (!academyId) throw new Error("No academy");
        const newFee: MockAthleteFee = {
          _id: `fee_${Date.now()}`,
          academyId,
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
        return newFee._id;
      }

      case "fees:recordPayment": {
        const feeId = args.feeId as string;
        const amountPaid = Number(args.amountPaid);
        const fee = this.db.athleteFees.find((f) => f._id === feeId);
        if (!fee) throw new Error("Fee not found");

        this.db.feePayments.push({
          _id: `pay_${Date.now()}`,
          feeId,
          amountPaid,
          paidAt: nowIso,
          recordedBy: user?._id ?? "usr_accounting",
          notes: args.notes as string | undefined,
        });

        const allPayments = this.db.feePayments.filter(
          (p) => p.feeId === feeId,
        );
        const totalPaid = allPayments.reduce((s, p) => s + p.amountPaid, 0);

        fee.status = totalPaid >= fee.amountDue ? "paid" : "partially_paid";
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "fees:updateFeeStatus": {
        const feeId = args.feeId as string;
        const fee = this.db.athleteFees.find((f) => f._id === feeId);
        if (fee) {
          fee.status = args.status as MockAthleteFee["status"];
          if (args.notes) fee.notes = args.notes as string;
          this.saveDb();
          this.notifyAll();
        }
        return null;
      }

      case "fees:deleteFee": {
        const feeId = args.feeId as string;
        this.db.athleteFees = this.db.athleteFees.filter(
          (f) => f._id !== feeId,
        );
        this.db.feePayments = this.db.feePayments.filter(
          (p) => p.feeId !== feeId,
        );
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "invoices:createInvoice": {
        if (!academyId) throw new Error("No academy");
        const academy = this.db.academies.find((a) => a._id === academyId);
        const nextNum =
          academy?.nextInvoiceNumber ?? this.db.invoices.length + 1;
        if (academy) {
          academy.nextInvoiceNumber = nextNum + 1;
        }

        const invoiceNumber = `INV-${String(nextNum).padStart(4, "0")}`;
        const newInvoice: MockInvoice = {
          _id: `inv_${Date.now()}`,
          academyId,
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
        return newInvoice._id;
      }

      case "invoices:updateInvoiceStatus": {
        const invoiceId = args.invoiceId as string;
        const invoice = this.db.invoices.find((i) => i._id === invoiceId);
        if (invoice) {
          invoice.status = args.status as MockInvoice["status"];
          if (args.status === "paid") {
            invoice.paidAt = nowIso;
          }
          this.saveDb();
          this.notifyAll();
        }
        return null;
      }

      case "invoices:deleteInvoice": {
        const invoiceId = args.invoiceId as string;
        this.db.invoices = this.db.invoices.filter((i) => i._id !== invoiceId);
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "academies:createAcademy": {
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
        return newAcad._id;
      }

      case "academies:setActiveAcademy": {
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
        const academyIdArg = args.academyId as string;
        const acad = this.db.academies.find((a) => a._id === academyIdArg);
        if (acad) {
          acad.status = args.status as MockAcademy["status"];
          this.saveDb();
          this.notifyAll();
        }
        return null;
      }

      case "academies:deleteAcademy": {
        const academyIdArg = args.academyId as string;
        this.db.academies = this.db.academies.filter(
          (a) => a._id !== academyIdArg,
        );
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "invites:createInvite": {
        const targetAcademyId = (args.academyId as string) || academyId;
        if (!targetAcademyId) throw new Error("No academy specified");
        const email = (args.email as string).trim().toLowerCase();
        const role = args.role as MockInvite["role"];
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
        let existingUser = this.db.users.find(
          (u) => u.email.toLowerCase() === email,
        );
        if (!existingUser) {
          const namePart = email
            .split("@")[0]
            .replace(/[._]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          existingUser = {
            _id: `usr_${Date.now()}`,
            name: `${namePart}`,
            email,
            password,
            role,
            academyId: targetAcademyId,
            tokenIdentifier: `mock|${Date.now()}`,
          };
          this.db.users.push(existingUser);
        } else {
          existingUser.role = role;
          existingUser.academyId = targetAcademyId;
          existingUser.password = password;
        }

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
        if (!academyId) throw new Error("No academy");
        if (!user || (user.role !== "academy_admin" && user.role !== "coach")) {
          throw new Error("Forbidden: only academy admin or coach can broadcast announcements");
        }
        const newAnn: MockAnnouncement = {
          _id: `ann_${Date.now()}`,
          academyId,
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
        return newAnn._id;
      }

      case "announcements:deleteAnnouncement": {
        const announcementId = args.announcementId as string;
        this.db.announcements = this.db.announcements.filter(
          (a) => a._id !== announcementId,
        );
        this.db.announcementReads = (this.db.announcementReads || []).filter(
          (r) => r.announcementId !== announcementId,
        );
        this.saveDb();
        this.notifyAll();
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

        if (existing) {
          existing.status = status;
          existing.markedAt = nowIso;
          existing.markedBy = user?._id ?? "usr_admin";
        } else {
          this.db.attendanceRecords.push({
            _id: `att_${Date.now()}_${targetAthlete._id}`,
            sessionId,
            athleteId: targetAthlete._id,
            status,
            markedAt: nowIso,
            markedBy: user?._id ?? "usr_admin",
          });
        }
        this.saveDb();
        this.notifyAll();

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
        this.db.attendanceRecords = this.db.attendanceRecords.filter(
          (r) => !(r.sessionId === sessionId && r.athleteId === athleteId),
        );
        this.saveDb();
        this.notifyAll();
        return null;
      }

      case "messages:sendMessage": {
        if (!user) throw new Error("Unauthenticated");
        const conversationId = args.conversationId as string;
        const content = (args.content as string).trim();
        if (!content) throw new Error("Message content cannot be empty");

        const conv = this.db.conversations.find((c) => c._id === conversationId);
        if (!conv) throw new Error("Conversation not found");
        if (
          !conv.participantIds.includes(user._id) &&
          user.role !== "academy_admin"
        ) {
          throw new Error("Forbidden: not a participant");
        }

        const newMsg: MockMessage = {
          _id: `msg_${Date.now()}`,
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
        return newMsg._id;
      }

      case "messages:getOrCreateConversation": {
        if (!user || !academyId) throw new Error("Unauthenticated");
        const targetUserId = args.targetUserId as string;

        const existing = this.db.conversations.find(
          (c) =>
            c.academyId === academyId &&
            c.participantIds.length === 2 &&
            c.participantIds.includes(user._id) &&
            c.participantIds.includes(targetUserId) &&
            (!args.contextId || c.contextId === args.contextId),
        );

        if (existing) {
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
            const newMsg: MockMessage = {
              _id: `msg_${Date.now()}`,
              conversationId: existing._id,
              academyId,
              senderId: user._id,
              content: initialText,
              readBy: [user._id],
              createdAt: nowIso,
            };
            this.db.messages.push(newMsg);
            existing.lastMessageText = initialText;
            existing.lastMessageAt = nowIso;
            existing.lastSenderId = user._id;
          }
          this.saveDb();
          this.notifyAll();
          return existing._id;
        }

        const newConv: MockConversation = {
          _id: `conv_${Date.now()}`,
          academyId,
          participantIds: [user._id, targetUserId],
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

        if (args.initialMessage && String(args.initialMessage).trim()) {
          this.db.messages.push({
            _id: `msg_${Date.now()}`,
            conversationId: newConv._id,
            academyId,
            senderId: user._id,
            content: String(args.initialMessage).trim(),
            readBy: [user._id],
            createdAt: nowIso,
          });
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

      default:
        console.warn(`[LocalMock] Unhandled mutation: ${name}`);
        return null;
    }
  }
}

// Pure so live builds (where nothing uses it) drop the mock store and demo data.
export const localMockStore = /* @__PURE__ */ new LocalMockStore();
