import { describe, expect, it } from "vitest";

import {
  generateRuleMutants,
  measureBoundaryStrength,
} from "../../src/domain/boundaryStrength.js";
import { generateOutcomeTests } from "../../src/domain/outcomeTests.js";
import { canonicalCase, canonicalOutcomeRule } from "../../src/domain/seed.js";

describe("boundary strength", () => {
  const tests = generateOutcomeTests(
    canonicalCase.scenario,
    canonicalOutcomeRule,
  );
  const mutants = generateRuleMutants(canonicalOutcomeRule);

  it("generates exactly the eight required altered rules", () => {
    expect(mutants.map(({ id }) => id)).toEqual([
      "occurrences-lower",
      "occurrences-higher",
      "window-expanded",
      "cure-shorter",
      "cure-longer",
      "credits-toggled",
      "termination-removed",
      "comparator-inclusive",
    ]);
  });

  it("catches all eight altered rules and identifies their counterexamples", () => {
    const strength = measureBoundaryStrength(tests, mutants);
    expect(strength.killedCount).toBe(8);
    expect(strength.totalCount).toBe(8);
    expect(strength.results.every(({ killed }) => killed)).toBe(true);

    const caughtBy = Object.fromEntries(
      strength.results.map(({ mutantId, caughtByTestIds }) => [
        mutantId,
        caughtByTestIds,
      ]),
    );
    expect(caughtBy["occurrences-lower"]).toContain("insufficient-occurrences");
    expect(caughtBy["occurrences-higher"]).toContain("positive-trigger");
    expect(caughtBy["window-expanded"]).toContain("outside-window");
    expect(caughtBy["cure-shorter"]).toContain("cure-period-open");
    expect(caughtBy["cure-longer"]).toContain("positive-trigger");
    expect(caughtBy["credits-toggled"]).toContain("positive-trigger");
    expect(caughtBy["termination-removed"]).toContain("positive-trigger");
    expect(caughtBy["comparator-inclusive"]).toContain("threshold-equality");
  });

  it("catches all eight nearby mutations for a custom supported lock", () => {
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
    const result = measureBoundaryStrength(
      customTests,
      generateRuleMutants(customRule),
    );

    expect(result.killedCount).toBe(8);
    expect(result.totalCount).toBe(8);
  });
});
