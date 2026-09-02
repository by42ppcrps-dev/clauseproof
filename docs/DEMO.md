# Demo video plan

Target length: 2 minutes 35 seconds. Hard limit: under 3 minutes, public on YouTube, with audio. Judges are not required to watch past three minutes, so the working product is on screen within the first ten seconds.

Everything below is what the product really does. Trim dead time and speed up slow stretches; do not splice runs together or narrate a result that is not on screen.

## Setup before recording

- ChatGPT desktop app, built-in browser, GPT-5.6 Sol or Terra selected (site tools are disabled on other models).
- Open the live URL, click **Reset**, and confirm the header pill reads `WebMCP · dynamic tools live` and the agreement shows **Revision 0**.
- Layout: page on the left at about two-thirds width, ChatGPT conversation on the right so tool calls are readable.
- Prompts are pasted, never typed live. They are in `demo-kit/prompts/` and repeated below.
- Record in short clips, one per section. Redo a clip, not the whole video.
- Keep notifications, other tabs, and account details out of frame.

## Shot list

Narration audio for each section is pre-rendered in `demo-kit/narration/` (one file per section, numbered like the sections below). Captions are the on-screen text lines.

### 01 · Hook (0:00–0:10)

Start on the finished crash test: the Two commercial futures panel with **$80,000** visible. Then cut back to the reset page and the ChatGPT pane.

On-screen text: `Same clause. Same facts. $80,000 apart.`

Narration: "Same contract, same bad month, eighty thousand dollars apart. That is what one clause with two reasonable readings costs, and nobody sees it until the dispute. ClauseProof runs the clause first."

### 02 · Agent stages both readings (0:10–0:45)

Paste prompt 1. Show ChatGPT calling `inspect_contract_case`, `stage_interpretations`, and `run_contract_crash_test`, then the page filling in both futures.

Prompt 1:

> Read the three clauses on this page. Stage two readings of what happens after two months below the 99.5% uptime commitment: first, a vendor-favorable reading where the 'sole and exclusive remedy' sentence displaces every SLA-related remedy, so repeated misses are not a material breach; second, a customer-favorable reading where that sentence only limits compensation, so repeated misses can still be a material breach with termination. Keep accrued credits in both. Cite the clauses you rely on, explain each choice, and do not pick the intended outcome for me. Then run both readings against the same facts.

On-screen text: `WebMCP tools: inspect → stage_interpretations → run_contract_crash_test` and `The page does the math. The agent never calculates money.`

Narration: "One prompt. Through WebMCP the agent reads the clauses, stages a vendor-favorable and a customer-favorable reading, and runs both. The page does the math: two thousand dollars in credits either way, but one reading leaves eighty thousand in fees on the table and the other lets the customer walk."

### 03 · Person locks intent (0:45–1:00)

Scroll to Lock intended behavior. Click **Lock this outcome** with the defaults: 2 misses, 6 months, 10-day cure, credits preserved. Then show the Authority boundary panel: the agent's tool list changes to `inspect` and `propose_clarifying_redline`.

On-screen text: `No tool for this. Locking intent is person-only.`

Narration: "Now the part that stays human. I decide what this clause should mean: two misses in six months, ten-day cure, credits preserved. There is no tool for this, and the agent's tool list changes the moment I lock it."

### 04 · A wrong candidate fails, with evidence (1:00–1:35)

Paste prompt 2. Show the generated "After" clause reading **at least 3 distinct calendar months**, then the test bench: **5/6**, **7/8**, `positive trigger` failed, `Requires 2 misses instead of 3` surviving, accept disabled.

Prompt 2:

> Look at my locked outcome. Before matching it, try a stricter candidate that requires three qualifying misses but matches every other locked term, then run every contract test. Report the page's pass counts, the failed counterexample, and the surviving altered rule. Do not repair or accept yet.

On-screen text: `Rule → generated wording → parsed back → 6 outcome tests + 8 altered rules` and `5/6 · 7/8 · exact counterexample`

Narration: "I ask the agent to try a stricter rule first: three misses. It sends a structured rule, not prose. The page compiles it into real clause wording, parses that wording back, and runs six outcome tests and eight altered-rule challenges. Five of six. Seven of eight. And the failing test says exactly why: after two misses, termination was expected, and the three-miss rule gave none."

### 05 · Agent repairs from the counterexample (1:35–2:00)

Paste prompt 3. Show the replacement clause reading **at least 2 distinct calendar months**, then **6/6** and **8/8** with the accept button enabled.

Prompt 3:

> Using only my locked rule and the counterexample you got back, repair the candidate: change the occurrence count from three to two and nothing else. Stage the replacement and run every test again. Report the page's counts and whether it is eligible for my acceptance. Do not accept it.

On-screen text: `Repair from evidence, not guesses` and `6/6 · 8/8 · eligible, not accepted`

Narration: "The agent reads the counterexample and repairs only the occurrence count. Six of six. Eight of eight. Eligible. Not accepted, because the agent cannot accept."

### 06 · Person accepts (2:00–2:18)

Click **Accept tested revision**. Show **Revision 1**, the accepted wording, and the proof ledger with the failed candidate, the repair, and the acceptance attributed to Browser agent and Person.

On-screen text: `Revision 1 · every step attributed to who did it`

Narration: "I accept. Revision one. The ledger keeps the whole story: the wrong candidate, the failing test, the repair, the pass, and my acceptance, each attributed to whoever actually did it."

### 07 · Close (2:18–2:35)

Show the Authority boundary panel and the tool list.

On-screen text: `5 typed WebMCP tools · registered per phase · strict schemas · no tool for decisions` and `github.com/lumegridai-ops/clauseproof · MIT`

Narration: "Five typed WebMCP tools, registered per phase, strict schemas, and no tool for the decisions. One synthetic case today, not legal advice. The pattern is the point: agents propose and repair, the page proves, people decide."

## Assembly

1. Record clips `01.mov` … `07.mov` in the ChatGPT desktop app (screen recording with the built-in browser visible).
2. Use the narration files in `demo-kit/narration/` as the voice track, or read the lines yourself. AI narration is allowed by the organizers.
3. `demo-kit/assemble.sh` stitches numbered clips and narration with ffmpeg and trims each clip to its narration length. Speed up a clip with the `SPEED` variable if the agent's tool calls run long.
4. Check the final file: under three minutes, audio present, the $80,000 divergence visible, the three-miss failure visible, the repair reaching 6/6 and 8/8 in the same run, both person-only clicks on screen, and the synthetic-case limit spoken.
5. Upload to YouTube as Public (not Unlisted) and paste the link into the Devpost form.
