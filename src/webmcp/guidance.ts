import type { WorkflowPhase } from "../domain/model.js";
import type { RecoveryAction } from "./output.js";

export const readingVocabulary = {
  exclusiveRemedyScope: {
    all_sla_related_remedies:
      "credits displace every SLA remedy, including termination (vendor-favorable)",
    sla_compensation_only:
      "credits only cap money; breach termination survives (customer-favorable)",
  },
  repeatedSlaFailureMayBeMaterialBreach:
    "true if repeated misses can be an uncured material breach",
  creditsSurviveTermination:
    "true if accrued credits remain payable after exit",
} as const;

export function nextAction(phase: WorkflowPhase): RecoveryAction | null {
  const actions: Partial<Record<WorkflowPhase, RecoveryAction>> = {
    ready: {
      action: "stage_interpretations",
      reason: "Stage two materially different clause-cited readings.",
    },
    interpretations_staged: {
      action: "run_contract_crash_test",
      reason: "Execute the current readings against the same facts.",
    },
    divergence_visible: {
      action: "wait_for_person_outcome_lock",
      reason: "Only the person may define and lock the intended behavior.",
    },
    outcome_locked: {
      action: "propose_clarifying_redline",
      reason:
        "Stage or revise a structured rule against the human-owned outcome lock.",
    },
    redline_staged: {
      action: "verify_contract_tests",
      reason: "Run every outcome and boundary test against the proposal.",
    },
  };
  return actions[phase] ?? null;
}
