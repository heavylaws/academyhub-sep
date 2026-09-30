import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
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
import { auth, db } from "@/lib/firebase.ts";
import type { UserRole } from "@/hooks/use-current-user.ts";

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
   * Register with Email & Password and send mandatory verification email.
   */
  async signUp(email: string, password: string, displayName?: string): Promise<FirebaseUser> {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName?.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim() });
    }
    await sendEmailVerification(cred.user);
    return cred.user;
  }

  /**
   * Sign in with Email & Password.
   */
  async signIn(email: string, password: string): Promise<FirebaseUser> {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
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
   * 1. Checks if email is verified. If not, returns unverified.
   * 2. Checks if /admins/{uid} exists (platform admin, created manually in console).
   * 3. Checks if user has a membership doc at /academies/{academyId}/members/{uid}.
   * 4. If none, looks up pending invites for the user's verified email across academies.
   *    If found, creates the members/{uid} document and marks the invite accepted.
   * 5. If no membership and no pending invite, returns pending_access.
   */
  async resolveUserMembership(user: FirebaseUser): Promise<MembershipResolution> {
    if (!user.emailVerified) {
      return {
        status: "unverified",
        role: null,
        academyId: null,
      };
    }

    try {
      // 1. Check if user is a platform admin (marker document /admins/{uid})
      const adminSnap = await getDoc(doc(db, "admins", user.uid));
      if (adminSnap.exists()) {
        return {
          status: "active",
          role: "platform_admin",
          academyId: null,
          isPlatformAdmin: true,
        };
      }

      // 2. Check for existing academy membership
      const membersQuery = query(collectionGroup(db, "members"), where("uid", "==", user.uid));
      const memberSnaps = await getDocs(membersQuery);
      if (!memberSnaps.empty) {
        const memberData = memberSnaps.docs[0].data() as AcademyMemberDoc;
        const academyId = memberSnaps.docs[0].ref.parent.parent?.id || memberData.academyId;
        return {
          status: "active",
          role: memberData.role,
          academyId: academyId || null,
          memberDoc: memberData,
        };
      }

      // 3. Look up pending invites for the user's verified email
      const userEmail = (user.email || "").toLowerCase().trim();
      if (userEmail) {
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
            // Create member doc and mark invite accepted in ONE writeBatch
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
      }

      // 4. No membership found and no pending invites
      return {
        status: "pending_access",
        role: null,
        academyId: null,
      };
    } catch (err) {
      console.error("Error resolving user membership:", err);
      return {
        status: "pending_access",
        role: null,
        academyId: null,
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
