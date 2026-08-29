import type { RedlineProposal } from "../../domain/workflow.js";

interface RedlinePanelProps {
  proposal: RedlineProposal | null;
  canStage: boolean;
  busy: boolean;
  originalText: string;
  onStage: () => void;
}

export function RedlinePanel({
  proposal,
  canStage,
  busy,
  originalText,
  onStage,
}: RedlinePanelProps) {
  return (
    <section className="panel redline-panel" aria-labelledby="redline-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Staged clarification</p>
          <h2 id="redline-heading">Smallest explicit boundary</h2>
        </div>
        <span className="stage-badge">Stage ≠ accept</span>
      </div>
      {proposal ? (
        <div className="redline-diff">
          <div className="diff-block removed">
            <span>Before</span>
            <p>{originalText}</p>
          </div>
          <div className="diff-block added">
            <span>After</span>
            <p>{proposal.proposedText}</p>
          </div>
          <div className="semantic-rule-card">
            <p>Executable meaning</p>
            <strong>2 misses · 6 months · 10-day cure</strong>
            <span>Termination without penalty · credits preserved</span>
          </div>
        </div>
      ) : (
        <div className="redline-empty">
          <p>
            A clarification can be staged only after the person locks the
            expected behavior.
          </p>
          <button
            className="secondary-button"
            disabled={!canStage || busy}
            onClick={onStage}
            type="button"
          >
            Use sample clarification
          </button>
        </div>
      )}
    </section>
  );
}
