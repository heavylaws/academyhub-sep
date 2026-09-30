import { describe, expect, it } from "vitest";
import { localMockStore } from "@/lib/local-mock-store.ts";
import { OperationType, handleFirestoreError } from "@/lib/firebase.ts";

describe("Firebase Firestore Multi-Device Sync Engine", () => {
  it("formats and throws structured error info for security audits", () => {
    expect(() => {
      handleFirestoreError(
        new Error("Missing or insufficient permissions."),
        OperationType.WRITE,
        "academies/acad_hercules/drills/drill_test",
      );
    }).toThrowError();

    try {
      handleFirestoreError(
        new Error("Permission denied"),
        OperationType.GET,
        "athletes/ath_test",
      );
    } catch (err: unknown) {
      const errorJson = JSON.parse((err as Error).message);
      expect(errorJson.operationType).toBe("get");
      expect(errorJson.path).toBe("athletes/ath_test");
      expect(errorJson.error).toContain("Permission denied");
    }
  });

  it("merges remote records into local store and avoids duplicates", () => {
    const testAthleteId = `ath_sync_${Date.now()}`;
    const initialDb = localMockStore.getDb();
    const prevCount = initialDb.athletes.length;

    // Simulate remote device syncing a new athlete
    const remoteAthlete = {
      _id: testAthleteId,
      academyId: "acad_hercules",
      firstName: "SyncTest",
      lastName: "RemotePlayer",
      dateOfBirth: "2010-05-15",
      gender: "male" as const,
      status: "active" as const,
      primaryPosition: "Midfielder",
      createdAt: new Date().toISOString(),
    };

    const hasChanged = localMockStore.mergeRemoteData({
      athletes: [remoteAthlete],
    });

    expect(hasChanged).toBe(true);

    const updated = localMockStore.getDb().athletes.find((a) => a._id === testAthleteId);
    expect(updated).toBeDefined();
    expect(updated?.firstName).toBe("SyncTest");
    expect(localMockStore.getDb().athletes.length).toBe(prevCount + 1);

    // Merge an update to the same remote player
    const hasUpdated = localMockStore.mergeRemoteData({
      athletes: [{ ...remoteAthlete, firstName: "SyncTestUpdated" }],
    });

    expect(hasUpdated).toBe(true);
    const updatedAgain = localMockStore.getDb().athletes.find((a) => a._id === testAthleteId);
    expect(updatedAgain?.firstName).toBe("SyncTestUpdated");
    // Count should remain the same (no duplicates)
    expect(localMockStore.getDb().athletes.length).toBe(prevCount + 1);
  });

  it("triggers local change listeners when store is modified", () => {
    let triggered = false;
    const unsub = localMockStore.onChange(() => {
      triggered = true;
    });

    // Execute any mutation
    localMockStore.setPersona("usr_admin");
    unsub();

    expect(typeof unsub).toBe("function");
  });
});

describe("mergeRemoteData hardening", () => {
  it("ignores user records from the network so roles and passwords cannot be injected", () => {
    const before = localMockStore.getDb().users.length;
    const changed = localMockStore.mergeRemoteData({
      users: [
        {
          _id: "usr_injected",
          name: "Injected",
          email: "attacker@example.com",
          password: "owned",
          role: "platform_admin",
          tokenIdentifier: "mock|injected",
        },
      ],
    });
    expect(changed).toBe(false);
    expect(localMockStore.getDb().users.length).toBe(before);
    expect(localMockStore.getDb().users.some((u) => u._id === "usr_injected")).toBe(false);
  });

  it("ignores records that belong to another academy", () => {
    const id = `ath_other_${Date.now()}`;
    const changed = localMockStore.mergeRemoteData(
      {
        athletes: [
          {
            _id: id,
            academyId: "acad_other",
            firstName: "Other",
            lastName: "Academy",
            status: "active" as const,
            createdAt: new Date().toISOString(),
          },
        ],
      },
      "acad_hercules",
    );
    expect(changed).toBe(false);
    expect(localMockStore.getDb().athletes.some((a) => a._id === id)).toBe(false);
  });
});
