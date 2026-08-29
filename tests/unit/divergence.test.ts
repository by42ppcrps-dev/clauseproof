import { describe, expect, it } from "vitest";

import { compareOutcomes } from "../../src/domain/divergence.js";
import { evaluateInterpretation } from "../../src/domain/engine.js";
import {
  canonicalCase,
  canonicalCustomerInterpretation,
  canonicalVendorInterpretation,
} from "../../src/domain/seed.js";

describe("commercial divergence", () => {
  it("returns stable ordered differences and exactly $80,000 financial divergence", () => {
    const vendor = evaluateInterpretation(
      canonicalCase.contract,
      canonicalCase.scenario,
      canonicalVendorInterpretation,
    );
    const customer = evaluateInterpretation(
      canonicalCase.contract,
      canonicalCase.scenario,
      canonicalCustomerInterpretation,
    );

    expect(compareOutcomes(vendor, customer)).toEqual({
      differences: [
        {
          field: "terminationAvailable",
          left: false,
          right: true,
          financialImpactCents: 0,
        },
        {
          field: "futureFeesCents",
          left: 8_000_000,
          right: 0,
          financialImpactCents: 8_000_000,
        },
      ],
      totalFinancialDivergenceCents: 8_000_000,
    });
  });
});
