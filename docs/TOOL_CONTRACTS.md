# ClauseProof WebMCP Tool Contracts

ClauseProof exposes exactly five narrow tools. All inputs are strict Zod objects, JSON Schema is generated from the same schemas, unknown keys are rejected, and actor identity is never accepted as input.

## `inspect_contract_case`

Reads the current revision, phase, visible clauses, scenario, and next action. Its `view` is one of `overview`, `clauses`, or `workflow`. It is read-only and idempotent. Because it can return contract language, it marks that content as untrusted.

## `stage_interpretations`

Stages exactly two clause-cited modeled interpretations against the current revision. Each interpretation supplies a short label, one to three known clause IDs, constrained remedy and breach semantics, and a concise rationale. The application rejects unknown clauses, identical semantic readings, stale revisions, unsupported facts, and readings that do not produce distinct outcomes.

## `run_contract_crash_test`

Runs the current interpretation set against the one visible scenario. It accepts only the current base revision and interpretation-set identifier and returns concise branch summaries plus ordered divergence fields.

## `propose_clarifying_redline`

After a person locks the expected outcome, stages proposed text and a matching structured rule against one or both relevant clauses. It validates the current revision and human-owned outcome-lock identifier. It stages only and cannot accept.

## `verify_contract_tests`

Runs all six outcome tests and eight boundary variants against the current proposal. It validates the current revision, proposal identifier, and fingerprints. It reports pass counts, failed identifiers, boundary strength, and eligibility for human acceptance. It cannot accept.

## Phase surface

| Phase                    | Available tools                |
| ------------------------ | ------------------------------ |
| `ready`                  | inspect, stage interpretations |
| `interpretations_staged` | inspect, run crash test        |
| `divergence_visible`     | inspect                        |
| `outcome_locked`         | inspect, propose redline       |
| `redline_staged`         | inspect, verify tests          |
| `verified`               | inspect                        |
| `accepted`               | inspect                        |

Static fallback mode may register all five, but every handler continues to enforce the same workflow rules.

## Stable failures

Failures use the documented codes `INVALID_INPUT`, `INVALID_PHASE`, `STALE_REVISION`, `UNKNOWN_CLAUSE`, `INTERPRETATIONS_NOT_DISTINCT`, `UNKNOWN_INTERPRETATION_SET`, `OUTCOME_NOT_LOCKED`, `STALE_OUTCOME_LOCK`, `RULE_MISMATCH`, `UNKNOWN_PROPOSAL`, `STALE_PROPOSAL`, `TESTS_FAILED`, `ALREADY_ACCEPTED`, and `INTERNAL_ERROR`.

No failure exposes a stack trace. Every recoverable failure gives exactly one clear recovery action.
