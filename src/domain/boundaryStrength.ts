import type { ClarificationRule, OutcomeTest } from "./schemas.js";
import {
  runOutcomeSuite,
  type ExecutableClarificationRule,
} from "./outcomeTests.js";

export interface RuleMutant {
  id: string;
  description: string;
  rule: ExecutableClarificationRule;
}

export interface MutationResult {
  mutantId: string;
  description: string;
  killed: boolean;
  caughtByTestIds: string[];
}

export interface BoundaryStrengthResult {
  results: MutationResult[];
  killedCount: number;
  totalCount: number;
}

function triggerMutant(
  rule: ClarificationRule,
  id: string,
  description: string,
  trigger: ExecutableClarificationRule["trigger"],
): RuleMutant {
  return { id, description, rule: { ...rule, trigger } };
}

export function generateRuleMutants(rule: ClarificationRule): RuleMutant[] {
  return [
    triggerMutant(
      rule,
      "occurrences-one",
      "Requires one miss instead of two.",
      {
        ...rule.trigger,
        requiredOccurrences: 1,
      },
    ),
    triggerMutant(
      rule,
      "occurrences-three",
      "Requires three misses instead of two.",
      {
        ...rule.trigger,
        requiredOccurrences: 3,
      },
    ),
    triggerMutant(
      rule,
      "window-twelve",
      "Uses a twelve-month rolling window.",
      {
        ...rule.trigger,
        rollingWindowMonths: 12,
      },
    ),
    {
      id: "cure-zero",
      description: "Uses a zero-day cure period.",
      rule: { ...rule, cureDays: 0 },
    },
    {
      id: "cure-thirty",
      description: "Uses a thirty-day cure period.",
      rule: { ...rule, cureDays: 30 },
    },
    {
      id: "credits-not-preserved",
      description: "Does not preserve accrued service credits.",
      rule: { ...rule, preserveAccruedCredits: false },
    },
    {
      id: "termination-removed",
      description: "Removes the termination effect.",
      rule: { ...rule, effect: "none" },
    },
    triggerMutant(rule, "comparator-inclusive", "Treats equality as a miss.", {
      ...rule.trigger,
      comparator: "below_or_equal",
    }),
  ];
}

export function measureBoundaryStrength(
  tests: OutcomeTest[],
  mutants: RuleMutant[],
): BoundaryStrengthResult {
  const results = mutants.map(({ id, description, rule }) => {
    const suite = runOutcomeSuite(tests, rule);
    const caughtByTestIds = suite.results
      .filter(({ passed }) => !passed)
      .map(({ testId }) => testId);
    return {
      mutantId: id,
      description,
      killed: caughtByTestIds.length > 0,
      caughtByTestIds,
    };
  });
  return {
    results,
    killedCount: results.filter(({ killed }) => killed).length,
    totalCount: results.length,
  };
}
