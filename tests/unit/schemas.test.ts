import { describe, expect, it } from "vitest";

import {
  actorSchema,
  interpretationSemanticsSchema,
  scenarioFactsSchema,
} from "../../src/domain/schemas.js";

const validScenario = {
  id: "scenario-canonical",
  monthlyFeeCents: 1_000_000,
  monthsRemaining: 8,
  serviceCreditRateBps: 1_000,
  monthlyUptime: [
    { month: "2026-01", uptimeBps: 9_870 },
    { month: "2026-02", uptimeBps: 9_890 },
  ],
  noticeDate: "2026-03-01",
  observedAtDate: "2026-04-01",
  curedAtDate: null,
};

describe("domain schemas", () => {
  it("accepts integer cents, basis points, and ISO dates", () => {
    expect(scenarioFactsSchema.parse(validScenario)).toEqual(validScenario);
  });

  it("rejects floating money and out-of-range basis points", () => {
    expect(() =>
      scenarioFactsSchema.parse({ ...validScenario, monthlyFeeCents: 10.5 }),
    ).toThrow();
    expect(() =>
      scenarioFactsSchema.parse({
        ...validScenario,
        monthlyUptime: [{ month: "2026-01", uptimeBps: 10_001 }],
      }),
    ).toThrow();
  });

  it("rejects unknown keys at every strict schema boundary", () => {
    expect(() =>
      interpretationSemanticsSchema.parse({
        exclusiveRemedyScope: "sla_compensation_only",
        repeatedSlaFailureMayBeMaterialBreach: true,
        creditsSurviveTermination: true,
        confidence: 0.99,
      }),
    ).toThrow();
    expect(() =>
      scenarioFactsSchema.parse({ ...validScenario, extra: true }),
    ).toThrow();
  });

  it("models actor provenance as a discriminated union", () => {
    expect(actorSchema.parse({ kind: "human-ui" })).toEqual({
      kind: "human-ui",
    });
    expect(
      actorSchema.parse({
        kind: "agent-tool",
        toolName: "stage_interpretations",
      }),
    ).toEqual({ kind: "agent-tool", toolName: "stage_interpretations" });
    expect(() => actorSchema.parse({ kind: "agent-tool" })).toThrow();
  });
});
