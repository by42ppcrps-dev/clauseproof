# Devpost submission copy

Paste-ready text for the submission form. Keep the claims boundary in `docs/CLAIMS.md` in mind if you edit.

## Project name

ClauseProof

## Tagline

Unit tests for contract language. A browser agent stages the readings and repairs the fix; the page proves it; you decide.

## Description

### The problem

Contract clauses survive review because both sides read the same words with different pictures in their heads. The difference only shows up after a bad event, when it turns into termination rights, credits, or months of fees.

Here is the clause family ClauseProof starts with. A SaaS agreement promises 99.5% monthly uptime, says service credits are the customer's "sole and exclusive remedy," and separately lets either party terminate for an uncured material breach. Now uptime is 98.7% in January and 98.9% in February, the fee is $10,000 a month, eight months remain, and the failure is not cured after notice. One reasonable reading: the customer gets $2,000 in credits and still owes $80,000. Another reasonable reading: the customer gets the same $2,000 and can walk. Nobody noticed at signing.

### What ClauseProof does

ClauseProof runs the clause instead of arguing about it. On one page:

1. A browser agent, working through WebMCP tools the page registers, reads the three clauses and stages two clause-cited readings with constrained semantics: vendor-favorable and customer-favorable.
2. The page executes both readings against the same facts and shows the two commercial futures side by side. In the demo case they are $80,000 apart. Then a what-if: "what if March also missed?" The agent changes the facts through a tool and the page re-runs both readings on the new facts. Facts can change only before the lock.
3. The person locks what the clause should mean: two misses within six months, written notice, a ten-day cure, termination without penalty, credits preserved. This step has no tool. It is person-only, and the agent's tool list changes when it happens.
4. The agent proposes a structured rule. The page compiles the rule into exact clause wording, parses the wording back into a rule, checks that they agree, and runs six outcome examples plus eight altered-rule challenges (mutation tests for the clause boundary).
5. If the candidate is wrong, the page says exactly why. In the walkthrough the agent first tries a three-miss rule: 5 of 6 outcome tests pass, 7 of 8 altered rules are caught, the failing test reports that termination was expected after two misses but the candidate gave none, and the surviving altered rule is "two misses instead of three."
6. The agent repairs only that field and retests: 6 of 6, 8 of 8. The page marks the candidate eligible. The agent still cannot accept.
7. The person accepts. The contract advances to revision 1 and the proof ledger keeps the failed candidate, the counterexample, the repair, the pass, and the acceptance, each attributed to who actually did it.

### Why this is a strong fit for WebMCP

The agent has to act on live page state inside a governed workflow, not just talk about a document. WebMCP is what makes that safe and useful:

- **Typed actions with live identifiers.** Every tool call carries the page's current revision and the IDs returned by earlier steps. A stale revision, a wrong outcome-lock ID, an invented clause, or two readings that agree all fail with a stable error code and one recovery action. The agent cannot drift from what the page actually shows.
- **Structured input, deterministic execution.** The agent supplies semantics; the page calculates money, dates, rolling windows, and test results. Input schemas are strict Zod objects compiled to JSON Schema with plain-English descriptions, so a natural prompt like "stage a vendor-favorable and a customer-favorable reading" is enough.
- **Phase-aware registration.** The page registers only the tools that make sense in the current phase and revokes the others through the registration `AbortSignal`. The authority panel on the page renders the same phase-to-tool map the registry enforces, so you can watch the agent's powers change.
- **Machine-readable failure.** A failed verification returns the exact failing test and the surviving altered rule in the tool result. That is what turns "try again" into a real repair.
- **Enforced human authority.** Lock, accept, and reset are not tools. The WebMCP layer receives a frozen port with no such methods, actor identity is never accepted as input, and the audit trail cannot record an agent action as a person's.

### What people and agents can do together now

Before: a person reads a clause, maybe asks a chatbot whether it "looks safe," and gets prose back. The disagreement stays hidden until the bad month.

Now: the agent does the tedious, structured part (stage the competing readings, propose the rule, read the counterexample, repair) inside the page; the page does the part software should own (execute the readings, generate the wording, run the tests); and the person does the two things only a person should do (say what the clause is supposed to mean, and accept the wording that proved it). The whole exchange is recorded with provenance.

### How WebMCP is implemented

- Six tools registered through `document.modelContext.registerTool` (with `navigator.modelContext` accepted for earlier Chrome previews): `inspect_contract_case`, `stage_interpretations`, `run_contract_crash_test`, `set_scenario_facts`, `propose_clarifying_redline`, `verify_contract_tests`.
- One `AbortController` per registration generation; a store subscription re-registers the phase's tool set on every state change. `?toolMode=static` registers all six for agents that only read tools at load.
- Strict Zod schemas are the single source of truth. JSON Schema is generated from them with `additionalProperties: false`, min and max bounds, enums for semantic choices, and field descriptions.
- Tool results are small JSON objects: `ok`, `data`, and one `next` action when agent work remains. Failures carry a stable code, the current revision, and a recovery action. No stack traces.
- Annotations mark the read tool `readOnlyHint: true` and its contract text `untrustedContentHint: true`.
- The WebMCP layer imports only a restricted agent port. An architecture check fails the build if it ever imports a human-capable surface. Twelve Playwright tests drive the real registered tools through a fake `document.modelContext`, including the failed-candidate-to-repair path and the tool list revoking on reset.

### Built with

TypeScript, React 19, Vite, Zod 4, Vitest, Playwright, ChatGPT Sites. No backend, no external AI API, no upload, no OCR.

### Limits

ClauseProof supports one synthetic SaaS agreement, one adverse scenario, one constrained reading vocabulary, and one canonical clarification grammar. A passing run proves that the generated clause and the structured rule agree and that the rule satisfies the modeled examples and boundaries for this case. It is not formal verification, not arbitrary contract analysis, and not legal advice. The pattern generalizes to any clause with numbers in it (cure periods, notice windows, caps, renewal terms); this is the first instance.

### Hackathon-period work

The repository's history begins August 28, 2026, after the August 25 start of the submission period. The domain engine, the governed workflow, the UI, the WebMCP layer, the release gates, and the adversarial hardening were all built during the challenge. `docs/CHANGELOG_HACKATHON.md` maps the work to dated commits.

## Testing instructions (form field)

No login. Fresh state on every reset.

1. Open the live URL in the ChatGPT desktop app's built-in browser with a GPT-5.6 model that supports site tools, or in Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled.
2. The status pill in the header reads `WebMCP · dynamic tools live`. Click **Reset** if the page is not at revision 0.
3. Copy the prompt at the top of the page into the agent. It reads the clauses, stages two readings, and runs the crash test. Confirm the $80,000 divergence. Optional what-if: ask "What if March 2026 had also missed at 99.2% uptime? Change the facts and report the new gap." The agent calls `set_scenario_facts` and the timeline and futures update.
4. Click **Lock this outcome** yourself (defaults: 2 misses, 6 months, 10-day cure, credits preserved). Note the agent's tool list changes.
5. Copy the next on-page prompt. The agent stages a three-miss candidate and runs every test. Confirm 5/6, 7/8, the failed `positive-trigger` example, the surviving `occurrences-lower` rule, and the disabled accept button.
6. The agent repairs to two misses and retests. Confirm 6/6 and 8/8.
7. Click **Accept tested revision** yourself. Confirm revision 1 and the proof ledger.

No agent available: every panel has a manual fallback button that calls the same application service, and `?toolMode=static` registers all six tools at once.

## Links (form fields)

- Live URL: https://lumegridai-ops.github.io/clauseproof/ (no login; a ChatGPT Sites deployment also exists at https://clauseproof-testbench.dgkv.chatgpt.site/ once public publishing is enabled for the workspace)
- Repository: https://github.com/lumegridai-ops/clauseproof (MIT license file in the root, visible in About)
- Video: public YouTube link, under three minutes
