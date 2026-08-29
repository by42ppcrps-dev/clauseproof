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
  });
});
