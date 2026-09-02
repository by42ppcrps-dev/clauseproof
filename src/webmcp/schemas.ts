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
  view: z
    .enum(["overview", "clauses", "workflow"])
    .default("overview")
    .describe(
      "overview: scenario facts plus the reading vocabulary. clauses: the visible clause text and IDs. workflow: current artifact IDs and the person's locked rule (needed before proposing or repairing a redline).",
    ),
});

export const stageInterpretationsInputSchema = z.strictObject({
  baseRevision: z
    .number()
    .int()
    .nonnegative()
    .describe("The revision number returned by inspect_contract_case."),
  interpretations: z
    .array(
      z.strictObject({
        label: z
          .string()
          .min(3)
          .max(60)
          .describe(
            "Short human-readable name, e.g. 'Vendor-favorable reading'.",
          ),
        clauseIds: z
          .array(toolClauseIdSchema)
          .min(1)
          .max(3)
          .describe(
            "Visible clause IDs this reading relies on. Must include sla-exclusive-remedy and material-breach.",
          ),
        semantics: interpretationSemanticsSchema,
        rationale: z
          .string()
          .min(20)
          .max(320)
          .describe(
            "One or two sentences explaining why the cited words support this reading.",
          ),
      }),
    )
    .length(2)
    .describe(
      "Exactly two readings whose semantics differ enough to change credits, termination, or future fees.",
    ),
});

export const runContractCrashTestInputSchema = z.strictObject({
  baseRevision: z
    .number()
    .int()
    .nonnegative()
    .describe("The current revision returned by inspect_contract_case."),
  interpretationSetId: z
    .string()
    .min(1)
    .max(120)
    .describe("The interpretationSetId returned by stage_interpretations."),
});

export const proposeClarifyingRedlineInputSchema = z.strictObject({
  baseRevision: z
    .number()
    .int()
    .nonnegative()
    .describe("The current revision returned by inspect_contract_case."),
  outcomeLockId: z
    .string()
    .min(1)
    .max(120)
    .describe(
      "The person's outcomeLockId from inspect_contract_case view=workflow. Never invent this.",
    ),
  targetClauseIds: redlineClauseIdsSchema.describe(
    "Always the ordered pair [sla-exclusive-remedy, material-breach].",
  ),
  semanticRule: clarificationRuleSchema.describe(
    "The executable rule the generated clause must implement. Compare it with lockedExpectedRule; every field you do not intend to change should match the lock exactly.",
  ),
  rationale: z
    .string()
    .min(20)
    .max(400)
    .describe("Why this rule was chosen, or which counterexample it repairs."),
});

export const verifyContractTestsInputSchema = z.strictObject({
  baseRevision: z
    .number()
    .int()
    .nonnegative()
    .describe("The current revision returned by inspect_contract_case."),
  proposalId: z
    .string()
    .min(1)
    .max(120)
    .describe("The proposalId returned by propose_clarifying_redline."),
});
