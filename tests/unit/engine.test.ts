import { describe, expect, it } from "vitest";

import {
  calculateCureDeadline,
  calculateServiceCredits,
  evaluateInterpretation,
  qualifyingMonths,
} from "../../src/domain/engine.js";
import {
  canonicalCase,
  canonicalCustomerInterpretation,
  canonicalVendorInterpretation,
} from "../../src/domain/seed.js";

describe("interpretation engine", () => {
  it("identifies qualifying months using a strict below comparator", () => {
    expect(qualifyingMonths(canonicalCase.scenario, 9_950, "below")).toEqual([
      "2026-01",
      "2026-02",
    ]);
  });

  it("calculates credits only in integer cents", () => {
    expect(
      calculateServiceCredits(canonicalCase.scenario, 9_950, "below"),
    ).toBe(200_000);
  });

  it("calculates the material-breach deadline deterministically", () => {
    expect(calculateCureDeadline("2026-03-01", 30)).toBe("2026-03-31");
  });

  it("executes the vendor-favorable reading", () => {
    expect(
      evaluateInterpretation(
        canonicalCase.contract,
        canonicalCase.scenario,
        canonicalVendorInterpretation,
      ),
    ).toEqual({
      serviceCreditsCents: 200_000,
      terminationAvailable: false,
      futureFeesCents: 8_000_000,
      cureDeadline: "2026-03-31",
      reasons: [
        "Two months are below the 99.50% SLA threshold.",
        "The exclusive-remedy scope blocks SLA-related termination.",
        "Future fees remain payable because termination is unavailable.",
      ],
    });
  });

  it("executes the customer-favorable reading", () => {
    expect(
      evaluateInterpretation(
        canonicalCase.contract,
        canonicalCase.scenario,
        canonicalCustomerInterpretation,
      ),
    ).toEqual({
      serviceCreditsCents: 200_000,
      terminationAvailable: true,
      futureFeesCents: 0,
      cureDeadline: "2026-03-31",
      reasons: [
        "Two months are below the 99.50% SLA threshold.",
        "The reading permits repeated SLA failure to follow the material-breach path.",
        "The breach remained uncured through the 30-day deadline.",
        "Future fees end because termination is available.",
      ],
    });
  });

  it("does not open the material-breach path before written notice is given", () => {
    const outcome = evaluateInterpretation(
      canonicalCase.contract,
      { ...canonicalCase.scenario, noticeGiven: false },
      canonicalCustomerInterpretation,
    );

    expect(outcome.terminationAvailable).toBe(false);
    expect(outcome.futureFeesCents).toBe(8_000_000);
  });
});
