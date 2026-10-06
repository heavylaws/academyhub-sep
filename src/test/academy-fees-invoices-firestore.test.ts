import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Academy Fees, Payments and Invoices Architecture", () => {
  const academyId = "acad_hercules";

  beforeEach(() => {
    localMockStore.resetToDefault();
  });

  describe("Role Authorization: Only academy_admin and accounting can create or update", () => {
    it("allows accounting and academy_admin to create fees and invoices", async () => {
      // Set persona as accounting
      localMockStore.setPersona("usr_accounting");

      const athId = (await localMockStore.executeMutation("athletes:createAthlete", {
        academyId,
        firstName: "Karim",
        lastName: "Benz",
      })) as string;

      const feeId = (await localMockStore.executeMutation("fees:createFee", {
        academyId,
        athleteId: athId,
        label: "Fall Term Training Dues",
        amountDue: 250,
        currency: "USD",
        dueDate: "2026-10-31",
      })) as string;

      expect(feeId).toBeDefined();

      const fee = localMockStore.getDb().athleteFees.find((f) => f._id === feeId);
      expect(fee).toBeDefined();
      expect(fee?.amountDue).toBe(250);
      expect(fee?.currency).toBe("USD");

      // Record payment as accounting
      await localMockStore.executeMutation("fees:recordPayment", {
        feeId,
        amountPaid: 250,
      });

      expect(fee?.status).toBe("paid");

      // Create invoice as accounting
      const invoiceId = (await localMockStore.executeMutation("invoices:createInvoice", {
        academyId,
        athleteId: athId,
        description: "Equipment & Jersey Fee",
        amount: 80,
        currency: "USD",
        dueDate: "2026-10-15",
      })) as string;

      expect(invoiceId).toBeDefined();
      const invoice = localMockStore.getDb().invoices.find((i) => i._id === invoiceId);
      expect(invoice).toBeDefined();
      expect(invoice?.currency).toBe("USD");
      expect(invoice?.amount).toBe(80);
    });

    it("forbids coaches, athletes, and guardians from creating or updating fees or invoices", async () => {
      // Create athlete first with admin
      localMockStore.setPersona("usr_admin");
      const athId = (await localMockStore.executeMutation("athletes:createAthlete", {
        academyId,
        firstName: "Sara",
        lastName: "Ahmed",
      })) as string;

      // Switch persona to coach
      localMockStore.setPersona("usr_coach");
      await expect(
        localMockStore.executeMutation("fees:createFee", {
          academyId,
          athleteId: athId,
          label: "Unauthorized Fee",
          amountDue: 100,
          currency: "USD",
          dueDate: "2026-10-31",
        }),
      ).rejects.toThrow("Unauthorized");

      // Switch persona to athlete
      localMockStore.setPersona("usr_athlete");
      await expect(
        localMockStore.executeMutation("fees:createFee", {
          academyId,
          athleteId: athId,
          label: "Unauthorized Athlete Fee",
          amountDue: 100,
          currency: "USD",
          dueDate: "2026-10-31",
        }),
      ).rejects.toThrow("Unauthorized");

      await expect(
        localMockStore.executeMutation("invoices:createInvoice", {
          academyId,
          athleteId: athId,
          description: "Unauthorized Invoice",
          amount: 50,
          dueDate: "2026-10-31",
        }),
      ).rejects.toThrow("Unauthorized");
    });
  });

  describe("Read Isolation: Athlete and Guardian can read only linked fees", () => {
    it("ensures athletes see only their own fees", async () => {
      localMockStore.setPersona("usr_accounting");

      // Athlete 1
      const athId1 = (await localMockStore.executeMutation("athletes:createAthlete", {
        academyId,
        firstName: "Player",
        lastName: "One",
        email: "player1@test.local",
      })) as string;
      const user1 = localMockStore.getDb().users.find((u) => u.email === "player1@test.local")!;

      // Athlete 2
      const athId2 = (await localMockStore.executeMutation("athletes:createAthlete", {
        academyId,
        firstName: "Player",
        lastName: "Two",
        email: "player2@test.local",
      })) as string;

      // Create fee for player 1
      await localMockStore.executeMutation("fees:createFee", {
        academyId,
        athleteId: athId1,
        label: "Player 1 Fee",
        amountDue: 150,
        currency: "USD",
        dueDate: "2026-11-01",
      });

      // Create fee for player 2
      await localMockStore.executeMutation("fees:createFee", {
        academyId,
        athleteId: athId2,
        label: "Player 2 Fee",
        amountDue: 300,
        currency: "USD",
        dueDate: "2026-11-01",
      });

      // Query as player 1
      localMockStore.setPersona(user1._id);
      const player1Fees = localMockStore.executeQuery("fees:listFeesForAcademy", {}) as Array<{
        athleteId: string;
        label: string;
      }>;

      expect(player1Fees.length).toBe(1);
      expect(player1Fees[0].athleteId).toBe(athId1);
      expect(player1Fees[0].label).toBe("Player 1 Fee");
    });

    it("ensures guardians see only fees for their linked athletes", async () => {
      localMockStore.setPersona("usr_accounting");

      // Athlete with guardian
      const athId = (await localMockStore.executeMutation("athletes:createAthlete", {
        academyId,
        firstName: "Junior",
        lastName: "ParentChild",
        guardianName: "Mother Jane",
        guardianEmail: "jane.mother@test.local",
      })) as string;

      const guardianUser = localMockStore.getDb().users.find((u) => u.email === "jane.mother@test.local")!;

      // Fee for child
      await localMockStore.executeMutation("fees:createFee", {
        academyId,
        athleteId: athId,
        label: "Junior Training Fee",
        amountDue: 200,
        currency: "USD",
        dueDate: "2026-11-15",
      });

      // Query as guardian
      localMockStore.setPersona(guardianUser._id);
      const guardianFees = localMockStore.executeQuery("fees:listFeesForAcademy", {}) as Array<{
        athleteId: string;
        label: string;
      }>;

      expect(guardianFees.length).toBe(1);
      expect(guardianFees[0].athleteId).toBe(athId);
      expect(guardianFees[0].label).toBe("Junior Training Fee");
    });
  });

  describe("Default Currency: USD", () => {
    it("uses USD as default currency when none is specified", async () => {
      localMockStore.setPersona("usr_accounting");

      const athId = (await localMockStore.executeMutation("athletes:createAthlete", {
        academyId,
        firstName: "Currency",
        lastName: "Test",
      })) as string;

      const feeId = (await localMockStore.executeMutation("fees:createFee", {
        academyId,
        athleteId: athId,
        label: "Standard Annual Subscription",
        amountDue: 500,
        dueDate: "2026-12-01",
      })) as string;

      const fee = localMockStore.getDb().athleteFees.find((f) => f._id === feeId);
      expect(fee?.currency).toBe("USD");

      const invoiceId = (await localMockStore.executeMutation("invoices:createInvoice", {
        academyId,
        athleteId: athId,
        description: "Annual Kit Invoice",
        amount: 120,
        dueDate: "2026-12-01",
      })) as string;

      const invoice = localMockStore.getDb().invoices.find((i) => i._id === invoiceId);
      expect(invoice?.currency).toBe("USD");
    });
  });
});
