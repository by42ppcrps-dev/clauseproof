import { describe, expect, it } from "vitest";

import {
  evaluateClarificationRule,
  generateOutcomeTests,
  hasOccurrencesWithinWindow,
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
      "positive-trigger",
      "insufficient-occurrences",
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

  it("does not allow termination when required written notice was not given", () => {
    const positive = tests.find(({ id }) => id === "positive-trigger");
    expect(positive).toBeDefined();
    if (!positive) return;

    const result = evaluateClarificationRule(
      { ...positive.facts, noticeGiven: false },
      canonicalOutcomeRule,
    );

    expect(result.terminationAvailable).toBe(false);
    expect(result.reasons).toContain("Required written notice was not given.");
  });

  it("generates six honest cases for a custom supported lock", () => {
    const customRule = {
      ...canonicalOutcomeRule,
      trigger: {
        ...canonicalOutcomeRule.trigger,
        thresholdBps: 9_900,
        requiredOccurrences: 3,
        rollingWindowMonths: 8,
      },
      cureDays: 14,
      preserveAccruedCredits: false,
    };
    const customTests = generateOutcomeTests(
      canonicalCase.scenario,
      customRule,
    );

    const result = runOutcomeSuite(customTests, customRule);
    expect(result.passedCount).toBe(6);
    expect(result.totalCount).toBe(6);
    expect(
      customTests.find(({ id }) => id === "positive-trigger")?.facts
        .monthlyUptime,
    ).toHaveLength(3);
    expect(
      customTests.find(({ id }) => id === "positive-trigger")?.expected
        .serviceCreditsCents,
    ).toBe(0);
  });

  it("produces counterexamples for every wrong behavioral field", () => {
    const wrongRules = [
      {
        ...canonicalOutcomeRule,
        trigger: {
          ...canonicalOutcomeRule.trigger,
          thresholdBps: canonicalOutcomeRule.trigger.thresholdBps - 1,
        },
      },
      {
        ...canonicalOutcomeRule,
        trigger: {
          ...canonicalOutcomeRule.trigger,
          requiredOccurrences: 3,
        },
      },
      {
        ...canonicalOutcomeRule,
        trigger: {
          ...canonicalOutcomeRule.trigger,
          rollingWindowMonths: 5,
        },
      },
      { ...canonicalOutcomeRule, cureDays: 11 },
      { ...canonicalOutcomeRule, preserveAccruedCredits: false },
    ];

    for (const wrongRule of wrongRules) {
      expect(runOutcomeSuite(tests, wrongRule).passedCount).toBeLessThan(6);
    }
  });

  it("counts distinct calendar months rather than duplicate entries", () => {
    expect(hasOccurrencesWithinWindow(["2026-01", "2026-01"], 2, 6)).toBe(
      false,
    );
    expect(hasOccurrencesWithinWindow(["2026-01", "2026-02"], 2, 6)).toBe(true);
  });
});
