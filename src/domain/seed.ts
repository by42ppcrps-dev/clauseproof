import {
  canonicalCaseSchema,
  clarificationRuleSchema,
  modeledInterpretationSchema,
} from "./schemas.js";

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze(Reflect.get(value, key) as unknown);
  }
  Object.freeze(value);
  return value;
}

export const canonicalCase = deepFreeze(
  canonicalCaseSchema.parse({
    id: "clauseproof-synthetic-saas",
    title: "Synthetic SaaS Service Agreement",
    syntheticDisclosure:
      "This agreement and scenario are synthetic and demonstrate modeled commercial behavior only.",
    contract: {
      revision: 0,
      acceptedRedlineId: null,
      terms: {
        slaThresholdBps: 9_950,
        serviceCreditRateBps: 1_000,
        materialBreachCureDays: 30,
      },
      clauses: [
        {
          id: "sla-commitment",
          heading: "SLA commitment",
          text: "Provider will maintain a Monthly Uptime Percentage of at least 99.5%.",
          order: 1,
        },
        {
          id: "sla-exclusive-remedy",
          heading: "Exclusive remedy",
          text: "If Monthly Uptime Percentage is below 99.5%, Customer’s sole and exclusive remedy is the applicable service credit in Exhibit A.",
          order: 2,
        },
        {
          id: "material-breach",
          heading: "Material breach",
          text: "Either party may terminate this Agreement for material breach if the breach remains uncured for 30 days after written notice.",
          order: 3,
        },
      ],
    },
    scenario: {
      id: "two-consecutive-sla-misses",
      monthlyFeeCents: 1_000_000,
      monthsRemaining: 8,
      serviceCreditRateBps: 1_000,
      monthlyUptime: [
        { month: "2026-01", uptimeBps: 9_870 },
        { month: "2026-02", uptimeBps: 9_890 },
      ],
      noticeGiven: true,
      noticeDate: "2026-03-01",
      observedAtDate: "2026-04-01",
      curedAtDate: null,
    },
  }),
);

export const canonicalVendorInterpretation = deepFreeze(
  modeledInterpretationSchema.parse({
    id: "vendor-favorable",
    label: "Vendor-favorable reading",
    baseRevision: 0,
    clauseIds: ["sla-commitment", "sla-exclusive-remedy", "material-breach"],
    semantics: {
      exclusiveRemedyScope: "all_sla_related_remedies",
      repeatedSlaFailureMayBeMaterialBreach: false,
      creditsSurviveTermination: true,
    },
    rationale:
      "The exclusive-remedy clause is modeled as displacing every remedy arising from the SLA failures, including termination.",
  }),
);

export const canonicalCustomerInterpretation = deepFreeze(
  modeledInterpretationSchema.parse({
    id: "customer-favorable",
    label: "Customer-favorable reading",
    baseRevision: 0,
    clauseIds: ["sla-commitment", "sla-exclusive-remedy", "material-breach"],
    semantics: {
      exclusiveRemedyScope: "sla_compensation_only",
      repeatedSlaFailureMayBeMaterialBreach: true,
      creditsSurviveTermination: true,
    },
    rationale:
      "The exclusive-remedy clause is modeled as limiting monetary compensation while preserving a separate material-breach termination path.",
  }),
);

export const canonicalOutcomeRule = deepFreeze(
  clarificationRuleSchema.parse({
    trigger: {
      metric: "monthly_uptime_percentage",
      comparator: "below",
      thresholdBps: 9_950,
      requiredOccurrences: 2,
      rollingWindowMonths: 6,
    },
    noticeRequired: true,
    cureDays: 10,
    effect: "customer_may_terminate_without_penalty",
    preserveAccruedCredits: true,
    overridesClauseIds: ["sla-exclusive-remedy", "material-breach"],
  }),
);
