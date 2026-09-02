import { DomainError } from "../domain/errors.js";
import type { WorkflowPhase } from "../domain/model.js";
import type { Actor } from "../domain/schemas.js";
import { hasHumanAuthority, type HumanUiActor } from "./humanAuthority.js";

export function normalizeServiceError(error: unknown): DomainError {
  return error instanceof DomainError
    ? error
    : new DomainError(
        "INTERNAL_ERROR",
        "ClauseProof could not complete the action.",
        "Inspect the current case before retrying.",
      );
}

export function auditActorFor(actor: HumanUiActor): Actor {
  return hasHumanAuthority(actor) ? { kind: "human-ui" } : { kind: "system" };
}

export function assertHumanAuthority(
  actor: HumanUiActor,
  action: string,
): void {
  if (!hasHumanAuthority(actor)) {
    throw new DomainError(
      "INVALID_INPUT",
      `Human UI authority is required to ${action}.`,
      "Use the visible human control in the page.",
    );
  }
}

export function shouldRecoverOutcomeLock(
  error: unknown,
  phase: WorkflowPhase,
): boolean {
  return (
    error instanceof DomainError &&
    phase === "redline_staged" &&
    ["RULE_MISMATCH", "STALE_PROPOSAL", "STALE_OUTCOME_LOCK"].includes(
      error.code,
    )
  );
}
