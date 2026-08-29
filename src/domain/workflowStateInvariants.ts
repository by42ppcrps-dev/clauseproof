import type { RefinementCtx } from "zod";

import { validateWorkflowProof } from "./workflowProofInvariants.js";
import type { PersistedWorkflowState } from "./workflowStateSchema.js";

const artifactKeys = [
  "interpretationSet",
  "crashTest",
  "outcomeLock",
  "proposal",
  "verification",
] as const;

const requiredArtifacts = {
  ready: [],
  interpretations_staged: ["interpretationSet"],
  divergence_visible: ["interpretationSet", "crashTest"],
  outcome_locked: ["interpretationSet", "crashTest", "outcomeLock"],
  redline_staged: ["interpretationSet", "crashTest", "outcomeLock", "proposal"],
  verified: artifactKeys,
  accepted: artifactKeys,
} as const;

function issue(context: RefinementCtx, path: PropertyKey[], message: string) {
  context.addIssue({ code: "custom", path, message });
}

function validateArtifactPresence(
  state: PersistedWorkflowState,
  context: RefinementCtx,
): void {
  const required = new Set<string>(requiredArtifacts[state.phase]);
  for (const key of artifactKeys) {
    const value = state[key];
    if (required.has(key) && value === null) {
      issue(context, [key], "Required artifact is missing.");
    }
    if (
      !required.has(key) &&
      state.phase !== "outcome_locked" &&
      value !== null
    ) {
      issue(context, [key], "Artifact is forbidden in this phase.");
    }
  }
  if (
    state.phase === "outcome_locked" &&
    state.verification &&
    (!state.proposal || state.verification.eligibleForAcceptance)
  ) {
    issue(
      context,
      ["verification"],
      "Only failed evidence may remain after verification.",
    );
  }
}

function validateBindings(
  state: PersistedWorkflowState,
  context: RefinementCtx,
): void {
  const { interpretationSet, crashTest, outcomeLock, proposal, verification } =
    state;
  const baseRevision =
    state.phase === "accepted"
      ? state.case.contract.revision - 1
      : state.case.contract.revision;
  if (
    interpretationSet &&
    (interpretationSet.baseRevision !== baseRevision ||
      interpretationSet.scenarioId !== state.case.scenario.id)
  ) {
    issue(context, ["interpretationSet"], "Interpretation set is stale.");
  }
  if (crashTest && crashTest.interpretationSetId !== interpretationSet?.id) {
    issue(context, ["crashTest"], "Crash test is detached.");
  }
  if (outcomeLock && outcomeLock.baseRevision !== baseRevision) {
    issue(context, ["outcomeLock"], "Outcome lock is stale.");
  }
  if (
    proposal &&
    (proposal.baseRevision !== baseRevision ||
      proposal.outcomeLockId !== outcomeLock?.id ||
      proposal.outcomeLockFingerprint !== outcomeLock?.fingerprint)
  ) {
    issue(context, ["proposal"], "Proposal is detached.");
  }
  if (
    verification &&
    (verification.proposalId !== proposal?.id ||
      verification.proposalFingerprint !== proposal?.fingerprint ||
      verification.outcomeLockFingerprint !== outcomeLock?.fingerprint ||
      verification.verifiedText !== proposal?.proposedText)
  ) {
    issue(context, ["verification"], "Verification is detached.");
  }
}

function validateVerification(
  state: PersistedWorkflowState,
  context: RefinementCtx,
): void {
  const { verification, outcomeLock } = state;
  if (!verification) return;
  const passed = verification.outcomeSuite.results.filter(
    ({ passed: resultPassed }) => resultPassed,
  ).length;
  const killed = verification.boundaryStrength.results.filter(
    ({ killed: resultKilled }) => resultKilled,
  ).length;
  if (
    verification.outcomeSuite.passedCount !== passed ||
    verification.boundaryStrength.killedCount !== killed ||
    verification.eligibleForAcceptance !== (passed === 6 && killed === 8)
  ) {
    issue(context, ["verification"], "Verification counts are inconsistent.");
  }
  verification.outcomeSuite.results.forEach((result, index) => {
    const calculatedPass =
      result.actual.terminationAvailable ===
        result.expected.terminationAvailable &&
      result.actual.serviceCreditsCents === result.expected.serviceCreditsCents;
    if (
      result.passed !== calculatedPass ||
      (result.failureReason === null) !== calculatedPass
    ) {
      issue(
        context,
        ["verification", "outcomeSuite", "results", index],
        "Test result status is inconsistent with its evidence.",
      );
    }
  });
  const lockedTestIds = new Set(outcomeLock?.tests.map(({ id }) => id) ?? []);
  verification.boundaryStrength.results.forEach((result, index) => {
    if (
      result.killed !== result.caughtByTestIds.length > 0 ||
      new Set(result.caughtByTestIds).size !== result.caughtByTestIds.length ||
      result.caughtByTestIds.some((id) => !lockedTestIds.has(id))
    ) {
      issue(
        context,
        ["verification", "boundaryStrength", "results", index],
        "Mutation result status is inconsistent with its evidence.",
      );
    }
  });
  if (
    outcomeLock &&
    verification.outcomeSuite.results.some((result, index) => {
      const lockedTest = outcomeLock.tests[index];
      return (
        result.testId !== lockedTest?.id ||
        JSON.stringify(result.expected) !== JSON.stringify(lockedTest.expected)
      );
    })
  ) {
    issue(
      context,
      ["verification", "outcomeSuite"],
      "Verification results do not match the locked tests.",
    );
  }
}

function validateAcceptance(
  state: PersistedWorkflowState,
  context: RefinementCtx,
): void {
  const accepted = state.phase === "accepted";
  const finalEvent = state.events.at(-1);
  if (
    accepted &&
    (finalEvent?.action !== "accept_redline" ||
      finalEvent.actor.kind !== "human-ui" ||
      finalEvent.outcome !== "completed")
  ) {
    issue(
      context,
      ["events"],
      "Accepted state requires a completed human acceptance event.",
    );
  }
  if (
    (accepted &&
      state.case.contract.acceptedRedlineId !== state.proposal?.id) ||
    (!accepted && state.case.contract.acceptedRedlineId !== null)
  ) {
    issue(
      context,
      ["case", "contract", "acceptedRedlineId"],
      "Accepted revision is inconsistent with the phase.",
    );
  }
  if (
    accepted &&
    state.proposal &&
    state.case.contract.clauses.find(
      ({ id }) => id === state.proposal?.targetClauseIds[0],
    )?.text !== state.proposal.proposedText
  ) {
    issue(
      context,
      ["case", "contract", "clauses"],
      "Accepted text does not match the verified proposal.",
    );
  }
}

export function validateWorkflowState(
  state: PersistedWorkflowState,
  context: RefinementCtx,
): void {
  validateArtifactPresence(state, context);
  validateBindings(state, context);
  validateVerification(state, context);
  validateAcceptance(state, context);
  validateWorkflowProof(state, context);
  state.events.forEach((event, index) => {
    if (event.sequence !== index + 1) {
      issue(
        context,
        ["events", index, "sequence"],
        "Audit sequence is not contiguous.",
      );
    }
  });
}
