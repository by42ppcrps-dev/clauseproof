import {
  generateRuleMutants,
  measureBoundaryStrength,
} from "../domain/boundaryStrength.js";
import { compareOutcomes } from "../domain/divergence.js";
import { DomainError } from "../domain/errors.js";
import { evaluateInterpretation } from "../domain/engine.js";
import {
  generateOutcomeTests,
  runOutcomeSuite,
} from "../domain/outcomeTests.js";
import { renderCanonicalRedline } from "../domain/redline.js";
import type {
  CrashTestRecord,
  InterpretationSet,
  OutcomeLock,
  RedlineProposal,
  VerificationRecord,
  WorkflowState,
} from "../domain/workflow.js";
import type {
  ClauseProofDependencies,
  LockOutcomeCommand,
  RunCrashTestCommand,
  StageInterpretationsCommand,
  StageRedlineCommand,
  VerifyRedlineCommand,
} from "./serviceTypes.js";
import {
  assertOutcomeLockFingerprint,
  assertProposalOutcomeLock,
  assertProposalFingerprint,
  parseAttachedProposalRule,
  parseSupportedOutcomeRule,
  parseSupportedRule,
} from "./proposalIntegrity.js";

export function assertRevision(
  state: WorkflowState,
  baseRevision: number,
): void {
  if (baseRevision !== state.case.contract.revision) {
    throw new DomainError(
      "STALE_REVISION",
      `Revision ${baseRevision} is stale; current revision is ${state.case.contract.revision}.`,
      "Inspect the current case and retry with its current revision.",
    );
  }
}

export async function createInterpretationSet(
  state: WorkflowState,
  dependencies: ClauseProofDependencies,
  command: StageInterpretationsCommand,
): Promise<InterpretationSet> {
  assertRevision(state, command.baseRevision);
  const knownClauses = new Set(state.case.contract.clauses.map(({ id }) => id));
  for (const interpretation of command.interpretations) {
    if (interpretation.clauseIds.some((id) => !knownClauses.has(id))) {
      throw new DomainError(
        "UNKNOWN_CLAUSE",
        "An interpretation cites a clause outside the visible agreement.",
        "Inspect the visible clauses and retry using only their IDs.",
      );
    }
    const citedClauses = new Set(interpretation.clauseIds);
    if (
      !citedClauses.has("sla-exclusive-remedy") ||
      !citedClauses.has("material-breach")
    ) {
      throw new DomainError(
        "INVALID_INPUT",
        "Each interpretation must cite both clauses that create the modeled ambiguity.",
        "Cite both sla-exclusive-remedy and material-breach in each interpretation.",
      );
    }
  }
  const interpretations = command.interpretations.map((interpretation) => ({
    ...interpretation,
    baseRevision: command.baseRevision,
  })) as StageInterpretationsCommand["interpretations"];
  const outcomes = interpretations.map((interpretation) =>
    evaluateInterpretation(
      state.case.contract,
      state.case.scenario,
      interpretation,
    ),
  );
  const first = outcomes[0];
  const second = outcomes[1];
  if (
    !first ||
    !second ||
    compareOutcomes(first, second).differences.length === 0
  ) {
    throw new DomainError(
      "INTERPRETATIONS_NOT_DISTINCT",
      "The two modeled interpretations produce the same commercial outcome.",
      "Change the constrained semantics so the readings are materially distinct.",
    );
  }
  return {
    id: dependencies.idGenerator.next("interpretation-set"),
    baseRevision: command.baseRevision,
    scenarioId: state.case.scenario.id,
    interpretations,
    fingerprint: await dependencies.fingerprintProvider.create({
      caseId: state.case.id,
      baseRevision: command.baseRevision,
      scenarioId: state.case.scenario.id,
      interpretations: interpretations.map(({ semantics, clauseIds }) => ({
        semantics,
        clauseIds,
      })),
    }),
  };
}

export function createCrashTest(
  state: WorkflowState,
  command: RunCrashTestCommand,
): CrashTestRecord {
  assertRevision(state, command.baseRevision);
  const set = state.interpretationSet;
  if (!set || set.id !== command.interpretationSetId) {
    throw new DomainError(
      "UNKNOWN_INTERPRETATION_SET",
      "The interpretation set is not current.",
      "Inspect the case and use the current interpretation-set ID.",
    );
  }
  const outcomes = set.interpretations.map((interpretation) =>
    evaluateInterpretation(
      state.case.contract,
      state.case.scenario,
      interpretation,
    ),
  ) as CrashTestRecord["outcomes"];
  return {
    interpretationSetId: set.id,
    outcomes,
    divergence: compareOutcomes(outcomes[0], outcomes[1]),
  };
}

export async function createOutcomeLock(
  state: WorkflowState,
  dependencies: ClauseProofDependencies,
  command: LockOutcomeCommand,
): Promise<OutcomeLock> {
  assertRevision(state, command.baseRevision);
  const expectedRule = parseSupportedOutcomeRule(
    command.expectedRule,
    state.case.contract.terms.slaThresholdBps,
  );
  const tests = generateOutcomeTests(state.case.scenario, expectedRule);
  return {
    id: dependencies.idGenerator.next("outcome-lock"),
    baseRevision: command.baseRevision,
    createdBy: "human-ui",
    sourceCase: state.case,
    expectedRule,
    tests,
    fingerprint: await dependencies.fingerprintProvider.create({
      sourceCase: state.case,
      baseRevision: command.baseRevision,
      expectedRule,
      tests,
    }),
  };
}

function currentOutcomeLock(
  state: WorkflowState,
  command: StageRedlineCommand,
): OutcomeLock {
  const lock = state.outcomeLock;
  if (!lock) {
    throw new DomainError(
      "OUTCOME_NOT_LOCKED",
      "No human-owned outcome lock is available.",
      "Ask the person to lock the intended outcome in the page.",
    );
  }
  if (
    lock.id !== command.outcomeLockId ||
    lock.baseRevision !== command.baseRevision
  ) {
    throw new DomainError(
      "STALE_OUTCOME_LOCK",
      "The outcome lock is stale.",
      "Inspect the case and use the current human-owned outcome lock.",
    );
  }
  return lock;
}

export async function createProposal(
  state: WorkflowState,
  dependencies: ClauseProofDependencies,
  command: StageRedlineCommand,
): Promise<RedlineProposal> {
  assertRevision(state, command.baseRevision);
  const lock = currentOutcomeLock(state, command);
  await assertOutcomeLockFingerprint(state, dependencies, lock);
  const semanticRule = parseSupportedRule(command.semanticRule);
  if (
    command.targetClauseIds.length !== 2 ||
    command.targetClauseIds[0] !== "sla-exclusive-remedy" ||
    command.targetClauseIds[1] !== "material-breach"
  ) {
    throw new DomainError(
      "UNKNOWN_CLAUSE",
      "The clarification must target the exact clauses that create the ambiguity.",
      "Target sla-exclusive-remedy followed by material-breach.",
    );
  }
  const originalText = state.case.contract.clauses.find(
    ({ id }) => id === command.targetClauseIds[0],
  )?.text;
  if (!originalText) {
    throw new DomainError(
      "UNKNOWN_CLAUSE",
      "The targeted clause is unavailable in the current agreement.",
      "Inspect the current agreement before staging the clarification.",
    );
  }
  const proposedText = renderCanonicalRedline(semanticRule);
  const proposal = {
    id: dependencies.idGenerator.next("proposal"),
    baseRevision: command.baseRevision,
    outcomeLockId: command.outcomeLockId,
    outcomeLockFingerprint: lock.fingerprint,
    targetClauseIds: [command.targetClauseIds[0], command.targetClauseIds[1]],
    originalText,
    proposedText,
    semanticRule,
    rationale: command.rationale,
  } satisfies Omit<RedlineProposal, "fingerprint">;
  return {
    ...proposal,
    fingerprint: await dependencies.fingerprintProvider.create({
      sourceCase: lock.sourceCase,
      ...proposal,
    }),
  };
}

export async function createVerification(
  state: WorkflowState,
  dependencies: ClauseProofDependencies,
  command: VerifyRedlineCommand,
): Promise<VerificationRecord> {
  assertRevision(state, command.baseRevision);
  const proposal = state.proposal;
  if (!proposal || proposal.id !== command.proposalId) {
    throw new DomainError(
      "UNKNOWN_PROPOSAL",
      "The redline proposal is not current.",
      "Inspect the case and use the current proposal ID.",
    );
  }
  const lock = state.outcomeLock;
  if (!lock) {
    throw new DomainError(
      "STALE_PROPOSAL",
      "The proposal no longer matches the current outcome lock.",
      "Stage a new proposal against the current outcome lock.",
    );
  }
  assertProposalOutcomeLock(proposal, lock);
  await assertOutcomeLockFingerprint(state, dependencies, lock);
  const executableRule = parseAttachedProposalRule(proposal);
  await assertProposalFingerprint(state, dependencies, proposal);
  const outcomeSuite = runOutcomeSuite(lock.tests, executableRule);
  const boundaryStrength = measureBoundaryStrength(
    lock.tests,
    generateRuleMutants(executableRule),
  );
  return {
    proposalId: proposal.id,
    proposalFingerprint: proposal.fingerprint,
    outcomeLockFingerprint: lock.fingerprint,
    verifiedText: proposal.proposedText,
    outcomeSuite,
    boundaryStrength,
    eligibleForAcceptance:
      outcomeSuite.passedCount === 6 &&
      outcomeSuite.totalCount === 6 &&
      boundaryStrength.killedCount === 8 &&
      boundaryStrength.totalCount === 8,
  };
}
