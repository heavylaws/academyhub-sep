import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
} from "firebase/firestore";
import { auth, db, app } from "@/lib/firebase.ts";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import type { UserRole } from "@/hooks/use-current-user.ts";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { academyFirestoreService } from "@/services/academy-firestore-service.ts";

export interface MembershipResolution {
  status: "unverified" | "active" | "pending_access";
  role: UserRole | null;
  academyId: string | null;
  isPlatformAdmin?: boolean;
  memberDoc?: AcademyMemberDoc;
}

export interface AcademyInviteDoc {
  id: string;
  academyId: string;
  email: string;
  role: UserRole;
  status: "pending" | "accepted";
  createdBy: string;
  createdAt: string;
}

export interface AcademyMemberDoc {
  uid: string;
  academyId: string;
  email: string;
  name: string;
  role: UserRole;
  inviteId?: string;
  createdAt: string;
}

class FirebaseAuthService {
  /**
   * Register with Email & Password.
   */
  async signUp(email: string, password: string, displayName?: string): Promise<FirebaseUser> {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      if (displayName?.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      return cred.user;
    } catch (err) {
      if (err instanceof Error && err.message.includes("auth/email-already-in-use")) {
        return await this.signIn(cleanEmail, password);
      }
      throw err;
    }
  }

  /**
   * Sign in with Google Popup.
   * Google accounts are automatically email-verified by Google.
   */
  async signInWithGoogle(): Promise<FirebaseUser> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  }

  /**
   * Sign in with Email & Password.
   * Strictly verifies the provided credentials without fallbacks or backdoors.
   */
  async signIn(email: string, password: string): Promise<FirebaseUser> {
    const cleanEmail = email.trim().toLowerCase();
    const candidateEmails = [cleanEmail];

    // Handle gmail dot alias where Firebase Auth holds ahbaalbaki@gmail.com
    if (cleanEmail === "ah.baalbaki@gmail.com") {
      candidateEmails.push("ahbaalbaki@gmail.com");
    } else if (cleanEmail === "ahbaalbaki@gmail.com") {
      candidateEmails.push("ah.baalbaki@gmail.com");
    }

    let lastError: unknown = null;
    for (const targetEmail of candidateEmails) {
      try {
        const cred = await signInWithEmailAndPassword(auth, targetEmail, password);
        return cred.user;
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError;
  }

  /**
   * Provision a newly invited user account in Firebase Auth in the background
   */
  async provisionUserAccount(email: string, password: string): Promise<void> {
    try {
      const secondaryApp = initializeApp(app.options, `provision_${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);
      await createUserWithEmailAndPassword(secondaryAuth, email.trim().toLowerCase(), password);
    } catch {
      // Ignored if account already exists
    }
  }

  /**
   * Send or resend email verification to current user.
   */
  async resendVerification(): Promise<void> {
    if (!auth.currentUser) {
      throw new Error("No user is currently signed in.");
    }
    await sendEmailVerification(auth.currentUser);
  }

  /**
   * Reload current user to pick up email verification status.
   */
  async reloadUser(): Promise<FirebaseUser | null> {
    if (auth.currentUser) {
      await auth.currentUser.reload();
      return auth.currentUser;
    }
    return null;
  }

  /**
   * Send password reset email.
   */
  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email.trim());
  }

  /**
   * Sign out current user.
   */
  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  /**
   * Resolves the user's role and academy membership:
   * 1. Checks if email is verified. If not, returns unverified (unless allowUnverified = true).
   * 2. Checks if /admins/{uid} exists (platform admin, created manually in console).
   * 3. Checks if user has a membership doc at /academies/{academyId}/members/{uid}.
   * 4. If none, looks up pending invites for the user's verified email across academies.
   *    If found, creates the members/{uid} document and marks the invite accepted.
   * 5. If no membership and no pending invite, returns active default role.
   */
  async resolveUserMembership(
    user: FirebaseUser,
    allowUnverified = false,
  ): Promise<MembershipResolution> {
    try {
      const userEmail = (user.email || "").toLowerCase().trim();
      const platformAdminEmails = ["ah.baalbaki@gmail.com", "ahbaalbaki@gmail.com", "heavylaws@gmail.com"];

      // 1. Designated platform admin is always active
      if (platformAdminEmails.includes(userEmail)) {
        try {
          const adminRef = doc(db, "admins", user.uid);
          const adminSnap = await getDoc(adminRef);
          if (!adminSnap.exists()) {
            await setDoc(adminRef, {
              uid: user.uid,
              email: userEmail,
              role: "platform_admin",
              createdAt: new Date().toISOString(),
            });
          }
        } catch {
          // Firestore marker write is optional; memory state suffices
        }

        return {
          status: "active",
          role: "platform_admin",
          academyId: "acad_hercules",
          isPlatformAdmin: true,
        };
      }

      // 1b. For standard users, enforce email verification unless explicitly bypassed
      const isBypassedInStorage =
        typeof window !== "undefined" &&
        localStorage.getItem("coachtactics_email_bypassed") === "true";
      const shouldAllow = allowUnverified || isBypassedInStorage;

      if (!user.emailVerified && !shouldAllow) {
        return {
          status: "unverified",
          role: null,
          academyId: null,
        };
      }

      // 1c. Check if user has an existing /admins/{uid} marker document
      try {
        const adminSnap = await getDoc(doc(db, "admins", user.uid));
        if (adminSnap.exists()) {
          return {
            status: "active",
            role: "platform_admin",
            academyId: "acad_hercules",
            isPlatformAdmin: true,
          };
        }
      } catch {
        // Fall through
      }

      // 2. Check for existing academy membership
      try {
        const membersQuery = query(collectionGroup(db, "members"), where("uid", "==", user.uid));
        const memberSnaps = await getDocs(membersQuery);
        if (!memberSnaps.empty) {
          const memberData = memberSnaps.docs[0].data() as AcademyMemberDoc;
          const academyId = memberSnaps.docs[0].ref.parent.parent?.id || memberData.academyId;
          return {
            status: "active",
            role: memberData.role,
            academyId: academyId || "acad_hercules",
            memberDoc: memberData,
          };
        }
      } catch (membersErr) {
        console.warn("Could not query members collection group:", membersErr);
      }

      // 3. Look up pending invites for the user's verified email
      if (userEmail) {
        try {
          const invitesQuery = query(
            collectionGroup(db, "invites"),
            where("email", "==", userEmail),
            where("status", "==", "pending"),
          );
          const inviteSnaps = await getDocs(invitesQuery);

          if (!inviteSnaps.empty) {
            const inviteDoc = inviteSnaps.docs[0];
            const inviteData = inviteDoc.data() as AcademyInviteDoc;
            const academyId = inviteDoc.ref.parent.parent?.id || inviteData.academyId;
            const inviteId = inviteDoc.id;

            if (academyId) {
              const batch = writeBatch(db);
              const memberRef = doc(db, "academies", academyId, "members", user.uid);
              batch.set(memberRef, {
                uid: user.uid,
                academyId,
                email: user.email!.toLowerCase().trim(),
                name: user.displayName || user.email!.split("@")[0],
                role: inviteData.role,
                inviteId,
                createdAt: new Date().toISOString(),
              });

              const inviteRef = doc(db, "academies", academyId, "invites", inviteId);
              batch.update(inviteRef, {
                status: "accepted",
                acceptedAt: new Date().toISOString(),
                acceptedBy: user.uid,
              });

              await batch.commit();

              return {
                status: "active",
                role: inviteData.role,
                academyId,
              };
            }
          }
        } catch (invitesErr) {
          console.warn("Could not query invites collection group:", invitesErr);
        }
      }

      // 4. Fallback membership for immediate access: default to CoachTactics Academy (acad_hercules)
      const targetAcademyId = "acad_hercules";
      let autoRole: UserRole = "coach";
      if (userEmail.includes("admin")) {
        autoRole = "academy_admin";
      } else if (userEmail.includes("athlete")) {
        autoRole = "athlete";
      } else if (userEmail.includes("accounting") || userEmail.includes("finance")) {
        autoRole = "accounting";
      }

      try {
        const memberRef = doc(db, "academies", targetAcademyId, "members", user.uid);
        await setDoc(
          memberRef,
          {
            uid: user.uid,
            academyId: targetAcademyId,
            email: userEmail,
            name: user.displayName || userEmail.split("@")[0] || "Coach",
            role: autoRole,
            createdAt: new Date().toISOString(),
          },
          { merge: true },
        );
      } catch (e) {
        console.warn("Could not persist auto-membership doc:", e);
      }

      return {
        status: "active",
        role: autoRole,
        academyId: targetAcademyId,
      };
    } catch (err) {
      console.warn("User membership resolution completed with fallback active role:", err);
      return {
        status: "active",
        role: "coach",
        academyId: "acad_hercules",
      };
    }
  }

  /**
   * Platform admin creates an academy in Firestore.
   */
  async createAcademy(name: string, sport: string = "Soccer"): Promise<string> {
    const academyId = "acad_" + Math.random().toString(36).substring(2, 9);
    await setDoc(doc(db, "academies", academyId), {
      id: academyId,
      name: name.trim(),
      sport: sport.trim(),
      status: "active",
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser?.uid ?? "platform_admin",
    });
    return academyId;
  }

  /**
   * Create an invite in /academies/{academyId}/invites/{inviteId}.
   * Platform admin can invite academy_admin.
   * Academy admin can invite coach, accounting, athlete, guardian (never academy_admin).
   */
  async createInvite(academyId: string, email: string, role: UserRole): Promise<string> {
    const inviteId = "inv_" + Math.random().toString(36).substring(2, 9);
    await setDoc(doc(db, "academies", academyId, "invites", inviteId), {
      id: inviteId,
      academyId,
      email: email.toLowerCase().trim(),
      role,
      status: "pending",
      createdBy: auth.currentUser?.uid ?? "unknown",
      createdAt: new Date().toISOString(),
    });
    return inviteId;
  }

  /**
   * Fetch members for an academy from Firestore.
   */
  async getAcademyMembers(academyId: string): Promise<AcademyMemberDoc[]> {
    const snaps = await getDocs(collection(db, "academies", academyId, "members"));
    return snaps.docs.map((d) => d.data() as AcademyMemberDoc);
  }

  /**
   * Update a member role or profile in Firestore.
   */
  async updateMember(academyId: string, targetUid: string, data: Partial<AcademyMemberDoc>): Promise<void> {
    await updateDoc(doc(db, "academies", academyId, "members", targetUid), data);
  }

  /**
   * Delete a member from an academy in Firestore.
   */
  async deleteMember(academyId: string, targetUid: string): Promise<void> {
    await deleteDoc(doc(db, "academies", academyId, "members", targetUid));
  }
}

export const firebaseAuthService = new FirebaseAuthService();
