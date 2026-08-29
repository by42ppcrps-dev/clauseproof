import {
  ClauseProofService,
  type AgentOrManualActor,
} from "../application/ClauseProofService.js";
import { createHumanUiActor } from "../application/humanAuthority.js";
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
} from "../application/serviceTypes.js";
import type { WorkflowState } from "../domain/workflow.js";
import type { StatePersistence } from "./persistence.js";

type Listener = () => void;

export class ClauseProofStore {
  private readonly listeners = new Set<Listener>();
  private readonly service: ClauseProofService;

  public constructor(
    dependencies: ClauseProofDependencies,
    private readonly persistence?: StatePersistence,
  ) {
    this.service = new ClauseProofService(
      dependencies,
      persistence?.load() ?? undefined,
    );
  }

  public readonly getSnapshot = (): WorkflowState => this.service.inspectCase();

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(state: WorkflowState, persist = true): void {
    if (persist) this.persistence?.save(state);
    for (const listener of this.listeners) listener();
  }

  private async execute<T>(
    operation: () => Promise<ServiceResult<T>>,
  ): Promise<ServiceResult<T>> {
    const result = await operation();
    this.publish(result.state);
    return result;
  }

  public stageInterpretations(
    actor: AgentOrManualActor,
    command: StageInterpretationsCommand,
  ): Promise<ServiceResult<StageInterpretationsData>> {
    return this.execute(() =>
      this.service.stageInterpretations(actor, command),
    );
  }

  public runCrashTest(
    actor: AgentOrManualActor,
    command: RunCrashTestCommand,
  ): Promise<ServiceResult<RunCrashTestData>> {
    return this.execute(() => this.service.runCrashTest(actor, command));
  }

  public lockOutcome(
    command: LockOutcomeCommand,
  ): Promise<ServiceResult<LockOutcomeData>> {
    return this.execute(() =>
      this.service.lockOutcome(createHumanUiActor(), command),
    );
  }

  public stageRedline(
    actor: AgentOrManualActor,
    command: StageRedlineCommand,
  ): Promise<ServiceResult<StageRedlineData>> {
    return this.execute(() => this.service.stageRedline(actor, command));
  }

  public verifyRedline(
    actor: AgentOrManualActor,
    command: VerifyRedlineCommand,
  ): Promise<ServiceResult<VerifyRedlineData>> {
    return this.execute(() => this.service.verifyRedline(actor, command));
  }

  public acceptRedline(
    command: AcceptRedlineCommand,
  ): Promise<ServiceResult<AcceptRedlineData>> {
    return this.execute(() =>
      this.service.acceptRedline(createHumanUiActor(), command),
    );
  }

  public async reset(): Promise<ServiceResult<ResetData>> {
    const result = await this.service.resetDemo(createHumanUiActor());
    this.persistence?.clear();
    this.publish(result.state, false);
    return result;
  }
}

export function createClauseProofStore(
  dependencies: ClauseProofDependencies,
  persistence?: StatePersistence,
): ClauseProofStore {
  return new ClauseProofStore(dependencies, persistence);
}
