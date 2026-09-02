import type { WorkflowState } from "../../domain/workflow.js";

export function candidateOccurrencesFor(lockedOccurrences: number): number {
  return lockedOccurrences < 4 ? lockedOccurrences + 1 : lockedOccurrences - 1;
}

function occurrenceWord(value: number): string {
  const words: Record<number, string> = { 2: "two", 3: "three", 4: "four" };
  return words[value] ?? String(value);
}

export function agentPromptFor(state: WorkflowState): string {
  if (state.phase === "ready") {
    return "Read the three clauses on this page. Stage two readings of what happens after two months below the 99.5% uptime commitment: first, a vendor-favorable reading where the 'sole and exclusive remedy' sentence displaces every SLA-related remedy, so repeated misses are not a material breach; second, a customer-favorable reading where that sentence only limits compensation, so repeated misses can still be a material breach with termination. Keep accrued credits in both. Cite the clauses you rely on, explain each choice, and do not pick the intended outcome for me. Then run both readings against the same facts.";
  }
  if (state.phase === "interpretations_staged") {
    return "Run the two staged readings against the same facts on this page. Report each commercial outcome and the exact clause semantics that create the difference. Do not choose the intended outcome for me.";
  }
  if (state.phase === "divergence_visible") {
    return "Explain the two commercial futures on this page and the clause semantics behind the gap between them. Do not choose or lock the intended result; that decision is mine.";
  }
  if (state.phase === "outcome_locked" && state.verification) {
    const candidateOccurrences =
      state.proposal?.semanticRule.trigger.requiredOccurrences;
    const lockedOccurrences =
      state.outcomeLock?.expectedRule.trigger.requiredOccurrences;
    const failedOutcomes =
      state.verification.outcomeSuite.results
        .filter(({ passed }) => !passed)
        .map(({ testId }) => testId)
        .join(", ") || "none";
    const survivingBoundaries =
      state.verification.boundaryStrength.results
        .filter(({ killed }) => !killed)
        .map(({ mutantId }) => mutantId)
        .join(", ") || "none";
    return `Staged candidate: ${candidateOccurrences ?? "unknown"} qualifying misses. Locked intent: ${lockedOccurrences ?? "unknown"} qualifying misses. The candidate passed ${state.verification.outcomeSuite.passedCount}/${state.verification.outcomeSuite.totalCount} outcomes and caught ${state.verification.boundaryStrength.killedCount}/${state.verification.boundaryStrength.totalCount} altered rules. Failed outcome: ${failedOutcomes}. Surviving boundary: ${survivingBoundaries}. Repair the proposal to match my locked rule, stage the replacement clarification, and rerun every test. Do not invent terms and do not accept the revision.`;
  }
  if (state.phase === "outcome_locked") {
    const lockedOccurrences =
      state.outcomeLock?.expectedRule.trigger.requiredOccurrences;
    if (lockedOccurrences !== undefined) {
      const candidateOccurrences = candidateOccurrencesFor(lockedOccurrences);
      return `Inspect my locked outcome. First stage a candidate that requires ${occurrenceWord(candidateOccurrences)} qualifying misses while matching every other locked term; my lock requires ${lockedOccurrences}. Run every contract test, use the returned failure and surviving-boundary evidence to repair the proposal to my locked rule, then stage and retest the replacement. Do not accept the revision.`;
    }
    return "Inspect my locked outcome, stage a deliberately different supported occurrence rule, and run every contract test. Use only returned evidence to repair the proposal to my lock. Do not accept the revision.";
  }
  if (state.phase === "redline_staged") {
    return "Run every outcome and altered-rule boundary test against the staged clarification. Report the exact failures and counterexamples. If it fails, repair and retest; do not accept the revision.";
  }
  if (state.phase === "verified") {
    return "Summarize the passing outcome and boundary evidence, then state clearly that only I can accept the tested revision. Do not attempt acceptance.";
  }
  return "Inspect the accepted revision and summarize the behavior its tests proved, without making legal conclusions.";
}
