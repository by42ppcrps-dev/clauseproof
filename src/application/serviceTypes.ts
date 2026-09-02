import type { DomainErrorCode } from "../domain/errors.js";
import type { FingerprintProvider } from "./fingerprint.js";
import type {
  ClarificationRule,
  ModeledInterpretation,
  ScenarioFacts,
} from "../domain/schemas.js";
import type {
  CrashTestRecord,
  InterpretationSet,
  OutcomeLock,
  RedlineProposal,
  VerificationRecord,
  WorkflowState,
} from "../domain/workflow.js";

export interface Clock {
  now(): string;
}

export interface IdGenerator {
  next(prefix: string): string;
}

export interface ClauseProofDependencies {
  clock: Clock;
  idGenerator: IdGenerator;
  fingerprintProvider: FingerprintProvider;
}

export interface StageInterpretationsCommand {
  baseRevision: number;
  interpretations: [ModeledInterpretation, ModeledInterpretation];
}

export interface RunCrashTestCommand {
  baseRevision: number;
  interpretationSetId: string;
}

export interface LockOutcomeCommand {
  baseRevision: number;
  expectedRule: ClarificationRule;
}

export interface StageRedlineCommand {
  baseRevision: number;
  outcomeLockId: string;
  targetClauseIds: ClarificationRule["overridesClauseIds"];
  semanticRule: ClarificationRule;
  rationale: string;
}

export interface VerifyRedlineCommand {
  baseRevision: number;
  proposalId: string;
}

export interface AcceptRedlineCommand {
  baseRevision: number;
  proposalId: string;
}

export interface PublicServiceError {
  code: DomainErrorCode;
  message: string;
  currentRevision: number;
  recovery: string | null;
}

export interface ServiceSuccess<T> {
  ok: true;
  data: T;
  state: WorkflowState;
}

export interface ServiceFailure {
  ok: false;
  error: PublicServiceError;
  state: WorkflowState;
}

export type ServiceResult<T> = ServiceSuccess<T> | ServiceFailure;

export interface StageInterpretationsData {
  interpretationSet: InterpretationSet;
}

export interface RunCrashTestData {
  crashTest: CrashTestRecord;
}

export interface LockOutcomeData {
  outcomeLock: OutcomeLock;
}

export interface StageRedlineData {
  proposal: RedlineProposal;
}

export interface VerifyRedlineData {
  verification: VerificationRecord;
}

export interface AcceptRedlineData {
  revision: number;
}

export interface ResetData {
  phase: "ready";
}

export type ScenarioFactsInput = Omit<
  ScenarioFacts,
  "id" | "serviceCreditRateBps"
>;

export interface SetScenarioFactsCommand {
  baseRevision: number;
  scenario: ScenarioFactsInput;
  rationale: string;
}

export interface SetScenarioFactsData {
  scenario: ScenarioFacts;
  crashTest: CrashTestRecord | null;
}
