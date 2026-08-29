import { DomainError } from "../domain/errors.js";
import {
  parseCanonicalRedline,
  renderCanonicalRedline,
} from "../domain/redline.js";
import {
  clarificationRuleSchema,
  type ClarificationRule,
} from "../domain/schemas.js";
import type {
  OutcomeLock,
  RedlineProposal,
  WorkflowState,
} from "../domain/workflow.js";
import type { ClauseProofDependencies } from "./serviceTypes.js";
import { canonicalize } from "./canonicalize.js";

export function parseSupportedRule(rule: ClarificationRule): ClarificationRule {
  const parsed = clarificationRuleSchema.safeParse(rule);
  if (!parsed.success) {
    throw new DomainError(
      "INVALID_INPUT",
      "The clarification rule is outside the supported executable bounds.",
      "Use a supported occurrence, window, cure, threshold, and clause combination.",
    );
  }
  return parsed.data;
}

export function parseSupportedOutcomeRule(
  rule: ClarificationRule,
  contractThresholdBps: number,
): ClarificationRule {
  const parsed = parseSupportedRule(rule);
  if (parsed.trigger.thresholdBps !== contractThresholdBps) {
    throw new DomainError(
      "INVALID_INPUT",
      "The locked trigger threshold must match the agreement's SLA threshold.",
      `Use the agreement threshold of ${contractThresholdBps} basis points.`,
    );
  }
  return parsed;
}

export function parseAttachedProposalRule(
  proposal: RedlineProposal,
): ClarificationRule {
  const executableRule = parseCanonicalRedline(proposal.proposedText);
  const claimedRule = clarificationRuleSchema.safeParse(proposal.semanticRule);
  if (
    !claimedRule.success ||
    renderCanonicalRedline(claimedRule.data) !== proposal.proposedText
  ) {
    throw new DomainError(
      "RULE_MISMATCH",
      "The staged text and structured rule do not describe the same behavior.",
      "Stage a new clarification from a supported structured rule.",
    );
  }
  return executableRule;
}

export async function assertProposalFingerprint(
  state: WorkflowState,
  dependencies: ClauseProofDependencies,
  proposal: RedlineProposal,
): Promise<void> {
  const { fingerprint, ...fingerprintedFields } = proposal;
  const currentFingerprint = await dependencies.fingerprintProvider.create({
    sourceCase: state.case,
    ...fingerprintedFields,
  });
  if (currentFingerprint !== fingerprint) {
    throw new DomainError(
      "STALE_PROPOSAL",
      "The proposal changed after it was staged.",
      "Stage a new proposal against the current outcome lock.",
    );
  }
}

export async function assertOutcomeLockFingerprint(
  state: WorkflowState,
  dependencies: ClauseProofDependencies,
  lock: OutcomeLock,
): Promise<void> {
  if (canonicalize(state.case) !== canonicalize(lock.sourceCase)) {
    throw new DomainError(
      "STALE_OUTCOME_LOCK",
      "The contract or scenario changed after the outcome was locked.",
      "Return to the current case and lock the intended outcome again.",
    );
  }
  const currentFingerprint = await dependencies.fingerprintProvider.create({
    sourceCase: lock.sourceCase,
    baseRevision: lock.baseRevision,
    expectedRule: lock.expectedRule,
    tests: lock.tests,
  });
  if (currentFingerprint !== lock.fingerprint) {
    throw new DomainError(
      "STALE_OUTCOME_LOCK",
      "The human-owned outcome lock changed after it was created.",
      "Ask the person to lock the intended outcome again.",
    );
  }
}

export function assertProposalOutcomeLock(
  proposal: RedlineProposal,
  lock: OutcomeLock,
): void {
  if (
    proposal.outcomeLockId !== lock.id ||
    proposal.outcomeLockFingerprint !== lock.fingerprint ||
    proposal.baseRevision !== lock.baseRevision
  ) {
    throw new DomainError(
      "STALE_PROPOSAL",
      "The proposal no longer matches the current outcome lock.",
      "Stage a new proposal against the current outcome lock.",
    );
  }
}
