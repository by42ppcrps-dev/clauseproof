import { addMonths } from "./calendarMonth.js";
import { addDays, calculateServiceCredits } from "./engine.js";
import type {
  ClarificationRule,
  OutcomeTest,
  ScenarioFacts,
} from "./schemas.js";

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

function qualifyingUptimes(
  firstMonth: string,
  count: number,
  lastOffset: number,
  value: number,
): ScenarioFacts["monthlyUptime"] {
  return Array.from({ length: count }, (_, index) =>
    uptime(
      addMonths(firstMonth, index === count - 1 ? lastOffset : index),
      value,
    ),
  );
}

function expectedOutcome(
  facts: ScenarioFacts,
  rule: ClarificationRule,
  terminationAvailable: boolean,
): OutcomeTest["expected"] {
  const accruedCredits = calculateServiceCredits(
    facts,
    rule.trigger.thresholdBps,
    rule.trigger.comparator,
  );
  return {
    terminationAvailable,
    serviceCreditsCents:
      terminationAvailable && !rule.preserveAccruedCredits ? 0 : accruedCredits,
  };
}

function createTestFacts(base: ScenarioFacts, rule: ClarificationRule) {
  const { requiredOccurrences, rollingWindowMonths, thresholdBps } =
    rule.trigger;
  const below = thresholdBps - 1;
  const firstMonth = addMonths(
    base.noticeDate.slice(0, 7),
    -rollingWindowMonths - 1,
  );
  const positiveUptimes = qualifyingUptimes(
    firstMonth,
    requiredOccurrences,
    rollingWindowMonths - 1,
    below,
  );
  const atCureDeadline = addDays(base.noticeDate, rule.cureDays);
  return {
    positive: scenario(
      base,
      "positive-trigger",
      positiveUptimes,
      atCureDeadline,
      null,
    ),
    insufficient: scenario(
      base,
      "insufficient-occurrences",
      qualifyingUptimes(
        firstMonth,
        requiredOccurrences - 1,
        requiredOccurrences - 2,
        below,
      ),
      atCureDeadline,
      null,
    ),
    outsideWindow: scenario(
      base,
      "outside-window",
      qualifyingUptimes(
        firstMonth,
        requiredOccurrences,
        rollingWindowMonths,
        below,
      ),
      atCureDeadline,
      null,
    ),
    cureOpen: scenario(
      base,
      "cure-period-open",
      positiveUptimes,
      addDays(base.noticeDate, rule.cureDays - 1),
      null,
    ),
    cured: scenario(
      base,
      "cured-in-time",
      positiveUptimes,
      atCureDeadline,
      atCureDeadline,
    ),
    threshold: scenario(
      base,
      "threshold-equality",
      [
        ...qualifyingUptimes(
          firstMonth,
          requiredOccurrences - 1,
          requiredOccurrences - 2,
          below,
        ),
        uptime(addMonths(firstMonth, rollingWindowMonths - 1), thresholdBps),
      ],
      atCureDeadline,
      null,
    ),
  };
}

export function generateOutcomeTests(
  base: ScenarioFacts,
  rule: ClarificationRule,
): OutcomeTest[] {
  const facts = createTestFacts(base, rule);
  const { requiredOccurrences, rollingWindowMonths } = rule.trigger;
  return [
    {
      id: "positive-trigger",
      name: `${requiredOccurrences} qualifying misses trigger termination at the cure deadline`,
      facts: facts.positive,
      expected: expectedOutcome(facts.positive, rule, true),
    },
    {
      id: "insufficient-occurrences",
      name: `${requiredOccurrences - 1} qualifying misses are insufficient`,
      facts: facts.insufficient,
      expected: expectedOutcome(facts.insufficient, rule, false),
    },
    {
      id: "outside-window",
      name: `The required misses spanning ${rollingWindowMonths + 1} months are outside the rolling window`,
      facts: facts.outsideWindow,
      expected: expectedOutcome(facts.outsideWindow, rule, false),
    },
    {
      id: "cure-period-open",
      name: `The ${rule.cureDays}-day cure period is still open one day before its deadline`,
      facts: facts.cureOpen,
      expected: expectedOutcome(facts.cureOpen, rule, false),
    },
    {
      id: "cured-in-time",
      name: "A cure on the deadline prevents termination",
      facts: facts.cured,
      expected: expectedOutcome(facts.cured, rule, false),
    },
    {
      id: "threshold-equality",
      name: "A month exactly at the threshold is not below it",
      facts: facts.threshold,
      expected: expectedOutcome(facts.threshold, rule, false),
    },
  ];
}
