import type { RefinementCtx } from "zod";

import {
  generateRuleMutants,
  measureBoundaryStrength,
} from "./boundaryStrength.js";
import { generateOutcomeTests, runOutcomeSuite } from "./outcomeTests.js";
import { parseCanonicalRedline, renderCanonicalRedline } from "./redline.js";
import type { ClarificationRule } from "./schemas.js";
import { canonicalCase } from "./seed.js";
import type { PersistedWorkflowState } from "./workflowStateSchema.js";

function issue(context: RefinementCtx, path: PropertyKey[], message: string) {
  context.addIssue({ code: "custom", path, message });
}

function sameValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameValue(value, right[index]))
    );
  }
  if (
    typeof left !== "object" ||
    left === null ||
    typeof right !== "object" ||
    right === null
  ) {
    return false;
  }
  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord).sort();
  const rightKeys = Object.keys(rightRecord).sort();
  return (
    sameValue(leftKeys, rightKeys) &&
    leftKeys.every((key) => sameValue(leftRecord[key], rightRecord[key]))
  );
}

function expectedAcceptedCase(state: PersistedWorkflowState) {
  const lock = state.outcomeLock;
  const proposal = state.proposal;
  if (!lock || !proposal) return null;
  return {
    ...lock.sourceCase,
    contract: {
      ...lock.sourceCase.contract,
      revision: lock.sourceCase.contract.revision + 1,
      acceptedRedlineId: proposal.id,
      clauses: lock.sourceCase.contract.clauses.map((clause) =>
        clause.id === proposal.targetClauseIds[0]
          ? { ...clause, text: proposal.proposedText }
          : clause,
      ),
    },
  };
}

function validateCaseBinding(
  state: PersistedWorkflowState,
  context: RefinementCtx,
): void {
  const lock = state.outcomeLock;
  const sourceCase = lock?.sourceCase ?? state.case;
  // The agreement is fixed; the scenario facts may be varied before the lock
  // as a what-if, but they keep the canonical scenario id and credit rate.
  const canonicalWithCurrentFacts = {
    ...canonicalCase,
    scenario: sourceCase.scenario,
  };
  if (
    !sameValue(sourceCase, canonicalWithCurrentFacts) ||
    sourceCase.scenario.id !== canonicalCase.scenario.id ||
    sourceCase.scenario.serviceCreditRateBps !==
      canonicalCase.scenario.serviceCreditRateBps
  ) {
    issue(
      context,
      ["case"],
      "The workflow is not bound to the canonical case.",
    );
  }
  const expectedCase =
    state.phase === "accepted" ? expectedAcceptedCase(state) : sourceCase;
  if (!expectedCase || !sameValue(state.case, expectedCase)) {
    issue(
      context,
      ["case"],
      "The current case is detached from the locked contract and scenario.",
    );
  }
}

function validateOutcomeLock(
  state: PersistedWorkflowState,
  context: RefinementCtx,
): void {
  const lock = state.outcomeLock;
  if (!lock) return;
  if (
    lock.baseRevision !== lock.sourceCase.contract.revision ||
    lock.expectedRule.trigger.thresholdBps !==
      lock.sourceCase.contract.terms.slaThresholdBps
  ) {
    issue(context, ["outcomeLock"], "The outcome lock is stale.");
  }
  const expectedTests = generateOutcomeTests(
    lock.sourceCase.scenario,
    lock.expectedRule,
  );
  if (!sameValue(lock.tests, expectedTests)) {
    issue(
      context,
      ["outcomeLock", "tests"],
      "The locked tests are not the deterministic suite for the source case.",
    );
  }
}

function validateProposal(
  state: PersistedWorkflowState,
  context: RefinementCtx,
): ClarificationRule | null {
  const proposal = state.proposal;
  const lock = state.outcomeLock;
  if (!proposal || !lock) return null;
  const originalText = lock.sourceCase.contract.clauses.find(
    ({ id }) => id === proposal.targetClauseIds[0],
  )?.text;
  if (proposal.originalText !== originalText) {
    issue(context, ["proposal", "originalText"], "Original text is stale.");
  }
  try {
    const parsed = parseCanonicalRedline(proposal.proposedText);
    if (
      !sameValue(parsed, proposal.semanticRule) ||
      renderCanonicalRedline(proposal.semanticRule) !== proposal.proposedText
    ) {
      issue(
        context,
        ["proposal"],
        "The proposal text and executable rule are detached.",
      );
    }
    return parsed;
  } catch {
    issue(
      context,
      ["proposal", "proposedText"],
      "The proposal text is not canonical executable language.",
    );
    return null;
  }
}

function validateProof(
  state: PersistedWorkflowState,
  rule: ClarificationRule | null,
  context: RefinementCtx,
): void {
  const lock = state.outcomeLock;
  const verification = state.verification;
  if (!lock || !verification || !rule) return;
  const outcomeSuite = runOutcomeSuite(lock.tests, rule);
  const boundaryStrength = measureBoundaryStrength(
    lock.tests,
    generateRuleMutants(rule),
  );
  const eligibleForAcceptance =
    outcomeSuite.passedCount === 6 &&
    outcomeSuite.totalCount === 6 &&
    boundaryStrength.killedCount === 8 &&
    boundaryStrength.totalCount === 8;
  if (
    !sameValue(verification.outcomeSuite, outcomeSuite) ||
    !sameValue(verification.boundaryStrength, boundaryStrength) ||
    verification.eligibleForAcceptance !== eligibleForAcceptance
  ) {
    issue(
      context,
      ["verification"],
      "The persisted verification is not the current deterministic proof.",
    );
  }
}

export function validateWorkflowProof(
  state: PersistedWorkflowState,
  context: RefinementCtx,
): void {
  validateCaseBinding(state, context);
  validateOutcomeLock(state, context);
  validateProof(state, validateProposal(state, context), context);
}
