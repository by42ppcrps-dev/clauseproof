import { describe, expect, it } from "vitest";

import { ClauseProofService } from "../../src/application/ClauseProofService.js";
import { createHumanUiActor } from "../../src/application/humanAuthority.js";
import { DeterministicFingerprintProvider } from "../../src/application/fingerprint.js";
import {
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

describe("ClauseProofService", () => {
  it("orchestrates the complete canonical journey with ordered provenance", async () => {
    const service = new ClauseProofService(dependencies());
    await reachDivergence(service);

    const locked = await service.lockOutcome(createHumanUiActor(), {
      baseRevision: 0,
      expectedRule: canonicalOutcomeRule,
    });
    expect(locked.ok).toBe(true);
    if (!locked.ok) throw new Error("Expected outcome to lock.");

    const proposed = await service.stageRedline(manualActor, {
      baseRevision: 0,
      outcomeLockId: locked.data.outcomeLock.id,
      targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
      proposedText:
        "Notwithstanding the exclusive-remedy provision, Customer may terminate without penalty after two Monthly Uptime Percentage results below 99.5% within six months, if written notice is given and the failures remain uncured for ten days; accrued service credits remain payable.",
      semanticRule: canonicalOutcomeRule,
      rationale:
        "This clarification preserves service credits while making the repeated-failure termination boundary explicit.",
    });
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
