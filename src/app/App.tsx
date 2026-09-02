import { useState } from "react";

import { writeToClipboard } from "./clipboard.js";

import type { WorkflowState } from "../domain/workflow.js";
import { ActivityRail } from "../features/activity/ActivityRail.js";
import { AuthorityBoundary } from "../features/authority/AuthorityBoundary.js";
import { ContractPanel } from "../features/contract/ContractPanel.js";
import { FuturesPanel } from "../features/futures/FuturesPanel.js";
import {
  agentPromptFor,
  candidateOccurrencesFor,
} from "../features/guide/agentPrompts.js";
import { JudgePath } from "../features/guide/JudgePath.js";
import { OutcomeLockPanel } from "../features/outcome/OutcomeLockPanel.js";
import { RedlinePanel } from "../features/redline/RedlinePanel.js";
import { TestBench } from "../features/testbench/TestBench.js";
import { ScenarioTimeline } from "../features/timeline/ScenarioTimeline.js";
import { useClauseProof } from "../state/useClauseProof.js";
import {
  useWebMcpRegistry,
  webMcpUnavailableHint,
} from "../webmcp/useRegistry.js";

const phaseLabels: Record<WorkflowState["phase"], string> = {
  ready: "Ready to inspect",
  interpretations_staged: "Readings staged",
  divergence_visible: "Divergence visible",
  outcome_locked: "Outcome locked",
  redline_staged: "Clarification staged",
  verified: "Tests verified",
  accepted: "Revision accepted",
};

export function App() {
  const demo = useClauseProof();
  const webMcpStatus = useWebMcpRegistry();
  const { state, busy } = demo;
  const [copyState, setCopyState] = useState<
    "idle" | "copying" | "copied" | "failed"
  >("idle");
  const judgePrompt = agentPromptFor(state);
  const repairNeeded =
    state.verification !== null && !state.verification.eligibleForAcceptance;
  const lockedOccurrences =
    state.outcomeLock?.expectedRule.trigger.requiredOccurrences ?? null;
  const candidateOccurrences =
    state.proposal?.semanticRule.trigger.requiredOccurrences ??
    (lockedOccurrences === null
      ? null
      : candidateOccurrencesFor(lockedOccurrences));

  async function copyPrompt() {
    setCopyState("copying");
    const copied = await writeToClipboard(judgePrompt);
    setCopyState(copied ? "copied" : "failed");
    if (copied) {
      globalThis.setTimeout(() => setCopyState("idle"), 1_500);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            CP
          </div>
          <div>
            <p className="brand-name">ClauseProof</p>
            <p className="brand-tagline">Unit tests for contract language</p>
          </div>
        </div>
        <div className="topbar-actions">
          <div className={`phase-pill ${repairNeeded ? "failed" : ""}`}>
            <span />
            {repairNeeded ? "Candidate failed tests" : phaseLabels[state.phase]}
          </div>
          <div
            className="mcp-status"
            title={
              webMcpStatus.includes("not detected")
                ? webMcpUnavailableHint
                : "Tools are registered through document.modelContext"
            }
          >
            {webMcpStatus}
          </div>
          <button
            className="quiet-button reset-button"
            disabled={busy}
            onClick={demo.reset}
            type="button"
          >
            Reset
          </button>
        </div>
      </header>

      {copyState === "copying" || copyState === "failed" ? (
        <section className="copy-fallback" role="status">
          <p>
            {copyState === "failed"
              ? "Your browser blocked clipboard access. Select and copy this prompt:"
              : "Copying… The prompt remains selectable below."}
          </p>
          <textarea
            aria-label="Browser-agent prompt"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={judgePrompt}
          />
        </section>
      ) : null}

      <section className="hero-copy" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Contract behavior testbench</p>
          <h1 id="page-title">
            Crash-test ambiguous clauses <em>before the real world does.</em>
          </h1>
          <p className="hero-subhead">
            One SLA clause. Two reasonable readings. $80,000 apart. Your browser
            agent stages the readings and repairs the fix, this page runs the
            numbers and the tests, and you decide what the contract should do.
          </p>
        </div>
        <div className="agent-instruction" aria-label="Browser-agent task">
          <p className="eyebrow">Paste this into your browser agent</p>
          <p>{judgePrompt}</p>
          <button
            className="secondary-button"
            onClick={copyPrompt}
            type="button"
          >
            {copyState === "copied"
              ? "Prompt copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy prompt"}
          </button>
        </div>
      </section>

      <JudgePath
        candidateOccurrences={candidateOccurrences}
        lockedOccurrences={lockedOccurrences}
        phase={state.phase}
        repairNeeded={repairNeeded}
      />

      <AuthorityBoundary phase={state.phase} />

      {state.phase === "ready" ? (
        <section className="manual-fallback-strip" aria-label="Manual fallback">
          <div>
            <strong>Manual fallback</strong>
            <span>
              No browser agent available? Stage the canonical fixture through
              the same application service.
            </span>
          </div>
          <button
            className="quiet-button fallback-button"
            disabled={busy}
            onClick={demo.stageSampleInterpretations}
            type="button"
          >
            {busy ? "Staging…" : "Stage sample readings (manual fallback)"}
          </button>
        </section>
      ) : null}

      {demo.error ? (
        <div className="error-banner" role="alert">
          {demo.error}
        </div>
      ) : null}

      <div className="workspace-grid">
        <ContractPanel contract={state.case.contract} />
        <ScenarioTimeline
          scenario={state.case.scenario}
          slaThresholdBps={state.case.contract.terms.slaThresholdBps}
        />
        <FuturesPanel
          busy={busy}
          canRun={state.phase === "interpretations_staged"}
          clauses={state.case.contract.clauses}
          crashTest={state.crashTest}
          interpretations={state.interpretationSet?.interpretations ?? null}
          onRun={demo.runCrashTest}
        />
      </div>

      <div className="decision-grid">
        <OutcomeLockPanel
          busy={busy}
          canLock={state.phase === "divergence_visible"}
          onLock={demo.lockOutcome}
          outcomeLock={state.outcomeLock}
        />
        <RedlinePanel
          busy={busy}
          candidateOccurrences={candidateOccurrences}
          canStage={state.phase === "outcome_locked"}
          lockedOccurrences={lockedOccurrences}
          onStage={demo.stageSampleRedline}
          proposal={state.proposal}
        />
      </div>

      <TestBench
        accepted={state.phase === "accepted"}
        busy={busy}
        canAccept={
          state.phase === "verified" &&
          Boolean(state.verification?.eligibleForAcceptance)
        }
        canVerify={state.phase === "redline_staged"}
        onAccept={demo.acceptRedline}
        onVerify={demo.verifyRedline}
        verification={state.verification}
      />

      <ActivityRail events={state.events} />

      <footer>
        ClauseProof tests modeled commercial behavior in a synthetic agreement.
        It does not predict a court ruling, determine enforceability, or provide
        legal advice.
      </footer>
    </main>
  );
}
