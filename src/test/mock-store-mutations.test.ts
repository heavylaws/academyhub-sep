import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("LocalMockStore State Mutations & Queries Suite", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
  });

  describe("Persona Switching", () => {
    it("switches active persona and retrieves corresponding user profile", () => {
      localMockStore.setPersona("usr_coach");
      const coach = localMockStore.getCurrentUser();
      expect(coach).not.toBeNull();
      expect(coach?.role).toBe("coach");
      expect(coach?.name).toBe("Dave Miller");

      localMockStore.setPersona("usr_athlete");
      const athlete = localMockStore.getCurrentUser();
      expect(athlete).not.toBeNull();
      expect(athlete?.role).toBe("athlete");
      expect(athlete?.name).toBe("Marcus Vance");
    });
  });

  describe("Assessments Mutation & Querying", () => {
    it("records a new assessment and retrieves it in grouped format", async () => {
      localMockStore.setPersona("usr_coach");

      // Record new test point
      const newId = await localMockStore.executeMutation(
        "assessments:recordAssessment",
        {
          athleteId: "ath_marcus",
          metric: "Broad Jump (m)",
          value: 2.95,
          unit: "m",
          assessedOn: "2026-09-07",
          notes: "Solid takeoff form.",
        },
      );

      expect(newId).toBeDefined();

      // Query assessments for Marcus
      const groups = localMockStore.executeQuery(
        "assessments:listAssessmentsForAthlete",
        { athleteId: "ath_marcus" },
      ) as Array<{ metric: string; points: Array<{ value: number }> }>;

      const broadJumpGroup = groups.find((g) => g.metric === "Broad Jump (m)");
      expect(broadJumpGroup).toBeDefined();
      expect(broadJumpGroup?.points.some((p) => p.value === 2.95)).toBe(true);
    });
  });

  describe("Finance & Invoicing Mutations", () => {
    it("records an invoice and applies payment", async () => {
      localMockStore.setPersona("usr_accounting");

      // Create new invoice
      const invoiceId = (await localMockStore.executeMutation(
        "invoices:createInvoice",
        {
          athleteId: "ath_marcus",
          description: "Q4 Track & Field Fee",
          amount: 300,
          currency: "USD",
          dueDate: "2026-10-01",
          note: "Early registration discount applied",
        },
      )) as string;

      expect(invoiceId).toBeDefined();

      // Update invoice status
      await localMockStore.executeMutation("invoices:updateInvoiceStatus", {
        invoiceId,
        status: "paid",
      });

      const db = localMockStore.getDb();
      const updatedInvoice = db.invoices.find((i) => i._id === invoiceId);
      expect(updatedInvoice).toBeDefined();
      expect(updatedInvoice?.status).toBe("paid");
      expect(updatedInvoice?.paidAt).toBeDefined();
    });
  });

  describe("Attendance Records Mutation", () => {
    it("marks attendance for an athlete in a training session", async () => {
      localMockStore.setPersona("usr_coach");

      await localMockStore.executeMutation("attendance:setAttendance", {
        sessionId: "sess_today_1",
        athleteId: "ath_marcus",
        status: "present",
      });

      const db = localMockStore.getDb();
      const record = db.attendanceRecords.find(
        (r) => r.sessionId === "sess_today_1" && r.athleteId === "ath_marcus",
      );
      expect(record).toBeDefined();
      expect(record?.status).toBe("present");
    });
  });
});
