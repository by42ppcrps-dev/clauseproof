# ClauseProof Architecture

## Dependency direction

```text
domain ← application ← state/webmcp ← UI
```

The domain is pure deterministic TypeScript. It owns contract facts, semantic interpretations, money and date calculations, outcome comparison, outcome tests, boundary variants, and workflow invariants. It must not import React, browser APIs, persistence, WebMCP, or network clients, and it must not use current time or randomness.

The application layer owns workflow orchestration, actor-safe commands, revisions, canonical fingerprints, stale-artifact invalidation, and audit creation. `ClauseProofService` is the sole business-operation boundary used by the UI and WebMCP.

The state layer publishes application snapshots, subscriptions, persistence, migrations, and reset behavior. It contains no contract calculations.

The WebMCP layer validates untrusted input, calls the service, normalizes concise results, and manages phase-aware tool registration. It contains no business calculations and cannot call human-only service methods.

The UI renders selectors and invokes actor-safe wrappers. Components do not mutate store internals, calculate commercial outcomes, decide transitions, or construct actor identity from editable values.

## Determinism

- Money is integer cents.
- Percentages are integer basis points.
- Dates are ISO calendar dates evaluated without current time.
- Application time and identifiers are injected.
- Fingerprints use canonical JSON and SHA-256.
- Domain functions have no side effects.

## Authority

Agent or manual-fallback actors may stage interpretations, run the crash test, stage a redline, and verify it. Only a `human-ui` actor may lock an outcome, accept a redline, or reset the case.

There is no generic public dispatch API. Human-only service methods require a human actor type that WebMCP code cannot construct or import through its adapter surface. An agent-originated audit event can never be recorded as `human-ui`.

## Workflow

```text
ready
→ interpretations_staged
→ divergence_visible
→ outcome_locked
→ redline_staged
→ verified
→ accepted
```

Every out-of-phase command fails without mutating business state. Reset is the sole non-monotonic transition. Revision or outcome changes invalidate every downstream artifact.

## Persistence and registration

Persistence is an adapter with safe schema migration and recovery from corrupted storage. A fresh browser starts from the canonical seed.

Dynamic WebMCP registration uses one `AbortController` per generation and revokes stale tools on phase change. Static mode registers all five tools, but the service still rejects invalid phases, revisions, and fingerprints; registration is not the security boundary.
