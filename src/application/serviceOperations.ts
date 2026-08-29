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
import type {
  CrashTestRecord,
  InterpretationSet,
  OutcomeLock,
  RedlineProposal,
  VerificationRecord,
  WorkflowState,
} from "../domain/workflow.js";
import { canonicalize } from "./canonicalize.js";
import type {
  ClauseProofDependencies,
  LockOutcomeCommand,
  RunCrashTestCommand,
  StageInterpretationsCommand,
  StageRedlineCommand,
  VerifyRedlineCommand,
} from "./serviceTypes.js";

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
  const tests = generateOutcomeTests(state.case.scenario, command.expectedRule);
  return {
    id: dependencies.idGenerator.next("outcome-lock"),
    baseRevision: command.baseRevision,
    createdBy: "human-ui",
    expectedRule: command.expectedRule,
    tests,
    fingerprint: await dependencies.fingerprintProvider.create({
      caseId: state.case.id,
      baseRevision: command.baseRevision,
      expectedRule: command.expectedRule,
      tests,
    }),
  };
}

function currentOutcomeLock(
  state: WorkflowState,
  command: StageRedlineCommand,
) {
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
  if (canonicalize(lock.expectedRule) !== canonicalize(command.semanticRule)) {
    throw new DomainError(
      "RULE_MISMATCH",
      "The proposed semantic rule does not match the locked outcome.",
      "Revise the proposal to match every field in the current outcome lock.",
    );
  }
  const knownClauses = new Set(state.case.contract.clauses.map(({ id }) => id));
  if (command.targetClauseIds.some((id) => !knownClauses.has(id))) {
    throw new DomainError(
      "UNKNOWN_CLAUSE",
      "The proposal targets a clause outside the visible agreement.",
      "Use only a visible target clause ID.",
    );
  }
  return {
    id: dependencies.idGenerator.next("proposal"),
    ...command,
    fingerprint: await dependencies.fingerprintProvider.create({
      caseId: state.case.id,
      ...command,
    }),
  };
}

export function createVerification(
  state: WorkflowState,
  command: VerifyRedlineCommand,
): VerificationRecord {
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
  if (!lock || proposal.outcomeLockId !== lock.id) {
    throw new DomainError(
      "STALE_PROPOSAL",
      "The proposal no longer matches the current outcome lock.",
      "Stage a new proposal against the current outcome lock.",
    );
  }
  const outcomeSuite = runOutcomeSuite(lock.tests, proposal.semanticRule);
  const boundaryStrength = measureBoundaryStrength(
    lock.tests,
    generateRuleMutants(proposal.semanticRule),
  );
  return {
    proposalId: proposal.id,
    outcomeSuite,
    boundaryStrength,
    eligibleForAcceptance:
      outcomeSuite.passedCount === outcomeSuite.totalCount &&
      boundaryStrength.killedCount === boundaryStrength.totalCount,
  };
}
