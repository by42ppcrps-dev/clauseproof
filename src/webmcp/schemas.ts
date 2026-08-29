import { z } from "zod";

import {
  clarificationRuleSchema,
  interpretationSemanticsSchema,
} from "../domain/schemas.js";

const toolClauseIdSchema = z.enum([
  "sla-commitment",
  "sla-exclusive-remedy",
  "material-breach",
]);

const redlineClauseIdsSchema = z.tuple([
  z.literal("sla-exclusive-remedy"),
  z.literal("material-breach"),
]);

export const inspectContractCaseInputSchema = z.strictObject({
  view: z.enum(["overview", "clauses", "workflow"]).default("overview"),
});

export const stageInterpretationsInputSchema = z.strictObject({
  baseRevision: z.number().int().nonnegative(),
  interpretations: z
    .array(
      z.strictObject({
        label: z.string().min(3).max(60),
        clauseIds: z.array(toolClauseIdSchema).min(1).max(3),
        semantics: interpretationSemanticsSchema,
        rationale: z.string().min(20).max(320),
      }),
    )
    .length(2),
});

export const runContractCrashTestInputSchema = z.strictObject({
  baseRevision: z.number().int().nonnegative(),
  interpretationSetId: z.string().min(1).max(120),
});

export const proposeClarifyingRedlineInputSchema = z.strictObject({
  baseRevision: z.number().int().nonnegative(),
  outcomeLockId: z.string().min(1).max(120),
  targetClauseIds: redlineClauseIdsSchema,
  semanticRule: clarificationRuleSchema,
  rationale: z.string().min(20).max(400),
});

export const verifyContractTestsInputSchema = z.strictObject({
  baseRevision: z.number().int().nonnegative(),
  proposalId: z.string().min(1).max(120),
});
