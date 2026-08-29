export const workflowPhases = [
  "ready",
  "interpretations_staged",
  "divergence_visible",
  "outcome_locked",
  "redline_staged",
  "verified",
  "accepted",
] as const;

export const clauseIds = [
  "sla-commitment",
  "sla-exclusive-remedy",
  "material-breach",
] as const;

export const webMcpToolNames = [
  "inspect_contract_case",
  "stage_interpretations",
  "run_contract_crash_test",
  "propose_clarifying_redline",
  "verify_contract_tests",
] as const;

export const exclusiveRemedyScopes = [
  "sla_compensation_only",
  "all_sla_related_remedies",
] as const;

export const comparisonOperators = ["below", "below_or_equal"] as const;

export const clarificationEffects = [
  "customer_may_terminate_without_penalty",
  "none",
] as const;

export type MoneyCents = number;
export type BasisPoints = number;
export type Revision = number;

export type WorkflowPhase = (typeof workflowPhases)[number];
export type ClauseId = (typeof clauseIds)[number];
export type WebMcpToolName = (typeof webMcpToolNames)[number];
export type ExclusiveRemedyScope = (typeof exclusiveRemedyScopes)[number];
export type ComparisonOperator = (typeof comparisonOperators)[number];
export type ClarificationEffect = (typeof clarificationEffects)[number];
