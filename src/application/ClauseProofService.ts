import type { Actor } from "../domain/schemas.js";
import { canonicalCase } from "../domain/seed.js";
import {
  acceptProposal,
  createInitialWorkflowState,
  lockExpectedOutcome,
  markVerified,
  recoverOutcomeLockAfterIntegrityFailure,
  replaceScenario,
  showCrashTest,
  stageInterpretationSet,
  stageProposal,
  type AuditEvent,
  type WorkflowState,
} from "../domain/workflow.js";
import {
  outcomeLockSummary,
  proposalSummary,
  scenarioSummary,
  verificationSummary,
} from "./auditSummaries.js";
import type { HumanUiActor } from "./humanAuthority.js";
import {
  assertHumanAuthority,
  auditActorFor,
  normalizeServiceError,
  shouldRecoverOutcomeLock,
} from "./serviceResults.js";
import { assertAcceptanceProof } from "./acceptanceProof.js";
import {
  createCrashTest,
  createInterpretationSet,
  createOutcomeLock,
  createProposal,
  createVerification,
} from "./serviceOperations.js";
import { createScenarioFacts } from "./scenarioOperations.js";
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
  SetScenarioFactsCommand,
  SetScenarioFactsData,
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
    const normalized = normalizeServiceError(error);
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

  public async setScenarioFacts(
    actor: AgentOrManualActor,
    command: SetScenarioFactsCommand,
  ): Promise<ServiceResult<SetScenarioFactsData>> {
    try {
      const { scenario, crashTest } = createScenarioFacts(this.state, command);
      this.state = ownValue(replaceScenario(this.state, scenario, crashTest));
      return this.success(
        actor,
        "set_scenario_facts",
        scenarioSummary(scenario, crashTest),
        { scenario, crashTest },
      );
    } catch (error) {
      return this.failure(error, actor, "set_scenario_facts");
    }
  }

  public async lockOutcome(
    actor: HumanUiActor,
    command: LockOutcomeCommand,
  ): Promise<ServiceResult<LockOutcomeData>> {
    const auditActor = auditActorFor(actor);
    try {
      assertHumanAuthority(actor, "lock an outcome");
      const outcomeLock = await createOutcomeLock(
        this.state,
        this.dependencies,
        command,
      );
      this.state = ownValue(lockExpectedOutcome(this.state, outcomeLock));
      return this.success(
        auditActor,
        "lock_outcome",
        outcomeLockSummary(outcomeLock),
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
        proposalSummary(proposal, this.state.outcomeLock),
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
        verificationSummary(verification),
        { verification },
      );
    } catch (error) {
      if (shouldRecoverOutcomeLock(error, this.state.phase)) {
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
    const auditActor = auditActorFor(actor);
    try {
      assertHumanAuthority(actor, "accept a redline");
      await assertAcceptanceProof(this.state, this.dependencies, command);
      this.state = ownValue(acceptProposal(this.state));
      return this.success(
        auditActor,
        "accept_redline",
        `Person accepted the tested clarification as revision ${this.state.case.contract.revision} after independent proof recomputation.`,
        { revision: this.state.case.contract.revision },
      );
    } catch (error) {
      return this.failure(error, auditActor, "accept_redline");
    }
  }

  public async resetDemo(
    actor: HumanUiActor,
  ): Promise<ServiceResult<ResetData>> {
    const auditActor = auditActorFor(actor);
    try {
      assertHumanAuthority(actor, "reset the case");
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
}
