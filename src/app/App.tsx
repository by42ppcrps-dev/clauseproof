import { useState } from "react";

import type { WorkflowState } from "../domain/workflow.js";
import { ActivityRail } from "../features/activity/ActivityRail.js";
import { AuthorityBoundary } from "../features/authority/AuthorityBoundary.js";
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

function candidateOccurrencesFor(lockedOccurrences: number): number {
  return lockedOccurrences < 4 ? lockedOccurrences + 1 : lockedOccurrences - 1;
}

function occurrenceWord(value: number): string {
  const words: Record<number, string> = { 2: "two", 3: "three", 4: "four" };
  return words[value] ?? String(value);
}

function judgePromptFor(state: WorkflowState): string {
  if (state.phase === "ready") {
    return "Inspect the SLA remedy and material-breach clauses. Stage exactly two materially different readings of what happens after two qualifying SLA misses using only these supported semantic combinations: reading 1 — exclusiveRemedyScope=all_sla_related_remedies, repeatedSlaFailureMayBeMaterialBreach=false, creditsSurviveTermination=true; reading 2 — exclusiveRemedyScope=sla_compensation_only, repeatedSlaFailureMayBeMaterialBreach=true, creditsSurviveTermination=true. Cite both relevant clauses visible in this page, explain each semantic choice, and do not choose the intended business result for me. Then run both readings against the same facts.";
  }
  if (state.phase === "interpretations_staged") {
    return "Run the current staged readings against the same visible facts. Report each commercial outcome and the exact semantic choices that create the divergence. Do not choose the intended business result for me.";
  }
  if (state.phase === "divergence_visible") {
    return "Explain the two displayed commercial futures and the exact clause semantics that caused the divergence. Do not choose or lock the intended result; that decision belongs to me.";
  }
  if (state.phase === "outcome_locked" && state.verification) {
    const candidateOccurrences =
      state.proposal?.semanticRule.trigger.requiredOccurrences;
    const lockedOccurrences =
      state.outcomeLock?.expectedRule.trigger.requiredOccurrences;
    const failedOutcomes =
      state.verification.outcomeSuite.results
        .filter(({ passed }) => !passed)
        .map(({ testId }) => testId)
        .join(", ") || "none";
    const survivingBoundaries =
      state.verification.boundaryStrength.results
        .filter(({ killed }) => !killed)
        .map(({ mutantId }) => mutantId)
        .join(", ") || "none";
    return `Staged candidate: ${candidateOccurrences ?? "unknown"} qualifying misses. Locked intent: ${lockedOccurrences ?? "unknown"} qualifying misses. The candidate passed ${state.verification.outcomeSuite.passedCount}/${state.verification.outcomeSuite.totalCount} outcomes and caught ${state.verification.boundaryStrength.killedCount}/${state.verification.boundaryStrength.totalCount} altered rules. Failed outcome: ${failedOutcomes}. Surviving boundary: ${survivingBoundaries}. Repair the proposal to match my locked rule, stage the replacement clarification, and rerun every test. Do not invent terms and do not accept the revision.`;
  }
  if (state.phase === "outcome_locked") {
    const lockedOccurrences =
      state.outcomeLock?.expectedRule.trigger.requiredOccurrences;
    if (lockedOccurrences !== undefined) {
      const candidateOccurrences = candidateOccurrencesFor(lockedOccurrences);
      return `Inspect my locked outcome. First stage a candidate that requires ${occurrenceWord(candidateOccurrences)} qualifying misses while matching every other locked term; my lock requires ${lockedOccurrences}. Run every contract test, use the returned failure and surviving-boundary evidence to repair the proposal to my locked rule, then stage and retest the replacement. Do not accept the revision.`;
    }
    return "Inspect my locked outcome, stage a deliberately different supported occurrence rule, and run every contract test. Use only returned evidence to repair the proposal to my lock. Do not accept the revision.";
  }
  if (state.phase === "redline_staged") {
    return "Run every outcome and altered-rule boundary test against the staged clarification. Report the exact failures and counterexamples. If it fails, repair and retest; do not accept the revision.";
  }
  if (state.phase === "verified") {
    return "Summarize the passing outcome and boundary evidence, then state clearly that only I can accept the tested revision. Do not attempt acceptance.";
  }
  return "Inspect the accepted revision and summarize its tested behavioral boundary without making legal conclusions.";
}

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
  const judgePrompt = judgePromptFor(state);
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
          <div className="mcp-status">{webMcpStatus}</div>
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
        <div className="agent-instruction" aria-label="Browser-agent task">
          <p className="eyebrow">Current browser-agent task</p>
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
                : "Copy judge prompt"}
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
        <ScenarioTimeline scenario={state.case.scenario} />
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
