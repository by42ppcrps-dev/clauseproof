import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  inspectContractCaseInputSchema,
  proposeClarifyingRedlineInputSchema,
  runContractCrashTestInputSchema,
  stageInterpretationsInputSchema,
  verifyContractTestsInputSchema,
} from "../../src/webmcp/schemas.js";

describe("WebMCP schemas", () => {
  const schemas = [
    inspectContractCaseInputSchema,
    stageInterpretationsInputSchema,
    runContractCrashTestInputSchema,
    proposeClarifyingRedlineInputSchema,
    verifyContractTestsInputSchema,
  ];

  it("generates strict JSON Schema from each Zod source", () => {
    expect(schemas).toHaveLength(5);
    for (const schema of schemas) {
      const jsonSchema = z.toJSONSchema(schema);
      expect(jsonSchema.type).toBe("object");
      expect(jsonSchema.additionalProperties).toBe(false);
    }
  });

  it("rejects unknown input keys", () => {
    expect(() =>
      inspectContractCaseInputSchema.parse({
        view: "overview",
        actor: "human-ui",
      }),
    ).toThrow();
    expect(() =>
      runContractCrashTestInputSchema.parse({
        baseRevision: 0,
        interpretationSetId: "set-1",
        approve: true,
      }),
    ).toThrow();
    expect(() =>
      proposeClarifyingRedlineInputSchema.parse({
        baseRevision: 0,
        outcomeLockId: "lock-1",
        targetClauseIds: ["material-breach"],
        proposedText: "Agent-authored wording must never be accepted as input.",
        semanticRule: {
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
        },
        rationale:
          "The application must generate the wording from the structured rule.",
      }),
    ).toThrow();
  });

  it("advertises only the exact two-clause clarification target", () => {
    const base = {
      baseRevision: 0,
      outcomeLockId: "lock-1",
      semanticRule: {
        trigger: {
          metric: "monthly_uptime_percentage" as const,
          comparator: "below" as const,
          thresholdBps: 9_950,
          requiredOccurrences: 2,
          rollingWindowMonths: 6,
        },
        noticeRequired: true as const,
        cureDays: 10,
        effect: "customer_may_terminate_without_penalty" as const,
        preserveAccruedCredits: true,
        overridesClauseIds: [
          "sla-exclusive-remedy",
          "material-breach",
        ] as const,
      },
      rationale:
        "The exact target prevents the agent from claiming unsupported edits.",
    };
    expect(() =>
      proposeClarifyingRedlineInputSchema.parse({
        ...base,
        targetClauseIds: ["sla-exclusive-remedy"],
      }),
    ).toThrow();
    expect(() =>
      proposeClarifyingRedlineInputSchema.parse({
        ...base,
        targetClauseIds: ["material-breach", "sla-exclusive-remedy"],
      }),
    ).toThrow();
    expect(() =>
      proposeClarifyingRedlineInputSchema.parse({
        ...base,
        targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
        semanticRule: {
          ...base.semanticRule,
          overridesClauseIds: ["material-breach", "sla-exclusive-remedy"],
        },
      }),
    ).toThrow();
  });
});
