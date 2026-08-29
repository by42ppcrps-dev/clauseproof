import { describe, expect, it } from "vitest";

import { DeterministicFingerprintProvider } from "../../src/application/fingerprint.js";
import type { ClauseProofDependencies } from "../../src/application/serviceTypes.js";
import { canonicalOutcomeRule } from "../../src/domain/seed.js";
import { createClauseProofStore } from "../../src/state/createStore.js";
import { createAgentClauseProofPort } from "../../src/state/agentPort.js";
import { createToolHandlers } from "../../src/webmcp/handlers.js";

function createHarness() {
  let id = 0;
  const dependencies: ClauseProofDependencies = {
    clock: { now: () => "2026-08-29T00:00:00.000Z" },
    fingerprintProvider: new DeterministicFingerprintProvider(),
    idGenerator: { next: (prefix) => `${prefix}-${++id}` },
  };
  const store = createClauseProofStore(dependencies);
  const agentPort = createAgentClauseProofPort(store);
  return { agentPort, store, handlers: createToolHandlers(agentPort) };
}

const stagedInput = {
  baseRevision: 0,
  interpretations: [
    {
      label: "Vendor-favorable reading",
      clauseIds: ["sla-commitment", "sla-exclusive-remedy", "material-breach"],
      semantics: {
        exclusiveRemedyScope: "all_sla_related_remedies",
        repeatedSlaFailureMayBeMaterialBreach: false,
        creditsSurviveTermination: true,
      },
      rationale:
        "The exclusive remedy is modeled as blocking every SLA-related remedy, including termination.",
    },
    {
      label: "Customer-favorable reading",
      clauseIds: ["sla-commitment", "sla-exclusive-remedy", "material-breach"],
      semantics: {
        exclusiveRemedyScope: "sla_compensation_only",
        repeatedSlaFailureMayBeMaterialBreach: true,
        creditsSurviveTermination: true,
      },
      rationale:
        "The remedy is modeled as limiting compensation while preserving a separate material-breach path.",
    },
  ],
} as const;

describe("WebMCP handlers", () => {
  it("exposes exactly five non-human operations", () => {
    const { agentPort, handlers } = createHarness();
    expect(Object.keys(agentPort).sort()).toEqual([
      "getSnapshot",
      "runCrashTest",
      "stageInterpretations",
      "stageRedline",
      "subscribe",
      "verifyRedline",
    ]);
    expect("lockOutcome" in agentPort).toBe(false);
    expect("acceptRedline" in agentPort).toBe(false);
    expect("reset" in agentPort).toBe(false);
    expect(Object.keys(handlers).sort()).toEqual([
      "inspect_contract_case",
      "propose_clarifying_redline",
      "run_contract_crash_test",
      "stage_interpretations",
      "verify_contract_tests",
    ]);
    expect(JSON.stringify(Object.keys(handlers))).not.toMatch(
      /lock|accept|approve|human/i,
    );
  });

  it("stages and executes two readings through the shared store", async () => {
    const { store, handlers } = createHarness();
    const staged = await handlers.stage_interpretations(stagedInput);
    expect(staged.ok).toBe(true);
    if (!staged.ok) throw new Error("Expected staging to succeed.");
    const crashed = await handlers.run_contract_crash_test({
      baseRevision: 0,
      interpretationSetId: staged.data.interpretationSetId,
    });
    expect(crashed).toMatchObject({
      ok: true,
      data: {
        branches: [
          { futureFeesCents: 8_000_000, terminationAvailable: false },
          { futureFeesCents: 0, terminationAvailable: true },
        ],
        totalFinancialDivergenceCents: 8_000_000,
      },
    });
    expect(store.getSnapshot().phase).toBe("divergence_visible");
    expect(JSON.stringify(crashed).length).toBeLessThan(1_200);
  });

  it("normalizes malformed input with one recovery action", async () => {
    const { handlers } = createHarness();
    const result = await handlers.inspect_contract_case({
      view: "overview",
      actor: "human-ui",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected invalid input.");
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(result.error.recovery.action).toBe("retry_with_valid_input");
  });

  it("stages and verifies a rule only after a human-owned lock", async () => {
    const { store, handlers } = createHarness();
    const staged = await handlers.stage_interpretations(stagedInput);
    if (!staged.ok) throw new Error("Expected staging to succeed.");
    await handlers.run_contract_crash_test({
      baseRevision: 0,
      interpretationSetId: staged.data.interpretationSetId,
    });
    const locked = await store.lockOutcome({
      baseRevision: 0,
      expectedRule: canonicalOutcomeRule,
    });
    if (!locked.ok) throw new Error("Expected human outcome lock.");
    const proposal = await handlers.propose_clarifying_redline({
      baseRevision: 0,
      outcomeLockId: locked.data.outcomeLock.id,
      targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
      semanticRule: canonicalOutcomeRule,
      rationale:
        "The clarification preserves credits and states the occurrence, window, notice, cure, and termination boundaries.",
    });
    expect(proposal.ok).toBe(true);
    if (!proposal.ok) throw new Error("Expected proposal to stage.");
    const stagedProposal = store.getSnapshot().proposal;
    if (!stagedProposal) throw new Error("Expected staged proposal state.");
    expect(proposal.data).toMatchObject({
      semanticRuleSummary: {
        metric: "monthly_uptime_percentage",
        comparator: "below",
        thresholdBps: 9_950,
        requiredOccurrences: 2,
        rollingWindowMonths: 6,
        cureDays: 10,
        effect: "customer_may_terminate_without_penalty",
        preserveAccruedCredits: true,
      },
      stagedOnly: true,
    });
    expect(proposal.data.originalText).toBe(stagedProposal.originalText);
    expect(proposal.data.proposedText).toBe(stagedProposal.proposedText);
    expect(JSON.stringify(proposal).length).toBeLessThan(1_200);
    const verification = await handlers.verify_contract_tests({
      baseRevision: 0,
      proposalId: proposal.data.proposalId,
    });
    expect(verification).toMatchObject({
      ok: true,
      data: {
        outcomeTestsPassed: 6,
        boundaryRulesCaught: 8,
        eligibleForHumanAcceptance: true,
      },
    });
    expect(store.getSnapshot().phase).toBe("verified");
  });

  it("surfaces the locked rule and exact failures so an agent can repair without guessing", async () => {
    const { store, handlers } = createHarness();
    const staged = await handlers.stage_interpretations(stagedInput);
    if (!staged.ok) throw new Error("Expected staging to succeed.");
    await handlers.run_contract_crash_test({
      baseRevision: 0,
      interpretationSetId: staged.data.interpretationSetId,
    });
    const locked = await store.lockOutcome({
      baseRevision: 0,
      expectedRule: canonicalOutcomeRule,
    });
    if (!locked.ok) throw new Error("Expected human outcome lock.");

    const inspected = await handlers.inspect_contract_case({
      view: "workflow",
    });
    expect(inspected).toMatchObject({
      ok: true,
      data: {
        phase: "outcome_locked",
        revision: 0,
        outcomeLockId: locked.data.outcomeLock.id,
        lockedExpectedRule: canonicalOutcomeRule,
      },
    });

    const wrongRule = {
      ...canonicalOutcomeRule,
      trigger: {
        ...canonicalOutcomeRule.trigger,
        requiredOccurrences: 3,
      },
    };
    const wrongProposal = await handlers.propose_clarifying_redline({
      baseRevision: 0,
      outcomeLockId: locked.data.outcomeLock.id,
      targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
      semanticRule: wrongRule,
      rationale:
        "This deliberately requires three occurrences so the executable tests can expose the mismatch.",
    });
    expect(wrongProposal.ok).toBe(true);
    if (!wrongProposal.ok) throw new Error("Expected wrong rule to stage.");

    const failed = await handlers.verify_contract_tests({
      baseRevision: 0,
      proposalId: wrongProposal.data.proposalId,
    });
    expect(failed).toMatchObject({
      ok: true,
      data: {
        eligibleForHumanAcceptance: false,
        failedTestCounterexamples: [
          "positive-trigger|Expected termination available.|actual:termination=false,creditsCents=200000",
        ],
        boundarySurvivors: ["occurrences-lower"],
      },
      next: {
        action: "propose_clarifying_redline",
      },
    });
    if (!failed.ok) throw new Error("Expected verification evidence.");
    expect(failed.data.boundarySurvivors).toEqual(expect.any(Array));
    expect(failed.next?.reason).toMatch(/revise/i);
    expect(JSON.stringify(failed).length).toBeLessThan(1_200);
    expect(store.getSnapshot().phase).toBe("outcome_locked");

    const worstProposal = await handlers.propose_clarifying_redline({
      baseRevision: 0,
      outcomeLockId: locked.data.outcomeLock.id,
      targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
      semanticRule: {
        ...canonicalOutcomeRule,
        trigger: {
          ...canonicalOutcomeRule.trigger,
          thresholdBps: 10_000,
          rollingWindowMonths: 18,
        },
        cureDays: 1,
        preserveAccruedCredits: false,
      },
      rationale:
        "This intentionally violates several locked boundaries to exercise the maximum failure evidence surface.",
    });
    if (!worstProposal.ok) throw new Error("Expected worst rule to stage.");
    const worstFailure = await handlers.verify_contract_tests({
      baseRevision: 0,
      proposalId: worstProposal.data.proposalId,
    });
    expect(worstFailure).toMatchObject({
      ok: true,
      data: { eligibleForHumanAcceptance: false },
    });
    if (!worstFailure.ok) throw new Error("Expected verification evidence.");
    expect(worstFailure.data.failedTestCounterexamples).toHaveLength(5);
    expect(JSON.stringify(worstFailure).length).toBeLessThan(1_200);

    const repaired = await handlers.propose_clarifying_redline({
      baseRevision: 0,
      outcomeLockId: locked.data.outcomeLock.id,
      targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
      semanticRule: canonicalOutcomeRule,
      rationale:
        "The revised rule now uses the human-locked ten-day cure period exposed by workflow inspection.",
    });
    expect(repaired.ok).toBe(true);
  });
});
