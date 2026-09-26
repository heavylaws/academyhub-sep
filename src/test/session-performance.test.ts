import { describe, expect, it, beforeEach } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";

describe("Live Team Session Rapid Performance Recording Suite", () => {
  beforeEach(() => {
    localMockStore.resetToDefault();
    localMockStore.setPersona("usr_coach");
  });

  it("batch records drill results for multiple athletes in a team session", async () => {
    const sessionId = "sess_today_1";

    const batchResult = (await localMockStore.executeMutation(
      "assessments:recordBatchSessionAssessments",
      {
        sessionId,
        metric: "Sprint 40m (s)",
        unit: "s",
        assessedOn: "2026-09-17",
        entries: [
          { athleteId: "ath_marcus", value: 4.49, notes: "New PR!" },
          { athleteId: "ath_sarah", value: 4.88, notes: "Good reaction time" },
          { athleteId: "ath_alex", value: 4.95 },
        ],
      },
    )) as { count: number; ids: string[] };

    expect(batchResult.count).toBe(3);
    expect(batchResult.ids).toHaveLength(3);

    // Query session-specific assessments
    const sessionAssessments = localMockStore.executeQuery(
      "assessments:listAssessmentsForSession",
      { sessionId },
    ) as Array<{
      _id: string;
      athleteId: string;
      athleteName: string;
      metric: string;
      value: number;
      unit: string;
      notes?: string;
    }>;

    expect(sessionAssessments).toHaveLength(3);

    const marcusResult = sessionAssessments.find(
      (a) => a.athleteId === "ath_marcus",
    );
    expect(marcusResult).toBeDefined();
    expect(marcusResult?.athleteName).toBe("Marcus Vance");
    expect(marcusResult?.value).toBe(4.49);
    expect(marcusResult?.notes).toBe("New PR!");

    const sarahResult = sessionAssessments.find(
      (a) => a.athleteId === "ath_sarah",
    );
    expect(sarahResult).toBeDefined();
    expect(sarahResult?.value).toBe(4.88);
  });

  it("updates athlete permanent assessment history when logged via live session", async () => {
    const sessionId = "sess_today_1";

    await localMockStore.executeMutation(
      "assessments:recordBatchSessionAssessments",
      {
        sessionId,
        metric: "Vertical Jump (cm)",
        unit: "cm",
        assessedOn: "2026-09-17",
        entries: [{ athleteId: "ath_marcus", value: 76 }],
      },
    );

    // Query Marcus's general assessment profile
    const marcusAssessments = localMockStore.executeQuery(
      "assessments:listAssessmentsForAthlete",
      { athleteId: "ath_marcus" },
    ) as Array<{ metric: string; points: Array<{ value: number }> }>;

    const vertJump = marcusAssessments.find(
      (g) => g.metric === "Vertical Jump (cm)",
    );
    expect(vertJump).toBeDefined();
    expect(vertJump?.points.some((p) => p.value === 76)).toBe(true);
  });

  it("allows coaches to remove an erroneous session drill score", async () => {
    const sessionId = "sess_today_1";

    const batch = (await localMockStore.executeMutation(
      "assessments:recordBatchSessionAssessments",
      {
        sessionId,
        metric: "Coach Technique Rating (1-5)",
        unit: "stars",
        assessedOn: "2026-09-17",
        entries: [{ athleteId: "ath_marcus", value: 5 }],
      },
    )) as { count: number; ids: string[] };

    const scoreId = batch.ids[0];

    // Verify present
    let sessionList = localMockStore.executeQuery(
      "assessments:listAssessmentsForSession",
      { sessionId },
    ) as Array<{ _id: string }>;
    expect(sessionList.some((s) => s._id === scoreId)).toBe(true);

    // Delete
    await localMockStore.executeMutation("assessments:deleteAssessment", {
      assessmentId: scoreId,
    });

    // Verify deleted
    sessionList = localMockStore.executeQuery(
      "assessments:listAssessmentsForSession",
      { sessionId },
    ) as Array<{ _id: string }>;
    expect(sessionList.some((s) => s._id === scoreId)).toBe(false);
  });
});
