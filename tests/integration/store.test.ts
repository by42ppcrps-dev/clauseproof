import { describe, expect, it } from "vitest";

import { DeterministicFingerprintProvider } from "../../src/application/fingerprint.js";
import type { ClauseProofDependencies } from "../../src/application/serviceTypes.js";
import {
  canonicalCustomerInterpretation,
  canonicalVendorInterpretation,
} from "../../src/domain/seed.js";
import { createClauseProofStore } from "../../src/state/createStore.js";
import {
  JsonStatePersistence,
  type StorageAdapter,
} from "../../src/state/persistence.js";

class MemoryStorage implements StorageAdapter {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function dependencies(): ClauseProofDependencies {
  let id = 0;
  return {
    clock: { now: () => "2026-08-29T00:00:00.000Z" },
    fingerprintProvider: new DeterministicFingerprintProvider(),
    idGenerator: { next: (prefix) => `${prefix}-${++id}` },
  };
}

describe("external store and persistence", () => {
  it("publishes and persists service state after a command", async () => {
    const storage = new MemoryStorage();
    const persistence = new JsonStatePersistence(storage);
    const store = createClauseProofStore(dependencies(), persistence);
    let notifications = 0;
    const unsubscribe = store.subscribe(() => {
      notifications += 1;
    });

    const result = await store.stageInterpretations(
      { kind: "manual-fallback" },
      {
        baseRevision: 0,
        interpretations: [
          canonicalVendorInterpretation,
          canonicalCustomerInterpretation,
        ],
      },
    );

    expect(result.ok).toBe(true);
    expect(notifications).toBe(1);
    expect(store.getSnapshot().phase).toBe("interpretations_staged");
    expect(persistence.load()?.phase).toBe("interpretations_staged");
    unsubscribe();
  });

  it("reloads a valid persisted snapshot", async () => {
    const storage = new MemoryStorage();
    const persistence = new JsonStatePersistence(storage);
    const first = createClauseProofStore(dependencies(), persistence);
    await first.stageInterpretations(
      { kind: "manual-fallback" },
      {
        baseRevision: 0,
        interpretations: [
          canonicalVendorInterpretation,
          canonicalCustomerInterpretation,
        ],
      },
    );

    const reloaded = createClauseProofStore(dependencies(), persistence);
    expect(reloaded.getSnapshot().phase).toBe("interpretations_staged");
    expect(reloaded.getSnapshot().interpretationSet).not.toBeNull();
  });

  it("clears corrupted or unsupported persisted data and starts fresh", () => {
    const storage = new MemoryStorage();
    storage.setItem("clauseproof-state", "{not-json");
    const persistence = new JsonStatePersistence(storage);
    const store = createClauseProofStore(dependencies(), persistence);
    expect(store.getSnapshot().phase).toBe("ready");
    expect(storage.getItem("clauseproof-state")).toBeNull();

    storage.setItem(
      "clauseproof-state",
      JSON.stringify({ version: 99, state: { phase: "accepted" } }),
    );
    expect(persistence.load()).toBeNull();
    expect(storage.getItem("clauseproof-state")).toBeNull();
  });
});
