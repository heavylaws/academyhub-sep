import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Session Attendance Kiosk & Athlete Self-Check-in Suite", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
    localMockStore.setPersona("usr_coach");
  });

  describe("Today's Sessions & Kiosk Roster Queries", () => {
    it("retrieves today's sessions with team details and roster counts", () => {
      const sessions = localMockStore.executeQuery(
        "trainingSessions:listTodaySessions",
        {},
      ) as Array<{
        _id: string;
        title: string;
        teamName: string;
        rosterCount: number;
        checkedInCount: number;
      }>;

      expect(sessions).toBeDefined();
      expect(sessions.length).toBeGreaterThan(0);
      const sprintSession = sessions.find((s) => s._id === "sess_today_1");
      expect(sprintSession).toBeDefined();
      expect(sprintSession?.teamName).toBe("Sprint Elite");
      expect(sprintSession?.rosterCount).toBeGreaterThanOrEqual(2);
    });

    it("retrieves session kiosk roster with attendance stats", () => {
      const data = localMockStore.executeQuery(
        "trainingSessions:getSessionKioskRoster",
        { sessionId: "sess_today_1" },
      ) as {
        session: { title: string; teamName: string };
        roster: Array<{
          _id: string;
          firstName: string;
          lastName: string;
          checkInPin?: string;
          hasPin?: boolean;
          status: string;
        }>;
        stats: {
          total: number;
          present: number;
          late: number;
          absent: number;
          unrecorded: number;
          percentCheckedIn: number;
        };
      };

      expect(data).toBeDefined();
      expect(data.session.title).toBe("Max Velocity Sprints & Acceleration");
      expect(data.roster.length).toBeGreaterThan(0);
      expect(data.stats.total).toBe(data.roster.length);

      // The kiosk roster says whether a PIN exists but never exposes it
      const marcus = data.roster.find((a) => a._id === "ath_marcus");
      expect(marcus).toBeDefined();
      expect(marcus?.hasPin).toBe(true);
      expect(marcus?.checkInPin).toBeUndefined();
    });
  });

  describe("Athlete Check-In Mutations", () => {
    it("checks in athlete via direct athleteId", async () => {
      const res = (await localMockStore.executeMutation(
        "trainingSessions:checkInAthlete",
        {
          sessionId: "sess_today_1",
          athleteId: "ath_marcus",
        },
      )) as {
        success: boolean;
        athlete: { _id: string; firstName: string; lastName: string };
        status: string;
        recordedAt: string;
      };

      expect(res.success).toBe(true);
      expect(res.athlete._id).toBe("ath_marcus");
      expect(res.athlete.firstName).toBe("Marcus");
      expect(["present", "late"]).toContain(res.status);

      // Verify roster reflects check-in
      const rosterData = localMockStore.executeQuery(
        "trainingSessions:getSessionKioskRoster",
        { sessionId: "sess_today_1" },
      ) as {
        roster: Array<{ _id: string; status: string }>;
        stats: { percentCheckedIn: number; present: number; late: number };
      };

      const checkedAthlete = rosterData.roster.find((a) => a._id === "ath_marcus");
      expect(["present", "late"]).toContain(checkedAthlete?.status);
      expect(rosterData.stats.present + rosterData.stats.late).toBeGreaterThanOrEqual(1);
    });

    it("checks in athlete via 4-digit PIN", async () => {
      // Marcus Vance PIN is 1024
      const res = (await localMockStore.executeMutation(
        "trainingSessions:checkInAthlete",
        {
          sessionId: "sess_today_1",
          pin: "1024",
        },
      )) as {
        success: boolean;
        athlete: { _id: string; firstName: string };
        status: string;
      };

      expect(res.success).toBe(true);
      expect(res.athlete._id).toBe("ath_marcus");
      expect(res.athlete.firstName).toBe("Marcus");
    });

    it("rejects check-in with invalid PIN", async () => {
      await expect(
        localMockStore.executeMutation("trainingSessions:checkInAthlete", {
          sessionId: "sess_today_1",
          pin: "9999",
        }),
      ).rejects.toThrow(/Invalid check-in PIN/i);
    });

    it("rejects check-in when athlete is not enrolled in session's team", async () => {
      // Elena Rostova (Gymnastics, PIN 2048) trying to check into Sprint Elite session
      await expect(
        localMockStore.executeMutation("trainingSessions:checkInAthlete", {
          sessionId: "sess_today_1",
          pin: "2048",
        }),
      ).rejects.toThrow(/not enrolled in this team/i);
    });

    it("supports undoing check-in for an athlete", async () => {
      // Check in
      await localMockStore.executeMutation("trainingSessions:checkInAthlete", {
        sessionId: "sess_today_1",
        athleteId: "ath_marcus",
      });

      // Undo check-in
      await localMockStore.executeMutation("trainingSessions:undoCheckIn", {
        sessionId: "sess_today_1",
        athleteId: "ath_marcus",
      });

      const rosterData = localMockStore.executeQuery(
        "trainingSessions:getSessionKioskRoster",
        { sessionId: "sess_today_1" },
      ) as {
        roster: Array<{ _id: string; status: string }>;
      };

      const marcus = rosterData.roster.find((a) => a._id === "ath_marcus");
      expect(marcus?.status).toBe("unrecorded");
    });

    it("allows coach to manually override attendance status", async () => {
      await localMockStore.executeMutation("trainingSessions:setAttendance", {
        sessionId: "sess_today_1",
        athleteId: "ath_marcus",
        status: "excused",
      });

      const rosterData = localMockStore.executeQuery(
        "trainingSessions:getSessionKioskRoster",
        { sessionId: "sess_today_1" },
      ) as {
        roster: Array<{ _id: string; status: string }>;
      };

      const marcus = rosterData.roster.find((a) => a._id === "ath_marcus");
      expect(marcus?.status).toBe("excused");
    });
  });
});
