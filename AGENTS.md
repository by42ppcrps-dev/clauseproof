# AGENTS.md — ClauseProof Coding Contract

This file is authoritative for every coding agent working in this repository.

## 1. Product lock

ClauseProof is a deterministic contract behavior testbench.

The canonical flow is:

```text
inspect
→ stage two modeled interpretations
→ run the same bad-day scenario
→ show divergent commercial futures
→ person locks intended outcome
→ agent stages a clarifying redline
→ application runs outcome and boundary tests
→ person accepts
```

Do not change the product thesis or add a second scenario without an explicit human instruction.

## 2. Read before editing

Before changing code, read:

1. `docs/PRODUCT_SPEC.md`
2. `docs/ARCHITECTURE.md`
3. `docs/TOOL_CONTRACTS.md`
4. the relevant tests
5. this file

Do not infer requirements from the old implementation.

## 3. Non-goals

Do not add:

- arbitrary upload or OCR;
- external AI calls;
- Xano, SerpApi, or any backend;
- auth, accounts, teams, or organizations;
- e-sign or signature packets;
- general legal analysis;
- a generic framework or SDK;
- a new state management library;
- Tailwind, a component framework, or an animation library;
- a second contract case.

## 4. Layer rules

Dependency direction:

```text
domain <- application <- state/webmcp <- UI
```

### Domain

- pure TypeScript;
- no React;
- no browser APIs;
- no storage;
- no WebMCP;
- no `fetch`;
- no `Date.now()` or `Math.random()`;
- no side effects.

### Application

- owns workflow orchestration, actor-safe commands, revisions, fingerprints, and audit creation;
- calls pure domain functions;
- does not render UI;
- does not register WebMCP tools.

### State

- stores and publishes application state;
- does not contain contract calculations;
- persistence is an adapter, not business logic.

### WebMCP

- validates untrusted input;
- calls `ClauseProofService`;
- normalizes results;
- contains no business calculations;
- cannot call human-only service methods.

### UI

- renders selectors and calls service wrappers;
- components do not mutate store internals;
- components do not calculate legal/commercial outcomes.

## 5. Human authority

The following commands are human UI only:

- `lockOutcome`
- `acceptRedline`
- `resetDemo`

Never expose them as WebMCP tools.

Never accept actor identity from tool input.

An agent-originated event must never be recorded as `human-ui`.

## 6. Determinism

Use:

- integer cents;
- integer basis points;
- injected clock;
- injected ID generator;
- canonical JSON for fingerprints.

Do not use floating-point dollars, random IDs, or current time in domain tests.

## 7. Code standards

- TypeScript strict mode.
- No `any`.
- No `@ts-ignore`.
- No non-null assertions except the root mount when unavoidable.
- No `TODO`, `FIXME`, or placeholder copy.
- No silent catch.
- No broad index signatures when a union or schema is possible.
- Use discriminated unions for phases, actors, and results.
- Prefer named pure functions.
- Keep functions focused.
- Split by responsibility, not arbitrary file count.
- Avoid premature abstraction.
- Avoid duplicate source-of-truth schemas.

Soft limits:

- component: 250 lines;
- domain module: 300 lines;
- function: 50 lines;
- tool result: 1,200 characters on canonical data.

If a limit must be exceeded, explain why in the commit.

## 8. Schema rules

- Define input in Zod.
- Use strict objects.
- Generate JSON Schema from the same Zod schema.
- Reject unknown keys.
- Set useful min/max bounds.
- Use enums for semantic choices.
- Never ask the agent to calculate money, dates, or rolling windows.

## 9. Error rules

Return stable error codes:

```text
INVALID_INPUT
INVALID_PHASE
STALE_REVISION
UNKNOWN_CLAUSE
INTERPRETATIONS_NOT_DISTINCT
UNKNOWN_INTERPRETATION_SET
OUTCOME_NOT_LOCKED
STALE_OUTCOME_LOCK
RULE_MISMATCH
UNKNOWN_PROPOSAL
STALE_PROPOSAL
TESTS_FAILED
ALREADY_ACCEPTED
INTERNAL_ERROR
```

Every recoverable tool error must include one clear recovery action.

Never return a stack trace to a tool caller.

## 10. Tests before implementation

For each work package:

1. add or update the failing tests;
2. implement the smallest code that makes them pass;
3. run targeted tests;
4. run the complete required gate;
5. report exact command results.

Never weaken a test merely to make a change pass.

## 11. Required checks

Before claiming completion:

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run check:architecture
npm run check:tools
npm run build
```

For UI, registry, or release changes also run:

```bash
npm run test:e2e
```

## 12. Task scope

Every task prompt must name:

- goal;
- allowed files;
- forbidden files;
- invariants;
- tests;
- acceptance commands.

Do not modify files outside the allowed scope without stopping and reporting the dependency.

Do not perform unrelated refactors.

## 13. Git behavior

- One coherent behavior per commit.
- No generated lockfile churn without a dependency change.
- Do not rewrite challenge-period history.
- Do not force push.
- Do not change deployment or Devpost copy in a feature task.
- Do not merge until the required gate passes.

## 14. Review checklist

Before finalizing a diff, inspect for:

- business logic in UI;
- state mutation in WebMCP;
- agent-accessible human authority;
- stale artifacts not invalidated;
- duplicated schemas;
- hidden assumptions;
- nondeterministic calculations;
- misleading copy;
- accessibility regression;
- tool overlap;
- tool result bloat;
- unsupported claim;
- old ClauseProof/OCR/Xano/signature language.

## 15. Completion response

Return:

1. concise behavior implemented;
2. files changed;
3. tests added;
4. commands run and results;
5. remaining risk or `none`.

Do not say “done” if any required command was not run or failed.
