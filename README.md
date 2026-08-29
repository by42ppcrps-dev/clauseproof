# ClauseProof — Unit tests for contract language

ClauseProof is a deterministic contract behavior testbench for commercial counsel, procurement teams, and contract operations professionals. A browser agent stages two constrained, clause-cited readings of one synthetic SaaS agreement. The page runs both against the same adverse facts, exposes an $80,000 divergence, and turns the person's intended outcome into executable examples. The agent can then stage a structured clarification, learn from an exact failed counterexample, repair it, and rerun the tests. Only the person can lock intent or accept the tested revision.

> ClauseProof tests modeled commercial behavior in a synthetic agreement. It does not parse arbitrary contracts, predict a court ruling, determine enforceability, or provide legal advice.

## Live build

[Open the ClauseProof testbench](https://clauseproof-testbench.dgkv.chatgpt.site/).

Judge-access status: access is being finalized. The current deployment may require owner authentication, so it must be verified from a signed-out browser or accompanied by working judge credentials before it is used as the contest live URL.

## The one case

The synthetic agreement combines:

- a 99.5% monthly uptime commitment;
- a service-credit clause described as the customer's “sole and exclusive remedy”; and
- a separate 30-day material-breach termination clause.

The bad-day facts are fixed: January uptime is 98.7%, February uptime is 98.9%, the monthly fee is $10,000, eight months remain, notice was given March 1, and the failure was not cured.

Two supported readings produce different commercial futures from those same facts:

| Modeled reading                                        | Credits | Termination | Future fees |
| ------------------------------------------------------ | ------: | ----------- | ----------: |
| Credits displace all SLA-related remedies              |  $2,000 | Unavailable |     $80,000 |
| Credits limit compensation; breach termination remains |  $2,000 | Available   |          $0 |

The displayed financial divergence is exactly $80,000.

## The proof boundary

ClauseProof never pretends to understand unrestricted legal prose. The agent submits a strictly validated semantic rule. The application compiles that rule into one supported canonical clause grammar, parses the generated wording back into a rule, checks exact round-trip equality, and executes the reconstructed rule against the person's locked examples. The lock snapshots the displayed contract and scenario; fingerprints bind that lock, the proposal, and the verification; acceptance independently recomputes the complete proof.

```text
validated semantic rule
→ deterministic clause renderer
→ canonical clause wording
→ strict parser and round-trip check
→ six outcome examples + eight altered-rule challenges
→ human-only acceptance
```

A passing run proves only that the generated clause and structured rule agree and that the rule satisfies the modeled examples and boundaries for this synthetic case. It is not formal verification or a legal conclusion.

## Why WebMCP matters

WebMCP is necessary for the agent collaboration, not for the deterministic engine. It gives the browser agent a narrow, typed way to:

- inspect the exact page revision and visible clauses;
- stage two clause-cited semantic readings;
- execute both readings against page-owned facts;
- stage a candidate rule only after a person locks intent;
- receive exact counterexamples from a failed candidate; and
- repair and retest without inventing calculations or acceptance authority.

The available tools change with the workflow phase. Every tool input uses a strict Zod schema, rejects unknown fields, and carries revision or artifact identifiers where required. WebMCP cannot lock an outcome, accept a revision, or reset the case. Those controls exist only in the human UI.

Without WebMCP, the page still has an explicit manual fallback for accessibility and repeatable testing. What WebMCP adds is genuine in-page agent action with live state, provenance, recovery evidence, and enforceable authority boundaries—not a second implementation of the business logic.

## Judge journey

1. In a WebMCP-capable browser, ask the agent to inspect the agreement and stage the exact two cited semantic combinations: credits displace all SLA remedies and repeated failure is not a material breach; versus credits limit compensation and repeated failure may be a material breach. Preserve accrued credits in both readings, then run them against the same scenario.
2. Confirm the displayed $80,000 divergence.
3. As the person, lock the intended two-miss, six-month, 10-day-cure behavior.
4. Ask the agent to stage a deliberately wrong three-occurrence candidate and run every test.
5. Observe the exact failure: `5/6` outcome examples pass, `7/8` altered rules are caught, the `positive-trigger` example expected termination but the candidate produced no termination, and `occurrences-lower` survives.
6. Ask the agent to repair only the occurrence count and retest. The replacement reaches `6/6` and `8/8`.
7. Use the human-only button to accept the tested revision.

See [docs/DEMO.md](docs/DEMO.md) for the timed, under-three-minute recording script and exact prompts.

## WebMCP tools

- `inspect_contract_case`
- `stage_interpretations`
- `run_contract_crash_test`
- `propose_clarifying_redline`
- `verify_contract_tests`

There is deliberately no tool for locking expected behavior, accepting a redline, resetting the case, approving a contract, recording a human decision, or signing anything.

## Local development

Requires Node.js 24 or newer.

```bash
npm install
npm run dev
```

Run the complete quality gate with:

```bash
npm run check:full
```

The gate runs linting, formatting, strict TypeScript checks, unit and integration tests, architecture checks, WebMCP tool-budget checks, a production build, and Playwright browser tests.

Add `?toolMode=static` to the local URL to register the five-tool fallback surface. Service-side phase, revision, fingerprint, and authority checks remain active in static mode.

## Architecture

```text
domain ← application ← state/WebMCP ← UI
```

- `src/domain` contains pure deterministic contract calculations, the supported clause renderer/parser, outcome examples, and altered-rule testing.
- `src/application` owns workflow transitions, injected IDs and clock, fingerprints, stale-artifact checks, immutable state ownership, proof recomputation, and actor-safe commands.
- `src/state` publishes immutable snapshots, exposes a restricted agent-only port, and handles strict versioned persistence without calculating outcomes.
- `src/webmcp` validates untrusted tool input and calls the restricted port backed by the same application service used by the UI.
- React components render state and invoke typed wrappers; they do not calculate contract outcomes.

The implementation uses no external AI service, backend, upload pipeline, OCR, or legal-analysis API. The browser agent is supplied by the WebMCP-capable browser; the page remains the deterministic source of scenario calculations and test evidence.

## Evidence and limitations

- [Product specification](docs/PRODUCT_SPEC.md)
- [Architecture and authority model](docs/ARCHITECTURE.md)
- [Exact tool contracts](docs/TOOL_CONTRACTS.md)
- [Claims boundary](docs/CLAIMS.md)
- [Adversarial eval matrix](evals/README.md)
- [Hackathon-period changelog](docs/CHANGELOG_HACKATHON.md)
- [Contest submission copy](docs/SUBMISSION.md)

ClauseProof currently supports one synthetic SaaS agreement, one adverse scenario, one constrained interpretation vocabulary, and one canonical clarification grammar. It is a focused demonstration of contract behavior testing—not a production contract review system.

## License

MIT
