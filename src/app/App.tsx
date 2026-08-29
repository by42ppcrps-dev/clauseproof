import { useState } from "react";

import type { WorkflowState } from "../domain/workflow.js";
import { ActivityRail } from "../features/activity/ActivityRail.js";
import { ContractPanel } from "../features/contract/ContractPanel.js";
import { FuturesPanel } from "../features/futures/FuturesPanel.js";
import { JudgePath } from "../features/guide/JudgePath.js";
import { OutcomeLockPanel } from "../features/outcome/OutcomeLockPanel.js";
import { RedlinePanel } from "../features/redline/RedlinePanel.js";
import { TestBench } from "../features/testbench/TestBench.js";
import { ScenarioTimeline } from "../features/timeline/ScenarioTimeline.js";
import { useClauseProof } from "../state/useClauseProof.js";
import { useWebMcpRegistry } from "../webmcp/useRegistry.js";

const phaseLabels: Record<WorkflowState["phase"], string> = {
  ready: "Ready to inspect",
  interpretations_staged: "Readings staged",
  divergence_visible: "Divergence visible",
  outcome_locked: "Outcome locked",
  redline_staged: "Clarification staged",
  verified: "Tests verified",
  accepted: "Revision accepted",
};

const judgePrompt =
  "Inspect the SLA remedy and material-breach clauses. Stage the two strongest materially different readings of what happens after two qualifying SLA misses. Cite only clauses visible in this page. Do not choose the intended business result for me.";

function writeWithLegacyClipboard(text: string): boolean {
  const previousFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : undefined;
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.append(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  previousFocus?.focus();
  return copied;
}

async function writeToClipboard(text: string): Promise<boolean> {
  const modernWrite = navigator.clipboard?.writeText.bind(navigator.clipboard);
  if (modernWrite) {
    const modernResult = await Promise.race([
      modernWrite(text).then(
        () => true,
        () => false,
      ),
      new Promise<boolean>((resolve) => {
        globalThis.setTimeout(() => resolve(false), 300);
      }),
    ]);
    if (modernResult) return true;
  }

  return writeWithLegacyClipboard(text);
}

export function App() {
  const demo = useClauseProof();
  const webMcpStatus = useWebMcpRegistry();
  const { state, busy } = demo;
  const [copyState, setCopyState] = useState<
    "idle" | "copying" | "copied" | "failed"
  >("idle");
  const exclusiveRemedy = state.case.contract.clauses.find(
    ({ id }) => id === "sla-exclusive-remedy",
  );

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
          <div className="phase-pill">
            <span />
            {phaseLabels[state.phase]}
          </div>
          <div className="mcp-status">{webMcpStatus}</div>
          <button className="quiet-button" onClick={copyPrompt} type="button">
            {copyState === "copied"
              ? "Prompt copied"
              : copyState === "failed"
                ? "Copy failed"
                : "Copy judge prompt"}
          </button>
          <button
            className="quiet-button reset-button"
            disabled={busy}
            onClick={demo.reset}
            type="button"
          >
            Reset
          </button>
          {state.phase === "ready" ? (
            <button
              className="secondary-button"
              disabled={busy}
              onClick={demo.stageSampleInterpretations}
              type="button"
            >
              {busy ? "Staging…" : "Use sample readings"}
            </button>
          ) : null}
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
            aria-label="Judge prompt"
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
        </div>
        <p>
          One synthetic agreement. Two reasonable readings. The page executes
          both and shows where the commercial futures split.
        </p>
      </section>

      <JudgePath phase={state.phase} />

      {demo.error ? (
        <div className="error-banner" role="alert">
          {demo.error}
        </div>
      ) : null}

      <div className="workspace-grid">
        <ContractPanel contract={state.case.contract} />
        <ScenarioTimeline scenario={state.case.scenario} />
        <FuturesPanel
          busy={busy}
          canRun={state.phase === "interpretations_staged"}
          crashTest={state.crashTest}
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
          canStage={state.phase === "outcome_locked"}
          onStage={demo.stageSampleRedline}
          originalText={exclusiveRemedy?.text ?? "Exclusive-remedy clause"}
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
