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
      "occurrences-one",
      "occurrences-three",
      "window-twelve",
      "cure-zero",
      "cure-thirty",
      "credits-not-preserved",
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
    expect(caughtBy["occurrences-one"]).toContain("one-miss-only");
    expect(caughtBy["occurrences-three"]).toContain("two-misses-uncured");
    expect(caughtBy["window-twelve"]).toContain("outside-window");
    expect(caughtBy["cure-zero"]).toContain("cure-period-open");
    expect(caughtBy["cure-thirty"]).toContain("two-misses-uncured");
    expect(caughtBy["credits-not-preserved"]).toContain("two-misses-uncured");
    expect(caughtBy["termination-removed"]).toContain("two-misses-uncured");
    expect(caughtBy["comparator-inclusive"]).toContain("threshold-equality");
  });
});
