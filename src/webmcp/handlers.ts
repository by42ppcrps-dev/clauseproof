import { ZodError } from "zod";

import type { ModeledInterpretation } from "../domain/schemas.js";
import type { WebMcpToolName } from "../domain/model.js";
import type { AgentClauseProofPort } from "../state/agentPort.js";
import { nextAction, readingVocabulary } from "./guidance.js";
import {
  invalidInputFailure,
  serviceFailure,
  type ToolResult,
} from "./output.js";
import {
  inspectContractCaseInputSchema,
  proposeClarifyingRedlineInputSchema,
  runContractCrashTestInputSchema,
  setScenarioFactsInputSchema,
  stageInterpretationsInputSchema,
  verifyContractTestsInputSchema,
} from "./schemas.js";
import {
  failedTestEvidence,
  semanticRuleSummary,
  survivingBoundaryIds,
  type CrashToolData,
  type ProposalToolData,
  type ScenarioToolData,
  type StageToolData,
  type VerificationToolData,
} from "./normalizers.js";

function parseFailure(store: AgentClauseProofPort, error: unknown) {
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

export function createToolHandlers(store: AgentClauseProofPort) {
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
                  lockedExpectedRule: state.outcomeLock?.expectedRule ?? null,
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
                  slaThresholdBps: state.case.contract.terms.slaThresholdBps,
                  readingVocabulary,
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

    async set_scenario_facts(
      input: unknown,
    ): Promise<ToolResult<ScenarioToolData>> {
      try {
        const parsed = setScenarioFactsInputSchema.parse(input);
        const result = await store.setScenarioFacts(
          agentActor("set_scenario_facts"),
          parsed,
        );
        if (!result.ok) return serviceFailure(result);
        const { scenario, crashTest } = result.data;
        return {
          ok: true,
          data: {
            monthsOfUptime: scenario.monthlyUptime.length,
            monthlyFeeCents: scenario.monthlyFeeCents,
            monthsRemaining: scenario.monthsRemaining,
            noticeDate: scenario.noticeDate,
            curedAtDate: scenario.curedAtDate,
            crashTest: crashTest
              ? {
                  branches: crashTest.outcomes.map((outcome) => ({
                    serviceCreditsCents: outcome.serviceCreditsCents,
                    terminationAvailable: outcome.terminationAvailable,
                    futureFeesCents: outcome.futureFeesCents,
                  })),
                  totalFinancialDivergenceCents:
                    crashTest.divergence.totalFinancialDivergenceCents,
                }
              : null,
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
            originalText: result.data.proposal.originalText,
            proposedText: result.data.proposal.proposedText,
            semanticRuleSummary: semanticRuleSummary(
              result.data.proposal.semanticRule,
            ),
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
            failedTestCounterexamples: failedTestEvidence(verification),
            boundaryRulesCaught: verification.boundaryStrength.killedCount,
            boundaryRulesTotal: verification.boundaryStrength.totalCount,
            boundarySurvivors: survivingBoundaryIds(verification),
            eligibleForHumanAcceptance: verification.eligibleForAcceptance,
          },
          next: verification.eligibleForAcceptance
            ? nextAction(result.state.phase)
            : {
                action: "propose_clarifying_redline",
                reason:
                  "Revise the rule from these failures, then verify it again.",
              },
        };
      } catch (error) {
        return parseFailure(store, error);
      }
    },
  };
}

export type ToolHandlers = ReturnType<typeof createToolHandlers>;
