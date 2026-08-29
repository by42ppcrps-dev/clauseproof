import type { TestResult } from "../../domain/outcomeTests.js";
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

function words(identifier: string): string {
  return identifier.replaceAll("-", " ");
}

function money(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function expectedEvidence(result: TestResult): string {
  const termination = result.expected.terminationAvailable
    ? "termination available"
    : "termination unavailable";
  return `${termination}; ${money(result.expected.serviceCreditsCents)} credits`;
}

function actualEvidence(result: TestResult): string {
  const termination = result.actual.terminationAvailable
    ? "termination available"
    : "termination unavailable";
  return `${termination}; ${money(result.actual.serviceCreditsCents)} credits`;
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
  const eligible = verification?.eligibleForAcceptance === true;
  const outcomeSuitePassed =
    verification !== null &&
    verification.outcomeSuite.passedCount ===
      verification.outcomeSuite.totalCount;

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
        {verification ? (
          <span
            className={`verification-badge ${eligible ? "passed" : "failed"}`}
          >
            {eligible ? "All tests passed" : "Repair required"}
          </span>
        ) : null}
      </div>
      {verification ? (
        <>
          {!eligible ? (
            <div className="repair-callout" role="alert">
              <strong>Not eligible for acceptance.</strong>
              <p>
                Ask the browser agent to repair the semantic rule from the
                failed outcome and surviving-boundary evidence, then stage and
                test a replacement. The person’s lock remains unchanged.
              </p>
            </div>
          ) : null}
          <div className="score-grid">
            <div
              className={
                verification.outcomeSuite.passedCount ===
                verification.outcomeSuite.totalCount
                  ? "passed"
                  : "failed"
              }
            >
              <strong>
                {verification.outcomeSuite.passedCount}/
                {verification.outcomeSuite.totalCount}
              </strong>
              <span>Outcome tests</span>
            </div>
            <div
              className={
                verification.boundaryStrength.killedCount ===
                verification.boundaryStrength.totalCount
                  ? "passed"
                  : "failed"
              }
            >
              <strong>
                {verification.boundaryStrength.killedCount}/
                {verification.boundaryStrength.totalCount}
              </strong>
              <span>Altered rules caught</span>
            </div>
          </div>
          <div className="test-lists">
            <div>
              <h3>Six outcome examples</h3>
              <ul aria-label="Outcome test results">
                {verification.outcomeSuite.results.map((result) => (
                  <li
                    className={result.passed ? "test-pass" : "test-fail"}
                    key={result.testId}
                  >
                    <div className="test-result-heading">
                      <span className="result-icon" aria-hidden="true">
                        {result.passed ? "✓" : "×"}
                      </span>
                      <strong>{words(result.testId)}</strong>
                      <span className="result-status">
                        {result.passed ? "Pass" : "Fail"}
                      </span>
                    </div>
                    <div className="test-evidence">
                      <span>Expected: {expectedEvidence(result)}</span>
                      <span>Actual: {actualEvidence(result)}</span>
                      {result.failureReason ? (
                        <strong>{result.failureReason}</strong>
                      ) : null}
                      <span>{result.actual.reasons.join(" ")}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3>Eight altered-rule challenges</h3>
              <ul aria-label="Boundary strength results">
                {verification.boundaryStrength.results.map((result) => (
                  <li
                    className={result.killed ? "test-pass" : "test-fail"}
                    key={result.mutantId}
                  >
                    <div className="test-result-heading">
                      <span className="result-icon" aria-hidden="true">
                        {result.killed ? "✓" : "×"}
                      </span>
                      <strong>{result.description}</strong>
                      <span className="result-status">
                        {result.killed ? "Pass" : "Fail"}
                      </span>
                    </div>
                    <div className="test-evidence">
                      {result.killed ? (
                        <span>
                          Caught by:{" "}
                          {result.caughtByTestIds.map(words).join(", ")}
                        </span>
                      ) : (
                        <strong>
                          {outcomeSuitePassed
                            ? "Boundary gap: this altered rule matches every locked outcome example."
                            : "Repair evidence: this altered rule matches every locked outcome example."}
                        </strong>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
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
            Six outcome examples and eight altered-rule challenges wait for a
            staged clarification. Every result will show its actual pass or
            failure evidence.
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
