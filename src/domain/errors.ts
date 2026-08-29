export const domainErrorCodes = [
  "INVALID_INPUT",
  "INVALID_PHASE",
  "STALE_REVISION",
  "UNKNOWN_CLAUSE",
  "INTERPRETATIONS_NOT_DISTINCT",
  "UNKNOWN_INTERPRETATION_SET",
  "OUTCOME_NOT_LOCKED",
  "STALE_OUTCOME_LOCK",
  "RULE_MISMATCH",
  "UNKNOWN_PROPOSAL",
  "STALE_PROPOSAL",
  "TESTS_FAILED",
  "ALREADY_ACCEPTED",
  "INTERNAL_ERROR",
] as const;

export type DomainErrorCode = (typeof domainErrorCodes)[number];

export class DomainError extends Error {
  public constructor(
    public readonly code: DomainErrorCode,
    message: string,
    public readonly recovery: string | null,
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export function requirePhase(
  actual: string,
  expected: string,
  action: string,
): void {
  if (actual !== expected) {
    throw new DomainError(
      "INVALID_PHASE",
      `${action} requires phase ${expected}; current phase is ${actual}.`,
      "Inspect the current case and use the action available in its current phase.",
    );
  }
}
