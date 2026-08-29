import { z } from "zod";

import { validateWorkflowState } from "./workflowStateInvariants.js";
import {
  actorSchema,
  canonicalCaseSchema,
  clarificationRuleSchema,
  commercialOutcomeSchema,
  isoDateSchema,
  modeledInterpretationSchema,
  moneyCentsSchema,
  outcomeTestSchema,
  revisionSchema,
  workflowPhaseSchema,
} from "./schemas.js";

const idSchema = z.string().min(1).max(160);
const fingerprintSchema = z.string().min(1).max(128);

const interpretationSetSchema = z.strictObject({
  id: idSchema,
  baseRevision: revisionSchema,
  scenarioId: idSchema,
  interpretations: z.tuple([
    modeledInterpretationSchema,
    modeledInterpretationSchema,
  ]),
  fingerprint: fingerprintSchema,
});

const divergenceDifferenceSchema = z.discriminatedUnion("field", [
  z.strictObject({
    field: z.literal("serviceCreditsCents"),
    left: moneyCentsSchema,
    right: moneyCentsSchema,
    financialImpactCents: moneyCentsSchema,
  }),
  z.strictObject({
    field: z.literal("terminationAvailable"),
    left: z.boolean(),
    right: z.boolean(),
    financialImpactCents: z.literal(0),
  }),
  z.strictObject({
    field: z.literal("futureFeesCents"),
    left: moneyCentsSchema,
    right: moneyCentsSchema,
    financialImpactCents: moneyCentsSchema,
  }),
  z.strictObject({
    field: z.literal("cureDeadline"),
    left: isoDateSchema,
    right: isoDateSchema,
    financialImpactCents: z.literal(0),
  }),
]);

const crashTestSchema = z.strictObject({
  interpretationSetId: idSchema,
  outcomes: z.tuple([commercialOutcomeSchema, commercialOutcomeSchema]),
  divergence: z.strictObject({
    differences: z.array(divergenceDifferenceSchema).min(1).max(4),
    totalFinancialDivergenceCents: moneyCentsSchema,
  }),
});

const outcomeLockSchema = z.strictObject({
  id: idSchema,
  baseRevision: revisionSchema,
  createdBy: z.literal("human-ui"),
  sourceCase: canonicalCaseSchema,
  expectedRule: clarificationRuleSchema,
  tests: z.array(outcomeTestSchema).length(6),
  fingerprint: fingerprintSchema,
});

const proposalSchema = z.strictObject({
  id: idSchema,
  baseRevision: revisionSchema,
  outcomeLockId: idSchema,
  outcomeLockFingerprint: fingerprintSchema,
  targetClauseIds: z.tuple([
    z.literal("sla-exclusive-remedy"),
    z.literal("material-breach"),
  ]),
  originalText: z.string().min(1).max(1_000),
  proposedText: z.string().min(1).max(1_000),
  semanticRule: clarificationRuleSchema,
  rationale: z.string().min(20).max(400),
  fingerprint: fingerprintSchema,
});

const expectedOutcomeSchema = z.strictObject({
  terminationAvailable: z.boolean(),
  serviceCreditsCents: moneyCentsSchema,
});

const testResultSchema = z.strictObject({
  testId: idSchema,
  passed: z.boolean(),
  actual: commercialOutcomeSchema,
  expected: expectedOutcomeSchema,
  failureReason: z.string().min(1).max(240).nullable(),
});

const outcomeSuiteSchema = z.strictObject({
  results: z.array(testResultSchema).length(6),
  passedCount: z.number().int().min(0).max(6),
  totalCount: z.literal(6),
});

const mutationResultSchema = z.strictObject({
  mutantId: idSchema,
  description: z.string().min(1).max(240),
  killed: z.boolean(),
  caughtByTestIds: z.array(idSchema).max(6),
});

const boundaryStrengthSchema = z.strictObject({
  results: z.array(mutationResultSchema).length(8),
  killedCount: z.number().int().min(0).max(8),
  totalCount: z.literal(8),
});

const verificationSchema = z.strictObject({
  proposalId: idSchema,
  proposalFingerprint: fingerprintSchema,
  outcomeLockFingerprint: fingerprintSchema,
  verifiedText: z.string().min(1).max(1_000),
  outcomeSuite: outcomeSuiteSchema,
  boundaryStrength: boundaryStrengthSchema,
  eligibleForAcceptance: z.boolean(),
});

const auditEventSchema = z.strictObject({
  id: idSchema,
  sequence: z.number().int().positive(),
  occurredAt: z.iso.datetime(),
  actor: actorSchema,
  action: z.string().min(1).max(120),
  outcome: z.enum(["completed", "rejected"]),
  summary: z.string().min(1).max(320),
});

export const workflowStateShapeSchema = z.strictObject({
  phase: workflowPhaseSchema,
  case: canonicalCaseSchema,
  interpretationSet: interpretationSetSchema.nullable(),
  crashTest: crashTestSchema.nullable(),
  outcomeLock: outcomeLockSchema.nullable(),
  proposal: proposalSchema.nullable(),
  verification: verificationSchema.nullable(),
  events: z.array(auditEventSchema).max(200),
});

export type PersistedWorkflowState = z.infer<typeof workflowStateShapeSchema>;

export const workflowStateSchema = workflowStateShapeSchema.superRefine(
  validateWorkflowState,
);
