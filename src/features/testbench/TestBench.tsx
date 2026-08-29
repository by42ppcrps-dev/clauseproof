import type { VerificationRecord } from "../../domain/workflow.js";

interface TestBenchProps {
  verification: VerificationRecord | null;
  canVerify: boolean;
  canAccept: boolean;
  accepted: boolean;
  busy: boolean;
  onVerify: () => void;
  onAccept: () => void;
}

export function TestBench({
  verification,
  canVerify,
  canAccept,
  accepted,
  busy,
  onVerify,
  onAccept,
}: TestBenchProps) {
  return (
    <section
      className="panel testbench-panel"
      aria-labelledby="testbench-heading"
    >
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Deterministic contract tests</p>
          <h2 id="testbench-heading">Outcome + boundary strength</h2>
        </div>
        {verification ? <span className="verified-badge">Verified</span> : null}
      </div>
      {verification ? (
        <>
          <div className="score-grid">
            <div>
              <strong>
                {verification.outcomeSuite.passedCount}/
                {verification.outcomeSuite.totalCount}
              </strong>
              <span>Outcome tests</span>
            </div>
            <div>
              <strong>
                {verification.boundaryStrength.killedCount}/
                {verification.boundaryStrength.totalCount}
              </strong>
              <span>Altered rules caught</span>
            </div>
          </div>
          <div className="test-lists">
            <ul aria-label="Outcome test results">
              {verification.outcomeSuite.results.map((result) => (
                <li key={result.testId}>
                  <span aria-hidden="true">✓</span>
                  {result.testId.replaceAll("-", " ")}
                </li>
              ))}
            </ul>
            <ul aria-label="Boundary strength results">
              {verification.boundaryStrength.results.map((result) => (
                <li key={result.mutantId}>
                  <span aria-hidden="true">✓</span>
                  {result.description}
                </li>
              ))}
            </ul>
          </div>
          <button
            className="human-button accept-button"
            disabled={!canAccept || busy || accepted}
            onClick={onAccept}
            type="button"
          >
            {accepted ? "Revision accepted" : "Accept tested revision"}
          </button>
        </>
      ) : (
        <div className="testbench-empty">
          <p>
            Six outcome cases and eight altered-rule challenges wait for a
            staged clarification.
          </p>
          <button
            className="primary-button"
            disabled={!canVerify || busy}
            onClick={onVerify}
            type="button"
          >
            Run all contract tests
          </button>
        </div>
      )}
    </section>
  );
}
