# ClauseProof WebMCP Tool Contracts

ClauseProof exposes exactly six narrow tools. All inputs are strict Zod objects, JSON Schema is generated from the same schemas with plain-English field descriptions, unknown keys are rejected, and actor identity is never accepted as input.

Tools are registered through `document.modelContext.registerTool`, the surface defined by the WebMCP draft and used by ChatGPT's built-in browser and Chrome 149+. `navigator.modelContext` is accepted as a fallback for earlier Chrome previews. Each `execute` returns a plain JSON object (`ok`, `data`, `next` on success; `ok`, `error` with a stable code, the current revision, and one recovery action on failure).

## `inspect_contract_case`

Reads the current revision, phase, visible clauses, scenario, and next action. Its `view` is one of `overview`, `clauses`, or `workflow`. The overview also returns the agreement's SLA threshold and a `readingVocabulary` that explains each supported semantic choice in plain English, so an agent can map a natural request ("vendor-favorable", "customer-favorable") onto the enums without being told their names. The workflow view returns the person's locked rule and the artifact IDs later tools require. It is read-only and idempotent. Because it can return contract language, it marks that content as untrusted.

## `stage_interpretations`

Stages exactly two clause-cited modeled interpretations against the current revision. Each interpretation supplies a short label, constrained remedy and breach semantics, a concise rationale, and citations to both `sla-exclusive-remedy` and `material-breach` (with the SLA commitment optionally included). The application rejects unknown or incomplete citations, identical semantic readings, stale revisions, unsupported facts, and readings that do not produce distinct outcomes.

## `run_contract_crash_test`

Runs the current interpretation set against the one visible scenario. It accepts only the current base revision and interpretation-set identifier and returns concise branch summaries plus ordered divergence fields.

## `set_scenario_facts`

What-if. Replaces the scenario facts (monthly uptime list, fee, months remaining, notice flag and date, evaluation date, cure date) against the current revision, keeping the canonical scenario id and credit rate. Allowed only in `ready`, `interpretations_staged`, and `divergence_visible`; once the person locks intent the facts are frozen and the tool returns `INVALID_PHASE`. In `divergence_visible` the page re-executes both staged readings on the new facts and returns the new branch outcomes and divergence, which may be zero when the readings agree under those facts. Duplicate months and out-of-bounds values are rejected with `INVALID_INPUT`. Every change is recorded in the proof ledger as an agent action.

## `propose_clarifying_redline`

After a person locks the expected outcome, stages a supported structured rule against the exact ordered pair `sla-exclusive-remedy`, `material-breach`. The agent cannot submit arbitrary proposal text: the application deterministically generates the canonical clause wording from the rule. It validates the current revision, human-owned outcome-lock identifier, and the lock's exact contract-and-scenario snapshot. A supported but wrong rule may be staged so the tests can return repair evidence. The tool stages only and cannot accept.

## `verify_contract_tests`

Parses the exact generated wording back into executable semantics, checks exact renderer/parser agreement, and runs all six outcome tests plus eight altered-rule challenges against that reconstructed rule. It validates the current revision, outcome-lock fingerprint, proposal identifier, generated text, and proposal fingerprint. It reports pass counts, exact failed expectations, surviving altered rules, and eligibility for human acceptance. A failed verification preserves the evidence and returns the workflow to `outcome_locked` so a replacement may be staged. It cannot accept; human acceptance independently recomputes the same proof and requires exact agreement with the stored verification.

## Phase surface

| Phase                    | Available tools                                    |
| ------------------------ | -------------------------------------------------- |
| `ready`                  | inspect, stage interpretations, set scenario facts |
| `interpretations_staged` | inspect, run crash test, set scenario facts        |
| `divergence_visible`     | inspect, set scenario facts                        |
| `outcome_locked`         | inspect, propose redline                           |
| `redline_staged`         | inspect, verify tests                              |
| `verified`               | inspect                                            |
| `accepted`               | inspect                                            |

Static fallback mode may register all six, but every handler continues to enforce the same workflow rules.

WebMCP handlers receive a restricted agent port whose interface and frozen runtime object omit `lockOutcome`, `acceptRedline`, and `reset`; the registry is not handed the human-capable store.

## Stable failures

Failures use the documented codes `INVALID_INPUT`, `INVALID_PHASE`, `STALE_REVISION`, `UNKNOWN_CLAUSE`, `INTERPRETATIONS_NOT_DISTINCT`, `UNKNOWN_INTERPRETATION_SET`, `OUTCOME_NOT_LOCKED`, `STALE_OUTCOME_LOCK`, `RULE_MISMATCH`, `UNKNOWN_PROPOSAL`, `STALE_PROPOSAL`, `TESTS_FAILED`, and `INTERNAL_ERROR`. `ALREADY_ACCEPTED` remains reserved in the shared error vocabulary; the current phase-gated flow does not emit it.

No failure exposes a stack trace. Every recoverable failure gives exactly one clear recovery action.
