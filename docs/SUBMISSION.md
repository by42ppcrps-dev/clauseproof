# Devpost Submission Copy

## Project name

ClauseProof

## Tagline

Crash-test ambiguous contract behavior before the real world does.

## Short description

ClauseProof is a deterministic contract behavior testbench for commercial counsel, procurement teams, and contract operations professionals. A browser agent stages two constrained, clause-cited readings of one synthetic SaaS agreement; the page runs both against the same adverse facts and exposes an $80,000 divergence. A person locks the intended outcome, the agent stages and repairs a structured clarification from exact counterexamples, and only the person can accept the fully tested wording.

## The problem

Contract language often survives review because each side reads the same words with a different operational model in mind. The disagreement appears only after a bad event, when the difference can become termination rights, credits, or months of fees.

ClauseProof focuses on one synthetic but concrete example: an SLA promises 99.5% monthly uptime, calls service credits the customer's sole and exclusive remedy, and separately allows termination for uncured material breach. After two uptime misses, one modeled reading gives the customer $2,000 in credits but no termination and $80,000 in remaining fees. Another gives the same credits, permits termination, and leaves no future fees.

The audience is specific: commercial counsel defining the intended allocation, procurement professionals negotiating operational remedies, and contract operations teams translating approved intent into repeatable review criteria. This prototype does not claim measured savings or production readiness. It demonstrates how that audience can expose a consequential semantic gap before accepting language.

## What ClauseProof does

The complete workflow is:

1. The browser agent inspects the current page revision, visible clauses, and scenario.
2. It stages exactly two materially different readings using known clause IDs and constrained semantic choices.
3. The page executes both readings against identical facts and renders the divergent commercial futures.
4. The person locks the expected behavior: two misses below 99.5% within six months, written notice, a 10-day cure period, termination without penalty, and preservation of accrued credits.
5. The agent stages a deliberately wrong three-occurrence rule.
6. The application generates the exact supported clause wording from that rule, reconstructs the rule from the wording, and runs six outcome examples plus eight altered-rule challenges.
7. The wrong candidate reaches only `5/6` and `7/8`. The returned counterexample says that the two-miss positive case expected termination but the candidate produced none; the surviving `occurrences-lower` mutation identifies the missing boundary.
8. The agent repairs the occurrence count and reruns the same page-owned tests, reaching `6/6` and `8/8`.
9. The person—not the agent—accepts the current verified wording into revision 1.

This failure-and-repair loop is essential. ClauseProof does not award a passing badge to arbitrary prose, and the judge journey does not hide behind only a preloaded happy path. It visibly rejects a semantically wrong candidate, explains why, and keeps acceptance disabled until the repaired current proposal passes.

## Why this is a strong WebMCP use case

WebMCP is necessary for the agent collaboration, not for the deterministic calculations. The agent must act on live page state across a governed workflow: cite the current clauses, attach work to the current revision, use identifiers returned by earlier steps, wait for a person's outcome lock, receive machine-readable counterexamples, and repair the current candidate without acquiring approval authority.

ClauseProof exposes five narrow tools:

- `inspect_contract_case`
- `stage_interpretations`
- `run_contract_crash_test`
- `propose_clarifying_redline`
- `verify_contract_tests`

The tool surface is phase-aware. Inputs are strict Zod objects, JSON Schema comes from the same definitions, unknown keys are rejected, and actor identity never comes from tool input. Stale revisions and artifact fingerprints fail closed. Tool results return concise evidence and one next action when agent work remains rather than asking the agent to calculate money, dates, or test outcomes.

Human authority is deliberately missing from WebMCP. There is no tool for locking expected behavior, accepting a revision, resetting the case, approving a contract, or signing anything.

Without typed page tools, a browser agent could discuss visible prose but would have no reliable, governed way to stage interpretations into the live product, execute the page's deterministic engine, consume exact counterexamples, or repair the current artifact while preserving a human decision boundary. WebMCP turns that discussion into auditable collaboration.

## Better user experience

ClauseProof replaces a vague “does this clause look safe?” exchange with a visible sequence of evidence:

- two readings cite the exact clauses they depend on;
- both readings run against the same facts;
- the financial consequence is rendered side by side;
- the person's intended outcome becomes concrete examples;
- a wrong candidate shows expected-versus-actual behavior;
- a surviving altered rule identifies an under-specified boundary; and
- the exact tested wording is shown before human acceptance.

The browser agent handles structured staging and evidence-driven repair. The page owns deterministic execution. The person owns commercial intent and acceptance. Each participant does the part it is suited and authorized to do.

## How it was built

ClauseProof is a TypeScript and React application with a strict dependency direction:

```text
domain ← application ← state/WebMCP ← UI
```

The pure domain layer uses integer cents, integer basis points, calendar-safe dates, and no current time or randomness. It owns interpretation execution, commercial comparison, outcome examples, clause rendering/parsing, and altered-rule testing.

The application layer owns workflow phases, revision checks, canonical fingerprints, stale-artifact invalidation, actor-safe commands, and audit events. Both the UI and WebMCP call the same application service.

The generated-clause boundary is intentionally narrow and testable. The agent supplies a supported semantic rule, not arbitrary redline prose. ClauseProof deterministically renders canonical wording, parses that wording back into semantics, requires exact round-trip equality, and executes the reconstructed rule. The human lock snapshots the displayed contract and scenario; lock, proposal, and verification are fingerprint-bound; service snapshots are frozen; and acceptance independently recomputes the full proof. Corrupted, detached, structurally inconsistent, noncanonical, or fingerprint-mismatched state fails closed.

The project uses no external AI API, legal-analysis backend, arbitrary upload, or OCR. The WebMCP-capable browser supplies the agent; ClauseProof supplies the typed actions, workflow state, deterministic calculations, and verification evidence.

## Judging criteria

### WebMCP Leverage

WebMCP drives the substantive collaboration: phase-aware tool registration, strict shared schemas, current-revision identifiers, clause-cited staging, deterministic execution, exact failed counterexamples, evidence-driven repair, and enforceable exclusion of human-only commands. The agent changes real page state through the same application service as the UI.

### Execution

The entry is a complete single-case product experience rather than a tool-console proof of concept. It includes the visible agreement, adverse timeline, two future branches, human outcome lock, generated before/after clause, failed and passing test evidence, acceptance gating, audit provenance, persistence, manual fallback, and browser-level tests.

### Potential Impact

The product makes a specific case for commercial counsel, procurement, and contract operations teams: expose differences in modeled contract behavior before those differences become live disputes or avoidable commercial exposure. The $80,000 synthetic divergence makes that problem concrete without claiming real-world savings.

### Creativity and Ambition

ClauseProof treats a clarification as a behavioral patch: the person defines expected outcomes, the agent stages a candidate, the application finds a counterexample, and the agent repairs the semantic boundary. The differentiator is not generic contract summarization; it is a deterministic, human-governed failure-and-repair loop inside the webpage.

## Challenges and lessons

The hardest design problem was preventing a polished but meaningless proof. Testing an agent-supplied JSON rule while displaying unrelated prose would be theater. The repaired design removes arbitrary proposal prose from the tool input, generates wording from the semantic rule, parses it back before execution, checks exact agreement and fingerprints, and demonstrates a real failing candidate before the passing one.

The second challenge was authority. A useful browser agent needs enough power to stage and repair work, but it should not be able to manufacture the person's intent or acceptance. ClauseProof enforces that separation in its service types, runtime actor checks, restricted agent-only capability port, tool registry, UI, and audit history.

## Limitations and safety

ClauseProof supports one synthetic SaaS agreement, one adverse scenario, one constrained interpretation vocabulary, and one canonical clarification grammar. It does not analyze arbitrary contracts, determine legal meaning, predict courts, establish enforceability, provide legal advice, or perform formal verification.

A passing suite means only that the current generated wording and reconstructed rule agree and that the rule satisfies the modeled examples and predefined altered-rule boundaries for this synthetic case.

## Testing instructions

1. Open the project in ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled.
2. Reset to revision 0 if necessary.
3. Ask the agent to stage the exact two clause-cited semantic combinations: all SLA-related remedies displaced with repeated failure not a material breach; versus compensation only with repeated failure possibly a material breach. Preserve accrued credits in both, then run the same facts.
4. Confirm the $80,000 divergence, then use the page to lock the two-miss, six-month, 10-day-cure outcome.
5. Ask the agent to stage a candidate that changes only `requiredOccurrences` from 2 to 3 and run every test.
6. Confirm `5/6`, `7/8`, the failed `positive-trigger`, disabled acceptance, and surviving `occurrences-lower` mutation.
7. Ask the agent to repair `requiredOccurrences` to 2 and retest.
8. Confirm `6/6`, `8/8`, and eligibility for human acceptance.
9. Click **Accept tested revision** yourself and confirm revision 1 plus the audit trail.

The repository also includes a manual fallback that invokes the same application service, plus an adversarial eval matrix covering tool selection, authority, stale state, invalid citations, wrong rules, and evidence-driven repair.

## Hackathon-period work

The repository history begins on August 28, 2026, after the August 25 submission-period start. The deterministic domain, governed service, product UI, WebMCP layer, release gates, deployment adapter, judge guidance, and adversarial failure-and-repair hardening were built during the challenge period. The repository's hackathon changelog maps that work to dated source history and tests.
