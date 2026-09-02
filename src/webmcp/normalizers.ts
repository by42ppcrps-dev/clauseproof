import type { ClauseId } from "../domain/model.js";
import type { ClarificationRule } from "../domain/schemas.js";
import type { VerificationRecord } from "../domain/workflow.js";

export interface StageToolData {
  interpretationSetId: string;
  baseRevision: number;
  readingLabels: string[];
}

export interface CrashToolData {
  interpretationSetId: string;
  branches: {
    serviceCreditsCents: number;
    terminationAvailable: boolean;
    futureFeesCents: number;
  }[];
  divergentFields: string[];
  totalFinancialDivergenceCents: number;
}

export interface ProposalToolData {
  proposalId: string;
  targetClauseIds: ClauseId[];
  originalText: string;
  proposedText: string;
  semanticRuleSummary: {
    metric: ClarificationRule["trigger"]["metric"];
    comparator: ClarificationRule["trigger"]["comparator"];
    thresholdBps: number;
    requiredOccurrences: number;
    rollingWindowMonths: number;
    noticeRequired: ClarificationRule["noticeRequired"];
    cureDays: number;
    effect: ClarificationRule["effect"];
    preserveAccruedCredits: boolean;
    overridesClauseIds: ClauseId[];
  };
  stagedOnly: true;
}

export interface ScenarioToolData {
  monthsOfUptime: number;
  monthlyFeeCents: number;
  monthsRemaining: number;
  noticeDate: string;
  curedAtDate: string | null;
  crashTest: {
    branches: {
      serviceCreditsCents: number;
      terminationAvailable: boolean;
      futureFeesCents: number;
    }[];
    totalFinancialDivergenceCents: number;
  } | null;
}

export interface VerificationToolData {
  outcomeTestsPassed: number;
  outcomeTestsTotal: number;
  failedTestCounterexamples: string[];
  boundaryRulesCaught: number;
  boundaryRulesTotal: number;
  boundarySurvivors: string[];
  eligibleForHumanAcceptance: boolean;
}

export function semanticRuleSummary(
  rule: ClarificationRule,
): ProposalToolData["semanticRuleSummary"] {
  return {
    metric: rule.trigger.metric,
    comparator: rule.trigger.comparator,
    thresholdBps: rule.trigger.thresholdBps,
    requiredOccurrences: rule.trigger.requiredOccurrences,
    rollingWindowMonths: rule.trigger.rollingWindowMonths,
    noticeRequired: rule.noticeRequired,
    cureDays: rule.cureDays,
    effect: rule.effect,
    preserveAccruedCredits: rule.preserveAccruedCredits,
    overridesClauseIds: rule.overridesClauseIds,
  };
}

export function failedTestEvidence(verification: VerificationRecord): string[] {
  return verification.outcomeSuite.results
    .filter(({ passed }) => !passed)
    .map(({ testId, failureReason, actual }) => {
      const reason =
        failureReason ?? "Observed behavior did not match the lock.";
      return `${testId}|${reason}|actual:termination=${String(actual.terminationAvailable)},creditsCents=${actual.serviceCreditsCents}`;
    });
}

export function survivingBoundaryIds(
  verification: VerificationRecord,
): string[] {
  return verification.boundaryStrength.results
    .filter(({ killed }) => !killed)
    .map(({ mutantId }) => mutantId);
}
