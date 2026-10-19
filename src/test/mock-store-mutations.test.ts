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

  describe("Phase 4: 4-Corner Benchmarks & IDP Goals", () => {
    it("computes 4-corner benchmark report and handles IDP goal lifecycle in mock store", async () => {
      localMockStore.setPersona("usr_coach");

      const db = localMockStore.getDb();
      if (!db.athletes.some((a) => a._id === "ath_1")) {
        db.athletes.push(
          {
            _id: "ath_1",
            academyId: "acad_hercules",
            firstName: "Marco",
            lastName: "Reus",
            status: "active",
            createdAt: "2026-10-15T10:00:00.000Z",
          },
          {
            _id: "ath_2",
            academyId: "acad_hercules",
            firstName: "Erling",
            lastName: "Haaland",
            status: "active",
            createdAt: "2026-10-15T10:00:00.000Z",
          },
        );
      }

      await localMockStore.executeMutation("assessments:recordAssessment", {
        athleteId: "ath_1",
        metric: "10m Acceleration",
        value: 1.7,
        unit: "s",
        corner: "physical",
        optimizationDirection: "lower_is_better",
        assessedOn: "2026-10-15",
      });

      await localMockStore.executeMutation("assessments:recordAssessment", {
        athleteId: "ath_2",
        metric: "10m Acceleration",
        value: 1.6,
        unit: "s",
        corner: "physical",
        optimizationDirection: "lower_is_better",
        assessedOn: "2026-10-15",
      });

      const report = localMockStore.executeQuery("assessments:getAthleteBenchmarkReport", {
        athleteId: "ath_2",
      }) as {
        metrics: Array<{ metric: string; optimizationDirection: string; zScore: number }>;
      } | null;

      expect(report).toBeDefined();
      expect(report?.metrics.length).toBeGreaterThan(0);
      const metric = report?.metrics.find((m) => m.metric === "10m Acceleration");
      expect(metric).toBeDefined();
      expect(metric?.optimizationDirection).toBe("lower_is_better");
      expect(metric?.zScore).toBeGreaterThan(0);

      // Create and update IDP goal
      const goalId = (await localMockStore.executeMutation("athleteGoals:createAthleteGoal", {
        athleteId: "ath_2",
        title: "Sub-1.55s Sprint",
        corner: "physical",
        baselineValue: 1.65,
        targetValue: 1.55,
        currentValue: 1.6,
        unit: "s",
        optimizationDirection: "lower_is_better",
        targetDate: "2026-12-01",
      })) as string;

      expect(goalId).toBeDefined();

      const goalsBefore = localMockStore.executeQuery("athleteGoals:listAthleteGoals", {
        athleteId: "ath_2",
      }) as Array<{ status: string }>;
      expect(goalsBefore.length).toBe(1);
      expect(goalsBefore[0].status).toBe("in_progress");

      // Meet target -> auto achieves
      await localMockStore.executeMutation("athleteGoals:updateAthleteGoal", {
        goalId,
        currentValue: 1.54,
      });

      const goalsAfter = localMockStore.executeQuery("athleteGoals:listAthleteGoals", {
        athleteId: "ath_2",
      }) as Array<{ status: string }>;
      expect(goalsAfter[0].status).toBe("achieved");
    });
  });

  describe("Phase 5: Resilient Video Biomechanics & Corrective Drill Linking", () => {
    it("handles saveVideoAndAnalyze, retryVideoAnalysis, and applyCorrectiveDrillsToPlan in mock store", async () => {
      localMockStore.setPersona("usr_coach");
      const db = localMockStore.getDb();
      if (!db.athletes.some((a) => a._id === "ath_bio_test")) {
        db.athletes.push({
          _id: "ath_bio_test",
          academyId: "acad_hercules",
          firstName: "Kylian",
          lastName: "Speed",
          status: "active",
          createdAt: "2026-10-15T10:00:00.000Z",
        });
      }

      // 1. Save and analyze
      const analysisId = (await localMockStore.executeMutation(
        "videoAnalyses:saveVideoAndAnalyze",
        {
          athleteId: "ath_bio_test",
          storageId: "storage_123",
          filename: "sprint_drive.mp4",
          context: "Acceleration 10m sprint drive phase",
          frames: ["base64frame1"],
        },
      )) as string;

      expect(analysisId).toBeDefined();

      const analyses = localMockStore.executeQuery(
        "videoAnalyses:listAnalysesForAthlete",
        { athleteId: "ath_bio_test" },
      ) as Array<{
        _id: string;
        status: string;
        structuredTelemetry?: { overallBiomechanicsScore: number };
      }>;

      expect(analyses).toHaveLength(1);
      expect(analyses[0].status).toBe("complete");
      expect(analyses[0].structuredTelemetry?.overallBiomechanicsScore).toBeGreaterThan(0);

      // 2. Retry analysis with simulated failure
      const retryFailResult = (await localMockStore.executeMutation(
        "videoAnalyses:retryVideoAnalysis",
        {
          analysisId,
          simulateFailure: true,
        },
      )) as { success: boolean; retryCount: number };

      expect(retryFailResult.success).toBe(true);
      expect(retryFailResult.retryCount).toBe(1);

      const failedVa = localMockStore.executeQuery(
        "videoAnalyses:getAnalysis",
        { analysisId },
      ) as { status: string; retryCount: number };
      expect(failedVa.status).toBe("failed");
      expect(failedVa.retryCount).toBe(1);

      // 3. Retry again to recover
      const retrySuccessResult = (await localMockStore.executeMutation(
        "videoAnalyses:retryVideoAnalysis",
        { analysisId },
      )) as { success: boolean; retryCount: number };

      expect(retrySuccessResult.retryCount).toBe(2);
      const recoveredVa = localMockStore.executeQuery(
        "videoAnalyses:getAnalysis",
        { analysisId },
      ) as { status: string; retryCount: number };
      expect(recoveredVa.status).toBe("complete");

      // 4. Apply corrective drills to new training plan
      const linkResult = (await localMockStore.executeMutation(
        "videoAnalyses:applyCorrectiveDrillsToPlan",
        { analysisId },
      )) as { planId: string; addedDrillsCount: number };

      expect(linkResult.planId).toBeDefined();
      expect(linkResult.addedDrillsCount).toBeGreaterThan(0);

      const linkedPlan = db.trainingPlans.find((p) => p._id === linkResult.planId);
      expect(linkedPlan).toBeDefined();
      expect(linkedPlan?.phase).toBe("rehab_return_to_play");

      const drills = db.planItems.filter((i) => i.planId === linkResult.planId);
      expect(drills.length).toBe(linkResult.addedDrillsCount);
    });
  });
});


