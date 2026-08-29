import { DomainError } from "./errors.js";
import { clarificationRuleSchema, type ClarificationRule } from "./schemas.js";

const canonicalPattern =
  /^For a Monthly Uptime Percentage below (\d{1,3}(?:\.\d{1,2})?)%, Customer’s sole and exclusive monetary remedy is its Exhibit A service credit\. For those SLA failures, despite Section 3, Customer may terminate without penalty if Monthly Uptime Percentage is below (\d{1,3}(?:\.\d{1,2})?)% in at least (\d+) distinct calendar months within a rolling (\d+)-month period, Customer gives Provider written notice, and Provider does not cure within (\d+) (day|days) after notice\. (Accrued service credits survive termination\.|Accrued service credits are forfeited upon termination\.)$/;

function ruleMismatch(): DomainError {
  return new DomainError(
    "RULE_MISMATCH",
    "The staged clarification is not canonical executable language.",
    "Stage a new clarification from a supported structured rule.",
  );
}

function formatBasisPoints(value: number): string {
  const whole = Math.floor(value / 100);
  const fraction = String(value % 100)
    .padStart(2, "0")
    .replace(/0+$/, "");
  return fraction.length === 0 ? String(whole) : `${whole}.${fraction}`;
}

function parseBasisPoints(value: string): number {
  const [whole = "", fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function dayUnit(value: number): "day" | "days" {
  return value === 1 ? "day" : "days";
}

export function renderCanonicalRedline(rule: ClarificationRule): string {
  const supported = clarificationRuleSchema.parse(rule);
  const creditSentence = supported.preserveAccruedCredits
    ? "Accrued service credits survive termination."
    : "Accrued service credits are forfeited upon termination.";
  const threshold = formatBasisPoints(supported.trigger.thresholdBps);
  return `For a Monthly Uptime Percentage below ${threshold}%, Customer’s sole and exclusive monetary remedy is its Exhibit A service credit. For those SLA failures, despite Section 3, Customer may terminate without penalty if Monthly Uptime Percentage is below ${threshold}% in at least ${supported.trigger.requiredOccurrences} distinct calendar months within a rolling ${supported.trigger.rollingWindowMonths}-month period, Customer gives Provider written notice, and Provider does not cure within ${supported.cureDays} ${dayUnit(supported.cureDays)} after notice. ${creditSentence}`;
}

export function parseCanonicalRedline(text: string): ClarificationRule {
  const match = canonicalPattern.exec(text);
  if (!match) throw ruleMismatch();
  if (match[1] !== match[2]) throw ruleMismatch();
  const parsed = clarificationRuleSchema.safeParse({
    trigger: {
      metric: "monthly_uptime_percentage",
      comparator: "below",
      thresholdBps: parseBasisPoints(match[1] ?? ""),
      requiredOccurrences: Number(match[3]),
      rollingWindowMonths: Number(match[4]),
    },
    noticeRequired: true,
    cureDays: Number(match[5]),
    effect: "customer_may_terminate_without_penalty",
    preserveAccruedCredits:
      match[7] === "Accrued service credits survive termination.",
    overridesClauseIds: ["sla-exclusive-remedy", "material-breach"],
  });
  if (!parsed.success || renderCanonicalRedline(parsed.data) !== text) {
    throw ruleMismatch();
  }
  return parsed.data;
}
