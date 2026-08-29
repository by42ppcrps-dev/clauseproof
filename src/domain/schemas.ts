import { z } from "zod";

import {
  clauseIds,
  exclusiveRemedyScopes,
  webMcpToolNames,
  workflowPhases,
} from "./model.js";

export const moneyCentsSchema = z
  .number()
  .int()
  .nonnegative()
  .max(Number.MAX_SAFE_INTEGER);

export const basisPointsSchema = z.number().int().min(0).max(10_000);
export const revisionSchema = z.number().int().nonnegative();
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const isoDateSchema = z.iso.date();

export const workflowPhaseSchema = z.enum(workflowPhases);
export const clauseIdSchema = z.enum(clauseIds);
export const webMcpToolNameSchema = z.enum(webMcpToolNames);

export const actorSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("human-ui") }),
  z.strictObject({
    kind: z.literal("agent-tool"),
    toolName: webMcpToolNameSchema,
  }),
  z.strictObject({ kind: z.literal("manual-fallback") }),
  z.strictObject({ kind: z.literal("system") }),
]);

export const clauseSchema = z.strictObject({
  id: clauseIdSchema,
  heading: z.string().min(1).max(80),
  text: z.string().min(1).max(1_000),
  order: z.number().int().positive(),
});

export const contractTermsSchema = z.strictObject({
  slaThresholdBps: basisPointsSchema,
  serviceCreditRateBps: basisPointsSchema,
  materialBreachCureDays: z.number().int().nonnegative().max(365),
});

export const contractRevisionSchema = z.strictObject({
  revision: revisionSchema,
  clauses: z.array(clauseSchema).length(3),
  terms: contractTermsSchema,
  acceptedRedlineId: z.string().min(1).nullable(),
});

export const monthlyUptimeSchema = z.strictObject({
  month: monthSchema,
  uptimeBps: basisPointsSchema,
});

export const scenarioFactsSchema = z.strictObject({
  id: z.string().min(1).max(80),
  monthlyFeeCents: moneyCentsSchema,
  monthsRemaining: z.number().int().nonnegative().max(120),
  serviceCreditRateBps: basisPointsSchema,
  monthlyUptime: z.array(monthlyUptimeSchema).min(1).max(24),
  noticeDate: isoDateSchema,
  observedAtDate: isoDateSchema,
  curedAtDate: isoDateSchema.nullable(),
});

export const interpretationSemanticsSchema = z.strictObject({
  exclusiveRemedyScope: z.enum(exclusiveRemedyScopes),
  repeatedSlaFailureMayBeMaterialBreach: z.boolean(),
  creditsSurviveTermination: z.boolean(),
});

export const modeledInterpretationSchema = z.strictObject({
  id: z.string().min(1).max(80),
  label: z.string().min(3).max(60),
  baseRevision: revisionSchema,
  clauseIds: z.array(clauseIdSchema).min(1).max(3),
  semantics: interpretationSemanticsSchema,
  rationale: z.string().min(20).max(320),
});

export const commercialOutcomeSchema = z.strictObject({
  serviceCreditsCents: moneyCentsSchema,
  terminationAvailable: z.boolean(),
  futureFeesCents: moneyCentsSchema,
  cureDeadline: isoDateSchema,
  reasons: z.array(z.string().min(1)).min(1),
});

export const clarificationRuleSchema = z.strictObject({
  trigger: z.strictObject({
    metric: z.literal("monthly_uptime_percentage"),
    comparator: z.literal("below"),
    thresholdBps: basisPointsSchema,
    requiredOccurrences: z.number().int().positive().max(12),
    rollingWindowMonths: z.number().int().positive().max(24),
  }),
  noticeRequired: z.literal(true),
  cureDays: z.number().int().nonnegative().max(365),
  effect: z.literal("customer_may_terminate_without_penalty"),
  preserveAccruedCredits: z.boolean(),
  overridesClauseIds: z.array(clauseIdSchema).min(1).max(3),
});

export const outcomeTestSchema = z.strictObject({
  id: z.string().min(1).max(80),
  name: z.string().min(1).max(120),
  facts: scenarioFactsSchema,
  expected: z.strictObject({
    terminationAvailable: z.boolean(),
    minimumCreditsCents: moneyCentsSchema.optional(),
  }),
});

export const canonicalCaseSchema = z.strictObject({
  id: z.literal("clauseproof-synthetic-saas"),
  title: z.string().min(1).max(100),
  syntheticDisclosure: z.string().min(20).max(240),
  contract: contractRevisionSchema,
  scenario: scenarioFactsSchema,
});

export type Actor = z.infer<typeof actorSchema>;
export type Clause = z.infer<typeof clauseSchema>;
export type ContractRevision = z.infer<typeof contractRevisionSchema>;
export type ScenarioFacts = z.infer<typeof scenarioFactsSchema>;
export type InterpretationSemantics = z.infer<
  typeof interpretationSemanticsSchema
>;
export type ModeledInterpretation = z.infer<typeof modeledInterpretationSchema>;
export type CommercialOutcome = z.infer<typeof commercialOutcomeSchema>;
export type ClarificationRule = z.infer<typeof clarificationRuleSchema>;
export type OutcomeTest = z.infer<typeof outcomeTestSchema>;
export type CanonicalCase = z.infer<typeof canonicalCaseSchema>;
