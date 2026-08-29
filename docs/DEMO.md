# ClauseProof Demo Script

This is a truthful, agent-first recording plan for the WebMCP Challenge. Target runtime: **2 minutes 40 seconds**. The video must remain under three minutes, include audio, and show the live product functioning.

## Before recording

- Use ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled.
- Start from a freshly reset case at revision 0 and confirm the page says `WebMCP · dynamic tools live` or `WebMCP · static tools live`.
- Keep the browser-agent conversation and ClauseProof page visible enough to read.
- Use the real tools and live returned state. It is fine to trim dead waiting time; do not splice incompatible runs, substitute mock output, or narrate a result that is not visible.
- Rehearse until all three prompts complete within the timing budget.
- Keep third-party music, trademarks, notifications, and private account details out of frame.

## Timed narration and actions

### 0:00–0:12 — Hook

**On screen:** Fresh ClauseProof case, three visible clauses, synthetic disclosure.

**Say:**

> Two modeled readings of the same SLA can move eighty thousand dollars. ClauseProof does not ask an agent to guess the answer. It lets the agent stage modeled readings, while the page runs the facts and a person controls the decision.

### 0:12–0:34 — Agent stages cited readings

**Paste this exact prompt:**

> Inspect the SLA remedy and material-breach clauses. Stage exactly two cited modeled readings. In the first, the exclusive remedy displaces all SLA-related remedies and repeated SLA failure is not a material breach. In the second, the exclusive remedy limits compensation only and repeated SLA failure may be a material breach. Preserve accrued credits in both. Cite both relevant clauses, explain each choice, do not choose intent for me, and run both against the same facts.

**On screen:** The agent calls `inspect_contract_case`, `stage_interpretations`, and `run_contract_crash_test`. Pause briefly on the rendered reading labels, cited clause IDs, rationales, and audit provenance.

**Say:**

> These are constrained semantic readings, not legal conclusions. Invalid clause IDs, identical readings, stale revisions, and unsupported tool fields are rejected by the page.

### 0:34–0:54 — Same facts, divergent futures

**On screen:** Compare both future cards.

**Say:**

> The exact same synthetic facts produce two futures. Both grant two thousand dollars in credits. One blocks termination and leaves eighty thousand dollars in future fees; the other permits termination and leaves zero. The page—not the agent—calculates that divergence.

### 0:54–1:06 — Person locks intent

**On screen:** Human outcome-lock panel. Click **Lock this outcome** with two misses, a six-month window, a ten-day cure, termination without penalty, and accrued credits preserved.

**Say:**

> I now define the expected behavior. There is no WebMCP tool for this decision. Locking intent is human-only.

### 1:06–1:30 — Stage a deliberately wrong candidate

**Paste this exact prompt:**

> Inspect my locked outcome. Stage a candidate that changes only requiredOccurrences from 2 to 3 while preserving every other locked field. Target sla-exclusive-remedy followed by material-breach, then run every contract test. Report only the page-returned pass counts, failed counterexample, and surviving altered rule. Do not repair or accept it yet.

**On screen:** Pause on the generated “After” clause stating **at least 3 distinct calendar months**.

**Say:**

> The agent supplies a structured rule; ClauseProof generates the exact supported wording from it. Verification parses that wording back into executable semantics, checks the human lock and proposal fingerprints, and runs the reconstructed rule.

### 1:30–1:50 — Show the failure, not a happy-path shortcut

**On screen:** Failed verification and disabled acceptance control.

**The visible result must be:**

- `5/6` outcome examples passed;
- `7/8` altered rules caught;
- `positive-trigger` failed because termination was expected to be available but was actually unavailable, with $2,000 in accrued credits; and
- `occurrences-lower` survived because lowering three occurrences to the person's locked two made the behavior match.

**Say:**

> This candidate is wrong and cannot be accepted. The positive example expected termination after two misses, but a three-miss rule returned no termination. The surviving lower-occurrence mutation tells the agent exactly what boundary to repair.

### 1:50–2:14 — Agent repairs from evidence

**Paste this exact prompt:**

> Using only the human-locked rule and the returned counterexample, repair requiredOccurrences from 3 to 2 without changing any other semantic field. Stage the replacement clarification and run every contract test again. Report only the page-returned counts and whether it is eligible for human acceptance. Do not accept it.

**On screen:** Show the replacement generated clause, then the passing results.

**Say:**

> The replacement now matches the locked two-miss boundary. The same deterministic runner reports six of six outcome examples and eight of eight altered-rule challenges.

### 2:14–2:30 — Human-only acceptance

**On screen:** Agent reports eligibility but does not accept. Click **Accept tested revision** yourself. Show revision 1 and the accepted wording.

**Say:**

> Passing tests create eligibility, not authority. Only I can accept. The exact verified wording becomes revision one, and the audit trail preserves who did what.

### 2:30–2:40 — Honest close

**On screen:** Accepted revision and audit trail.

**Say:**

> ClauseProof is one synthetic case and one controlled clause grammar—not legal advice or arbitrary contract analysis. It demonstrates a safer pattern: agents propose and repair; deterministic software supplies evidence; people decide.

## Recording acceptance check

Before uploading the video, verify all of the following against the final recording:

- runtime is less than three minutes;
- audio clearly explains what was built and how WebMCP is used;
- the agent visibly invokes real WebMCP tools;
- the $80,000 divergence is visible;
- the three-occurrence wording and exact failed evidence are visible;
- the repair reaches `6/6` and `8/8` in the same run;
- the agent does not lock or accept;
- the person visibly performs both human-only actions;
- the synthetic limitation is spoken; and
- the uploaded YouTube video is publicly visible.
