# ClauseProof Release QA

Verified on August 29, 2026 against the source currently staged for the contest release.

## Automated gates

| Gate                               | Observed result                         |
| ---------------------------------- | --------------------------------------- |
| `npm run lint`                     | Passed                                  |
| `npm run format:check`             | Passed                                  |
| `npm run typecheck`                | Passed                                  |
| `npm run test`                     | 18 files, 80 tests passed               |
| `npm run check:architecture`       | Passed                                  |
| `npm run check:tools`              | Passed                                  |
| `npm run build`                    | Client and SSR production builds passed |
| `npm run test:e2e`                 | 12 desktop/mobile browser tests passed  |
| `git diff --check`                 | Passed                                  |
| Repository credential-pattern scan | No matches                              |

The browser suite covers failed, repaired, and accepted phases; acceptance gating; dynamic custom-lock copy; critical evidence text size; and horizontal overflow at desktop and mobile widths.

The fresh-case browser-agent prompt explicitly supplies both canonical semantic combinations and preserves accrued credits in both, making the documented $80,000 path reproducible rather than dependent on an agent guess.

## Real WebMCP browser journey

The in-app browser exercised the registered page tools against the running local build rather than a mocked tool surface.

1. `inspect_contract_case` returned the visible synthetic agreement and current phase.
2. `stage_interpretations` staged two distinct readings with both required clause citations.
3. `run_contract_crash_test` returned the same-facts divergence: $2,000 credits in both branches, $80,000 future fees versus $0, and an $80,000 total financial divergence.
4. The person-only UI locked the intended two-occurrence behavior; no WebMCP lock tool was present.
5. A three-occurrence proposal was generated and verified. The application returned `5/6`, `7/8`, failed `positive-trigger`, surviving `occurrences-lower`, and no acceptance eligibility.
6. A repaired two-occurrence proposal was generated and verified. The application returned `6/6`, `8/8`, no failed examples, no surviving altered rules, and human-acceptance eligibility.
7. The WebMCP surface still exposed no acceptance tool. The person-only UI accepted the exact verified wording and advanced the agreement to revision 1.

The accepted wording preserves Exhibit A credits as the exclusive monetary remedy and adds only the modeled SLA termination path, including written notice and the 10-day cure condition.

## Claims checked

- The product is one synthetic case and one controlled clause grammar.
- It does not parse arbitrary contracts, provide legal advice, predict courts, or claim formal verification.
- The page, not the agent, calculates money, dates, outcomes, and boundary results.
- Human intent and acceptance are absent from the WebMCP tool surface.
- Human lock, proposal, and verification artifacts are fingerprint-bound.
- The human lock is bound to the exact displayed contract and scenario snapshot.
- Acceptance independently recomputes the complete proof.
- Service snapshots are frozen and persisted state is strictly parsed.
- WebMCP receives an agent-only capability with no lock, accept, or reset methods.

## Release evidence still required

The source and local browser journey are verified. The contest package must not be described as judge-ready until all of these external checks are complete:

- the exact tested commit is deployed with public, signed-out access;
- the complete dated source history is available in a public MIT-licensed repository;
- a truthful narrated demonstration under three minutes is publicly available on YouTube; and
- the matching repository, site, and video URLs are entered into the final Devpost submission.

A dedicated Chrome DevTools performance trace was not available in this environment, so this report makes no Lighthouse or Core Web Vitals claim.
