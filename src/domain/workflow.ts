import type { BoundaryStrengthResult } from "./boundaryStrength.js";
import { DomainError, requirePhase } from "./errors.js";
import type { OutcomeDivergence } from "./divergence.js";
import type { OutcomeSuiteResult } from "./outcomeTests.js";
import { parseCanonicalRedline, renderCanonicalRedline } from "./redline.js";
import type {
  Actor,
  CanonicalCase,
  ClarificationRule,
  CommercialOutcome,
  ModeledInterpretation,
  OutcomeTest,
} from "./schemas.js";
import type { WorkflowPhase } from "./model.js";

export interface InterpretationSet {
  id: string;
  baseRevision: number;
  scenarioId: string;
  interpretations: [ModeledInterpretation, ModeledInterpretation];
  fingerprint: string;
}

export interface CrashTestRecord {
  interpretationSetId: string;
  outcomes: [CommercialOutcome, CommercialOutcome];
  divergence: OutcomeDivergence;
}

export interface OutcomeLock {
  id: string;
  baseRevision: number;
  createdBy: "human-ui";
  sourceCase: CanonicalCase;
  expectedRule: ClarificationRule;
  tests: OutcomeTest[];
  fingerprint: string;
}

export interface RedlineProposal {
  id: string;
  baseRevision: number;
  outcomeLockId: string;
  outcomeLockFingerprint: string;
  targetClauseIds: ClarificationRule["overridesClauseIds"];
  originalText: string;
  proposedText: string;
  semanticRule: ClarificationRule;
  rationale: string;
  fingerprint: string;
}

export interface VerificationRecord {
  proposalId: string;
  proposalFingerprint: string;
  outcomeLockFingerprint: string;
  verifiedText: string;
  outcomeSuite: OutcomeSuiteResult;
  boundaryStrength: BoundaryStrengthResult;
  eligibleForAcceptance: boolean;
}

export interface AuditEvent {
  id: string;
  sequence: number;
  occurredAt: string;
  actor: Actor;
  action: string;
  outcome: "completed" | "rejected";
  summary: string;
}

export interface WorkflowState {
  phase: WorkflowPhase;
  case: CanonicalCase;
  interpretationSet: InterpretationSet | null;
  crashTest: CrashTestRecord | null;
  outcomeLock: OutcomeLock | null;
  proposal: RedlineProposal | null;
  verification: VerificationRecord | null;
  events: AuditEvent[];
}

export function createInitialWorkflowState(
  value: CanonicalCase,
): WorkflowState {
  return {
    phase: "ready",
    case: value,
    interpretationSet: null,
    crashTest: null,
    outcomeLock: null,
    proposal: null,
    verification: null,
    events: [],
  };
}

export function stageInterpretationSet(
  state: WorkflowState,
  interpretationSet: InterpretationSet,
): WorkflowState {
  requirePhase(state.phase, "ready", "Staging interpretations");
  return { ...state, phase: "interpretations_staged", interpretationSet };
}

export function showCrashTest(
  state: WorkflowState,
  crashTest: CrashTestRecord,
): WorkflowState {
  requirePhase(state.phase, "interpretations_staged", "Running the crash test");
  return { ...state, phase: "divergence_visible", crashTest };
}

export function lockExpectedOutcome(
  state: WorkflowState,
  outcomeLock: OutcomeLock,
): WorkflowState {
  requirePhase(state.phase, "divergence_visible", "Locking the outcome");
  return {
    ...state,
    phase: "outcome_locked",
    outcomeLock,
    proposal: null,
    verification: null,
  };
}

export function stageProposal(
  state: WorkflowState,
  proposal: RedlineProposal,
): WorkflowState {
  requirePhase(state.phase, "outcome_locked", "Staging a redline");
  return { ...state, phase: "redline_staged", proposal, verification: null };
}

export function markVerified(
  state: WorkflowState,
  verification: VerificationRecord,
): WorkflowState {
  requirePhase(state.phase, "redline_staged", "Verifying a redline");
  return {
    ...state,
    phase: verification.eligibleForAcceptance ? "verified" : "outcome_locked",
    verification,
  };
}

export function recoverOutcomeLockAfterIntegrityFailure(
  state: WorkflowState,
): WorkflowState {
  requirePhase(
    state.phase,
    "redline_staged",
    "Recovering from an invalid proposal",
  );
  return { ...state, phase: "outcome_locked", verification: null };
}

export function acceptProposal(state: WorkflowState): WorkflowState {
  requirePhase(state.phase, "verified", "Accepting a redline");
  if (!state.proposal || !state.verification) {
    throw new DomainError(
      "UNKNOWN_PROPOSAL",
      "The verified proposal is unavailable.",
      "Stage and verify the current proposal again.",
    );
  }
  if (!state.verification.eligibleForAcceptance) {
    throw new DomainError(
      "TESTS_FAILED",
      "The proposal is not eligible for acceptance because its tests failed.",
      "Revise the proposal and run every contract test again.",
    );
  }
  const proposal = state.proposal;
  const verification = state.verification;
  if (
    verification.proposalId !== proposal.id ||
    verification.proposalFingerprint !== proposal.fingerprint ||
    verification.outcomeLockFingerprint !== proposal.outcomeLockFingerprint ||
    verification.verifiedText !== proposal.proposedText
  ) {
    throw new DomainError(
      "STALE_PROPOSAL",
      "The proposal changed after verification.",
      "Stage and verify the current proposal again.",
    );
  }
  const executableRule = parseCanonicalRedline(proposal.proposedText);
  if (renderCanonicalRedline(proposal.semanticRule) !== proposal.proposedText) {
    throw new DomainError(
      "RULE_MISMATCH",
      "The staged text and structured rule do not describe the same behavior.",
      "Stage a new clarification from a supported structured rule.",
    );
  }
  const verifiedText = renderCanonicalRedline(executableRule);
  const clauses = state.case.contract.clauses.map((clause) =>
    clause.id === proposal.targetClauseIds[0]
      ? { ...clause, text: verifiedText }
      : clause,
  );
  return {
    ...state,
    phase: "accepted",
    case: {
      ...state.case,
      contract: {
        ...state.case.contract,
        revision: state.case.contract.revision + 1,
        acceptedRedlineId: proposal.id,
        clauses,
      },
    },
  };
}
