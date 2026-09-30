import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "@/lib/firebase.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";
import type {
  MockAthlete,
  MockTeam,
  MockTeamMember,
  MockTrainingSession,
  MockAttendanceRecord,
  MockAthleteFee,
  MockFeePayment,
  MockInvoice,
  MockAnnouncement,
  MockConversation,
  MockMessage,
  MockDrill,
  MockTrainingPlan,
  MockPlanItem,
  MockAssessment,
} from "@/lib/local-mock-data.ts";

import type { TacticalPlan } from "@/domain/tactics/tactical-domain.ts";

export interface FirestoreAthletePin {
  athleteId: string;
  academyId: string;
  pin: string;
  updatedAt: string;
}

export type FirestoreTacticalBoard = Partial<TacticalPlan> & {
  id?: string;
  _id?: string;
  title?: string;
  academyId?: string;
  updatedAt?: string;
};

export interface AcademyFirestoreSyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
}

class AcademyFirestoreService {
  private activeAcademyId: string | null = null;
  private currentUser: FirebaseUser | null = null;
  private currentRole: string | null = null;
  private unsubs: Unsubscribe[] = [];
  private conversationMessageUnsubs: Map<string, Unsubscribe> = new Map();
  private isPushing = false;
  private statusListeners: Set<(status: AcademyFirestoreSyncStatus) => void> = new Set();
  private status: AcademyFirestoreSyncStatus = {
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
  };

  private isInitialized = false;

  constructor() {
    // Lazy initialization avoids circular import issues during module evaluation
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.initAuthListener();
  }

  private initAuthListener() {
    onAuthStateChanged(auth, (user) => {
      this.currentUser = user;
      if (!user) {
        this.cleanup();
        this.updateStatus({ isConnected: false, error: null });
        return;
      }

      // Check current academy
      const localUser = localMockStore.getCurrentUser();
      if (localUser?.academyId) {
        this.currentRole = localUser.role || null;
        this.setActiveAcademy(localUser.academyId, this.currentRole);
      }
    });

    localMockStore.onChange(() => {
      const localUser = localMockStore.getCurrentUser();
      if (localUser?.academyId && (localUser.academyId !== this.activeAcademyId || localUser.role !== this.currentRole)) {
        this.currentRole = localUser.role || null;
        this.setActiveAcademy(localUser.academyId, this.currentRole);
      }
    });
  }

  public subscribeStatus(cb: (status: AcademyFirestoreSyncStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  private updateStatus(patch: Partial<AcademyFirestoreSyncStatus>) {
    this.status = { ...this.status, ...patch };
    for (const listener of this.statusListeners) {
      try {
        listener(this.status);
      } catch (err) {
        console.error("Status listener error:", err);
      }
    }
  }

  public setActiveAcademy(academyId: string, role: string | null) {
    if (this.activeAcademyId === academyId && this.currentRole === role && this.unsubs.length > 0) {
      return;
    }

    this.cleanup();
    this.activeAcademyId = academyId;
    this.currentRole = role;

    if (this.currentUser && this.currentUser.emailVerified) {
      this.startListening(academyId, role);
    }
  }

  private isStaffRole(role: string | null): boolean {
    return role === "academy_admin" || role === "coach" || role === "platform_admin";
  }

  private isAccountingOrAdmin(role: string | null): boolean {
    return role === "academy_admin" || role === "accounting" || role === "platform_admin";
  }

  public async startListening(academyId: string, role: string | null) {
    this.cleanup();
    if (!this.currentUser || !this.currentUser.emailVerified) return;

    const uid = this.currentUser.uid;
    const isStaff = this.isStaffRole(role);
    const isAthlete = role === "athlete";
    const isGuardian = role === "guardian";

    try {
      this.updateStatus({ isSyncing: true, error: null });

      // 1. Athletes collection listener
      const athletesCol = collection(db, "academies", academyId, "athletes");
      let athletesQuery = query(athletesCol);

      if (!isStaff) {
        if (isAthlete) {
          athletesQuery = query(athletesCol, where("userId", "==", uid));
        } else if (isGuardian) {
          athletesQuery = query(athletesCol, where("guardianUids", "array-contains", uid));
        }
      }

      const athletesUnsub = onSnapshot(
        athletesQuery,
        (snap) => {
          if (this.isPushing) return;
          const remoteAthletes: MockAthlete[] = [];
          snap.forEach((d) => {
            const data = d.data();
            remoteAthletes.push({
              _id: d.id,
              academyId,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              dateOfBirth: data.dateOfBirth,
              gender: data.gender,
              sport: data.sport,
              heightCm: data.heightCm,
              weightKg: data.weightKg,
              email: data.email,
              phone: data.phone,
              guardianName: data.guardianName,
              guardianPhone: data.guardianPhone,
              guardianEmail: data.guardianEmail,
              status: data.status || "active",
              userId: data.userId,
              guardianUserId: data.guardianUserId,
              notes: data.notes,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          });

          // If staff and empty, attempt initial seed of sample data into Firestore
          if (isStaff && snap.empty && localMockStore.getDb().athletes.length > 0) {
            this.seedInitialDataToFirestore(academyId).catch(console.error);
            return;
          }

          if (!snap.empty) {
            localMockStore.mergeRemoteData({ athletes: remoteAthletes }, academyId);
          }
          this.updateStatus({ isConnected: true, lastSyncedAt: new Date() });
        },
        (error) => {
          this.updateStatus({ isConnected: false, error: error.message });
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/athletes`);
        },
      );
      this.unsubs.push(athletesUnsub);

      // 2. Athlete Pins listener (Only staff can read)
      if (isStaff) {
        const pinsCol = collection(db, "academies", academyId, "athletePins");
        const pinsUnsub = onSnapshot(
          pinsCol,
          (snap) => {
            if (this.isPushing) return;
            const pinMap = new Map<string, string>();
            snap.forEach((d) => {
              const data = d.data();
              if (data.pin) {
                pinMap.set(d.id, String(data.pin));
              }
            });

            // Update pins on local athletes cache
            const dbData = localMockStore.getDb();
            let changed = false;
            for (const ath of dbData.athletes) {
              if (ath.academyId === academyId) {
                const p = pinMap.get(ath._id);
                if (p && ath.checkInPin !== p) {
                  ath.checkInPin = p;
                  changed = true;
                }
              }
            }
            if (changed) {
              localMockStore.onChange(() => {})();
            }
          },
          (error) => {
            handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/athletePins`);
          },
        );
        this.unsubs.push(pinsUnsub);
      }

      // 3. Teams listener
      const teamsCol = collection(db, "academies", academyId, "teams");
      let teamsQuery = query(teamsCol);
      if (!isStaff && isAthlete) {
        teamsQuery = query(teamsCol, where("memberUserIds", "array-contains", uid));
      }

      const teamsUnsub = onSnapshot(
        teamsQuery,
        (snap) => {
          if (this.isPushing) return;
          const remoteTeams: MockTeam[] = [];
          snap.forEach((d) => {
            const data = d.data();
            remoteTeams.push({
              _id: d.id,
              academyId,
              name: data.name || "",
              sport: data.sport,
              createdBy: data.createdBy,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          });
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ teams: remoteTeams }, academyId);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/teams`);
        },
      );
      this.unsubs.push(teamsUnsub);

      // 4. Team Members listener
      const teamMembersCol = collection(db, "academies", academyId, "teamMembers");
      let teamMembersQuery = query(teamMembersCol);
      if (!isStaff && isAthlete) {
        teamMembersQuery = query(teamMembersCol, where("userId", "==", uid));
      }

      const teamMembersUnsub = onSnapshot(
        teamMembersQuery,
        (snap) => {
          if (this.isPushing) return;
          const remoteMembers: MockTeamMember[] = [];
          snap.forEach((d) => {
            const data = d.data();
            remoteMembers.push({
              _id: d.id,
              teamId: data.teamId,
              athleteId: data.athleteId,
              joinedAt: data.joinedAt || new Date().toISOString(),
            });
          });
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ teamMembers: remoteMembers }, academyId);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/teamMembers`);
        },
      );
      this.unsubs.push(teamMembersUnsub);

      // 5. Training Sessions listener
      const sessionsCol = collection(db, "academies", academyId, "trainingSessions");
      let sessionsQuery = query(sessionsCol);
      if (!isStaff && isAthlete) {
        sessionsQuery = query(sessionsCol, where("memberUserIds", "array-contains", uid));
      }

      const sessionsUnsub = onSnapshot(
        sessionsQuery,
        (snap) => {
          if (this.isPushing) return;
          const remoteSessions: MockTrainingSession[] = [];
          snap.forEach((d) => {
            const data = d.data();
            remoteSessions.push({
              _id: d.id,
              academyId,
              teamId: data.teamId,
              title: data.title || "",
              startsAt: data.startsAt || new Date().toISOString(),
              durationMinutes: Number(data.durationMinutes) || 60,
              location: data.location,
              notes: data.notes,
              createdBy: data.createdBy,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          });
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ trainingSessions: remoteSessions }, academyId);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/trainingSessions`);
        },
      );
      this.unsubs.push(sessionsUnsub);

      // 6. Attendance records listener
      const attendanceCol = collection(db, "academies", academyId, "attendance");
      let attendanceQuery = query(attendanceCol);
      if (!isStaff && isAthlete) {
        attendanceQuery = query(attendanceCol, where("userId", "==", uid));
      }

      const attendanceUnsub = onSnapshot(
        attendanceQuery,
        (snap) => {
          if (this.isPushing) return;
          const remoteAttendance: MockAttendanceRecord[] = [];
          snap.forEach((d) => {
            const data = d.data();
            remoteAttendance.push({
              _id: d.id,
              sessionId: data.sessionId,
              athleteId: data.athleteId,
              status: data.status || "present",
              markedAt: data.markedAt || new Date().toISOString(),
              markedBy: data.markedBy || "Staff",
            });
          });
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ attendanceRecords: remoteAttendance }, academyId);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/attendance`);
        },
      );
      this.unsubs.push(attendanceUnsub);

      // 7. Fees listener
      const feesCol = collection(db, "academies", academyId, "fees");
      let feesQuery = query(feesCol);
      if (!this.isAccountingOrAdmin(role)) {
        if (isAthlete) {
          feesQuery = query(feesCol, where("userId", "==", uid));
        } else if (isGuardian) {
          feesQuery = query(feesCol, where("guardianUids", "array-contains", uid));
        }
      }

      const feesUnsub = onSnapshot(
        feesQuery,
        (snap) => {
          if (this.isPushing) return;
          const remoteFees: MockAthleteFee[] = [];
          snap.forEach((d) => {
            const data = d.data();
            remoteFees.push({
              _id: d.id,
              academyId,
              athleteId: data.athleteId,
              label: data.label || "",
              amountDue: Number(data.amountDue) || 0,
              currency: data.currency || "USD",
              dueDate: data.dueDate || new Date().toISOString().slice(0, 10),
              status: data.status || "unpaid",
              notes: data.notes,
              createdBy: data.createdBy,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          });
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ athleteFees: remoteFees }, academyId);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/fees`);
        },
      );
      this.unsubs.push(feesUnsub);

      // 8. Fee payments listener
      const paymentsCol = collection(db, "academies", academyId, "payments");
      let paymentsQuery = query(paymentsCol);
      if (!this.isAccountingOrAdmin(role)) {
        if (isAthlete) {
          paymentsQuery = query(paymentsCol, where("userId", "==", uid));
        } else if (isGuardian) {
          paymentsQuery = query(paymentsCol, where("guardianUids", "array-contains", uid));
        }
      }

      const paymentsUnsub = onSnapshot(
        paymentsQuery,
        (snap) => {
          if (this.isPushing) return;
          const remotePayments: MockFeePayment[] = [];
          snap.forEach((d) => {
            const data = d.data();
            remotePayments.push({
              _id: d.id,
              feeId: data.feeId,
              amountPaid: Number(data.amountPaid) || 0,
              paidAt: data.paidAt || new Date().toISOString(),
              recordedBy: data.recordedBy || "Staff",
              paymentMethod: data.paymentMethod,
              notes: data.notes,
            });
          });
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ feePayments: remotePayments }, academyId);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/payments`);
        },
      );
      this.unsubs.push(paymentsUnsub);

      // 9. Invoices listener
      const invoicesCol = collection(db, "academies", academyId, "invoices");
      let invoicesQuery = query(invoicesCol);
      if (!this.isAccountingOrAdmin(role)) {
        if (isAthlete) {
          invoicesQuery = query(invoicesCol, where("userId", "==", uid));
        } else if (isGuardian) {
          invoicesQuery = query(invoicesCol, where("guardianUids", "array-contains", uid));
        }
      }

      const invoicesUnsub = onSnapshot(
        invoicesQuery,
        (snap) => {
          if (this.isPushing) return;
          const remoteInvoices: MockInvoice[] = [];
          snap.forEach((d) => {
            const data = d.data();
            remoteInvoices.push({
              _id: d.id,
              academyId,
              athleteId: data.athleteId,
              invoiceNumber: data.invoiceNumber || "",
              description: data.description || "",
              amount: Number(data.amount) || 0,
              currency: data.currency || "USD",
              dueDate: data.dueDate || new Date().toISOString().slice(0, 10),
              status: data.status || "draft",
              issuedAt: data.issuedAt || new Date().toISOString(),
              paidAt: data.paidAt,
              createdBy: data.createdBy || "Staff",
            });
          });
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ invoices: remoteInvoices }, academyId);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/invoices`);
        },
      );
      this.unsubs.push(invoicesUnsub);

      // 10. Announcements listener (academy members read, staff write)
      const annCol = collection(db, "academies", academyId, "announcements");
      const annUnsub = onSnapshot(
        query(annCol),
        (snap) => {
          if (this.isPushing) return;
          const remoteAnnouncements: MockAnnouncement[] = [];
          snap.forEach((d) => {
            const data = d.data();
            remoteAnnouncements.push({
              _id: d.id,
              academyId,
              title: data.title || "",
              content: data.content || "",
              category: data.category || "general",
              priority: data.priority || "normal",
              targetTeamId: data.targetTeamId,
              targetRole: data.targetRole,
              isPinned: Boolean(data.isPinned),
              expiresAt: data.expiresAt,
              createdBy: data.createdBy || "Staff",
              authorName: data.authorName,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          });
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ announcements: remoteAnnouncements }, academyId);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/announcements`);
        },
      );
      this.unsubs.push(annUnsub);

      // 11. Conversations listener (only users listed in participantUids)
      const convCol = collection(db, "academies", academyId, "conversations");
      const convQuery = isStaff && role === "platform_admin"
        ? query(convCol)
        : query(convCol, where("participantUids", "array-contains", uid));

      const convUnsub = onSnapshot(
        convQuery,
        (snap) => {
          if (this.isPushing) return;
          const remoteConversations: MockConversation[] = [];
          snap.forEach((d) => {
            const data = d.data();
            const partUids = Array.isArray(data.participantUids) ? data.participantUids : [];
            const partIds = Array.isArray(data.participantIds) ? data.participantIds : partUids;
            remoteConversations.push({
              _id: d.id,
              academyId,
              participantIds: partIds,
              participantUids: partUids,
              athleteId: data.athleteId,
              title: data.title,
              contextType: data.contextType || "general",
              contextId: data.contextId,
              contextTitle: data.contextTitle,
              lastMessageText: data.lastMessageText,
              lastMessageAt: data.lastMessageAt,
              lastSenderId: data.lastSenderId,
              createdAt: data.createdAt || new Date().toISOString(),
            });

            this.subscribeConversationMessages(academyId, d.id);
          });
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ conversations: remoteConversations }, academyId);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/conversations`);
        },
      );
      this.unsubs.push(convUnsub);

      // 12. Drills subcollection listener
      // Drills: staff write, academy members read
      const drillsCol = collection(db, "academies", academyId, "drills");
      const drillsUnsub = onSnapshot(
        drillsCol,
        (snap) => {
          const remoteDrills: MockDrill[] = [];
          snap.forEach((d) => remoteDrills.push({ ...(d.data() as MockDrill), _id: d.id }));
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ drills: remoteDrills }, academyId);
          }
          this.updateStatus({ lastSyncedAt: new Date() });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/drills`);
        },
      );
      this.unsubs.push(drillsUnsub);

      // 13. Training plans subcollection listener
      // Staff write, member read (athletes and guardians see only their own athlete's plans)
      const plansCol = collection(db, "academies", academyId, "trainingPlans");
      let plansQuery = query(plansCol);
      if (!isStaff) {
        if (isAthlete) {
          plansQuery = query(plansCol, where("userId", "==", uid));
        } else if (isGuardian) {
          plansQuery = query(plansCol, where("guardianUids", "array-contains", uid));
        }
      }
      const plansUnsub = onSnapshot(
        plansQuery,
        (snap) => {
          const remotePlans: MockTrainingPlan[] = [];
          snap.forEach((d) => remotePlans.push({ ...(d.data() as MockTrainingPlan), _id: d.id }));
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ trainingPlans: remotePlans }, academyId);
          }
          this.updateStatus({ lastSyncedAt: new Date() });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/trainingPlans`);
        },
      );
      this.unsubs.push(plansUnsub);

      // 14. Plan items subcollection listener
      const planItemsCol = collection(db, "academies", academyId, "planItems");
      let itemsQuery = query(planItemsCol);
      if (!isStaff) {
        if (isAthlete) {
          itemsQuery = query(planItemsCol, where("userId", "==", uid));
        } else if (isGuardian) {
          itemsQuery = query(planItemsCol, where("guardianUids", "array-contains", uid));
        }
      }
      const planItemsUnsub = onSnapshot(
        itemsQuery,
        (snap) => {
          const remoteItems: MockPlanItem[] = [];
          snap.forEach((d) => remoteItems.push({ ...(d.data() as MockPlanItem), _id: d.id }));
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ planItems: remoteItems }, academyId);
          }
          this.updateStatus({ lastSyncedAt: new Date() });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/planItems`);
        },
      );
      this.unsubs.push(planItemsUnsub);

      // 15. Assessments subcollection listener
      // Staff write, member read (athletes and guardians see only their own athlete's assessments)
      const assessmentsCol = collection(db, "academies", academyId, "assessments");
      let assessmentsQuery = query(assessmentsCol);
      if (!isStaff) {
        if (isAthlete) {
          assessmentsQuery = query(assessmentsCol, where("userId", "==", uid));
        } else if (isGuardian) {
          assessmentsQuery = query(assessmentsCol, where("guardianUids", "array-contains", uid));
        }
      }
      const assessmentsUnsub = onSnapshot(
        assessmentsQuery,
        (snap) => {
          const remoteAssessments: MockAssessment[] = [];
          snap.forEach((d) => remoteAssessments.push({ ...(d.data() as MockAssessment), _id: d.id }));
          if (!snap.empty) {
            localMockStore.mergeRemoteData({ assessments: remoteAssessments }, academyId);
          }
          this.updateStatus({ lastSyncedAt: new Date() });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/assessments`);
        },
      );
      this.unsubs.push(assessmentsUnsub);

      // 16. Tactical boards subcollection listener
      // Tactical boards: staff write, academy members read
      const boardsCol = collection(db, "academies", academyId, "tacticalBoards");
      const boardsUnsub = onSnapshot(
        boardsCol,
        () => {
          this.updateStatus({ lastSyncedAt: new Date() });
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/tacticalBoards`);
        },
      );
      this.unsubs.push(boardsUnsub);

      this.updateStatus({ isSyncing: false, isConnected: true });
    } catch (err) {
      this.updateStatus({ isSyncing: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  /**
   * Seeds initial sample data to Firestore under /academies/{academyId}/...
   * Check-in PINs are strictly placed in /academies/{academyId}/athletePins/{athleteId}.
   */
  public async seedInitialDataToFirestore(academyId: string): Promise<void> {
    if (!this.currentUser || !this.currentUser.emailVerified) return;
    this.isPushing = true;
    try {
      const dbData = localMockStore.getDb();
      const athletes = dbData.athletes.filter((a) => a.academyId === academyId);
      const teams = dbData.teams.filter((t) => t.academyId === academyId);
      const teamIds = new Set(teams.map((t) => t._id));
      const teamMembers = dbData.teamMembers.filter((m) => teamIds.has(m.teamId));
      const sessions = dbData.trainingSessions.filter((s) => s.academyId === academyId);
      const sessionIds = new Set(sessions.map((s) => s._id));
      const attendance = dbData.attendanceRecords.filter((a) => sessionIds.has(a.sessionId));

      // 1. Seed athletes & athletePins
      for (const ath of athletes) {
        const athDocRef = doc(db, "academies", academyId, "athletes", ath._id);
        const { checkInPin, ...athClean } = ath;
        await setDoc(
          athDocRef,
          {
            ...athClean,
            guardianUids: ath.guardianUserId ? [ath.guardianUserId] : [],
          },
          { merge: true },
        );

        if (checkInPin) {
          const pinDocRef = doc(db, "academies", academyId, "athletePins", ath._id);
          await setDoc(
            pinDocRef,
            {
              athleteId: ath._id,
              academyId,
              pin: checkInPin,
              updatedAt: new Date().toISOString(),
            },
            { merge: true },
          );
        }
      }

      // 2. Seed teams with memberUserIds
      for (const team of teams) {
        const teamDocRef = doc(db, "academies", academyId, "teams", team._id);
        const enrolledAthletes = teamMembers.filter((m) => m.teamId === team._id).map((m) => m.athleteId);
        const enrolledUserIds = athletes
          .filter((a) => enrolledAthletes.includes(a._id) && a.userId)
          .map((a) => a.userId as string);

        await setDoc(
          teamDocRef,
          {
            ...team,
            athleteIds: enrolledAthletes,
            memberUserIds: enrolledUserIds,
          },
          { merge: true },
        );
      }

      // 3. Seed team members
      for (const tm of teamMembers) {
        const tmDocRef = doc(db, "academies", academyId, "teamMembers", tm._id);
        const ath = athletes.find((a) => a._id === tm.athleteId);
        await setDoc(
          tmDocRef,
          {
            ...tm,
            academyId,
            userId: ath?.userId || null,
          },
          { merge: true },
        );
      }

      // 4. Seed training sessions
      for (const sess of sessions) {
        const sessDocRef = doc(db, "academies", academyId, "trainingSessions", sess._id);
        const enrolledAthletes = teamMembers.filter((m) => m.teamId === sess.teamId).map((m) => m.athleteId);
        const enrolledUserIds = athletes
          .filter((a) => enrolledAthletes.includes(a._id) && a.userId)
          .map((a) => a.userId as string);

        await setDoc(
          sessDocRef,
          {
            ...sess,
            memberUserIds: enrolledUserIds,
          },
          { merge: true },
        );
      }

      // 5. Seed attendance
      for (const att of attendance) {
        const attDocRef = doc(db, "academies", academyId, "attendance", att._id);
        const ath = athletes.find((a) => a._id === att.athleteId);
        await setDoc(
          attDocRef,
          {
            ...att,
            academyId,
            userId: ath?.userId || null,
          },
          { merge: true },
        );
      }

      // 6. Seed fees
      const fees = dbData.athleteFees.filter((f) => f.academyId === academyId);
      for (const fee of fees) {
        const feeDocRef = doc(db, "academies", academyId, "fees", fee._id);
        const ath = athletes.find((a) => a._id === fee.athleteId);
        await setDoc(
          feeDocRef,
          {
            ...fee,
            currency: fee.currency || "USD",
            userId: ath?.userId || null,
            guardianUids: ath?.guardianUserId ? [ath.guardianUserId] : [],
          },
          { merge: true },
        );
      }

      // 7. Seed fee payments
      const feeIds = new Set(fees.map((f) => f._id));
      const payments = dbData.feePayments.filter((p) => feeIds.has(p.feeId));
      for (const p of payments) {
        const payDocRef = doc(db, "academies", academyId, "payments", p._id);
        const fee = fees.find((f) => f._id === p.feeId);
        const ath = fee ? athletes.find((a) => a._id === fee.athleteId) : undefined;
        await setDoc(
          payDocRef,
          {
            ...p,
            academyId,
            athleteId: fee?.athleteId || null,
            userId: ath?.userId || null,
            guardianUids: ath?.guardianUserId ? [ath.guardianUserId] : [],
          },
          { merge: true },
        );
      }

      // 8. Seed invoices
      const invoices = dbData.invoices.filter((i) => i.academyId === academyId);
      for (const inv of invoices) {
        const invDocRef = doc(db, "academies", academyId, "invoices", inv._id);
        const ath = inv.athleteId ? athletes.find((a) => a._id === inv.athleteId) : undefined;
        await setDoc(
          invDocRef,
          {
            ...inv,
            currency: inv.currency || "USD",
            userId: ath?.userId || null,
            guardianUids: ath?.guardianUserId ? [ath.guardianUserId] : [],
          },
          { merge: true },
        );
      }

      // 9. Seed announcements
      const announcements = dbData.announcements.filter((a) => a.academyId === academyId);
      for (const ann of announcements) {
        const annDocRef = doc(db, "academies", academyId, "announcements", ann._id);
        await setDoc(annDocRef, ann, { merge: true });
      }

      // 10. Seed conversations and messages
      const conversations = dbData.conversations.filter((c) => c.academyId === academyId);
      for (const conv of conversations) {
        const convDocRef = doc(db, "academies", academyId, "conversations", conv._id);
        const participantUids = conv.participantUids || conv.participantIds || [];
        await setDoc(
          convDocRef,
          {
            ...conv,
            participantUids,
            participantIds: conv.participantIds || participantUids,
          },
          { merge: true },
        );

        const convMessages = dbData.messages.filter((m) => m.conversationId === conv._id);
        for (const msg of convMessages) {
          const msgDocRef = doc(db, "academies", academyId, "conversations", conv._id, "messages", msg._id);
          await setDoc(msgDocRef, msg, { merge: true });
        }
      }

      // 11. Seed drills
      const drills = dbData.drills.filter((d) => !d.academyId || d.academyId === academyId);
      for (const drill of drills) {
        const drillDocRef = doc(db, "academies", academyId, "drills", drill._id);
        await setDoc(drillDocRef, { ...drill, academyId }, { merge: true });
      }

      // 12. Seed training plans
      const plans = dbData.trainingPlans.filter((p) => p.academyId === academyId);
      for (const plan of plans) {
        const planDocRef = doc(db, "academies", academyId, "trainingPlans", plan._id);
        const ath = athletes.find((a) => a._id === plan.athleteId);
        await setDoc(
          planDocRef,
          {
            ...plan,
            userId: ath?.userId || null,
            athleteUserId: ath?.userId || null,
            guardianUids: ath?.guardianUserId ? [ath.guardianUserId] : [],
          },
          { merge: true },
        );
      }

      // 13. Seed plan items
      const planIds = new Set(plans.map((p) => p._id));
      const items = dbData.planItems.filter((i) => planIds.has(i.planId));
      for (const item of items) {
        const itemDocRef = doc(db, "academies", academyId, "planItems", item._id);
        const plan = plans.find((p) => p._id === item.planId);
        const ath = plan ? athletes.find((a) => a._id === plan.athleteId) : undefined;
        await setDoc(
          itemDocRef,
          {
            ...item,
            academyId,
            userId: ath?.userId || null,
            athleteUserId: ath?.userId || null,
            guardianUids: ath?.guardianUserId ? [ath.guardianUserId] : [],
          },
          { merge: true },
        );
      }

      // 14. Seed assessments
      const assessments = dbData.assessments.filter((a) => a.academyId === academyId);
      for (const ass of assessments) {
        const assDocRef = doc(db, "academies", academyId, "assessments", ass._id);
        const ath = athletes.find((a) => a._id === ass.athleteId);
        await setDoc(
          assDocRef,
          {
            ...ass,
            userId: ath?.userId || null,
            athleteUserId: ath?.userId || null,
            guardianUids: ath?.guardianUserId ? [ath.guardianUserId] : [],
          },
          { merge: true },
        );
      }
    } catch (err) {
      console.warn("Seeding initial academy data to Firestore encountered an issue:", err);
    } finally {
      this.isPushing = false;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Individual mutations synced to Firestore under /academies/{academyId}/...
  // ─────────────────────────────────────────────────────────────────────────────

  public async createAthlete(
    academyId: string,
    athlete: MockAthlete,
    pin?: string,
  ): Promise<void> {
    if (!this.currentUser) return;
    const athDocRef = doc(db, "academies", academyId, "athletes", athlete._id);
    const { checkInPin, ...cleanData } = athlete;

    await setDoc(athDocRef, {
      ...cleanData,
      guardianUids: athlete.guardianUserId ? [athlete.guardianUserId] : [],
    });

    if (pin) {
      const pinDocRef = doc(db, "academies", academyId, "athletePins", athlete._id);
      await setDoc(pinDocRef, {
        athleteId: athlete._id,
        academyId,
        pin,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  public async updateAthlete(
    academyId: string,
    athleteId: string,
    patch: Partial<MockAthlete>,
  ): Promise<void> {
    if (!this.currentUser) return;
    const athDocRef = doc(db, "academies", academyId, "athletes", athleteId);
    const { checkInPin, ...cleanPatch } = patch;
    await setDoc(athDocRef, cleanPatch, { merge: true });
  }

  public async saveAthletePin(
    academyId: string,
    athleteId: string,
    pin: string,
  ): Promise<void> {
    if (!this.currentUser) return;
    const pinDocRef = doc(db, "academies", academyId, "athletePins", athleteId);
    await setDoc(pinDocRef, {
      athleteId,
      academyId,
      pin,
      updatedAt: new Date().toISOString(),
    });
  }

  public async createTeam(academyId: string, team: MockTeam): Promise<void> {
    if (!this.currentUser) return;
    const teamDocRef = doc(db, "academies", academyId, "teams", team._id);
    await setDoc(teamDocRef, {
      ...team,
      memberUserIds: [],
      athleteIds: [],
    });
  }

  public async updateTeam(
    academyId: string,
    teamId: string,
    patch: Partial<MockTeam>,
  ): Promise<void> {
    if (!this.currentUser) return;
    const teamDocRef = doc(db, "academies", academyId, "teams", teamId);
    await setDoc(teamDocRef, patch, { merge: true });
  }

  public async deleteTeam(academyId: string, teamId: string): Promise<void> {
    if (!this.currentUser) return;
    const teamDocRef = doc(db, "academies", academyId, "teams", teamId);
    await deleteDoc(teamDocRef);
  }

  public async setTeamRoster(
    academyId: string,
    teamId: string,
    athleteIds: string[],
    members: MockTeamMember[],
  ): Promise<void> {
    if (!this.currentUser) return;
    const dbData = localMockStore.getDb();
    const enrolledUserIds = dbData.athletes
      .filter((a) => athleteIds.includes(a._id) && a.userId)
      .map((a) => a.userId as string);
    const enrolledGuardianUids = Array.from(
      new Set(
        dbData.athletes
          .filter((a) => athleteIds.includes(a._id) && a.guardianUserId)
          .map((a) => a.guardianUserId as string),
      ),
    );

    // Update team document
    const teamDocRef = doc(db, "academies", academyId, "teams", teamId);
    await setDoc(
      teamDocRef,
      {
        athleteIds,
        memberUserIds: enrolledUserIds,
        guardianUids: enrolledGuardianUids,
      },
      { merge: true },
    );

    // Update team members in Firestore
    for (const m of members) {
      const tmDocRef = doc(db, "academies", academyId, "teamMembers", m._id);
      const ath = dbData.athletes.find((a) => a._id === m.athleteId);
      await setDoc(tmDocRef, {
        ...m,
        academyId,
        userId: ath?.userId || null,
      });
    }
  }

  public async createSession(
    academyId: string,
    session: MockTrainingSession,
  ): Promise<void> {
    if (!this.currentUser) return;
    const sessDocRef = doc(db, "academies", academyId, "trainingSessions", session._id);
    const dbData = localMockStore.getDb();
    const teamMembers = dbData.teamMembers.filter((m) => m.teamId === session.teamId);
    const athIds = new Set(teamMembers.map((m) => m.athleteId));
    const memberUserIds = dbData.athletes
      .filter((a) => athIds.has(a._id) && a.userId)
      .map((a) => a.userId as string);
    const enrolledGuardianUids = Array.from(
      new Set(
        dbData.athletes
          .filter((a) => athIds.has(a._id) && a.guardianUserId)
          .map((a) => a.guardianUserId as string),
      ),
    );

    await setDoc(sessDocRef, {
      ...session,
      memberUserIds,
      guardianUids: enrolledGuardianUids,
    });
  }

  public async updateSession(
    academyId: string,
    sessionId: string,
    patch: Partial<MockTrainingSession>,
  ): Promise<void> {
    if (!this.currentUser) return;
    const sessDocRef = doc(db, "academies", academyId, "trainingSessions", sessionId);
    await setDoc(sessDocRef, patch, { merge: true });
  }

  public async deleteSession(
    academyId: string,
    sessionId: string,
  ): Promise<void> {
    if (!this.currentUser) return;
    const sessDocRef = doc(db, "academies", academyId, "trainingSessions", sessionId);
    await deleteDoc(sessDocRef);
  }

  public async setAttendanceRecord(
    academyId: string,
    attendance: MockAttendanceRecord,
  ): Promise<void> {
    if (!this.currentUser) return;
    const attDocRef = doc(db, "academies", academyId, "attendance", attendance._id);
    const dbData = localMockStore.getDb();
    const ath = dbData.athletes.find((a) => a._id === attendance.athleteId);

    await setDoc(attDocRef, {
      ...attendance,
      academyId,
      userId: ath?.userId || null,
      guardianUids: ath?.guardianUserId ? [ath.guardianUserId] : [],
    });
  }

  public async deleteAttendanceRecord(
    academyId: string,
    attendanceId: string,
  ): Promise<void> {
    if (!this.currentUser) return;
    const attDocRef = doc(db, "academies", academyId, "attendance", attendanceId);
    await deleteDoc(attDocRef);
  }

  public async createFee(
    academyId: string,
    fee: MockAthleteFee,
  ): Promise<void> {
    if (!this.currentUser) return;
    const feeDocRef = doc(db, "academies", academyId, "fees", fee._id);
    const dbData = localMockStore.getDb();
    const athlete = dbData.athletes.find((a) => a._id === fee.athleteId);

    await setDoc(feeDocRef, {
      ...fee,
      currency: fee.currency || "USD",
      userId: athlete?.userId || null,
      guardianUids: athlete?.guardianUserId ? [athlete.guardianUserId] : [],
    });
  }

  public async updateFee(
    academyId: string,
    feeId: string,
    patch: Partial<MockAthleteFee>,
  ): Promise<void> {
    if (!this.currentUser) return;
    const feeDocRef = doc(db, "academies", academyId, "fees", feeId);
    await setDoc(feeDocRef, patch, { merge: true });
  }

  public async deleteFee(
    academyId: string,
    feeId: string,
  ): Promise<void> {
    if (!this.currentUser) return;
    const feeDocRef = doc(db, "academies", academyId, "fees", feeId);
    await deleteDoc(feeDocRef);
  }

  public async recordFeePayment(
    academyId: string,
    payment: MockFeePayment,
    fee: MockAthleteFee,
  ): Promise<void> {
    if (!this.currentUser) return;
    const payDocRef = doc(db, "academies", academyId, "payments", payment._id);
    const dbData = localMockStore.getDb();
    const athlete = dbData.athletes.find((a) => a._id === fee.athleteId);

    await setDoc(payDocRef, {
      ...payment,
      academyId,
      athleteId: fee.athleteId,
      userId: athlete?.userId || null,
      guardianUids: athlete?.guardianUserId ? [athlete.guardianUserId] : [],
    });

    const feeDocRef = doc(db, "academies", academyId, "fees", fee._id);
    await setDoc(feeDocRef, { status: fee.status }, { merge: true });
  }

  public async createInvoice(
    academyId: string,
    invoice: MockInvoice,
  ): Promise<void> {
    if (!this.currentUser) return;
    const invDocRef = doc(db, "academies", academyId, "invoices", invoice._id);
    const dbData = localMockStore.getDb();
    const athlete = invoice.athleteId ? dbData.athletes.find((a) => a._id === invoice.athleteId) : undefined;

    await setDoc(invDocRef, {
      ...invoice,
      currency: invoice.currency || "USD",
      userId: athlete?.userId || null,
      guardianUids: athlete?.guardianUserId ? [athlete.guardianUserId] : [],
    });
  }

  public async updateInvoice(
    academyId: string,
    invoiceId: string,
    patch: Partial<MockInvoice>,
  ): Promise<void> {
    if (!this.currentUser) return;
    const invDocRef = doc(db, "academies", academyId, "invoices", invoiceId);
    await setDoc(invDocRef, patch, { merge: true });
  }

  private subscribeConversationMessages(academyId: string, conversationId: string) {
    if (this.conversationMessageUnsubs.has(conversationId)) return;
    const msgCol = collection(db, "academies", academyId, "conversations", conversationId, "messages");
    const unsub = onSnapshot(
      query(msgCol),
      (snap) => {
        if (this.isPushing) return;
        const remoteMessages: MockMessage[] = [];
        snap.forEach((d) => {
          const data = d.data();
          remoteMessages.push({
            _id: d.id,
            conversationId,
            academyId,
            senderId: data.senderId || "",
            content: data.content || data.text || "",
            readBy: Array.isArray(data.readBy) ? data.readBy : [],
            createdAt: data.createdAt || new Date().toISOString(),
          });
        });
        if (!snap.empty) {
          localMockStore.mergeRemoteData({ messages: remoteMessages }, academyId);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `academies/${academyId}/conversations/${conversationId}/messages`);
      },
    );
    this.conversationMessageUnsubs.set(conversationId, unsub);
    this.unsubs.push(unsub);
  }

  public async createAnnouncement(
    academyId: string,
    announcement: MockAnnouncement,
  ): Promise<void> {
    if (!this.currentUser) return;
    const annDocRef = doc(db, "academies", academyId, "announcements", announcement._id);
    await setDoc(annDocRef, announcement);
  }

  public async deleteAnnouncement(
    academyId: string,
    announcementId: string,
  ): Promise<void> {
    if (!this.currentUser) return;
    const annDocRef = doc(db, "academies", academyId, "announcements", announcementId);
    await deleteDoc(annDocRef);
  }

  public async createConversation(
    academyId: string,
    conversation: MockConversation,
  ): Promise<void> {
    if (!this.currentUser) return;
    const convDocRef = doc(db, "academies", academyId, "conversations", conversation._id);
    const participantUids = conversation.participantUids || conversation.participantIds || [];
    await setDoc(convDocRef, {
      ...conversation,
      participantUids,
      participantIds: conversation.participantIds || participantUids,
    });
  }

  public async updateConversation(
    academyId: string,
    conversationId: string,
    patch: Partial<MockConversation>,
  ): Promise<void> {
    if (!this.currentUser) return;
    const convDocRef = doc(db, "academies", academyId, "conversations", conversationId);
    await setDoc(convDocRef, patch, { merge: true });
  }

  public async sendMessage(
    academyId: string,
    conversationId: string,
    message: MockMessage,
  ): Promise<void> {
    if (!this.currentUser) return;
    const msgDocRef = doc(db, "academies", academyId, "conversations", conversationId, "messages", message._id);
    await setDoc(msgDocRef, message);

    const convDocRef = doc(db, "academies", academyId, "conversations", conversationId);
    await setDoc(
      convDocRef,
      {
        lastMessageText: message.content,
        lastMessageAt: message.createdAt,
        lastSenderId: message.senderId,
      },
      { merge: true },
    );
  }

  public async deleteMessage(
    academyId: string,
    conversationId: string,
    messageId: string,
  ): Promise<void> {
    if (!this.currentUser) return;
    const msgDocRef = doc(db, "academies", academyId, "conversations", conversationId, "messages", messageId);
    await deleteDoc(msgDocRef);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Drills, Training Plans, Assessments & Tactical Board Mutations
  // ─────────────────────────────────────────────────────────────────────────────

  public async createDrill(academyId: string, drill: MockDrill): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "drills", drill._id);
    await setDoc(docRef, { ...drill, academyId });
  }

  public async updateDrill(academyId: string, drillId: string, patch: Partial<MockDrill>): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "drills", drillId);
    await setDoc(docRef, patch, { merge: true });
  }

  public async deleteDrill(academyId: string, drillId: string): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "drills", drillId);
    await deleteDoc(docRef);
  }

  public async createTrainingPlan(
    academyId: string,
    plan: MockTrainingPlan,
    athleteUserId?: string,
    guardianUids?: string[],
  ): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "trainingPlans", plan._id);
    await setDoc(docRef, {
      ...plan,
      academyId,
      userId: athleteUserId || null,
      athleteUserId: athleteUserId || null,
      guardianUids: guardianUids || [],
    });
  }

  public async updateTrainingPlan(
    academyId: string,
    planId: string,
    patch: Partial<MockTrainingPlan>,
  ): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "trainingPlans", planId);
    await setDoc(docRef, patch, { merge: true });
  }

  public async deleteTrainingPlan(academyId: string, planId: string): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "trainingPlans", planId);
    await deleteDoc(docRef);
  }

  public async createPlanItem(
    academyId: string,
    item: MockPlanItem,
    athleteUserId?: string,
    guardianUids?: string[],
  ): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "planItems", item._id);
    await setDoc(docRef, {
      ...item,
      academyId,
      userId: athleteUserId || null,
      athleteUserId: athleteUserId || null,
      guardianUids: guardianUids || [],
    });
  }

  public async updatePlanItem(
    academyId: string,
    itemId: string,
    patch: Partial<MockPlanItem>,
  ): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "planItems", itemId);
    await setDoc(docRef, patch, { merge: true });
  }

  public async deletePlanItem(academyId: string, itemId: string): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "planItems", itemId);
    await deleteDoc(docRef);
  }

  public async recordAssessment(
    academyId: string,
    assessment: MockAssessment,
    athleteUserId?: string,
    guardianUids?: string[],
  ): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "assessments", assessment._id);
    await setDoc(docRef, {
      ...assessment,
      academyId,
      userId: athleteUserId || null,
      athleteUserId: athleteUserId || null,
      guardianUids: guardianUids || [],
    });
  }

  public async deleteAssessment(academyId: string, assessmentId: string): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "assessments", assessmentId);
    await deleteDoc(docRef);
  }

  public async saveTacticalBoard(academyId: string, board: FirestoreTacticalBoard): Promise<void> {
    if (!this.currentUser) return;
    const boardId = (board.id || board._id || `board_${Date.now()}`) as string;
    const docRef = doc(db, "academies", academyId, "tacticalBoards", boardId);
    await setDoc(
      docRef,
      {
        ...board,
        id: boardId,
        _id: boardId,
        academyId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  public async deleteTacticalBoard(academyId: string, boardId: string): Promise<void> {
    if (!this.currentUser) return;
    const docRef = doc(db, "academies", academyId, "tacticalBoards", boardId);
    await deleteDoc(docRef);
  }

  public async listTacticalBoards(academyId: string): Promise<FirestoreTacticalBoard[]> {
    const colRef = collection(db, "academies", academyId, "tacticalBoards");
    const snap = await getDocs(colRef);
    const boards: FirestoreTacticalBoard[] = [];
    snap.forEach((d) => boards.push({ id: d.id, ...(d.data() as FirestoreTacticalBoard) }));
    return boards;
  }

  public cleanup() {
    for (const unsub of this.conversationMessageUnsubs.values()) {
      try {
        unsub();
      } catch (err) {
        console.warn("Cleanup message unsub error", err);
      }
    }
    this.conversationMessageUnsubs.clear();

    for (const unsub of this.unsubs) {
      try {
        unsub();
      } catch (err) {
        console.warn("Cleanup unsub error", err);
      }
    }
    this.unsubs = [];
  }
}

export const academyFirestoreService = new AcademyFirestoreService();
