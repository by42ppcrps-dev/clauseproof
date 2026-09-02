# ClauseProof Product Specification

## Product lock

ClauseProof is a deterministic contract behavior testbench for one synthetic SaaS agreement and one adverse SLA scenario. It does not summarize arbitrary agreements, predict a court ruling, determine enforceability, or provide legal advice.

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

The primary product sentence is:

> ClauseProof does not ask whether a clause sounds safe. It runs the clause and shows where reasonable readings create different futures.

## Canonical agreement

The visible agreement contains exactly these clauses:

1. `sla-commitment`: Provider will maintain a Monthly Uptime Percentage of at least 99.5%.
2. `sla-exclusive-remedy`: If Monthly Uptime Percentage is below 99.5%, Customer’s sole and exclusive remedy is the applicable service credit in Exhibit A.
3. `material-breach`: Either party may terminate this Agreement for material breach if the breach remains uncured for 30 days after written notice.

The synthetic scenario has a $10,000 monthly fee, eight remaining months, January uptime of 98.7%, February uptime of 98.9%, a 10% monthly service credit for each qualifying month, written notice on March 1, and no cure by the relevant deadline.

## Required commercial result

The vendor-favorable reading produces $2,000 in service credits, no termination right, and $80,000 in future fees. The customer-favorable reading produces $2,000 in service credits, an available termination right, and no future fees. The displayed financial divergence is exactly $80,000.

## Outcome lock and tests

Only a person may lock the intended behavior: two uptime misses below 99.5% within a rolling six-month period, written notice, a ten-day cure period, termination without penalty, and preservation of accrued credits.

The application generates six deterministic tests covering the positive case, one miss, misses outside the window, an open cure period, a timely cure, and equality at the threshold. It then checks eight altered rules covering occurrence count, rolling window, cure period, credits, effect, and comparator boundaries.

The page must make the collaboration boundary visible rather than merely describe it: each phase shows the service-authorized agent tools alongside the actions permanently reserved for the person. The page also shows, for the current phase, the plain-English prompt a person can paste into their browser agent; the prompt describes the readings in ordinary language and relies on the tool schemas' field descriptions and the inspect tool's reading vocabulary rather than naming enum values. The accepted view retains the failed candidate, exact counterexample and surviving altered rule, repaired candidate, passing proof, and human acceptance in the recorded proof ledger.

## Non-goals

Do not add arbitrary upload, OCR, external AI calls, third-party backends, research, auth, accounts, teams, e-signature, general legal analysis, risk scores, multiple contracts, multiple industries, a chatbot, or a reusable framework.

## What-if facts

Before the person locks intent, the scenario facts (uptime months, fee, months remaining, notice and cure dates) may be replaced by the agent through `set_scenario_facts`. The agreement, the scenario id, and the credit rate stay canonical. When both readings are already staged and executed, the page re-runs them on the new facts immediately. The lock freezes the facts; a what-if after the lock is rejected.

## Manual fallback

The full journey must remain available without WebMCP through sample interpretation, crash-test, outcome-lock, sample-redline, verification, acceptance, and reset controls. Manual and agent paths call the same application service.
