import type { CrashTestRecord } from "../../domain/workflow.js";

interface FuturesPanelProps {
  crashTest: CrashTestRecord | null;
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

export function FuturesPanel({
  crashTest,
  onRun,
  canRun,
  busy,
}: FuturesPanelProps) {
  return (
    <section className="panel futures-panel" aria-labelledby="futures-heading">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Modeled behavior</p>
          <h2 id="futures-heading">Two commercial futures</h2>
        </div>
        <span className="same-facts-badge">Same facts</span>
      </div>
      {crashTest ? (
        <>
          <div className="divergence-hero">
            <p>Financial divergence</p>
            <strong>
              {money(crashTest.divergence.totalFinancialDivergenceCents)}
            </strong>
          </div>
          <div className="future-grid">
            {crashTest.outcomes.map((outcome, index) => (
              <article
                className={`future-card future-${index === 0 ? "a" : "b"}`}
                key={index}
              >
                <p className="future-label">
                  Reading {index === 0 ? "A" : "B"}
                </p>
                <h3>
                  {index === 0
                    ? "Exclusive means exclusive"
                    : "Termination remains separate"}
                </h3>
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
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="future-empty">
          <div className="branch-preview" aria-hidden="true">
            <span>A</span>
            <i />
            <span>B</span>
          </div>
          <h3>The language has not been executed yet.</h3>
          <p>
            Stage two constrained readings, then run both against the exact same
            facts.
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
