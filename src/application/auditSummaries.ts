import type {
  OutcomeLock,
  RedlineProposal,
  VerificationRecord,
} from "../domain/workflow.js";

export function outcomeLockSummary(lock: OutcomeLock): string {
  const { cureDays, preserveAccruedCredits, trigger } = lock.expectedRule;
  const creditCopy = preserveAccruedCredits
    ? "preserved credits"
    : "no preserved credits";
  return `Person locked ${trigger.requiredOccurrences} qualifying misses within ${trigger.rollingWindowMonths} months, a ${cureDays}-day cure, termination without penalty, and ${creditCopy}.`;
}

export function proposalSummary(
  proposal: RedlineProposal,
  lock: OutcomeLock | null,
): string {
  const candidate = proposal.semanticRule.trigger.requiredOccurrences;
  const locked = lock?.expectedRule.trigger.requiredOccurrences;
  const lockCopy =
    locked === undefined
      ? "the current human lock"
      : `the person's ${locked}-miss lock`;
  return `Staged a ${candidate}-miss clarification against ${lockCopy}; it is not accepted.`;
}

export function verificationSummary(verification: VerificationRecord): string {
  const { boundaryStrength, outcomeSuite } = verification;
  if (verification.eligibleForAcceptance) {
    return `Candidate passed: ${outcomeSuite.passedCount}/${outcomeSuite.totalCount} outcome tests and ${boundaryStrength.killedCount}/${boundaryStrength.totalCount} altered rules caught; eligible for human acceptance.`;
  }
  const failedExamples = outcomeSuite.results
    .filter(({ passed }) => !passed)
    .map(({ testId }) => testId)
    .join(", ");
  const survivors = boundaryStrength.results
    .filter(({ killed }) => !killed)
    .map(({ mutantId }) => mutantId)
    .join(", ");
  return `Candidate failed: ${outcomeSuite.passedCount}/${outcomeSuite.totalCount} outcome tests passed and ${boundaryStrength.killedCount}/${boundaryStrength.totalCount} altered rules caught; failed example: ${failedExamples || "none"}; survivor: ${survivors || "none"}.`;
}
