import type { WorkflowState } from "../../domain/workflow.js";

interface JudgePathProps {
  phase: WorkflowState["phase"];
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
  outcome_locked: "Agent stages a clarification",
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

export function JudgePath({ phase }: JudgePathProps) {
  return (
    <section className="judge-path" aria-label="Judge path">
      <div className="judge-path-copy">
        <p className="eyebrow">Judge path</p>
        <h2>Follow one clause from ambiguity to proof.</h2>
        <p>
          Watch the same language create two futures. A person sets intent; the
          agent may clarify and test it, but cannot lock or accept it.
        </p>
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
        <strong>{nextStep[phase]}</strong>
      </div>
    </section>
  );
}
