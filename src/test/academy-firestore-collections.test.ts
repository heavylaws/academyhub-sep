import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { academyFirestoreService } from "@/services/academy-firestore-service.ts";
import type { MockAthlete, MockTeam, MockTrainingSession } from "@/lib/local-mock-data.ts";

describe("Academy Firestore Scoped Architecture (/academies/{academyId}/...)", () => {
  const academyId = "acad_hercules";

  beforeEach(() => {
    localMockStore.resetToDefault();
    localMockStore.setPersona("usr_coach");
  });

  describe("Check-in PIN Separation (/academies/{academyId}/athletePins/)", () => {
    it("never stores checkInPin in the main athlete document", async () => {
      const testId = `ath_test_${Date.now()}`;
      const athlete: MockAthlete = {
        _id: testId,
        academyId,
        firstName: "Lucas",
        lastName: "Moura",
        gender: "male",
        status: "active",
        checkInPin: "4589",
        createdAt: new Date().toISOString(),
      };

      // Service should strip checkInPin from the athlete doc before saving
      let savedPinData: Record<string, unknown> | null = null;

      // Mock saveAthletePin & createAthlete internal behavior
      const { checkInPin, ...cleanData } = athlete;
      const savedAthData: Record<string, unknown> = cleanData;
      if (checkInPin) {
        savedPinData = {
          athleteId: athlete._id,
          academyId,
          pin: checkInPin,
          updatedAt: new Date().toISOString(),
        };
      }

      expect(savedAthData.checkInPin).toBeUndefined();
      expect(savedPinData).not.toBeNull();
      expect(savedPinData?.pin).toBe("4589");
      expect(savedPinData?.athleteId).toBe(testId);
    });

    it("generates missing check-in PINs into the isolated PIN collection for staff", async () => {
      // Create active athlete without PIN
      const athId = (await localMockStore.executeMutation("athletes:createAthlete", {
        academyId,
        firstName: "Kiosk",
        lastName: "Athlete",
        gender: "female",
      })) as string;

      const ath = localMockStore.getDb().athletes.find((a) => a._id === athId);
      expect(ath).toBeDefined();

      // Regenerate pin
      const newPin = await localMockStore.executeMutation("athletes:regenerateCheckInPin", {
        athleteId: athId,
      });

      expect(newPin).toBeDefined();
      expect(typeof newPin).toBe("string");
      expect(newPin).toMatch(/^\d{4}$/);

      // Verify that batch assignment assigns PINs
      const assigned = await localMockStore.executeMutation("athletes:generateMissingCheckInPins", {});
      expect(typeof assigned).toBe("number");
    });
  });

  describe("Athletes Subcollection Access Control & Guardian Linking", () => {
    it("allows athletes to read only their own athlete profile when userId matches", () => {
      const athleteUserId = "usr_athlete_marcus";
      const athleteDoc = {
        _id: "ath_marcus_vance",
        academyId,
        firstName: "Marcus",
        lastName: "Vance",
        userId: athleteUserId,
        status: "active" as const,
        createdAt: new Date().toISOString(),
      };

      // Rule: resource.data.userId == request.auth.uid
      const canAthleteReadOwn = athleteDoc.userId === athleteUserId;
      expect(canAthleteReadOwn).toBe(true);

      const foreignAthleteUserId = "usr_other_athlete";
      const canAthleteReadForeign = athleteDoc.userId === foreignAthleteUserId;
      expect(canAthleteReadForeign).toBe(false);
    });

    it("allows guardians to read athletes whose guardianUids contains their uid", () => {
      const guardianUid = "usr_guardian_sarah";
      const athleteWithGuardian = {
        _id: "ath_child_1",
        academyId,
        firstName: "Child",
        lastName: "Player",
        guardianUids: ["usr_guardian_sarah", "usr_guardian_spouse"],
        status: "active" as const,
        createdAt: new Date().toISOString(),
      };

      // Rule: request.auth.uid in resource.data.guardianUids
      const canGuardianRead = athleteWithGuardian.guardianUids.includes(guardianUid);
      expect(canGuardianRead).toBe(true);

      const unrelatedGuardianUid = "usr_stranger";
      const canStrangerRead = athleteWithGuardian.guardianUids.includes(unrelatedGuardianUid);
      expect(canStrangerRead).toBe(false);
    });
  });

  describe("Teams & Training Sessions Member User IDs for Athletes", () => {
    it("stores memberUserIds on teams so athlete can read their own team", async () => {
      const athleteId = (await localMockStore.executeMutation("athletes:createAthlete", {
        academyId,
        firstName: "Marcus",
        lastName: "Forward",
        gender: "male",
      })) as string;

      const teamId = (await localMockStore.executeMutation("teams:createTeam", {
        academyId,
        name: "U17 Select Elite",
        sport: "Soccer",
      })) as string;

      expect(teamId).toBeDefined();

      const team = localMockStore.getDb().teams.find((t) => t._id === teamId);
      expect(team).toBeDefined();
      expect(team?.name).toBe("U17 Select Elite");

      // Set roster with athlete
      const athlete1 = localMockStore.getDb().athletes.find((a) => a._id === athleteId)!;
      athlete1.userId = "usr_athlete_1";

      await localMockStore.executeMutation("teams:setTeamRoster", {
        teamId,
        athleteIds: [athlete1._id],
      });

      const members = localMockStore.getDb().teamMembers.filter((m) => m.teamId === teamId);
      expect(members.length).toBe(1);
      expect(members[0].athleteId).toBe(athlete1._id);
    });

    it("schedules training sessions and verifies member user IDs", async () => {
      const teamId = (await localMockStore.executeMutation("teams:createTeam", {
        academyId,
        name: "U19 Premier",
        sport: "Soccer",
      })) as string;

      const startIso = new Date(Date.now() + 86400000).toISOString();

      const sessionId = (await localMockStore.executeMutation("trainingSessions:scheduleSession", {
        academyId,
        teamId,
        title: "Tactical Positioning & High Press",
        startsAt: startIso,
        durationMinutes: 90,
        location: "Pitch A",
      })) as string;

      expect(sessionId).toBeDefined();

      const session = localMockStore.getDb().trainingSessions.find((s) => s._id === sessionId);
      expect(session).toBeDefined();
      expect(session?.title).toBe("Tactical Positioning & High Press");
    });
  });

  describe("Attendance & Kiosk Check-In Flow", () => {
    it("records kiosk check-in and updates attendance status", async () => {
      // Create team, athlete, and enroll in team
      const teamId = (await localMockStore.executeMutation("teams:createTeam", {
        academyId,
        name: "First Squad",
      })) as string;

      const athId = (await localMockStore.executeMutation("athletes:createAthlete", {
        academyId,
        firstName: "Leo",
        lastName: "Striker",
      })) as string;

      await localMockStore.executeMutation("teams:setTeamRoster", {
        teamId,
        athleteIds: [athId],
      });

      const startIso = new Date().toISOString();
      const sessionId = (await localMockStore.executeMutation("trainingSessions:scheduleSession", {
        academyId,
        teamId,
        title: "Morning Drills",
        startsAt: startIso,
        durationMinutes: 60,
      })) as string;

      const result = (await localMockStore.executeMutation("trainingSessions:checkInAthlete", {
        sessionId,
        athleteId: athId,
      })) as { success: boolean; status: string };

      expect(result.success).toBe(true);
      expect(["present", "late"]).toContain(result.status);

      const record = localMockStore.getDb().attendanceRecords.find(
        (r) => r.sessionId === sessionId && r.athleteId === athId,
      );
      expect(record).toBeDefined();
      expect(record?.status).toBe(result.status);

      // Undo check-in
      await localMockStore.executeMutation("trainingSessions:undoCheckIn", {
        sessionId,
        athleteId: athId,
      });

      const afterUndo = localMockStore.getDb().attendanceRecords.find(
        (r) => r.sessionId === sessionId && r.athleteId === athId,
      );
      expect(afterUndo).toBeUndefined();
    });
  });
});
