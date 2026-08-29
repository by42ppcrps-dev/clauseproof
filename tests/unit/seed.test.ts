import { describe, expect, it } from "vitest";

import {
  canonicalCase,
  canonicalCustomerInterpretation,
  canonicalOutcomeRule,
  canonicalVendorInterpretation,
} from "../../src/domain/seed.js";

describe("canonical seed", () => {
  it("contains the one locked agreement and exact clause order", () => {
    expect(canonicalCase.id).toBe("clauseproof-synthetic-saas");
    expect(canonicalCase.contract.revision).toBe(0);
    expect(canonicalCase.contract.clauses.map(({ id }) => id)).toEqual([
      "sla-commitment",
      "sla-exclusive-remedy",
      "material-breach",
    ]);
    expect(canonicalCase.scenario.monthlyFeeCents).toBe(1_000_000);
    expect(canonicalCase.scenario.monthsRemaining).toBe(8);
  });

  it("contains exact scenario facts and no confidence values", () => {
    expect(canonicalCase.scenario.monthlyUptime).toEqual([
      { month: "2026-01", uptimeBps: 9_870 },
      { month: "2026-02", uptimeBps: 9_890 },
    ]);
    expect(JSON.stringify(canonicalCase)).not.toContain("confidence");
    expect(canonicalCase.syntheticDisclosure).toMatch(/synthetic/i);
  });

  it("deep-freezes every canonical object", () => {
    expect(Object.isFrozen(canonicalCase)).toBe(true);
    expect(Object.isFrozen(canonicalCase.contract)).toBe(true);
    expect(Object.isFrozen(canonicalCase.contract.clauses)).toBe(true);
    expect(Object.isFrozen(canonicalCase.contract.clauses[0])).toBe(true);
    expect(Object.isFrozen(canonicalCase.scenario.monthlyUptime)).toBe(true);
    expect(Object.isFrozen(canonicalVendorInterpretation)).toBe(true);
    expect(Object.isFrozen(canonicalCustomerInterpretation)).toBe(true);
    expect(Object.isFrozen(canonicalOutcomeRule)).toBe(true);
  });
});
