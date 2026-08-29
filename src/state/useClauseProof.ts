import { useState, useSyncExternalStore } from "react";

import type { ClarificationRule } from "../domain/schemas.js";
import {
  canonicalCustomerInterpretation,
  canonicalVendorInterpretation,
} from "../domain/seed.js";
import { clauseProofStore } from "./runtimeStore.js";

const manualActor = { kind: "manual-fallback" } as const;

const sampleRedline = {
  targetClauseIds: ["sla-exclusive-remedy", "material-breach"] as const,
  proposedText:
    "Notwithstanding the exclusive-remedy provision, Customer may terminate without penalty after two Monthly Uptime Percentage results below 99.5% within a rolling six-month period, if Customer gives written notice and the failures remain uncured for ten days after notice. Accrued service credits remain payable following termination.",
  rationale:
    "This clarification preserves service credits while making the repeated-failure, rolling-window, notice, and cure boundaries explicit.",
};

export function useClauseProof() {
  const state = useSyncExternalStore(
    clauseProofStore.subscribe,
    clauseProofStore.getSnapshot,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(
    operation: () => Promise<{ ok: boolean; error?: { message: string } }>,
  ) {
    setBusy(true);
    setError(null);
    const result = await operation();
    if (!result.ok && result.error) setError(result.error.message);
    setBusy(false);
  }

  async function runCrashTest() {
    const interpretationSet = state.interpretationSet;
    if (!interpretationSet) return;
    await run(() =>
      clauseProofStore.runCrashTest(manualActor, {
        baseRevision: state.case.contract.revision,
        interpretationSetId: interpretationSet.id,
      }),
    );
  }

  async function stageSampleRedline() {
    const outcomeLock = state.outcomeLock;
    if (!outcomeLock) return;
    await run(() =>
      clauseProofStore.stageRedline(manualActor, {
        baseRevision: state.case.contract.revision,
        outcomeLockId: outcomeLock.id,
        targetClauseIds: [...sampleRedline.targetClauseIds],
        proposedText: sampleRedline.proposedText,
        semanticRule: outcomeLock.expectedRule,
        rationale: sampleRedline.rationale,
      }),
    );
  }

  async function verifyRedline() {
    const proposal = state.proposal;
    if (!proposal) return;
    await run(() =>
      clauseProofStore.verifyRedline(manualActor, {
        baseRevision: state.case.contract.revision,
        proposalId: proposal.id,
      }),
    );
  }

  async function acceptRedline() {
    const proposal = state.proposal;
    if (!proposal) return;
    await run(() =>
      clauseProofStore.acceptRedline({
        baseRevision: state.case.contract.revision,
        proposalId: proposal.id,
      }),
    );
  }

  return {
    state,
    busy,
    error,
    stageSampleInterpretations: () =>
      run(() =>
        clauseProofStore.stageInterpretations(manualActor, {
          baseRevision: state.case.contract.revision,
          interpretations: [
            canonicalVendorInterpretation,
            canonicalCustomerInterpretation,
          ],
        }),
      ),
    runCrashTest,
    lockOutcome: (expectedRule: ClarificationRule) =>
      run(() =>
        clauseProofStore.lockOutcome({
          baseRevision: state.case.contract.revision,
          expectedRule,
        }),
      ),
    stageSampleRedline,
    verifyRedline,
    acceptRedline,
    reset: () => run(() => clauseProofStore.reset()),
  };
}
