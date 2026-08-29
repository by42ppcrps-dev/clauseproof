import type { ClarificationRule } from "../../domain/schemas.js";
import type { RedlineProposal } from "../../domain/workflow.js";

interface RedlinePanelProps {
  proposal: RedlineProposal | null;
  candidateOccurrences: number | null;
  lockedOccurrences: number | null;
  canStage: boolean;
  busy: boolean;
  onStage: () => void;
}

function percentage(basisPoints: number): string {
  return `${(basisPoints / 100).toFixed(2).replace(/\.00$/, "")}%`;
}

function semanticSummary(rule: ClarificationRule) {
  return {
    trigger: `${rule.trigger.requiredOccurrences} misses`,
    window: `${rule.trigger.rollingWindowMonths}-month window`,
    cure: `${rule.cureDays}-day cure`,
    threshold: `Monthly uptime ${rule.trigger.comparator} ${percentage(rule.trigger.thresholdBps)}`,
    effect: "Customer may terminate without penalty",
    credits: rule.preserveAccruedCredits
      ? "Accrued credits preserved"
      : "Accrued credits not preserved",
  };
}

export function RedlinePanel({
  proposal,
  candidateOccurrences,
  lockedOccurrences,
  canStage,
  busy,
  onStage,
}: RedlinePanelProps) {
  const summary = proposal ? semanticSummary(proposal.semanticRule) : null;

  return (
    <section className="panel redline-panel" aria-label="Clarifying redline">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Staged clarification</p>
          <h2>Smallest explicit boundary</h2>
        </div>
        <span className="stage-badge">Stage ≠ accept</span>
      </div>
      {proposal && summary ? (
        <>
          <div className="redline-diff">
            <div className="diff-block removed">
              <span>Before · exact source text</span>
              <p>{proposal.originalText}</p>
            </div>
            <div className="diff-block added">
              <span>After · generated from staged rule</span>
              <p>{proposal.proposedText}</p>
            </div>
            <div className="semantic-rule-card">
              <p>Executable meaning supplied by the staged proposal</p>
              <ul className="rule-chip-list">
                <li>{summary.trigger}</li>
                <li>{summary.window}</li>
                <li>{summary.cure}</li>
              </ul>
              <span>{summary.threshold}</span>
              <span>{summary.effect}</span>
              <span>{summary.credits}</span>
            </div>
          </div>
          <div className="proposal-evidence">
            <p className="evidence-label">Staging rationale</p>
            <p>{proposal.rationale}</p>
            <p className="target-clauses">
              Targets: {proposal.targetClauseIds.join(", ")}
            </p>
          </div>
          {canStage ? (
            <div className="repair-redline-callout" role="status">
              <div>
                <strong>
                  {candidateOccurrences !== null && lockedOccurrences !== null
                    ? `The ${candidateOccurrences}-occurrence candidate did not prove the ${lockedOccurrences}-occurrence lock.`
                    : "This candidate did not prove the locked intent."}
                </strong>
                <p>
                  Ask the browser agent to repair the semantic rule from the
                  returned counterexample, then stage a replacement.
                </p>
              </div>
              <button
                className="quiet-button fallback-button"
                disabled={busy}
                onClick={onStage}
                type="button"
              >
                Stage locked-rule sample (manual fallback)
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="redline-empty">
          <div>
            <strong>Agent path</strong>
            <p>
              {candidateOccurrences !== null && lockedOccurrences !== null
                ? `Current lock requires ${lockedOccurrences} qualifying misses. Stage a ${candidateOccurrences}-occurrence candidate that matches every other locked term; the real failure and survivor evidence will direct its repair.`
                : "After the person locks intent, ask the browser agent to stage a deliberately different supported occurrence rule. The real failure and survivor evidence will direct its repair."}
            </p>
          </div>
          <div className="fallback-action">
            <span>Without a browser agent</span>
            <button
              className="quiet-button fallback-button"
              disabled={!canStage || busy}
              onClick={onStage}
              type="button"
            >
              Stage locked-rule sample (manual fallback)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
