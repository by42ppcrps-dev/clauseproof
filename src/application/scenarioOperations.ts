import { DomainError } from "../domain/errors.js";
import { scenarioFactsSchema, type ScenarioFacts } from "../domain/schemas.js";
import {
  scenarioEditablePhases,
  type CrashTestRecord,
  type WorkflowState,
} from "../domain/workflow.js";
import { assertRevision, createCrashTest } from "./serviceOperations.js";
import type { SetScenarioFactsCommand } from "./serviceTypes.js";

export function createScenarioFacts(
  state: WorkflowState,
  command: SetScenarioFactsCommand,
): { scenario: ScenarioFacts; crashTest: CrashTestRecord | null } {
  assertRevision(state, command.baseRevision);
  if (!scenarioEditablePhases.includes(state.phase)) {
    throw new DomainError(
      "INVALID_PHASE",
      `Changing the facts requires a phase before the outcome lock; current phase is ${state.phase}.`,
      "Facts are frozen once the person locks intent. Inspect the case and continue from its current phase.",
    );
  }
  const months = command.scenario.monthlyUptime.map(({ month }) => month);
  if (new Set(months).size !== months.length) {
    throw new DomainError(
      "INVALID_INPUT",
      "Each calendar month may appear only once in the uptime facts.",
      "Remove the duplicate month and retry.",
    );
  }
  const parsed = scenarioFactsSchema.safeParse({
    ...command.scenario,
    id: state.case.scenario.id,
    serviceCreditRateBps: state.case.contract.terms.serviceCreditRateBps,
  });
  if (!parsed.success) {
    throw new DomainError(
      "INVALID_INPUT",
      "The scenario facts are outside the supported bounds.",
      "Use integer cents, basis points, ISO dates, and one to twenty-four months.",
    );
  }
  const nextState: WorkflowState = {
    ...state,
    case: { ...state.case, scenario: parsed.data },
  };
  const set = state.interpretationSet;
  const crashTest =
    state.phase === "divergence_visible" && set
      ? createCrashTest(nextState, {
          baseRevision: command.baseRevision,
          interpretationSetId: set.id,
        })
      : null;
  return { scenario: parsed.data, crashTest };
}
