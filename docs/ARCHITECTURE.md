# ClauseProof Architecture

## Dependency direction

```text
domain ← application ← state/webmcp ← UI
```

The domain is pure deterministic TypeScript. It owns contract facts, semantic interpretations, money and date calculations, outcome comparison, outcome tests, boundary variants, and workflow invariants. It must not import React, browser APIs, persistence, WebMCP, or network clients, and it must not use current time or randomness.

The application layer owns workflow orchestration, actor-safe commands, revisions, canonical fingerprints, contract-and-scenario snapshot binding, stale-artifact invalidation, defensive state ownership, acceptance-proof recomputation, and audit creation. `ClauseProofService` is the sole business-operation boundary.

The state layer publishes immutable application snapshots, subscriptions, an agent-only capability port, strict versioned persistence, and reset behavior. It contains no contract calculations.

The WebMCP layer validates untrusted input, calls only the restricted agent port, normalizes concise results, and manages phase-aware tool registration. It contains no business calculations, and its runtime object and TypeScript interface contain no human-only service methods.

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

The WebMCP registry and the visible authority panel consume one shared phase-to-tool mapping. The UI therefore shows the same service-authorized agent surface that dynamic registration enforces, while separately identifying `lockOutcome`, `acceptRedline`, and `resetDemo` as person-only operations.

## Workflow

```text
ready
→ interpretations_staged
→ divergence_visible
→ outcome_locked
→ redline_staged
├→ verified → accepted
└→ outcome_locked (failed verification; repair and restage)
```

Every out-of-phase command fails without mutating business state. A failed verification preserves its counterexample evidence but returns the workflow to `outcome_locked`, where the agent may stage a replacement proposal. Reset is the sole full restart. Before acceptance, revision or outcome changes invalidate downstream artifacts. Acceptance advances the revision while retaining the exact proof bundle bound to the accepted wording.

Audit events record actor, action, outcome, sequence, and a concise evidence summary. This lets the final proof ledger preserve the wrong candidate, its exact test and altered-rule result, the repair, the passing rerun, and the person's acceptance even though only the current proposal remains the active workflow artifact.

## Persistence and registration

Persistence is a versioned adapter with strict parsing and recovery from stale or corrupted storage. Persisted certification is checked against the canonical source case, generated grammar, deterministic proof, artifact bindings, and completed human acceptance event. A fresh browser starts from the canonical seed.

Dynamic WebMCP registration uses one `AbortController` per generation and revokes stale tools on phase change. Static mode registers all five tools, but the service still rejects invalid phases, revisions, and fingerprints; registration is not the security boundary.
