import { DomainError, requirePhase } from "../domain/errors.js";
import type { VerificationRecord, WorkflowState } from "../domain/workflow.js";
import { canonicalize } from "./canonicalize.js";
import { createVerification } from "./serviceOperations.js";
import type {
  AcceptRedlineCommand,
  ClauseProofDependencies,
} from "./serviceTypes.js";

function hasExactProof(verification: VerificationRecord): boolean {
  return (
    verification.eligibleForAcceptance &&
    verification.outcomeSuite.passedCount === 6 &&
    verification.outcomeSuite.totalCount === 6 &&
    verification.boundaryStrength.killedCount === 8 &&
    verification.boundaryStrength.totalCount === 8
  );
}

export async function assertAcceptanceProof(
  state: WorkflowState,
  dependencies: ClauseProofDependencies,
  command: AcceptRedlineCommand,
): Promise<void> {
  requirePhase(state.phase, "verified", "Accepting a redline");
  const recomputed = await createVerification(state, dependencies, command);
  if (!hasExactProof(recomputed)) {
    throw new DomainError(
      "TESTS_FAILED",
      "The proposal does not currently pass the complete proof suite.",
      "Revise the proposal and run every contract test again.",
    );
  }
  if (
    !state.verification ||
    canonicalize(state.verification) !== canonicalize(recomputed)
  ) {
    throw new DomainError(
      "STALE_PROPOSAL",
      "The stored verification is not the current deterministic proof.",
      "Run every contract test again before accepting the proposal.",
    );
  }
}
