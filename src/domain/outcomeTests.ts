import type { ClarificationEffect, ComparisonOperator } from "./model.js";
import type {
  ClarificationRule,
  CommercialOutcome,
  OutcomeTest,
  ScenarioFacts,
} from "./schemas.js";
import {
  addDays,
  calculateCureDeadline,
  calculateServiceCredits,
  qualifyingMonths,
} from "./engine.js";

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

function monthIndex(month: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new RangeError(`Invalid month: ${month}`);
  return Number(match[1]) * 12 + Number(match[2]) - 1;
}

function formatMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function addMonths(month: string, count: number): string {
  return formatMonth(monthIndex(month) + count);
}

export function hasOccurrencesWithinWindow(
  months: string[],
  requiredOccurrences: number,
  rollingWindowMonths: number,
): boolean {
  const indices = months.map(monthIndex).sort((left, right) => left - right);
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
  cureElapsed: boolean,
  curedInTime: boolean,
  terminationAvailable: boolean,
): string[] {
  if (!occurrenceTrigger)
    return ["The required occurrence pattern is not present."];
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
  const cureElapsed = facts.observedAtDate >= cureDeadline;
  const curedInTime =
    facts.curedAtDate !== null && facts.curedAtDate <= cureDeadline;
  const terminationAvailable =
    occurrenceTrigger &&
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
      cureElapsed,
      curedInTime,
      terminationAvailable,
    ),
  };
}

function uptime(month: string, uptimeBps: number) {
  return { month, uptimeBps };
}

function scenario(
  base: ScenarioFacts,
  id: string,
  monthlyUptime: ScenarioFacts["monthlyUptime"],
  observedAtDate: string,
  curedAtDate: string | null,
): ScenarioFacts {
  return { ...base, id, monthlyUptime, observedAtDate, curedAtDate };
}

export function generateOutcomeTests(
  base: ScenarioFacts,
  rule: ClarificationRule,
): OutcomeTest[] {
  const below = rule.trigger.thresholdBps - 60;
  const firstMonth = base.monthlyUptime[0]?.month ?? "2026-01";
  const secondMonth = addMonths(firstMonth, 1);
  const twoMisses = [uptime(firstMonth, below), uptime(secondMonth, below)];
  const afterCure = addDays(base.noticeDate, rule.cureDays + 1);
  const positiveFacts = scenario(base, "positive", twoMisses, afterCure, null);
  const minimumCreditsCents = calculateServiceCredits(
    positiveFacts,
    rule.trigger.thresholdBps,
    rule.trigger.comparator,
  );
  return [
    {
      id: "two-misses-uncured",
      name: "Two qualifying misses remain uncured after the deadline",
      facts: positiveFacts,
      expected: { terminationAvailable: true, minimumCreditsCents },
    },
    {
      id: "one-miss-only",
      name: "One qualifying miss is insufficient",
      facts: scenario(
        base,
        "one-miss",
        [uptime(firstMonth, below)],
        afterCure,
        null,
      ),
      expected: { terminationAvailable: false },
    },
    {
      id: "outside-window",
      name: "Misses eight months apart are outside the rolling window",
      facts: scenario(
        base,
        "outside-window",
        [
          uptime(firstMonth, below),
          uptime(
            addMonths(firstMonth, rule.trigger.rollingWindowMonths + 2),
            below,
          ),
        ],
        afterCure,
        null,
      ),
      expected: { terminationAvailable: false },
    },
    {
      id: "cure-period-open",
      name: "The cure period remains open on day five",
      facts: scenario(
        base,
        "cure-open",
        twoMisses,
        addDays(base.noticeDate, Math.floor(rule.cureDays / 2)),
        null,
      ),
      expected: { terminationAvailable: false },
    },
    {
      id: "cured-in-time",
      name: "A cure on day nine prevents termination",
      facts: scenario(
        base,
        "cured-in-time",
        twoMisses,
        afterCure,
        addDays(base.noticeDate, Math.max(0, rule.cureDays - 1)),
      ),
      expected: { terminationAvailable: false },
    },
    {
      id: "threshold-equality",
      name: "A month exactly at the threshold is not below it",
      facts: scenario(
        base,
        "threshold-equality",
        [
          uptime(firstMonth, rule.trigger.thresholdBps),
          uptime(secondMonth, below),
        ],
        afterCure,
        null,
      ),
      expected: { terminationAvailable: false },
    },
  ];
}

export function runOutcomeTest(
  test: OutcomeTest,
  rule: ExecutableClarificationRule,
): TestResult {
  const actual = evaluateClarificationRule(test.facts, rule);
  const terminationMatches =
    actual.terminationAvailable === test.expected.terminationAvailable;
  const creditsMatch =
    test.expected.minimumCreditsCents === undefined ||
    actual.serviceCreditsCents >= test.expected.minimumCreditsCents;
  const passed = terminationMatches && creditsMatch;
  const failureReason = !terminationMatches
    ? `Expected termination ${test.expected.terminationAvailable ? "available" : "unavailable"}.`
    : !creditsMatch
      ? `Expected at least ${test.expected.minimumCreditsCents} cents in accrued credits.`
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
