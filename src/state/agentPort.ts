import type { AgentOrManualActor } from "../application/ClauseProofService.js";
import type {
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
} from "../application/serviceTypes.js";
import type { WorkflowState } from "../domain/workflow.js";
import type { ClauseProofStore } from "./createStore.js";

export interface AgentClauseProofPort {
  getSnapshot(): WorkflowState;
  subscribe(listener: () => void): () => void;
  stageInterpretations(
    actor: AgentOrManualActor,
    command: StageInterpretationsCommand,
  ): Promise<ServiceResult<StageInterpretationsData>>;
  runCrashTest(
    actor: AgentOrManualActor,
    command: RunCrashTestCommand,
  ): Promise<ServiceResult<RunCrashTestData>>;
  setScenarioFacts(
    actor: AgentOrManualActor,
    command: SetScenarioFactsCommand,
  ): Promise<ServiceResult<SetScenarioFactsData>>;
  stageRedline(
    actor: AgentOrManualActor,
    command: StageRedlineCommand,
  ): Promise<ServiceResult<StageRedlineData>>;
  verifyRedline(
    actor: AgentOrManualActor,
    command: VerifyRedlineCommand,
  ): Promise<ServiceResult<VerifyRedlineData>>;
}

export function createAgentClauseProofPort(
  store: ClauseProofStore,
): AgentClauseProofPort {
  return Object.freeze({
    getSnapshot: store.getSnapshot,
    subscribe: store.subscribe,
    stageInterpretations: (
      actor: AgentOrManualActor,
      command: StageInterpretationsCommand,
    ) => store.stageInterpretations(actor, command),
    runCrashTest: (actor: AgentOrManualActor, command: RunCrashTestCommand) =>
      store.runCrashTest(actor, command),
    setScenarioFacts: (
      actor: AgentOrManualActor,
      command: SetScenarioFactsCommand,
    ) => store.setScenarioFacts(actor, command),
    stageRedline: (actor: AgentOrManualActor, command: StageRedlineCommand) =>
      store.stageRedline(actor, command),
    verifyRedline: (actor: AgentOrManualActor, command: VerifyRedlineCommand) =>
      store.verifyRedline(actor, command),
  });
}
