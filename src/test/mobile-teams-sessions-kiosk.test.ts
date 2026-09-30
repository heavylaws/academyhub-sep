import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";
import {
  enqueueOfflineCheckIn,
  flushOfflineQueue,
  getOfflineQueue,
  clearOfflineQueue,
} from "@/lib/kiosk-offline-queue.ts";

describe("Phase 3: Teams, Sessions & Kiosk Touch Ergonomics Suite", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
    localMockStore.seedTestFixtures();
    clearOfflineQueue();
  });

  describe("1. Teams Management & Responsive Roster", () => {
    it("allows coaches and academy admins to list and create teams", async () => {
      localMockStore.setPersona("usr_coach");
      const user = localMockStore.getCurrentUser();
      expect(user?.role).toBe("coach");

      const initialTeams = localMockStore.executeQuery(
        "teams:listTeams",
        {},
      ) as Array<{ _id: string; name: string }>;
      expect(Array.isArray(initialTeams)).toBe(true);

      // Create a new team
      const newTeamId = await localMockStore.executeMutation("teams:createTeam", {
        name: "U14 Girls Elite",
        sport: "Soccer",
      });
      expect(newTeamId).toBeTruthy();

      const updatedTeams = localMockStore.executeQuery(
        "teams:listTeams",
        {},
      ) as Array<{ _id: string; name: string }>;
      expect(updatedTeams.some((t) => t.name === "U14 Girls Elite")).toBe(true);
    });

    it("manages team rosters and updates member counts accurately", async () => {
      localMockStore.setPersona("usr_admin"); // Academy admin
      const teams = localMockStore.executeQuery(
        "teams:listTeams",
        {},
      ) as Array<{ _id: string; name: string }>;
      const targetTeam = teams[0];
      expect(targetTeam).toBeDefined();

      const athletes = localMockStore.executeQuery(
        "athletes:listAthletes",
        {},
      ) as Array<{ _id: string }>;
      expect(athletes.length).toBeGreaterThan(0);

      const selectedAthleteIds = [athletes[0]._id, athletes[1]._id];

      // Update roster
      await localMockStore.executeMutation("teams:setTeamRoster", {
        teamId: targetTeam._id,
        athleteIds: selectedAthleteIds,
      });

      const teamData = localMockStore.executeQuery("teams:getTeam", {
        teamId: targetTeam._id,
      }) as { team: { name: string }; roster: Array<{ _id: string }> };

      expect(teamData.roster.length).toBe(2);
      expect(teamData.roster.map((a) => a._id)).toEqual(
        expect.arrayContaining(selectedAthleteIds),
      );
    });
  });

  describe("2. Training Sessions & Attendance Workflows", () => {
    it("schedules training sessions and verifies calendar listing", async () => {
      localMockStore.setPersona("usr_coach");
      const teams = localMockStore.executeQuery(
        "teams:listTeams",
        {},
      ) as Array<{ _id: string; name: string }>;
      const targetTeam = teams[0];

      const startsAt = new Date(Date.now() + 86400000).toISOString(); // Tomorrow
      const sessionId = await localMockStore.executeMutation(
        "trainingSessions:createSession",
        {
          teamId: targetTeam._id,
          title: "Speed Agility & Quickness",
          startsAt,
          durationMinutes: 75,
          location: "Pitch 2 (North)",
          notes: "Focus on 1v1 defensive stance and acceleration",
        },
      );
      expect(sessionId).toBeTruthy();

      const teamSessions = localMockStore.executeQuery(
        "trainingSessions:listSessionsForTeam",
        { teamId: targetTeam._id },
      ) as Array<{ _id: string; title: string; durationMinutes: number }>;

      const found = teamSessions.find((s) => s._id === sessionId);
      expect(found).toBeDefined();
      expect(found?.title).toBe("Speed Agility & Quickness");
      expect(found?.durationMinutes).toBe(75);
    });

    it("records and updates individual attendance statuses", async () => {
      localMockStore.setPersona("usr_coach");
      const teams = localMockStore.executeQuery(
        "teams:listTeams",
        {},
      ) as Array<{ _id: string }>;
      const teamId = teams[0]._id;

      const sessions = localMockStore.executeQuery(
        "trainingSessions:listSessionsForTeam",
        { teamId },
      ) as Array<{ _id: string }>;
      const session = sessions[0];
      expect(session).toBeDefined();

      const sessionWithAttendance = localMockStore.executeQuery(
        "trainingSessions:getSessionWithAttendance",
        { sessionId: session._id },
      ) as { roster: Array<{ _id: string }>; attendance: Array<{ athleteId: string; status: string }> };

      if (sessionWithAttendance.roster.length > 0) {
        const testAthleteId = sessionWithAttendance.roster[0]._id;

        // Mark as present
        await localMockStore.executeMutation("trainingSessions:setAttendance", {
          sessionId: session._id,
          athleteId: testAthleteId,
          status: "present",
        });

        let updated = localMockStore.executeQuery(
          "trainingSessions:getSessionWithAttendance",
          { sessionId: session._id },
        ) as { attendance: Array<{ athleteId: string; status: string }> };
        expect(
          updated.attendance.find((a) => a.athleteId === testAthleteId)?.status,
        ).toBe("present");

        // Mark as late
        await localMockStore.executeMutation("trainingSessions:setAttendance", {
          sessionId: session._id,
          athleteId: testAthleteId,
          status: "late",
        });

        updated = localMockStore.executeQuery(
          "trainingSessions:getSessionWithAttendance",
          { sessionId: session._id },
        ) as { attendance: Array<{ athleteId: string; status: string }> };
        expect(
          updated.attendance.find((a) => a.athleteId === testAthleteId)?.status,
        ).toBe("late");
      }
    });
  });

  describe("3. Kiosk Mode & Sideline Offline Check-In Ergonomics", () => {
    it("retrieves kiosk roster and computes attendance stats accurately", () => {
      const todaySessions = localMockStore.executeQuery(
        "trainingSessions:listTodaySessions",
        {},
      ) as Array<{ _id: string }>;

      if (todaySessions.length > 0) {
        const kioskData = localMockStore.executeQuery(
          "trainingSessions:getSessionKioskRoster",
          { sessionId: todaySessions[0]._id },
        ) as {
          session: { title: string };
          roster: Array<{ _id: string; status: string }>;
          stats: { total: number; percentCheckedIn: number };
        };

        expect(kioskData).toBeDefined();
        expect(kioskData.stats.total).toBe(kioskData.roster.length);
        expect(kioskData.stats.percentCheckedIn).toBeGreaterThanOrEqual(0);
        expect(kioskData.stats.percentCheckedIn).toBeLessThanOrEqual(100);
      }
    });

    it("supports offline check-in queueing and subsequent batch synchronization", async () => {
      const testSessionId = "session_test_offline_1";
      const testAthleteId = "athlete_offline_1";

      expect(getOfflineQueue().length).toBe(0);

      // Enqueue offline check-in
      enqueueOfflineCheckIn({
        sessionId: testSessionId,
        athleteId: testAthleteId,
        athleteName: "Leo Messi",
      });

      const queued = getOfflineQueue();
      expect(queued.length).toBe(1);
      expect(queued[0].athleteName).toBe("Leo Messi");
      expect(queued[0].sessionId).toBe(testSessionId);

      // Mock network restoration and sync
      const syncedRecords: Array<{ sessionId: string; athleteId?: string }> = [];
      const res = await flushOfflineQueue(async (item) => {
        syncedRecords.push({
          sessionId: item.sessionId,
          athleteId: item.athleteId,
        });
        return { success: true };
      });

      expect(res.synced).toBe(1);
      expect(res.failed).toBe(0);
      expect(getOfflineQueue().length).toBe(0);
      expect(syncedRecords[0].athleteId).toBe(testAthleteId);
    });
  });
});
