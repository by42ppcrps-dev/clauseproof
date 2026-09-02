import { z } from "zod";

import {
  basisPointsSchema,
  clarificationRuleSchema,
  interpretationSemanticsSchema,
  isoDateSchema,
  moneyCentsSchema,
  monthSchema,
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

export const setScenarioFactsInputSchema = z.strictObject({
  baseRevision: z
    .number()
    .int()
    .nonnegative()
    .describe("The current revision returned by inspect_contract_case."),
  scenario: z
    .strictObject({
      monthlyFeeCents: moneyCentsSchema.describe(
        "Monthly fee in integer cents; 1000000 means $10,000.",
      ),
      monthsRemaining: z
        .number()
        .int()
        .min(0)
        .max(120)
        .describe(
          "Months left on the term. Future fees at stake are fee times months.",
        ),
      monthlyUptime: z
        .array(
          z.strictObject({
            month: monthSchema.describe("Calendar month as YYYY-MM."),
            uptimeBps: basisPointsSchema.describe(
              "Uptime in basis points; 9870 means 98.70%.",
            ),
          }),
        )
        .min(1)
        .max(24)
        .describe(
          "One entry per month, each month at most once. Months below the SLA threshold count as misses.",
        ),
      noticeGiven: z
        .boolean()
        .describe("Whether the customer gave written notice."),
      noticeDate: isoDateSchema.describe("Written notice date, YYYY-MM-DD."),
      observedAtDate: isoDateSchema.describe(
        "Date the outcome is evaluated, YYYY-MM-DD. Termination needs this on or after the cure deadline.",
      ),
      curedAtDate: isoDateSchema
        .nullable()
        .describe("Date the provider cured, or null if never cured."),
    })
    .describe(
      "The complete replacement facts. Start from the current scenario in inspect_contract_case and change only what the what-if question needs.",
    ),
  rationale: z
    .string()
    .min(10)
    .max(300)
    .describe("The what-if question these facts answer."),
});
