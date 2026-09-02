import type { WorkflowState } from "../../domain/workflow.js";

interface JudgePathProps {
  candidateOccurrences: number | null;
  lockedOccurrences: number | null;
  phase: WorkflowState["phase"];
  repairNeeded: boolean;
}

const phaseOrder: WorkflowState["phase"][] = [
  "ready",
  "interpretations_staged",
  "divergence_visible",
  "outcome_locked",
  "redline_staged",
  "verified",
  "accepted",
];

const nextStep: Record<WorkflowState["phase"], string> = {
  ready: "Stage two readings",
  interpretations_staged: "Run the same facts",
  divergence_visible: "Person locks intended behavior",
  outcome_locked: "Agent stages a different candidate",
  redline_staged: "Run outcome and boundary tests",
  verified: "Person accepts the tested revision",
  accepted: "Proof complete",
};

const proofSteps = [
  { completeAt: "divergence_visible", label: "Ambiguity exposed" },
  { completeAt: "outcome_locked", label: "Intent locked by person" },
  { completeAt: "redline_staged", label: "Clarification staged" },
  { completeAt: "verified", label: "Boundary proven" },
] as const;

function phaseIsAtLeast(
  phase: WorkflowState["phase"],
  target: WorkflowState["phase"],
): boolean {
  return phaseOrder.indexOf(phase) >= phaseOrder.indexOf(target);
}

function currentPathCopy(
  phase: WorkflowState["phase"],
  candidateOccurrences: number | null,
  lockedOccurrences: number | null,
  repairNeeded: boolean,
): string {
  if (candidateOccurrences !== null && lockedOccurrences !== null) {
    if (phase === "verified" || phase === "accepted") {
      return `The tested candidate matches the person’s ${lockedOccurrences}-occurrence lock. The person still owns acceptance.`;
    }
    if (repairNeeded) {
      return `The ${candidateOccurrences}-occurrence candidate failed against the person’s ${lockedOccurrences}-occurrence lock. Its outcome failure and surviving rule are repair evidence; the agent still cannot lock or accept.`;
    }
    if (phase === "redline_staged") {
      return `The staged candidate requires ${candidateOccurrences} occurrences; the person’s lock requires ${lockedOccurrences}. Deterministic tests now decide whether they match.`;
    }
    if (phase === "outcome_locked") {
      return `The current lock requires ${lockedOccurrences} occurrences. The agent deliberately stages a ${candidateOccurrences}-occurrence candidate, learns from the real failures, and repairs it—but cannot lock or accept.`;
    }
  }
  return "Watch the same language create two futures. A person sets intent. In the walkthrough, a three-occurrence candidate fails against a two-occurrence lock, then the agent repairs it from the failing test—but cannot lock or accept.";
}

export function JudgePath({
  candidateOccurrences,
  lockedOccurrences,
  phase,
  repairNeeded,
}: JudgePathProps) {
  const currentNext =
    phase === "outcome_locked" &&
    candidateOccurrences !== null &&
    lockedOccurrences !== null
      ? repairNeeded
        ? `Agent repairs ${candidateOccurrences} misses to the locked ${lockedOccurrences}`
        : `Agent stages ${candidateOccurrences} misses against the locked ${lockedOccurrences}`
      : nextStep[phase];
  const pathCopy = currentPathCopy(
    phase,
    candidateOccurrences,
    lockedOccurrences,
    repairNeeded,
  );

  return (
    <section className="judge-path" aria-label="Guided walkthrough">
      <div className="judge-path-copy">
        <p className="eyebrow">Guided walkthrough · about 3 minutes</p>
        <h2>Follow one clause from ambiguity to proof.</h2>
        <p>{pathCopy}</p>
      </div>
      <ol aria-label="Proof progress">
        {proofSteps.map((step, index) => {
          const complete = phaseIsAtLeast(phase, step.completeAt);
          return (
            <li className={complete ? "complete" : ""} key={step.label}>
              <span aria-hidden="true">{complete ? "✓" : index + 1}</span>
              {step.label}
            </li>
          );
        })}
      </ol>
      <div className="judge-next" aria-live="polite">
        <span>{phase === "accepted" ? "Result" : "Next"}</span>
        <strong>{currentNext}</strong>
      </div>
    </section>
  );
}
