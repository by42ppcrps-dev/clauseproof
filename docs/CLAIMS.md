# ClauseProof Claims Boundary

## Required disclosure

> ClauseProof tests modeled commercial behavior in a synthetic agreement. It does not parse arbitrary contracts, predict a court ruling, determine enforceability, or provide legal advice.

## Accurate product description

> ClauseProof is a WebMCP-native contract behavior testbench where a browser agent stages constrained, clause-cited semantic readings, the page deterministically executes those readings against one visible scenario, and a person defines the expected outcomes that a generated clarification must pass.

ClauseProof is designed for commercial counsel, procurement teams, and contract operations professionals who need to expose operational ambiguity before agreement language is accepted. The current build demonstrates the workflow with one synthetic SaaS agreement and one adverse SLA scenario.

## What the application actually proves

Within the supported synthetic model, ClauseProof can accurately claim that it:

- executes two constrained semantic readings against the same page-owned facts;
- calculates the modeled credits, termination availability, future fees, and financial divergence deterministically;
- restricts readings to known clause IDs and supported semantic choices;
- records the labels, citations, rationales, and actor provenance that were actually staged;
- lets only a person lock expected behavior;
- generates six outcome examples from that lock;
- accepts a supported structured candidate even when it is wrong, then exposes exact failed expectations and surviving altered rules;
- allows an agent to repair that candidate from returned evidence;
- generates the exact displayed clause wording from the staged structured rule;
- parses that wording back into executable semantics and requires exact round-trip agreement;
- binds the outcome lock to the displayed contract and scenario snapshot;
- binds the human lock, staged proposal, and verification through canonical fingerprints;
- exposes frozen service snapshots so callers cannot mutate live workflow state; and
- lets only a person accept a fully passing current proposal.

A `6/6` outcome result means the reconstructed rule matched all six modeled expectations. An `8/8` altered-rule result means each of eight predefined nearby rule mutations was distinguished by at least one outcome example. Neither result establishes legal correctness.

## Generated-clause compiler/parser boundary

The agent does not submit arbitrary redline prose for the application to “understand.” It submits a strictly validated semantic rule within the supported bounds. ClauseProof then performs this sequence:

```text
strict semantic rule
→ deterministic canonical renderer
→ generated clarification text
→ strict canonical parser
→ reconstructed semantic rule
→ exact renderer/parser agreement check
→ deterministic outcome and altered-rule tests
```

Before verification, the generated wording is parsed and checked against the staged rule. Before acceptance, the application independently reconstructs the current rule, reruns the complete six-example and eight-boundary proof, and requires exact agreement with the stored verification. Arbitrary, corrupted, detached, structurally inconsistent, or noncanonical state fails closed.

This boundary demonstrates faithful compilation and execution for one controlled clause grammar. It does not claim natural-language understanding, interpretation of arbitrary contracts, linguistic completeness, or formal verification.

## Agent and human authority

The browser agent may inspect, stage modeled readings, run the crash test, stage a candidate semantic rule, receive deterministic counterexamples, repair the rule, and rerun tests.

The browser agent may not:

- lock the person's intended outcome;
- accept a tested revision;
- reset the demonstration;
- manufacture an actor identity through tool input; or
- bypass phase, revision, fingerprint, or current-artifact checks.

Human-only operations are absent from the WebMCP tool surface. The audit trail records agent actions as agent actions; it cannot record them as `human-ui`.

The browser's persisted state is a continuity adapter, not a tamper-proof legal record. Its strict parser rejects stale or internally inconsistent certification, but the page makes no cryptographic attestation claim against a person with arbitrary access to the browser's storage or runtime.

## Hallucination controls

ClauseProof limits what an agent can assert through the product workflow:

- facts and clause text come from the current page state;
- tool inputs are strict Zod objects and reject unknown keys;
- citations use a closed set of visible clause IDs;
- money uses integer cents and thresholds use integer basis points;
- dates, identifiers, and fingerprints are deterministic or injected;
- page-owned code performs every monetary, date, outcome, and boundary calculation;
- failed verification returns concrete expected-versus-actual evidence and one recovery direction; and
- acceptance remains unavailable until the current proposal passes every modeled check.

These controls reduce unsupported agent action inside the demonstration. They do not guarantee that a browser agent will never produce incorrect natural-language narration outside the application.

## Prohibited claims

Do not claim that ClauseProof:

- provides legal advice;
- predicts courts or determines enforceability;
- reads, uploads, analyzes, or redlines arbitrary contracts;
- establishes that generated wording is unambiguous in every legal or factual context;
- performs formal verification;
- proves real-world truth or production fitness;
- guarantees negotiation outcomes, avoided losses, contest results, or commercial impact;
- replaces commercial counsel, procurement, or contract operations professionals;
- uses an AI backend or external legal-analysis service;
- invented executable contracts or contract testing; or
- authorizes, signs, or executes an agreement.

Fingerprints are stale-state and integrity checks only. A passing suite shows that the current generated proposal satisfies the modeled behavior and predefined boundaries selected for this synthetic case. It is not a legal conclusion.
