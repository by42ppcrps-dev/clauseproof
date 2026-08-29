import { describe, expect, it } from "vitest";

import {
  parseCanonicalRedline,
  renderCanonicalRedline,
} from "../../src/domain/redline.js";
import { canonicalOutcomeRule } from "../../src/domain/seed.js";

describe("canonical redline language", () => {
  it("round-trips the exact human-readable grammar", () => {
    const text = renderCanonicalRedline(canonicalOutcomeRule);

    expect(text).toBe(
      "For a Monthly Uptime Percentage below 99.5%, Customer’s sole and exclusive monetary remedy is its Exhibit A service credit. For those SLA failures, despite Section 3, Customer may terminate without penalty if Monthly Uptime Percentage is below 99.5% in at least 2 distinct calendar months within a rolling 6-month period, Customer gives Provider written notice, and Provider does not cure within 10 days after notice. Accrued service credits survive termination.",
    );
    expect(text).not.toContain("Notwithstanding Sections 2");
    expect(text).toContain("sole and exclusive monetary remedy");
    expect(parseCanonicalRedline(text)).toEqual(canonicalOutcomeRule);
  });

  it("round-trips every supported variable without hidden prose semantics", () => {
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

    expect(parseCanonicalRedline(renderCanonicalRedline(customRule))).toEqual(
      customRule,
    );
  });

  it("fails closed for arbitrary or corrupted prose", () => {
    expect(() => parseCanonicalRedline("Everything is fine.")).toThrowError(
      expect.objectContaining({ code: "RULE_MISMATCH" }),
    );

    const corrupted = renderCanonicalRedline(canonicalOutcomeRule).replace(
      "within 10 days",
      "whenever convenient",
    );
    expect(() => parseCanonicalRedline(corrupted)).toThrowError(
      expect.objectContaining({ code: "RULE_MISMATCH" }),
    );
  });
});
