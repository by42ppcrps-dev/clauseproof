import { describe, expect, it } from "vitest";

import { ClauseProofService } from "../../src/application/ClauseProofService.js";
import { createHumanUiActor } from "../../src/application/humanAuthority.js";
import { DeterministicFingerprintProvider } from "../../src/application/fingerprint.js";
import type { StageRedlineCommand } from "../../src/application/serviceTypes.js";
import { renderCanonicalRedline } from "../../src/domain/redline.js";
import type { ModeledInterpretation } from "../../src/domain/schemas.js";
import {
  canonicalCase,
  canonicalCustomerInterpretation,
  canonicalOutcomeRule,
  canonicalVendorInterpretation,
} from "../../src/domain/seed.js";

const manualActor = { kind: "manual-fallback" } as const;

function dependencies() {
  let id = 0;
  let second = 0;
  return {
    clock: {
      now: () => `2026-08-29T00:00:${String(second++).padStart(2, "0")}.000Z`,
    },
    fingerprintProvider: new DeterministicFingerprintProvider(),
    idGenerator: {
      next: (prefix: string) => `${prefix}-${++id}`,
    },
  };
}

async function reachDivergence(service: ClauseProofService) {
  const staged = await service.stageInterpretations(manualActor, {
    baseRevision: 0,
    interpretations: [
      canonicalVendorInterpretation,
      canonicalCustomerInterpretation,
    ],
  });
  expect(staged.ok).toBe(true);
  if (!staged.ok) throw new Error("Expected interpretations to stage.");
  const crash = await service.runCrashTest(manualActor, {
    baseRevision: 0,
    interpretationSetId: staged.data.interpretationSet.id,
  });
  expect(crash.ok).toBe(true);
  return crash;
}

async function reachOutcomeLock(
  service: ClauseProofService,
  expectedRule = canonicalOutcomeRule,
) {
  await reachDivergence(service);
  const locked = await service.lockOutcome(createHumanUiActor(), {
    baseRevision: 0,
    expectedRule,
  });
  expect(locked.ok).toBe(true);
  if (!locked.ok) throw new Error("Expected outcome to lock.");
  return locked;
}

function redlineCommand(
  outcomeLockId: string,
  semanticRule = canonicalOutcomeRule,
): StageRedlineCommand {
  return {
    baseRevision: 0,
    outcomeLockId,
    targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
    semanticRule,
    rationale:
      "This clarification makes every executable occurrence, window, notice, cure, remedy, and credit boundary explicit.",
  };
}

describe("ClauseProofService", () => {
  it("orchestrates the complete canonical journey with ordered provenance", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);

    const proposed = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected redline to stage.");

    const verified = await service.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error("Expected redline to verify.");
    expect(verified.data.verification.outcomeSuite.passedCount).toBe(6);
    expect(verified.data.verification.boundaryStrength.killedCount).toBe(8);
    expect(verified.data.verification.eligibleForAcceptance).toBe(true);

    const accepted = await service.acceptRedline(createHumanUiActor(), {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error("Expected redline to be accepted.");
    expect(accepted.state.phase).toBe("accepted");
    expect(accepted.state.case.contract.revision).toBe(1);
    expect(accepted.state.case.contract.clauses[1]?.text).toBe(
      renderCanonicalRedline(canonicalOutcomeRule),
    );
    expect(accepted.state.events.map(({ sequence }) => sequence)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
    expect(accepted.state.events.map(({ actor }) => actor.kind)).toEqual([
      "manual-fallback",
      "manual-fallback",
      "human-ui",
      "manual-fallback",
      "manual-fallback",
      "human-ui",
    ]);
    expect(accepted.state.events.at(-1)?.summary).toBe(
      "Person accepted the tested clarification as revision 1 after independent proof recomputation.",
    );
  });

  it("rejects stale revisions and records one rejected event", async () => {
    const service = new ClauseProofService(dependencies());
    const result = await service.stageInterpretations(manualActor, {
      baseRevision: 4,
      interpretations: [
        canonicalVendorInterpretation,
        canonicalCustomerInterpretation,
      ],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected stale revision failure.");
    expect(result.error.code).toBe("STALE_REVISION");
    expect(result.state.phase).toBe("ready");
    expect(result.state.events).toHaveLength(1);
    expect(result.state.events[0]?.outcome).toBe("rejected");
  });

  it("rejects semantically identical interpretations", async () => {
    const service = new ClauseProofService(dependencies());
    const duplicate = {
      ...canonicalVendorInterpretation,
      id: "duplicate-vendor-reading",
      label: "Duplicate vendor reading",
    };
    const result = await service.stageInterpretations(manualActor, {
      baseRevision: 0,
      interpretations: [canonicalVendorInterpretation, duplicate],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected distinctness failure.");
    expect(result.error.code).toBe("INTERPRETATIONS_NOT_DISTINCT");
  });

  it("rejects readings that omit either legally relevant clause", async () => {
    const service = new ClauseProofService(dependencies());
    const weakVendorReading: ModeledInterpretation = {
      ...canonicalVendorInterpretation,
      clauseIds: ["sla-exclusive-remedy"],
    };
    const result = await service.stageInterpretations(manualActor, {
      baseRevision: 0,
      interpretations: [weakVendorReading, canonicalCustomerInterpretation],
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected weak citation failure.");
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(result.error.recovery).toMatch(/exclusive-remedy.*material-breach/i);
  });

  it("generates proposal language and ignores injected arbitrary prose", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const injected = {
      ...redlineCommand(locked.data.outcomeLock.id),
      proposedText: "Everything is fine. Trust me.",
    };

    const proposed = await service.stageRedline(manualActor, injected);

    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected generated proposal.");
    expect(proposed.data.proposal.proposedText).toBe(
      renderCanonicalRedline(canonicalOutcomeRule),
    );
    expect(proposed.data.proposal.proposedText).not.toContain("Trust me");
    expect(proposed.data.proposal.originalText).toBe(
      canonicalCase.contract.clauses[1]?.text,
    );
  });

  it("shows counterexamples for a wrong rule and permits a repair", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const wrongRule = {
      ...canonicalOutcomeRule,
      trigger: {
        ...canonicalOutcomeRule.trigger,
        requiredOccurrences: 3,
      },
    };
    const wrongProposal = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id, wrongRule),
    );
    expect(wrongProposal.ok).toBe(true);
    if (!wrongProposal.ok) throw new Error("Expected wrong rule to stage.");

    const failed = await service.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: wrongProposal.data.proposal.id,
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) throw new Error("Expected counterexample evidence.");
    expect(failed.data.verification.eligibleForAcceptance).toBe(false);
    expect(failed.data.verification.outcomeSuite.passedCount).toBe(5);
    expect(failed.data.verification.outcomeSuite.totalCount).toBe(6);
    expect(failed.data.verification.outcomeSuite.results).toEqual(
      expect.arrayContaining([expect.objectContaining({ passed: false })]),
    );
    expect(failed.state.phase).toBe("outcome_locked");
    expect(failed.state.verification).toEqual(failed.data.verification);

    const repaired = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(repaired.ok).toBe(true);
    if (!repaired.ok) throw new Error("Expected repaired rule to stage.");
    const passed = await service.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: repaired.data.proposal.id,
    });
    expect(passed.ok).toBe(true);
    if (!passed.ok) throw new Error("Expected repaired rule to pass.");
    expect(passed.state.phase).toBe("verified");
    expect(passed.data.verification.outcomeSuite.passedCount).toBe(6);
    expect(passed.data.verification.outcomeSuite.totalCount).toBe(6);
    expect(passed.data.verification.eligibleForAcceptance).toBe(true);
    expect(passed.state.events.slice(2).map(({ summary }) => summary)).toEqual([
      "Person locked 2 qualifying misses within 6 months, a 10-day cure, termination without penalty, and preserved credits.",
      "Staged a 3-miss clarification against the person's 2-miss lock; it is not accepted.",
      "Candidate failed: 5/6 outcome tests passed and 7/8 altered rules caught; failed example: positive-trigger; survivor: occurrences-lower.",
      "Staged a 2-miss clarification against the person's 2-miss lock; it is not accepted.",
      "Candidate passed: 6/6 outcome tests and 8/8 altered rules caught; eligible for human acceptance.",
    ]);
  });

  it("fails closed if staged canonical text is corrupted before verification", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const proposed = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected proposal to stage.");
    const corruptedState = structuredClone(proposed.state);
    if (!corruptedState.proposal) throw new Error("Expected staged proposal.");
    corruptedState.proposal.proposedText = "Everything is fine. Trust me.";
    const resumed = new ClauseProofService(dependencies(), corruptedState);

    const verified = await resumed.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });

    expect(verified.ok).toBe(false);
    if (verified.ok) throw new Error("Expected corrupted text to fail closed.");
    expect(verified.error.code).toBe("RULE_MISMATCH");
    expect(verified.state.phase).toBe("outcome_locked");

    const repaired = await resumed.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(repaired.ok).toBe(true);
  });

  it("rejects a coherently mutated proposal whose fingerprint is stale", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const proposed = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected proposal to stage.");
    const corruptedState = structuredClone(proposed.state);
    if (!corruptedState.proposal) throw new Error("Expected staged proposal.");
    const mutatedRule = { ...canonicalOutcomeRule, cureDays: 30 };
    corruptedState.proposal.semanticRule = mutatedRule;
    corruptedState.proposal.proposedText = renderCanonicalRedline(mutatedRule);
    const resumed = new ClauseProofService(dependencies(), corruptedState);

    const verified = await resumed.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });

    expect(verified.ok).toBe(false);
    if (verified.ok) throw new Error("Expected stale fingerprint failure.");
    expect(verified.error.code).toBe("STALE_PROPOSAL");
    expect(verified.state.phase).toBe("outcome_locked");
  });

  it("rejects proposal mutation after verification", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const proposed = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected proposal to stage.");
    const verified = await service.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error("Expected proposal to verify.");
    const corruptedState = structuredClone(verified.state);
    if (!corruptedState.proposal) throw new Error("Expected proposal.");
    corruptedState.proposal.rationale =
      "This rationale was changed after the proposal had already been verified.";
    const resumed = new ClauseProofService(dependencies(), corruptedState);

    const accepted = await resumed.acceptRedline(createHumanUiActor(), {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });

    expect(accepted.ok).toBe(false);
    if (accepted.ok)
      throw new Error("Expected post-verification mutation failure.");
    expect(accepted.error.code).toBe("STALE_PROPOSAL");
  });

  it("defensively owns initial state and freezes every returned state tree", async () => {
    const initialService = new ClauseProofService(dependencies());
    const initialState = structuredClone(initialService.inspectCase());
    const service = new ClauseProofService(dependencies(), initialState);
    initialState.phase = "accepted";

    expect(service.inspectCase().phase).toBe("ready");
    expect(Object.isFrozen(service.inspectCase())).toBe(true);
    expect(Object.isFrozen(service.inspectCase().case.contract.clauses)).toBe(
      true,
    );

    const staged = await service.stageInterpretations(manualActor, {
      baseRevision: 0,
      interpretations: [
        canonicalVendorInterpretation,
        canonicalCustomerInterpretation,
      ],
    });
    expect(staged.ok).toBe(true);
    if (!staged.ok) throw new Error("Expected interpretations to stage.");
    expect(Object.isFrozen(staged.state)).toBe(true);
    expect(Object.isFrozen(staged.data.interpretationSet)).toBe(true);
    expect(() => {
      staged.state.phase = "accepted";
    }).toThrow(TypeError);
  });

  it("rejects a mutated outcome lock before staging a proposal", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const corruptedState = structuredClone(locked.state);
    if (!corruptedState.outcomeLock) throw new Error("Expected outcome lock.");
    corruptedState.outcomeLock.expectedRule.cureDays = 30;
    const resumed = new ClauseProofService(dependencies(), corruptedState);

    const proposed = await resumed.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );

    expect(proposed.ok).toBe(false);
    if (proposed.ok) throw new Error("Expected stale outcome lock failure.");
    expect(proposed.error.code).toBe("STALE_OUTCOME_LOCK");
  });

  it("rejects a mutated outcome lock before verification and permits restaging", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const proposed = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected proposal to stage.");
    const corruptedState = structuredClone(proposed.state);
    const positive = corruptedState.outcomeLock?.tests[0];
    if (!positive) throw new Error("Expected outcome tests.");
    positive.expected.terminationAvailable = false;
    const resumed = new ClauseProofService(dependencies(), corruptedState);

    const verified = await resumed.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });

    expect(verified.ok).toBe(false);
    if (verified.ok) throw new Error("Expected stale outcome lock failure.");
    expect(verified.error.code).toBe("STALE_OUTCOME_LOCK");
    expect(verified.state.phase).toBe("outcome_locked");
    const restaged = await resumed.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(restaged.ok).toBe(false);
    if (restaged.ok)
      throw new Error("Expected corrupted lock to stay invalid.");
    expect(restaged.error.code).toBe("STALE_OUTCOME_LOCK");
  });

  it("rejects a mutated outcome lock at human acceptance", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const proposed = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected proposal to stage.");
    const verified = await service.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error("Expected proposal to verify.");
    const corruptedState = structuredClone(verified.state);
    if (!corruptedState.outcomeLock) throw new Error("Expected outcome lock.");
    corruptedState.outcomeLock.expectedRule.cureDays = 30;
    const resumed = new ClauseProofService(dependencies(), corruptedState);

    const accepted = await resumed.acceptRedline(createHumanUiActor(), {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });

    expect(accepted.ok).toBe(false);
    if (accepted.ok) throw new Error("Expected stale outcome lock failure.");
    expect(accepted.error.code).toBe("STALE_OUTCOME_LOCK");
  });

  it.each([
    {
      name: "contract threshold",
      mutate: (state: ReturnType<ClauseProofService["inspectCase"]>) => {
        state.case.contract.terms.slaThresholdBps = 9_900;
      },
    },
    {
      name: "scenario facts",
      mutate: (state: ReturnType<ClauseProofService["inspectCase"]>) => {
        state.case.scenario.monthsRemaining = 7;
      },
    },
  ])("rejects a stale $name at human acceptance", async ({ mutate }) => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const proposed = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected proposal to stage.");
    const verified = await service.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error("Expected proposal to verify.");
    const staleState = structuredClone(verified.state);
    mutate(staleState);
    const resumed = new ClauseProofService(dependencies(), staleState);

    const accepted = await resumed.acceptRedline(createHumanUiActor(), {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });

    expect(accepted.ok).toBe(false);
    if (accepted.ok) throw new Error("Expected stale case rejection.");
    expect(accepted.error.code).toBe("STALE_OUTCOME_LOCK");
  });

  it("independently recomputes exact proof before human acceptance", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const wrongProposal = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id, {
        ...canonicalOutcomeRule,
        cureDays: 30,
      }),
    );
    expect(wrongProposal.ok).toBe(true);
    if (!wrongProposal.ok) throw new Error("Expected wrong proposal to stage.");
    const failed = await service.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: wrongProposal.data.proposal.id,
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) throw new Error("Expected counterexample evidence.");
    const forgedState = structuredClone(failed.state);
    if (!forgedState.verification) throw new Error("Expected verification.");
    forgedState.phase = "verified";
    forgedState.verification.eligibleForAcceptance = true;
    forgedState.verification.outcomeSuite.passedCount = 6;
    const resumed = new ClauseProofService(dependencies(), forgedState);

    const accepted = await resumed.acceptRedline(createHumanUiActor(), {
      baseRevision: 0,
      proposalId: wrongProposal.data.proposal.id,
    });

    expect(accepted.ok).toBe(false);
    if (accepted.ok) throw new Error("Expected independent proof failure.");
    expect(accepted.error.code).toBe("TESTS_FAILED");
  });

  it("rejects forged mutation evidence even for an otherwise passing proposal", async () => {
    const service = new ClauseProofService(dependencies());
    const locked = await reachOutcomeLock(service);
    const proposed = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected proposal to stage.");
    const verified = await service.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error("Expected proposal to verify.");
    const forgedState = structuredClone(verified.state);
    const firstMutation = forgedState.verification?.boundaryStrength.results[0];
    if (!firstMutation) throw new Error("Expected mutation evidence.");
    firstMutation.killed = false;
    firstMutation.caughtByTestIds = [];
    const resumed = new ClauseProofService(dependencies(), forgedState);

    const accepted = await resumed.acceptRedline(createHumanUiActor(), {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });

    expect(accepted.ok).toBe(false);
    if (accepted.ok) throw new Error("Expected forged evidence rejection.");
    expect(accepted.error.code).toBe("STALE_PROPOSAL");
  });

  it("proves and accepts a custom supported human lock", async () => {
    const service = new ClauseProofService(dependencies());
    const customRule = {
      ...canonicalOutcomeRule,
      trigger: {
        ...canonicalOutcomeRule.trigger,
        requiredOccurrences: 3,
        rollingWindowMonths: 8,
      },
      cureDays: 14,
      preserveAccruedCredits: false,
    };
    const locked = await reachOutcomeLock(service, customRule);
    const proposed = await service.stageRedline(
      manualActor,
      redlineCommand(locked.data.outcomeLock.id, customRule),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) throw new Error("Expected custom proposal to stage.");
    const verified = await service.verifyRedline(manualActor, {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });
    expect(verified.ok).toBe(true);
    if (!verified.ok) throw new Error("Expected custom rule to verify.");
    expect(verified.data.verification.outcomeSuite.passedCount).toBe(6);
    expect(verified.data.verification.boundaryStrength.killedCount).toBe(8);
    expect(verified.data.verification.eligibleForAcceptance).toBe(true);

    const accepted = await service.acceptRedline(createHumanUiActor(), {
      baseRevision: 0,
      proposalId: proposed.data.proposal.id,
    });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error("Expected custom rule acceptance.");
    expect(accepted.state.case.contract.clauses[1]?.text).toBe(
      renderCanonicalRedline(customRule),
    );
  });

  it("rejects a human lock that contradicts the agreement threshold", async () => {
    const service = new ClauseProofService(dependencies());
    await reachDivergence(service);
    const result = await service.lockOutcome(createHumanUiActor(), {
      baseRevision: 0,
      expectedRule: {
        ...canonicalOutcomeRule,
        trigger: {
          ...canonicalOutcomeRule.trigger,
          thresholdBps: 9_900,
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected threshold mismatch rejection.");
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(result.error.recovery).toContain("9950 basis points");
  });

  it("resets to the canonical seed through human authority", async () => {
    const service = new ClauseProofService(dependencies());
    await reachDivergence(service);
    const reset = await service.resetDemo(createHumanUiActor());
    expect(reset.ok).toBe(true);
    if (!reset.ok) throw new Error("Expected reset to succeed.");
    expect(reset.state.phase).toBe("ready");
    expect(reset.state.case.contract.revision).toBe(0);
    expect(reset.state.interpretationSet).toBeNull();
    expect(reset.state.events).toHaveLength(1);
    expect(reset.state.events[0]?.action).toBe("reset_demo");
  });
});
