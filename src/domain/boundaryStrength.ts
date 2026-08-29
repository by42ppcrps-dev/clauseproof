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
      "occurrences-lower",
      `Requires ${rule.trigger.requiredOccurrences - 1} misses instead of ${rule.trigger.requiredOccurrences}.`,
      {
        ...rule.trigger,
        requiredOccurrences: rule.trigger.requiredOccurrences - 1,
      },
    ),
    triggerMutant(
      rule,
      "occurrences-higher",
      `Requires ${rule.trigger.requiredOccurrences + 1} misses instead of ${rule.trigger.requiredOccurrences}.`,
      {
        ...rule.trigger,
        requiredOccurrences: rule.trigger.requiredOccurrences + 1,
      },
    ),
    triggerMutant(
      rule,
      "window-expanded",
      `Uses a ${rule.trigger.rollingWindowMonths + 1}-month rolling window.`,
      {
        ...rule.trigger,
        rollingWindowMonths: rule.trigger.rollingWindowMonths + 1,
      },
    ),
    {
      id: "cure-shorter",
      description: `Uses a ${rule.cureDays - 1}-day cure period.`,
      rule: { ...rule, cureDays: rule.cureDays - 1 },
    },
    {
      id: "cure-longer",
      description: `Uses a ${rule.cureDays + 1}-day cure period.`,
      rule: { ...rule, cureDays: rule.cureDays + 1 },
    },
    {
      id: "credits-toggled",
      description: rule.preserveAccruedCredits
        ? "Does not preserve accrued service credits."
        : "Preserves accrued service credits.",
      rule: {
        ...rule,
        preserveAccruedCredits: !rule.preserveAccruedCredits,
      },
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
