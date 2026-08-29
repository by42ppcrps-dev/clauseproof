import { describe, expect, it } from "vitest";

import { DomainError } from "../../src/domain/errors.js";
import {
  createInitialWorkflowState,
  stageInterpretationSet,
} from "../../src/domain/workflow.js";
import {
  canonicalCase,
  canonicalCustomerInterpretation,
  canonicalVendorInterpretation,
} from "../../src/domain/seed.js";

describe("workflow reducer", () => {
  it("starts from the exact canonical seed", () => {
    const state = createInitialWorkflowState(canonicalCase);
    expect(state.phase).toBe("ready");
    expect(state.case.contract).toEqual(canonicalCase.contract);
    expect(state.interpretationSet).toBeNull();
    expect(state.events).toEqual([]);
  });

  it("permits the ready to interpretations-staged transition", () => {
    const state = createInitialWorkflowState(canonicalCase);
    const next = stageInterpretationSet(state, {
      id: "set-1",
      baseRevision: 0,
      scenarioId: canonicalCase.scenario.id,
      interpretations: [
        canonicalVendorInterpretation,
        canonicalCustomerInterpretation,
      ],
      fingerprint: "fingerprint-1",
    });
    expect(next.phase).toBe("interpretations_staged");
    expect(next.interpretationSet?.id).toBe("set-1");
    expect(state.phase).toBe("ready");
  });

  it("rejects an illegal transition without mutating state", () => {
    const state = createInitialWorkflowState(canonicalCase);
    expect(() =>
      stageInterpretationSet(
        { ...state, phase: "divergence_visible" },
        {
          id: "set-1",
          baseRevision: 0,
          scenarioId: canonicalCase.scenario.id,
          interpretations: [
            canonicalVendorInterpretation,
            canonicalCustomerInterpretation,
          ],
          fingerprint: "fingerprint-1",
        },
      ),
    ).toThrow(DomainError);
    expect(state.phase).toBe("ready");
  });
});
