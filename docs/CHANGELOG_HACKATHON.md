# ClauseProof Hackathon-Period Changelog

The WebMCP Challenge submission period began August 25, 2026. ClauseProof's current Git history begins August 28, 2026; there are no repository commits predating the submission period. The project represented by this repository is therefore hackathon-period work rather than a pre-existing product with a later WebMCP wrapper.

This document distinguishes the dated implementation milestones and the later adversarial hardening visible in the current source and tests.

## Dated repository milestones

| Date       | Commit    | Work introduced                                                                                                 |
| ---------- | --------- | --------------------------------------------------------------------------------------------------------------- |
| 2026-08-28 | `98c8e59` | Product specification, architecture contract, tool contracts, and claim limits for one synthetic SaaS case      |
| 2026-08-28 | `80994c2` | Pure deterministic domain calculations, modeled outcomes, generated examples, and boundary-strength checks      |
| 2026-08-28 | `bbbc065` | Governed workflow service, human authority types, revisions, fingerprints, audit events, state, and persistence |
| 2026-08-28 | `e6443a8` | Visible contract review cockpit, divergent futures, outcome lock, redline, tests, and activity rail             |
| 2026-08-28 | `18e8565` | Five strict, phase-aware WebMCP tools and dynamic registration                                                  |
| 2026-08-28 | `39379bf` | CI/release gates, architecture and tool-budget checks, production build, and Sites configuration                |
| 2026-08-28 | `1ab9836` | Static-asset runtime adapter for the hosted build                                                               |
| 2026-08-28 | `7ab0038` | Production social-preview asset wiring                                                                          |
| 2026-08-29 | `0dbe895` | Self-guiding judge path, browser-agent prompt, and interaction reliability improvements                         |
| 2026-08-29 | `d850195` | Production client-bundle serving fix                                                                            |
| 2026-08-29 | `b98afb1` | Production favicon bundling fix                                                                                 |
| 2026-09-02 | `18657b5` | feat: resolve the WebMCP context from document or navigator and describe every tool field                       |
| 2026-09-02 | `5287c91` | feat: plain-language agent prompts and walkthrough copy                                                         |
| 2026-09-02 | `6931c4f` | chore: add static hosting targets and a sub-path aware build                                                    |
| 2026-09-02 | `f3e4211` | docs: rewrite README and submission copy; add demo media and kit scripts                                        |

The dates and hashes above are read directly from the repository history. They can be checked with:

```bash
git log --date=iso-strict --pretty=format:'%h %ad %s' --reverse
```

## Adversarial proof hardening — August 29

An adversarial review found that the first implementation could test a structured rule while displaying agent-supplied wording that was not itself executable. That made the central proof claim invalid. The current source closes that gap instead of hiding it.

### Generated-clause integrity

- Removed arbitrary proposed clause wording from the WebMCP schema.
- Added a deterministic renderer for the one supported clarification grammar.
- Added a strict parser that reconstructs semantics from the generated wording.
- Requires exact renderer/parser round-trip equality.
- Binds the human outcome lock, staged proposal, and verification through canonical fingerprints.
- Binds the outcome lock to the exact displayed contract and scenario snapshot.
- Returns frozen service snapshots so callers cannot mutate live workflow state.
- Independently recomputes the complete proof at acceptance and requires exact stored-verification agreement.
- Strictly parses persisted nested state and rejects corrupted or internally inconsistent artifacts.
- Gives WebMCP a frozen agent-only capability port with no lock, accept, or reset methods.
- Accepts the exact verified generated wording into the contract revision.
- Fails closed on noncanonical text, text/rule disagreement, or later mutation.

Primary evidence:

- `src/domain/redline.ts`
- `src/application/proposalIntegrity.ts`
- `src/application/serviceOperations.ts`
- `src/domain/workflow.ts`
- `tests/unit/redline.test.ts`
- `tests/integration/service.test.ts`

### Real failure and repair

- A supported but wrong semantic candidate can now be staged rather than rejected for disagreeing with the human lock.
- Verification retains the failed evidence, returns the workflow to the outcome-locked repair phase, and keeps acceptance disabled.
- WebMCP returns exact failed expectation evidence and the identifiers of surviving altered rules.
- The proposal tool becomes available again after failure so the agent can repair from evidence.
- The judge journey deliberately stages a three-occurrence candidate against a two-occurrence lock, shows the failed positive example and surviving lower-occurrence mutation, and then repairs only that field.

Primary evidence:

- `src/domain/outcomeTestCases.ts`
- `src/domain/boundaryStrength.ts`
- `src/webmcp/normalizers.ts`
- `src/webmcp/handlers.ts`
- `src/features/testbench/TestBench.tsx`
- `tests/integration/service.test.ts`
- `tests/webmcp/handlers.test.ts`
- `tests/webmcp/registry.test.ts`
- `tests/e2e/manual-judge-flow.spec.ts`

### Truthful evidence rendering

- Displays the labels, citations, rationales, and semantic choices actually staged by the agent.
- Displays the exact generated “After” wording and its attached semantic fields.
- Shows expected and actual outcomes for every test rather than only aggregate badges.
- Shows which examples catch each altered rule and identifies missing counterexamples.
- Distinguishes manual fallback actions, browser-agent actions, and human decisions in the activity trail.
- Shows the exact service-authorized agent tools and permanently human-only actions from one shared phase mapping.
- Preserves the wrong candidate, exact failed evidence, repair, passing rerun, and human acceptance in the final proof ledger.
- Shows the executed artifact chain from bounded rule through generated wording and parse-back to deterministic tests.
- Makes clear that a person's non-default lock regenerates the wording and all fourteen checks within the same case.

Primary evidence:

- `src/features/futures/FuturesPanel.tsx`
- `src/features/redline/RedlinePanel.tsx`
- `src/features/testbench/TestBench.tsx`
- `src/features/activity/ActivityRail.tsx`
- `tests/e2e/manual-judge-flow.spec.ts`

### Contest package and evals

- Reframed the product for its specific audience: commercial counsel, procurement, and contract operations.
- Documented why WebMCP is necessary for governed agent collaboration while the deterministic engine remains page-owned.
- Added an under-three-minute agent-first recording script with the wrong-candidate-to-repair sequence.
- Added paste-ready submission copy mapped to all four judging criteria.
- Added an adversarial eval matrix covering tool selection, authority, stale state, invalid citations, wrong rules, and repair.
- Expanded the claims boundary to prohibit arbitrary-language, legal-advice, formal-verification, and guaranteed-impact claims.

Primary evidence:

- `README.md`
- `docs/DEMO.md`
- `docs/SUBMISSION.md`
- `docs/CLAIMS.md`
- `evals/README.md`
- `evals/adversarial-cases.json`

## Reproduction and freeze discipline

The complete local verification command is:

```bash
npm run check:full
```

Execution results belong in the release report produced when the final source is tested; this changelog does not invent or imply a particular run result.

The final public repository, judge-accessible live build, and public narrated video must all represent the same tested version. Under the challenge guidance, the submitted repository, live site, and Devpost entry should remain unchanged after the September 3, 2026 deadline through judging. If development continues, it should happen in a separate fork rather than altering the submitted version.

## Submission readiness — September 2

- Resolve the WebMCP context from `document.modelContext` first and `navigator.modelContext` second so one build works in ChatGPT's built-in browser, Chrome 149+, and earlier Chrome previews; report `not detected` with a hint when neither exists.
- Add plain-English `description` fields to every tool input schema and return a `readingVocabulary` from `inspect_contract_case`, so the on-page prompts can describe readings in ordinary language instead of naming enum values.
- Replace the enum-string agent prompts with natural-language prompts; rename the on-page "judge path" to a guided walkthrough; add a one-sentence value statement under the headline.
- Split the app shell into prompt and clipboard modules to stay within the 300-line architecture limit.
- Add hosting configuration for GitHub Pages (sub-path aware via `VITE_BASE`), Netlify, and Vercel alongside ChatGPT Sites; make the favicon path relative and the social-preview URL build-time configurable.
- Add `scripts/capture-demo-media.mjs` (README screenshots and B-roll driven through the real registered tools) and `scripts/build-demo-kit.mjs` (paste-ready prompts, pre-rendered narration, captions, and an ffmpeg assembly script for the demo video).
- Rewrite the README, Devpost description, and demo plan in plain language with exact prompts and testing steps.
