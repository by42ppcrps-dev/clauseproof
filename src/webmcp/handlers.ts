import { ZodError } from "zod";

import type { ModeledInterpretation } from "../domain/schemas.js";
import type { WebMcpToolName, WorkflowPhase } from "../domain/model.js";
import type { ClauseProofStore } from "../state/createStore.js";
import {
  invalidInputFailure,
  serviceFailure,
  type RecoveryAction,
  type ToolResult,
} from "./output.js";
import {
  inspectContractCaseInputSchema,
  proposeClarifyingRedlineInputSchema,
  runContractCrashTestInputSchema,
  stageInterpretationsInputSchema,
  verifyContractTestsInputSchema,
} from "./schemas.js";

function nextAction(phase: WorkflowPhase): RecoveryAction | null {
  const actions: Partial<Record<WorkflowPhase, RecoveryAction>> = {
    ready: {
      action: "stage_interpretations",
      reason: "Stage two materially different clause-cited readings.",
    },
    interpretations_staged: {
      action: "run_contract_crash_test",
      reason: "Execute the current readings against the same facts.",
    },
    divergence_visible: {
      action: "wait_for_person_outcome_lock",
      reason: "Only the person may define and lock the intended behavior.",
    },
    outcome_locked: {
      action: "propose_clarifying_redline",
      reason:
        "Stage language that matches the current human-owned outcome lock.",
    },
    redline_staged: {
      action: "verify_contract_tests",
      reason: "Run every outcome and boundary test against the proposal.",
    },
  };
  return actions[phase] ?? null;
}

function parseFailure(store: ClauseProofStore, error: unknown) {
  const message =
    error instanceof ZodError
      ? error.issues.map(({ message }) => message).join("; ")
      : "Input did not match the strict tool schema.";
  return invalidInputFailure(
    store.getSnapshot().case.contract.revision,
    message,
  );
}

function agentActor(toolName: WebMcpToolName) {
  return { kind: "agent-tool" as const, toolName };
}

interface StageToolData {
  interpretationSetId: string;
  baseRevision: number;
  readingLabels: string[];
}

interface CrashToolData {
  interpretationSetId: string;
  branches: {
    serviceCreditsCents: number;
    terminationAvailable: boolean;
    futureFeesCents: number;
  }[];
  divergentFields: string[];
  totalFinancialDivergenceCents: number;
}

interface ProposalToolData {
  proposalId: string;
  targetClauseIds: string[];
  stagedOnly: true;
}

interface VerificationToolData {
  outcomeTestsPassed: number;
  outcomeTestsTotal: number;
  failedTestIds: string[];
  boundaryRulesCaught: number;
  boundaryRulesTotal: number;
  eligibleForHumanAcceptance: boolean;
}

export function createToolHandlers(store: ClauseProofStore) {
  return {
    async inspect_contract_case(input: unknown): Promise<ToolResult<unknown>> {
      try {
        const { view } = inspectContractCaseInputSchema.parse(input);
        const state = store.getSnapshot();
        const common = {
          phase: state.phase,
          revision: state.case.contract.revision,
          caseId: state.case.id,
        };
        const data =
          view === "clauses"
            ? {
                ...common,
                clauses: state.case.contract.clauses.map(
                  ({ id, heading, text }) => ({
                    id,
                    heading,
                    text,
                  }),
                ),
              }
            : view === "workflow"
              ? {
                  ...common,
                  interpretationSetId: state.interpretationSet?.id ?? null,
                  outcomeLockId: state.outcomeLock?.id ?? null,
                  proposalId: state.proposal?.id ?? null,
                }
              : {
                  ...common,
                  scenario: {
                    monthlyFeeCents: state.case.scenario.monthlyFeeCents,
                    monthsRemaining: state.case.scenario.monthsRemaining,
                    monthlyUptime: state.case.scenario.monthlyUptime,
                    noticeDate: state.case.scenario.noticeDate,
                  },
                };
        return { ok: true, data, next: nextAction(state.phase) };
      } catch (error) {
        return parseFailure(store, error);
      }
    },

    async stage_interpretations(
      input: unknown,
    ): Promise<ToolResult<StageToolData>> {
      try {
        const parsed = stageInterpretationsInputSchema.parse(input);
        const first = parsed.interpretations[0];
        const second = parsed.interpretations[1];
        if (!first || !second)
          return parseFailure(store, new Error("Two readings required."));
        const toInterpretation = (
          value: typeof first,
          id: string,
        ): ModeledInterpretation => ({
          ...value,
          id,
          baseRevision: parsed.baseRevision,
        });
        const result = await store.stageInterpretations(
          agentActor("stage_interpretations"),
          {
            baseRevision: parsed.baseRevision,
            interpretations: [
              toInterpretation(first, "agent-reading-a"),
              toInterpretation(second, "agent-reading-b"),
            ],
          },
        );
        if (!result.ok) return serviceFailure(result);
        return {
          ok: true,
          data: {
            interpretationSetId: result.data.interpretationSet.id,
            baseRevision: result.data.interpretationSet.baseRevision,
            readingLabels: result.data.interpretationSet.interpretations.map(
              ({ label }) => label,
            ),
          },
          next: nextAction(result.state.phase),
        };
      } catch (error) {
        return parseFailure(store, error);
      }
    },

    async run_contract_crash_test(
      input: unknown,
    ): Promise<ToolResult<CrashToolData>> {
      try {
        const parsed = runContractCrashTestInputSchema.parse(input);
        const result = await store.runCrashTest(
          agentActor("run_contract_crash_test"),
          parsed,
        );
        if (!result.ok) return serviceFailure(result);
        return {
          ok: true,
          data: {
            interpretationSetId: result.data.crashTest.interpretationSetId,
            branches: result.data.crashTest.outcomes.map((outcome) => ({
              serviceCreditsCents: outcome.serviceCreditsCents,
              terminationAvailable: outcome.terminationAvailable,
              futureFeesCents: outcome.futureFeesCents,
            })),
            divergentFields: result.data.crashTest.divergence.differences.map(
              ({ field }) => field,
            ),
            totalFinancialDivergenceCents:
              result.data.crashTest.divergence.totalFinancialDivergenceCents,
          },
          next: nextAction(result.state.phase),
        };
      } catch (error) {
        return parseFailure(store, error);
      }
    },

    async propose_clarifying_redline(
      input: unknown,
    ): Promise<ToolResult<ProposalToolData>> {
      try {
        const parsed = proposeClarifyingRedlineInputSchema.parse(input);
        const result = await store.stageRedline(
          agentActor("propose_clarifying_redline"),
          parsed,
        );
        if (!result.ok) return serviceFailure(result);
        return {
          ok: true,
          data: {
            proposalId: result.data.proposal.id,
            targetClauseIds: result.data.proposal.targetClauseIds,
            stagedOnly: true,
          },
          next: nextAction(result.state.phase),
        };
      } catch (error) {
        return parseFailure(store, error);
      }
    },

    async verify_contract_tests(
      input: unknown,
    ): Promise<ToolResult<VerificationToolData>> {
      try {
        const parsed = verifyContractTestsInputSchema.parse(input);
        const result = await store.verifyRedline(
          agentActor("verify_contract_tests"),
          parsed,
        );
        if (!result.ok) return serviceFailure(result);
        const verification = result.data.verification;
        return {
          ok: true,
          data: {
            outcomeTestsPassed: verification.outcomeSuite.passedCount,
            outcomeTestsTotal: verification.outcomeSuite.totalCount,
            failedTestIds: verification.outcomeSuite.results
              .filter(({ passed }) => !passed)
              .map(({ testId }) => testId),
            boundaryRulesCaught: verification.boundaryStrength.killedCount,
            boundaryRulesTotal: verification.boundaryStrength.totalCount,
            eligibleForHumanAcceptance: verification.eligibleForAcceptance,
          },
          next: nextAction(result.state.phase),
        };
      } catch (error) {
        return parseFailure(store, error);
      }
    },
  };
}

export type ToolHandlers = ReturnType<typeof createToolHandlers>;
