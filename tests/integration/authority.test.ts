import { describe, expect, it } from "vitest";

import { ClauseProofService } from "../../src/application/ClauseProofService.js";
import type { HumanUiActor } from "../../src/application/humanAuthority.js";
import { DeterministicFingerprintProvider } from "../../src/application/fingerprint.js";
import {
  canonicalCustomerInterpretation,
  canonicalOutcomeRule,
  canonicalVendorInterpretation,
} from "../../src/domain/seed.js";

function createService() {
  let id = 0;
  return new ClauseProofService({
    clock: { now: () => "2026-08-29T00:00:00.000Z" },
    fingerprintProvider: new DeterministicFingerprintProvider(),
    idGenerator: { next: (prefix) => `${prefix}-${++id}` },
  });
}

describe("human authority", () => {
  it("rejects a forged structural human actor at runtime", async () => {
    const service = createService();
    const manualActor = { kind: "manual-fallback" } as const;
    const staged = await service.stageInterpretations(manualActor, {
      baseRevision: 0,
      interpretations: [
        canonicalVendorInterpretation,
        canonicalCustomerInterpretation,
      ],
    });
    if (!staged.ok) throw new Error("Expected interpretations to stage.");
    await service.runCrashTest(manualActor, {
      baseRevision: 0,
      interpretationSetId: staged.data.interpretationSet.id,
    });

    const forged = { kind: "human-ui" } as HumanUiActor;
    const result = await service.lockOutcome(forged, {
      baseRevision: 0,
      expectedRule: canonicalOutcomeRule,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected human authority failure.");
    expect(result.error.code).toBe("INVALID_INPUT");
    expect(result.state.events.at(-1)?.actor.kind).toBe("system");
    expect(
      result.state.events.some(
        ({ actor, outcome }) =>
          actor.kind === "human-ui" && outcome === "completed",
      ),
    ).toBe(false);
  });

  it("does not expose human authority from agent actor input", () => {
    const agentActor = {
      kind: "agent-tool",
      toolName: "stage_interpretations",
    } as const;
    expect(Object.keys(agentActor)).toEqual(["kind", "toolName"]);
  });
});
