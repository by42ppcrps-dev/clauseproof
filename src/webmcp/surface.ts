import type { WebMcpToolName, WorkflowPhase } from "../domain/model.js";

export const agentToolsByPhase: Readonly<
  Record<WorkflowPhase, readonly WebMcpToolName[]>
> = {
  ready: ["inspect_contract_case", "stage_interpretations"],
  interpretations_staged: ["inspect_contract_case", "run_contract_crash_test"],
  divergence_visible: ["inspect_contract_case"],
  outcome_locked: ["inspect_contract_case", "propose_clarifying_redline"],
  redline_staged: ["inspect_contract_case", "verify_contract_tests"],
  verified: ["inspect_contract_case"],
  accepted: ["inspect_contract_case"],
};

export const agentToolLabels = {
  inspect_contract_case: "Inspect the current case",
  stage_interpretations: "Stage modeled readings",
  run_contract_crash_test: "Run the same-facts crash test",
  propose_clarifying_redline: "Stage a clarifying rule",
  verify_contract_tests: "Run outcome and boundary tests",
} as const satisfies Record<WebMcpToolName, string>;

export const humanOnlyActions = [
  { id: "lockOutcome", label: "Lock intended behavior" },
  { id: "acceptRedline", label: "Accept tested revision" },
  { id: "resetDemo", label: "Reset case" },
] as const;
