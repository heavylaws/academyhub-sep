import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "@/lib/firebase.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";

/**
 * Cloud sync is opt-in. firestore.rules only admit signed-in Firebase users
 * with a verified email who are registered as members of the academy, so
 * without VITE_ENABLE_CLOUD_SYNC=true and a Firebase sign-in nothing is read
 * from or written to Firestore.
 */
const cloudSyncEnabled = import.meta.env.VITE_ENABLE_CLOUD_SYNC === "true";

export interface SyncStatus {
  isEnabled: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  error: string | null;
}

class FirestoreSyncService {
  private activeAcademyId: string | null = null;
  private unsubscribe: Unsubscribe | null = null;
  private isPushing = false;
  private pushDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private statusListeners: Set<(status: SyncStatus) => void> = new Set();
  private status: SyncStatus = {
    isEnabled: cloudSyncEnabled,
    isConnected: false,
    isSyncing: false,
    lastSyncedAt: null,
    error: cloudSyncEnabled ? null : "Cloud sync is disabled",
  };

  constructor() {
    if (cloudSyncEnabled) {
      this.init();
    }
  }

  private canSync(): boolean {
    return cloudSyncEnabled && auth.currentUser !== null && this.activeAcademyId !== null;
  }

  private init() {
    // Listen for store changes made locally on this device
    localMockStore.onChange(() => {
      const activeUser = localMockStore.getCurrentUser();
      if (activeUser?.academyId && activeUser.academyId !== this.activeAcademyId) {
        this.setAcademy(activeUser.academyId);
      }
      this.schedulePush();
    });

    // Only talk to Firestore while a Firebase user is signed in.
    onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        this.cleanup();
        this.updateStatus({ isConnected: false, error: "Sign in to enable cloud sync" });
        return;
      }
      const current = localMockStore.getCurrentUser();
      this.activeAcademyId = current?.academyId ?? null;
      if (this.activeAcademyId) {
        this.startListening(this.activeAcademyId);
      }
    });
  }

  public setAcademy(academyId: string) {
    if (this.activeAcademyId === academyId) return;
    this.activeAcademyId = academyId;
    if (this.canSync()) {
      this.startListening(academyId);
    }
  }

  public subscribeStatus(cb: (status: SyncStatus) => void): () => void {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  public getStatus(): SyncStatus {
    return { ...this.status };
  }

  private updateStatus(patch: Partial<SyncStatus>) {
    this.status = { ...this.status, ...patch };
    for (const listener of this.statusListeners) {
      try {
        listener(this.status);
      } catch (e) {
        console.error("Status listener error", e);
      }
    }
  }

  public startListening(academyId: string) {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (!cloudSyncEnabled || auth.currentUser === null) {
      return;
    }

    const syncDocPath = `academies/${academyId}/live_state/sync`;
    const docRef = doc(db, "academies", academyId, "live_state", "sync");

    try {
      this.unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          this.updateStatus({ isConnected: true, error: null });
          if (!snapshot.exists()) {
            return;
          }

          // If we are currently the ones pushing to Firestore, skip self-echo
          if (this.isPushing) return;

          const data = snapshot.data();
          if (data && data.payload) {
            try {
              const parsed = typeof data.payload === "string" ? JSON.parse(data.payload) : data.payload;
              const hasChanged = localMockStore.mergeRemoteData(parsed, academyId);
              if (hasChanged) {
                this.updateStatus({ lastSyncedAt: new Date() });
              }
            } catch (err) {
              console.warn("Failed to parse remote sync payload", err);
            }
          }
        },
        (error) => {
          this.updateStatus({ isConnected: false, error: error.message });
          handleFirestoreError(error, OperationType.GET, syncDocPath);
        },
      );
    } catch (err) {
      console.warn("Error establishing Firestore onSnapshot listener", err);
    }
  }

  private schedulePush() {
    if (this.pushDebounceTimeout) {
      clearTimeout(this.pushDebounceTimeout);
    }

    this.pushDebounceTimeout = setTimeout(() => {
      this.pushToFirestore();
    }, 1200);
  }

  public async pushToFirestore(): Promise<void> {
    const academyId = this.activeAcademyId;
    if (!this.canSync() || academyId === null) {
      return;
    }
    const syncDocPath = `academies/${academyId}/live_state/sync`;
    const docRef = doc(db, "academies", academyId, "live_state", "sync");

    this.isPushing = true;
    this.updateStatus({ isSyncing: true });

    try {
      const dbData = localMockStore.getDb();
      const academyTeams = new Set(dbData.teams.filter((t) => t.academyId === academyId).map((t) => t._id));
      const academySessions = new Set(dbData.trainingSessions.filter((ts) => ts.academyId === academyId).map((ts) => ts._id));

      // Sync essential operational collections
      const syncPayload = {
        academies: dbData.academies.filter((a) => a._id === academyId),
        athletes: dbData.athletes.filter((a) => a.academyId === academyId),
        teams: dbData.teams.filter((t) => t.academyId === academyId),
        teamMembers: dbData.teamMembers.filter((tm) => academyTeams.has(tm.teamId)),
        trainingSessions: dbData.trainingSessions.filter((ts) => ts.academyId === academyId),
        attendanceRecords: dbData.attendanceRecords.filter((ar) => academySessions.has(ar.sessionId)),
        drills: dbData.drills,
        invoices: dbData.invoices.filter((i) => i.academyId === academyId),
        announcements: dbData.announcements.filter((an) => an.academyId === academyId),
        conversations: dbData.conversations.filter((c) => c.academyId === academyId),
        messages: dbData.messages.filter((m) => m.academyId === academyId),
      };

      await setDoc(
        docRef,
        {
          academyId,
          lastUpdated: serverTimestamp(),
          deviceClient: typeof navigator !== "undefined" ? navigator.userAgent : "web-client",
          payload: JSON.stringify(syncPayload),
        },
        { merge: true },
      );

      this.updateStatus({
        isSyncing: false,
        lastSyncedAt: new Date(),
        error: null,
      });
    } catch (error) {
      this.updateStatus({ isSyncing: false, error: String(error) });
      handleFirestoreError(error, OperationType.WRITE, syncDocPath);
    } finally {
      this.isPushing = false;
    }
  }

  public cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export const firestoreSyncService = new FirestoreSyncService();
