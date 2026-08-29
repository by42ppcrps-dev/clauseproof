import type { ClarificationEffect, ComparisonOperator } from "./model.js";
import { monthIndex } from "./calendarMonth.js";
import type {
  ClarificationRule,
  CommercialOutcome,
  OutcomeTest,
  ScenarioFacts,
} from "./schemas.js";
import {
  calculateCureDeadline,
  calculateServiceCredits,
  qualifyingMonths,
} from "./engine.js";

export { generateOutcomeTests } from "./outcomeTestCases.js";

export type ExecutableClarificationRule = Omit<
  ClarificationRule,
  "trigger" | "effect"
> & {
  trigger: Omit<ClarificationRule["trigger"], "comparator"> & {
    comparator: ComparisonOperator;
  };
  effect: ClarificationEffect;
};

export interface TestResult {
  testId: string;
  passed: boolean;
  actual: CommercialOutcome;
  expected: OutcomeTest["expected"];
  failureReason: string | null;
}

export interface OutcomeSuiteResult {
  results: TestResult[];
  passedCount: number;
  totalCount: number;
}

export function hasOccurrencesWithinWindow(
  months: string[],
  requiredOccurrences: number,
  rollingWindowMonths: number,
): boolean {
  const indices = [...new Set(months.map(monthIndex))].sort(
    (left, right) => left - right,
  );
  return indices.some((start) => {
    const lastIncluded = start + rollingWindowMonths - 1;
    return (
      indices.filter((index) => index >= start && index <= lastIncluded)
        .length >= requiredOccurrences
    );
  });
}

function ruleReasons(
  occurrenceTrigger: boolean,
  noticeSatisfied: boolean,
  cureElapsed: boolean,
  curedInTime: boolean,
  terminationAvailable: boolean,
): string[] {
  if (!occurrenceTrigger)
    return ["The required occurrence pattern is not present."];
  if (!noticeSatisfied) return ["Required written notice was not given."];
  if (!cureElapsed) return ["The cure period is still open."];
  if (curedInTime) return ["The failure was cured before the deadline."];
  if (!terminationAvailable)
    return ["The rule does not provide a termination effect."];
  return [
    "The occurrence, notice, cure, and effect requirements are satisfied.",
  ];
}

export function evaluateClarificationRule(
  facts: ScenarioFacts,
  rule: ExecutableClarificationRule,
): CommercialOutcome {
  const months = qualifyingMonths(
    facts,
    rule.trigger.thresholdBps,
    rule.trigger.comparator,
  );
  const occurrenceTrigger = hasOccurrencesWithinWindow(
    months,
    rule.trigger.requiredOccurrences,
    rule.trigger.rollingWindowMonths,
  );
  const cureDeadline = calculateCureDeadline(facts.noticeDate, rule.cureDays);
  const noticeSatisfied = !rule.noticeRequired || facts.noticeGiven;
  const cureElapsed = facts.observedAtDate >= cureDeadline;
  const curedInTime =
    facts.curedAtDate !== null && facts.curedAtDate <= cureDeadline;
  const terminationAvailable =
    occurrenceTrigger &&
    noticeSatisfied &&
    cureElapsed &&
    !curedInTime &&
    rule.effect === "customer_may_terminate_without_penalty";
  const accruedCredits = calculateServiceCredits(
    facts,
    rule.trigger.thresholdBps,
    rule.trigger.comparator,
  );
  return {
    serviceCreditsCents:
      terminationAvailable && !rule.preserveAccruedCredits ? 0 : accruedCredits,
    terminationAvailable,
    futureFeesCents: terminationAvailable
      ? 0
      : facts.monthlyFeeCents * facts.monthsRemaining,
    cureDeadline,
    reasons: ruleReasons(
      occurrenceTrigger,
      noticeSatisfied,
      cureElapsed,
      curedInTime,
      terminationAvailable,
    ),
  };
}

export function runOutcomeTest(
  test: OutcomeTest,
  rule: ExecutableClarificationRule,
): TestResult {
  const actual = evaluateClarificationRule(test.facts, rule);
  const terminationMatches =
    actual.terminationAvailable === test.expected.terminationAvailable;
  const creditsMatch =
    actual.serviceCreditsCents === test.expected.serviceCreditsCents;
  const passed = terminationMatches && creditsMatch;
  const failureReason = !terminationMatches
    ? `Expected termination ${test.expected.terminationAvailable ? "available" : "unavailable"}.`
    : !creditsMatch
      ? `Expected exactly ${test.expected.serviceCreditsCents} cents in service credits.`
      : null;
  return {
    testId: test.id,
    passed,
    actual,
    expected: test.expected,
    failureReason,
  };
}

export function runOutcomeSuite(
  tests: OutcomeTest[],
  rule: ExecutableClarificationRule,
): OutcomeSuiteResult {
  const results = tests.map((test) => runOutcomeTest(test, rule));
  return {
    results,
    passedCount: results.filter(({ passed }) => passed).length,
    totalCount: results.length,
  };
}
