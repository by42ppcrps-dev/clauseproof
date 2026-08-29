import { DomainError } from "../domain/errors.js";
import type { Actor } from "../domain/schemas.js";
import { canonicalCase } from "../domain/seed.js";
import {
  acceptProposal,
  createInitialWorkflowState,
  lockExpectedOutcome,
  markVerified,
  recoverOutcomeLockAfterIntegrityFailure,
  showCrashTest,
  stageInterpretationSet,
  stageProposal,
  type AuditEvent,
  type WorkflowState,
} from "../domain/workflow.js";
import { hasHumanAuthority, type HumanUiActor } from "./humanAuthority.js";
import { assertAcceptanceProof } from "./acceptanceProof.js";
import {
  createCrashTest,
  createInterpretationSet,
  createOutcomeLock,
  createProposal,
  createVerification,
} from "./serviceOperations.js";
import type {
  AcceptRedlineCommand,
  AcceptRedlineData,
  ClauseProofDependencies,
  LockOutcomeCommand,
  LockOutcomeData,
  ResetData,
  RunCrashTestCommand,
  RunCrashTestData,
  ServiceResult,
  StageInterpretationsCommand,
  StageInterpretationsData,
  StageRedlineCommand,
  StageRedlineData,
  VerifyRedlineCommand,
  VerifyRedlineData,
} from "./serviceTypes.js";
import { ownValue } from "./stateOwnership.js";

export type AgentOrManualActor = Extract<
  Actor,
  { kind: "agent-tool" | "manual-fallback" }
>;

export class ClauseProofService {
  private state: WorkflowState;

  public constructor(
    private readonly dependencies: ClauseProofDependencies,
    initialState: WorkflowState = createInitialWorkflowState(canonicalCase),
  ) {
    this.state = ownValue(initialState);
  }

  public inspectCase(): WorkflowState {
    return this.state;
  }

  private appendEvent(
    actor: Actor,
    action: string,
    outcome: AuditEvent["outcome"],
    summary: string,
  ): void {
    const event: AuditEvent = {
      id: this.dependencies.idGenerator.next("event"),
      sequence: this.state.events.length + 1,
      occurredAt: this.dependencies.clock.now(),
      actor,
      action,
      outcome,
      summary,
    };
    this.state = ownValue({
      ...this.state,
      events: [...this.state.events, event],
    });
  }

  private success<T>(
    actor: Actor,
    action: string,
    summary: string,
    data: T,
  ): ServiceResult<T> {
    this.appendEvent(actor, action, "completed", summary);
    return { ok: true, data: ownValue(data), state: this.state };
  }

  private failure<T>(
    error: unknown,
    actor: Actor,
    action: string,
  ): ServiceResult<T> {
    const normalized =
      error instanceof DomainError
        ? error
        : new DomainError(
            "INTERNAL_ERROR",
            "ClauseProof could not complete the action.",
            "Inspect the current case before retrying.",
          );
    this.appendEvent(actor, action, "rejected", normalized.message);
    return {
      ok: false,
      error: {
        code: normalized.code,
        message: normalized.message,
        currentRevision: this.state.case.contract.revision,
        recovery: normalized.recovery,
      },
      state: this.state,
    };
  }

  public async stageInterpretations(
    actor: AgentOrManualActor,
    command: StageInterpretationsCommand,
  ): Promise<ServiceResult<StageInterpretationsData>> {
    try {
      const interpretationSet = await createInterpretationSet(
        this.state,
        this.dependencies,
        command,
      );
      this.state = ownValue(
        stageInterpretationSet(this.state, interpretationSet),
      );
      return this.success(
        actor,
        "stage_interpretations",
        "Two distinct modeled interpretations were staged.",
        { interpretationSet },
      );
    } catch (error) {
      return this.failure(error, actor, "stage_interpretations");
    }
  }

  public async runCrashTest(
    actor: AgentOrManualActor,
    command: RunCrashTestCommand,
  ): Promise<ServiceResult<RunCrashTestData>> {
    try {
      const crashTest = createCrashTest(this.state, command);
      this.state = ownValue(showCrashTest(this.state, crashTest));
      return this.success(
        actor,
        "run_contract_crash_test",
        "Both readings were executed against the same scenario.",
        { crashTest },
      );
    } catch (error) {
      return this.failure(error, actor, "run_contract_crash_test");
    }
  }

  public async lockOutcome(
    actor: HumanUiActor,
    command: LockOutcomeCommand,
  ): Promise<ServiceResult<LockOutcomeData>> {
    const auditActor: Actor = hasHumanAuthority(actor)
      ? { kind: "human-ui" }
      : { kind: "system" };
    try {
      this.requireHumanAuthority(actor, "lock an outcome");
      const outcomeLock = await createOutcomeLock(
        this.state,
        this.dependencies,
        command,
      );
      this.state = ownValue(lockExpectedOutcome(this.state, outcomeLock));
      return this.success(
        auditActor,
        "lock_outcome",
        "The person locked the expected contract behavior.",
        { outcomeLock },
      );
    } catch (error) {
      return this.failure(error, auditActor, "lock_outcome");
    }
  }

  public async stageRedline(
    actor: AgentOrManualActor,
    command: StageRedlineCommand,
  ): Promise<ServiceResult<StageRedlineData>> {
    try {
      const proposal = await createProposal(
        this.state,
        this.dependencies,
        command,
      );
      this.state = ownValue(stageProposal(this.state, proposal));
      return this.success(
        actor,
        "propose_clarifying_redline",
        "A clarification was staged for testing, not accepted.",
        { proposal },
      );
    } catch (error) {
      return this.failure(error, actor, "propose_clarifying_redline");
    }
  }

  public async verifyRedline(
    actor: AgentOrManualActor,
    command: VerifyRedlineCommand,
  ): Promise<ServiceResult<VerifyRedlineData>> {
    try {
      const verification = await createVerification(
        this.state,
        this.dependencies,
        command,
      );
      this.state = ownValue(markVerified(this.state, verification));
      return this.success(
        actor,
        "verify_contract_tests",
        "Outcome and boundary tests were executed.",
        { verification },
      );
    } catch (error) {
      if (
        error instanceof DomainError &&
        this.state.phase === "redline_staged" &&
        ["RULE_MISMATCH", "STALE_PROPOSAL", "STALE_OUTCOME_LOCK"].includes(
          error.code,
        )
      ) {
        this.state = ownValue(
          recoverOutcomeLockAfterIntegrityFailure(this.state),
        );
      }
      return this.failure(error, actor, "verify_contract_tests");
    }
  }

  public async acceptRedline(
    actor: HumanUiActor,
    command: AcceptRedlineCommand,
  ): Promise<ServiceResult<AcceptRedlineData>> {
    const auditActor: Actor = hasHumanAuthority(actor)
      ? { kind: "human-ui" }
      : { kind: "system" };
    try {
      this.requireHumanAuthority(actor, "accept a redline");
      await assertAcceptanceProof(this.state, this.dependencies, command);
      this.state = ownValue(acceptProposal(this.state));
      return this.success(
        auditActor,
        "accept_redline",
        "The person accepted the tested clarification.",
        { revision: this.state.case.contract.revision },
      );
    } catch (error) {
      return this.failure(error, auditActor, "accept_redline");
    }
  }

  public async resetDemo(
    actor: HumanUiActor,
  ): Promise<ServiceResult<ResetData>> {
    const auditActor: Actor = hasHumanAuthority(actor)
      ? { kind: "human-ui" }
      : { kind: "system" };
    try {
      this.requireHumanAuthority(actor, "reset the case");
      this.state = ownValue(createInitialWorkflowState(canonicalCase));
      return this.success(
        auditActor,
        "reset_demo",
        "The canonical synthetic case was restored.",
        { phase: "ready" },
      );
    } catch (error) {
      return this.failure(error, auditActor, "reset_demo");
    }
  }

  private requireHumanAuthority(actor: HumanUiActor, action: string): void {
    if (!hasHumanAuthority(actor)) {
      throw new DomainError(
        "INVALID_INPUT",
        `Human UI authority is required to ${action}.`,
        "Use the visible human control in the page.",
      );
    }
  }
}
