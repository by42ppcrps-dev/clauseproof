import type { DomainErrorCode } from "../domain/errors.js";
import type { ServiceFailure } from "../application/serviceTypes.js";

export interface RecoveryAction {
  action: string;
  reason: string;
}

export interface ToolSuccess<T> {
  ok: true;
  data: T;
  next: RecoveryAction | null;
}

export interface ToolFailure {
  ok: false;
  error: {
    code: DomainErrorCode;
    message: string;
    currentRevision: number;
    recovery: RecoveryAction;
  };
}

export type ToolResult<T> = ToolSuccess<T> | ToolFailure;

export function invalidInputFailure(
  currentRevision: number,
  message: string,
): ToolFailure {
  return {
    ok: false,
    error: {
      code: "INVALID_INPUT",
      message,
      currentRevision,
      recovery: {
        action: "retry_with_valid_input",
        reason:
          "Remove unknown fields and satisfy every documented input bound.",
      },
    },
  };
}

function recoveryAction(code: DomainErrorCode, reason: string | null): string {
  if (code === "OUTCOME_NOT_LOCKED") return "wait_for_person_outcome_lock";
  if (code === "RULE_MISMATCH") return "revise_semantic_rule";
  if (code === "UNKNOWN_CLAUSE") return "inspect_visible_clauses";
  if (code === "INTERPRETATIONS_NOT_DISTINCT") return "revise_interpretations";
  if (code === "TESTS_FAILED") return "revise_redline";
  return reason ? "inspect_contract_case" : "retry_current_action";
}

export function serviceFailure(failure: ServiceFailure): ToolFailure {
  return {
    ok: false,
    error: {
      ...failure.error,
      recovery: {
        action: recoveryAction(failure.error.code, failure.error.recovery),
        reason: failure.error.recovery ?? "Retry the current action once.",
      },
    },
  };
}
