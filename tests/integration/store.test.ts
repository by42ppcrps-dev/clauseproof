import { describe, expect, it } from "vitest";

import { DeterministicFingerprintProvider } from "../../src/application/fingerprint.js";
import type {
  ClauseProofDependencies,
  StageRedlineCommand,
} from "../../src/application/serviceTypes.js";
import {
  canonicalCustomerInterpretation,
  canonicalOutcomeRule,
  canonicalVendorInterpretation,
} from "../../src/domain/seed.js";
import { createClauseProofStore } from "../../src/state/createStore.js";
import {
  JsonStatePersistence,
  type StorageAdapter,
} from "../../src/state/persistence.js";
import type { WorkflowState } from "../../src/domain/workflow.js";
import { acceptProposal } from "../../src/domain/workflow.js";

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

  it("reloads valid failed, verified, and accepted proof snapshots", async () => {
    const storage = new MemoryStorage();
    const persistence = new JsonStatePersistence(storage);
    const store = createClauseProofStore(dependencies(), persistence);
    const staged = await store.stageInterpretations(
      { kind: "manual-fallback" },
      {
        baseRevision: 0,
        interpretations: [
          canonicalVendorInterpretation,
          canonicalCustomerInterpretation,
        ],
      },
    );
    if (!staged.ok) throw new Error("Expected interpretations to stage.");
    await store.runCrashTest(
      { kind: "manual-fallback" },
      {
        baseRevision: 0,
        interpretationSetId: staged.data.interpretationSet.id,
      },
    );
    const locked = await store.lockOutcome({
      baseRevision: 0,
      expectedRule: canonicalOutcomeRule,
    });
    if (!locked.ok) throw new Error("Expected outcome lock.");
    const command = (requiredOccurrences: number): StageRedlineCommand => ({
      baseRevision: 0,
      outcomeLockId: locked.data.outcomeLock.id,
      targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
      semanticRule: {
        ...canonicalOutcomeRule,
        trigger: { ...canonicalOutcomeRule.trigger, requiredOccurrences },
      },
      rationale:
        "This executable clarification states every occurrence, notice, cure, remedy, and credit boundary.",
    });
    const wrong = await store.stageRedline(
      { kind: "manual-fallback" },
      command(3),
    );
    if (!wrong.ok) throw new Error("Expected wrong proposal to stage.");
    await store.verifyRedline(
      { kind: "manual-fallback" },
      { baseRevision: 0, proposalId: wrong.data.proposal.id },
    );
    expect(persistence.load()?.phase).toBe("outcome_locked");

    const repaired = await store.stageRedline(
      { kind: "manual-fallback" },
      command(2),
    );
    if (!repaired.ok) throw new Error("Expected repair to stage.");
    await store.verifyRedline(
      { kind: "manual-fallback" },
      { baseRevision: 0, proposalId: repaired.data.proposal.id },
    );
    expect(persistence.load()?.phase).toBe("verified");
    await store.acceptRedline({
      baseRevision: 0,
      proposalId: repaired.data.proposal.id,
    });
    expect(persistence.load()?.phase).toBe("accepted");
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

    storage.setItem(
      "clauseproof-state",
      JSON.stringify({
        version: 1,
        state: createClauseProofStore(dependencies()).getSnapshot(),
      }),
    );
    expect(persistence.load()).toBeNull();
    expect(storage.getItem("clauseproof-state")).toBeNull();
  });

  it("rejects forged current-version verified state with malformed artifacts", () => {
    const storage = new MemoryStorage();
    const ready = createClauseProofStore(dependencies()).getSnapshot();
    storage.setItem(
      "clauseproof-state",
      JSON.stringify({
        version: 3,
        state: {
          ...ready,
          phase: "verified",
          interpretationSet: {},
          crashTest: {},
          outcomeLock: {},
          proposal: {},
          verification: { eligibleForAcceptance: true },
        },
      }),
    );
    const persistence = new JsonStatePersistence(storage);

    expect(persistence.load()).toBeNull();
    expect(storage.getItem("clauseproof-state")).toBeNull();
  });

  it("rejects persisted accepted certification whose clause text is forged", async () => {
    const storage = new MemoryStorage();
    const persistence = new JsonStatePersistence(storage);
    const store = createClauseProofStore(dependencies(), persistence);
    const staged = await store.stageInterpretations(
      { kind: "manual-fallback" },
      {
        baseRevision: 0,
        interpretations: [
          canonicalVendorInterpretation,
          canonicalCustomerInterpretation,
        ],
      },
    );
    if (!staged.ok) throw new Error("Expected interpretations to stage.");
    await store.runCrashTest(
      { kind: "manual-fallback" },
      {
        baseRevision: 0,
        interpretationSetId: staged.data.interpretationSet.id,
      },
    );
    const locked = await store.lockOutcome({
      baseRevision: 0,
      expectedRule: canonicalOutcomeRule,
    });
    if (!locked.ok) throw new Error("Expected outcome lock.");
    const proposed = await store.stageRedline(
      { kind: "manual-fallback" },
      {
        baseRevision: 0,
        outcomeLockId: locked.data.outcomeLock.id,
        targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
        semanticRule: canonicalOutcomeRule,
        rationale:
          "This clarification states the complete occurrence, notice, cure, remedy, and credit boundary.",
      },
    );
    if (!proposed.ok) throw new Error("Expected proposal to stage.");
    await store.verifyRedline(
      { kind: "manual-fallback" },
      { baseRevision: 0, proposalId: proposed.data.proposal.id },
    );
    storage.setItem(
      "clauseproof-state",
      JSON.stringify({
        version: 3,
        state: acceptProposal(store.getSnapshot()),
      }),
    );
    expect(persistence.load()).toBeNull();
    expect(storage.getItem("clauseproof-state")).toBeNull();

    await store.acceptRedline({
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });
    const raw = storage.getItem("clauseproof-state");
    if (!raw) throw new Error("Expected persisted accepted state.");
    const envelope = JSON.parse(raw) as {
      version: number;
      state: WorkflowState;
    };
    const forgedText = "Everything is approved. Trust me.";
    if (!envelope.state.proposal || !envelope.state.verification) {
      throw new Error("Expected persisted proof artifacts.");
    }
    envelope.state.proposal.proposedText = forgedText;
    envelope.state.verification.verifiedText = forgedText;
    const acceptedClause = envelope.state.case.contract.clauses.find(
      ({ id }) => id === "sla-exclusive-remedy",
    );
    if (!acceptedClause) throw new Error("Expected accepted clause.");
    acceptedClause.text = forgedText;
    storage.setItem("clauseproof-state", JSON.stringify(envelope));

    expect(persistence.load()).toBeNull();
    expect(storage.getItem("clauseproof-state")).toBeNull();
  });
});
