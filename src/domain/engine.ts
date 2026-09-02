import type { ComparisonOperator } from "./model.js";
import type {
  CommercialOutcome,
  ContractRevision,
  ModeledInterpretation,
  ScenarioFacts,
} from "./schemas.js";

function parseIsoDate(date: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError(`Invalid ISO date: ${date}`);
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function matchesThreshold(
  uptimeBps: number,
  thresholdBps: number,
  comparator: ComparisonOperator,
): boolean {
  return comparator === "below"
    ? uptimeBps < thresholdBps
    : uptimeBps <= thresholdBps;
}

export function qualifyingMonths(
  facts: ScenarioFacts,
  thresholdBps: number,
  comparator: ComparisonOperator,
): string[] {
  return facts.monthlyUptime
    .filter(({ uptimeBps }) =>
      matchesThreshold(uptimeBps, thresholdBps, comparator),
    )
    .map(({ month }) => month);
}

export function calculateServiceCredits(
  facts: ScenarioFacts,
  thresholdBps: number,
  comparator: ComparisonOperator,
): number {
  const monthlyCreditCents = Math.trunc(
    (facts.monthlyFeeCents * facts.serviceCreditRateBps) / 10_000,
  );
  return (
    qualifyingMonths(facts, thresholdBps, comparator).length *
    monthlyCreditCents
  );
}

export function calculateCureDeadline(
  noticeDate: string,
  cureDays: number,
): string {
  const date = parseIsoDate(noticeDate);
  date.setUTCDate(date.getUTCDate() + cureDays);
  return formatIsoDate(date);
}

export function addDays(date: string, days: number): string {
  return calculateCureDeadline(date, days);
}

function formatBasisPoints(value: number): string {
  return `${(value / 100).toFixed(2)}%`;
}

function mayTerminate(
  facts: ScenarioFacts,
  interpretation: ModeledInterpretation,
  cureDeadline: string,
  qualifyingCount: number,
): boolean {
  const semantics = interpretation.semantics;
  const pathPermitted =
    semantics.exclusiveRemedyScope === "sla_compensation_only" &&
    semantics.repeatedSlaFailureMayBeMaterialBreach;
  const curedInTime =
    facts.curedAtDate !== null && facts.curedAtDate <= cureDeadline;
  return (
    pathPermitted &&
    facts.noticeGiven &&
    qualifyingCount >= 2 &&
    facts.observedAtDate >= cureDeadline &&
    !curedInTime
  );
}

function outcomeReasons(
  thresholdBps: number,
  qualifyingCount: number,
  cureDays: number,
  terminationAvailable: boolean,
  interpretation: ModeledInterpretation,
): string[] {
  const reasons = [
    `${qualifyingCount === 2 ? "Two" : qualifyingCount} months are below the ${formatBasisPoints(thresholdBps)} SLA threshold.`,
  ];
  if (
    interpretation.semantics.exclusiveRemedyScope === "all_sla_related_remedies"
  ) {
    reasons.push("The exclusive-remedy scope blocks SLA-related termination.");
  } else if (interpretation.semantics.repeatedSlaFailureMayBeMaterialBreach) {
    reasons.push(
      "The reading permits repeated SLA failure to follow the material-breach path.",
    );
    if (terminationAvailable) {
      reasons.push(
        `The breach remained uncured through the ${cureDays}-day deadline.`,
      );
    }
  }
  reasons.push(
    terminationAvailable
      ? "Future fees end because termination is available."
      : "Future fees remain payable because termination is unavailable.",
  );
  return reasons;
}

export function evaluateInterpretation(
  contract: ContractRevision,
  facts: ScenarioFacts,
  interpretation: ModeledInterpretation,
): CommercialOutcome {
  const { slaThresholdBps, materialBreachCureDays } = contract.terms;
  const qualifyingCount = qualifyingMonths(
    facts,
    slaThresholdBps,
    "below",
  ).length;
  const cureDeadline = calculateCureDeadline(
    facts.noticeDate,
    materialBreachCureDays,
  );
  const terminationAvailable = mayTerminate(
    facts,
    interpretation,
    cureDeadline,
    qualifyingCount,
  );
  const accruedCredits = calculateServiceCredits(
    facts,
    slaThresholdBps,
    "below",
  );
  const serviceCreditsCents =
    terminationAvailable && !interpretation.semantics.creditsSurviveTermination
      ? 0
      : accruedCredits;
  return {
    serviceCreditsCents,
    terminationAvailable,
    futureFeesCents: terminationAvailable
      ? 0
      : facts.monthlyFeeCents * facts.monthsRemaining,
    cureDeadline,
    reasons: outcomeReasons(
      slaThresholdBps,
      qualifyingCount,
      materialBreachCureDays,
      terminationAvailable,
      interpretation,
    ),
  };
}

export interface ScenarioMonthView {
  month: string;
  uptimeBps: number;
  belowThreshold: boolean;
  creditCents: number;
}

export interface ScenarioView {
  months: ScenarioMonthView[];
  qualifyingMonthCount: number;
  feesAtStakeCents: number;
}

export function describeScenario(
  facts: ScenarioFacts,
  thresholdBps: number,
): ScenarioView {
  const monthlyCreditCents = Math.trunc(
    (facts.monthlyFeeCents * facts.serviceCreditRateBps) / 10_000,
  );
  const months = [...facts.monthlyUptime]
    .sort((left, right) => left.month.localeCompare(right.month))
    .map(({ month, uptimeBps }) => {
      const belowThreshold = matchesThreshold(uptimeBps, thresholdBps, "below");
      return {
        month,
        uptimeBps,
        belowThreshold,
        creditCents: belowThreshold ? monthlyCreditCents : 0,
      };
    });
  return {
    months,
    qualifyingMonthCount: months.filter(({ belowThreshold }) => belowThreshold)
      .length,
    feesAtStakeCents: facts.monthlyFeeCents * facts.monthsRemaining,
  };
}
