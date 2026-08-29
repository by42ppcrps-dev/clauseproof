import type { CommercialOutcome } from "./schemas.js";

export type DivergenceDifference =
  | {
      field: "serviceCreditsCents";
      left: number;
      right: number;
      financialImpactCents: number;
    }
  | {
      field: "terminationAvailable";
      left: boolean;
      right: boolean;
      financialImpactCents: 0;
    }
  | {
      field: "futureFeesCents";
      left: number;
      right: number;
      financialImpactCents: number;
    }
  | {
      field: "cureDeadline";
      left: string;
      right: string;
      financialImpactCents: 0;
    };

export interface OutcomeDivergence {
  differences: DivergenceDifference[];
  totalFinancialDivergenceCents: number;
}

export function compareOutcomes(
  left: CommercialOutcome,
  right: CommercialOutcome,
): OutcomeDivergence {
  const differences: DivergenceDifference[] = [];
  if (left.serviceCreditsCents !== right.serviceCreditsCents) {
    differences.push({
      field: "serviceCreditsCents",
      left: left.serviceCreditsCents,
      right: right.serviceCreditsCents,
      financialImpactCents: Math.abs(
        left.serviceCreditsCents - right.serviceCreditsCents,
      ),
    });
  }
  if (left.terminationAvailable !== right.terminationAvailable) {
    differences.push({
      field: "terminationAvailable",
      left: left.terminationAvailable,
      right: right.terminationAvailable,
      financialImpactCents: 0,
    });
  }
  if (left.futureFeesCents !== right.futureFeesCents) {
    differences.push({
      field: "futureFeesCents",
      left: left.futureFeesCents,
      right: right.futureFeesCents,
      financialImpactCents: Math.abs(
        left.futureFeesCents - right.futureFeesCents,
      ),
    });
  }
  if (left.cureDeadline !== right.cureDeadline) {
    differences.push({
      field: "cureDeadline",
      left: left.cureDeadline,
      right: right.cureDeadline,
      financialImpactCents: 0,
    });
  }
  return {
    differences,
    totalFinancialDivergenceCents: differences.reduce(
      (total, difference) => total + difference.financialImpactCents,
      0,
    ),
  };
}
