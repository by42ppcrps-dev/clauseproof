import { describe, expect, it } from "vitest";

import { DeterministicFingerprintProvider } from "../../src/application/fingerprint.js";
import type { ClauseProofDependencies } from "../../src/application/serviceTypes.js";
import { canonicalOutcomeRule } from "../../src/domain/seed.js";
import { createClauseProofStore } from "../../src/state/createStore.js";
import { createToolHandlers } from "../../src/webmcp/handlers.js";

function createHarness() {
  let id = 0;
  const dependencies: ClauseProofDependencies = {
    clock: { now: () => "2026-08-29T00:00:00.000Z" },
    fingerprintProvider: new DeterministicFingerprintProvider(),
    idGenerator: { next: (prefix) => `${prefix}-${++id}` },
  };
  const store = createClauseProofStore(dependencies);
  return { store, handlers: createToolHandlers(store) };
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
    const { handlers } = createHarness();
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
      proposedText:
        "Notwithstanding the exclusive-remedy provision, Customer may terminate without penalty after two uptime misses below 99.5% within six months, following written notice and a ten-day uncured period; accrued credits remain payable.",
      semanticRule: canonicalOutcomeRule,
      rationale:
        "The clarification preserves credits and states the occurrence, window, notice, cure, and termination boundaries.",
    });
    expect(proposal.ok).toBe(true);
    if (!proposal.ok) throw new Error("Expected proposal to stage.");
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
});
