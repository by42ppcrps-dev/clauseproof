import { describe, expect, it } from "vitest";

import {
  evaluateClarificationRule,
  generateOutcomeTests,
  runOutcomeSuite,
} from "../../src/domain/outcomeTests.js";
import { canonicalCase, canonicalOutcomeRule } from "../../src/domain/seed.js";

describe("outcome tests", () => {
  const tests = generateOutcomeTests(
    canonicalCase.scenario,
    canonicalOutcomeRule,
  );

  it("generates the six stable canonical cases from the locked rule", () => {
    expect(tests.map(({ id }) => id)).toEqual([
      "two-misses-uncured",
      "one-miss-only",
      "outside-window",
      "cure-period-open",
      "cured-in-time",
      "threshold-equality",
    ]);
  });

  it("passes all six cases for the canonical rule", () => {
    const result = runOutcomeSuite(tests, canonicalOutcomeRule);
    expect(result.passedCount).toBe(6);
    expect(result.totalCount).toBe(6);
    expect(result.results.every(({ passed }) => passed)).toBe(true);
  });

  it("defines exact cure and threshold boundaries", () => {
    const thresholdCase = tests.find(({ id }) => id === "threshold-equality");
    const cureCase = tests.find(({ id }) => id === "cure-period-open");
    expect(thresholdCase).toBeDefined();
    expect(cureCase).toBeDefined();
    if (thresholdCase && cureCase) {
      expect(
        evaluateClarificationRule(thresholdCase.facts, canonicalOutcomeRule)
          .terminationAvailable,
      ).toBe(false);
      expect(
        evaluateClarificationRule(cureCase.facts, canonicalOutcomeRule)
          .terminationAvailable,
      ).toBe(false);
    }
  });
});
