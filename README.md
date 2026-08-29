# ClauseProof — Unit tests for contract language

ClauseProof is a deterministic contract behavior testbench. A browser agent stages two constrained, clause-cited readings of one synthetic SaaS agreement. The page executes both readings against the exact same adverse facts and reveals an $80,000 commercial divergence. A person then locks the expected behavior, the agent stages a clarification, and the page runs six outcome tests plus eight boundary-strength challenges before the person can accept the revision.

> ClauseProof tests modeled commercial behavior in a synthetic agreement. It does not predict a court ruling, determine enforceability, or provide legal advice.

## Judge journey

1. Open the page and choose **Use sample readings**, or ask a WebMCP-capable browser agent to inspect and stage two readings.
2. Run the contract crash test and compare the two futures.
3. Lock the intended two-miss, six-month, ten-day-cure outcome in the human-only panel.
4. Stage the sample clarification or ask the agent to propose one.
5. Run every contract test and confirm `6/6` outcomes plus `8/8` altered rules caught.
6. Accept the tested revision using the human-only control.

The complete journey also works without WebMCP. Add `?toolMode=static` to register the five-tool fallback surface while preserving all service-side phase and revision checks.

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

## WebMCP tools

- `inspect_contract_case`
- `stage_interpretations`
- `run_contract_crash_test`
- `propose_clarifying_redline`
- `verify_contract_tests`

There is deliberately no tool for locking an outcome, accepting a redline, approving a case, recording a human decision, or signing anything.

## Architecture

Business truth is pure TypeScript in `src/domain`. Workflow, revisions, fingerprints, and actor-safe commands live in `src/application`. State publication and persistence live in `src/state`. WebMCP validates untrusted input and calls the same store/service used by the manual UI. React components render state and invoke typed wrappers; they do not calculate contract outcomes.

See `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/TOOL_CONTRACTS.md`, and `docs/CLAIMS.md` for the build-locked requirements and claim boundary.

## License

MIT
