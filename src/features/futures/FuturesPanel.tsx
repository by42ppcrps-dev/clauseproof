import type {
  ContractRevision,
  ModeledInterpretation,
} from "../../domain/schemas.js";
import type {
  CrashTestRecord,
  InterpretationSet,
} from "../../domain/workflow.js";

interface FuturesPanelProps {
  crashTest: CrashTestRecord | null;
  interpretations: InterpretationSet["interpretations"] | null;
  clauses: ContractRevision["clauses"];
  onRun: () => void;
  canRun: boolean;
  busy: boolean;
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function scopeLabel(
  scope: ModeledInterpretation["semantics"]["exclusiveRemedyScope"],
): string {
  return scope === "all_sla_related_remedies"
    ? "Exclusive remedy covers all SLA-related remedies"
    : "Exclusive remedy limits SLA compensation only";
}

function semanticLabels(
  interpretation: ModeledInterpretation,
): [string, string, string] {
  return [
    scopeLabel(interpretation.semantics.exclusiveRemedyScope),
    interpretation.semantics.repeatedSlaFailureMayBeMaterialBreach
      ? "Repeated SLA failure may be a material breach"
      : "Repeated SLA failure is not modeled as a material breach",
    interpretation.semantics.creditsSurviveTermination
      ? "Accrued credits survive termination"
      : "Accrued credits do not survive termination",
  ];
}

export function FuturesPanel({
  crashTest,
  interpretations,
  clauses,
  onRun,
  canRun,
  busy,
}: FuturesPanelProps) {
  const evidence =
    crashTest && interpretations
      ? {
          divergence: crashTest.divergence,
          branches: [
            {
              interpretation: interpretations[0],
              outcome: crashTest.outcomes[0],
            },
            {
              interpretation: interpretations[1],
              outcome: crashTest.outcomes[1],
            },
          ] as const,
        }
      : null;

  return (
    <section className="panel futures-panel" aria-labelledby="futures-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Modeled behavior</p>
          <h2 id="futures-heading">Two commercial futures</h2>
        </div>
        <span className="same-facts-badge">Same facts</span>
      </div>
      {evidence ? (
        <>
          <div className="divergence-hero">
            <p>Financial divergence</p>
            <strong>
              {money(evidence.divergence.totalFinancialDivergenceCents)}
            </strong>
          </div>
          <div className="future-grid">
            {evidence.branches.map(({ interpretation, outcome }, index) => {
              return (
                <article
                  className={`future-card future-${index === 0 ? "a" : "b"}`}
                  key={interpretation.id}
                >
                  <p className="future-label">Modeled reading {index + 1}</p>
                  <h3>{interpretation.label}</h3>
                  <div className="reading-evidence">
                    <p className="evidence-label">Clause citations</p>
                    <ul className="citation-list">
                      {interpretation.clauseIds.map((clauseId) => {
                        const clause = clauses.find(
                          ({ id }) => id === clauseId,
                        );
                        return (
                          <li key={clauseId}>
                            <span>{clause?.heading ?? clauseId}</span>
                            <code>{clauseId}</code>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="reading-rationale">
                      {interpretation.rationale}
                    </p>
                    <ul
                      className="semantic-list"
                      aria-label={`${interpretation.label} semantic choices`}
                    >
                      {semanticLabels(interpretation).map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  </div>
                  <dl>
                    <div>
                      <dt>Service credits</dt>
                      <dd>{money(outcome.serviceCreditsCents)}</dd>
                    </div>
                    <div>
                      <dt>Termination</dt>
                      <dd>
                        {outcome.terminationAvailable
                          ? "Available"
                          : "Unavailable"}
                      </dd>
                    </div>
                    <div>
                      <dt>Future fees</dt>
                      <dd>{money(outcome.futureFeesCents)}</dd>
                    </div>
                  </dl>
                  <p className="outcome-reason">{outcome.reasons.join(" ")}</p>
                </article>
              );
            })}
          </div>
        </>
      ) : crashTest ? (
        <div className="evidence-error" role="alert">
          The crash-test result is missing its staged reading evidence. Reset
          the case and run both readings again.
        </div>
      ) : (
        <div className="future-empty">
          <div className="branch-preview" aria-hidden="true">
            <span>A</span>
            <i />
            <span>B</span>
          </div>
          <h3>The language has not been executed yet.</h3>
          <p>
            Ask the browser agent to stage two clause-cited readings, then run
            both against the exact same facts.
          </p>
          <button
            className="primary-button"
            disabled={!canRun || busy}
            onClick={onRun}
            type="button"
          >
            {busy ? "Running…" : "Run crash test"}
          </button>
        </div>
      )}
    </section>
  );
}
