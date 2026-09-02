// Builds ./demo-kit (git-ignored): paste-ready prompts, pre-rendered narration
// per video section, caption text, stills, and an ffmpeg assembly script.
// Usage: node scripts/build-demo-kit.mjs   (macOS: uses `say` and `ffmpeg`)
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const kit = path.resolve("demo-kit");
const voice = process.env.VOICE ?? "Samantha";
const rate = process.env.RATE ?? "172";

// Narration: OpenAI text-to-speech when OPENAI_API_KEY and OPENAI_TTS_VOICE are
// set (natural voices such as "marin" or "cedar"); otherwise macOS `say`.
async function synthesize(text, aiff, m4a) {
  const key = process.env.OPENAI_API_KEY;
  const ttsVoice = process.env.OPENAI_TTS_VOICE;
  if (key && ttsVoice) {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
        voice: ttsVoice,
        input: text,
        response_format: "mp3",
        instructions:
          "Calm, confident product narrator for a short demo video. Natural pacing, clear diction, no theatrics.",
      }),
    });
    if (!response.ok) {
      throw new Error(
        `OpenAI TTS failed: ${response.status} ${await response.text()}`,
      );
    }
    const mp3 = aiff.replace(/\.aiff$/, ".mp3");
    await writeFile(mp3, Buffer.from(await response.arrayBuffer()));
    execFileSync("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      mp3,
      "-c:a",
      "aac",
      "-b:a",
      "160k",
      m4a,
    ]);
    execFileSync("rm", [mp3]);
    return;
  }
  execFileSync("say", ["-v", voice, "-r", rate, "-o", aiff, text]);
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    aiff,
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    m4a,
  ]);
  execFileSync("rm", [aiff]);
}

const prompts = {
  "01-stage-readings":
    "Read the three clauses on this page. Stage two readings of what happens after two months below the 99.5% uptime commitment: first, a vendor-favorable reading where the 'sole and exclusive remedy' sentence displaces every SLA-related remedy, so repeated misses are not a material breach; second, a customer-favorable reading where that sentence only limits compensation, so repeated misses can still be a material breach with termination. Keep accrued credits in both. Cite the clauses you rely on, explain each choice, and do not pick the intended outcome for me. Then run both readings against the same facts.",
  "02-what-if":
    "What if March 2026 had also missed, at 99.2% uptime? Change the facts to add that month, keep everything else the same, and tell me the new gap between the two readings. Do not lock or decide anything for me.",
  "03-wrong-candidate":
    "Look at my locked outcome. Before matching it, try a stricter candidate that requires three qualifying misses but matches every other locked term, then run every contract test. Report the page's pass counts, the failed counterexample, and the surviving altered rule. Do not repair or accept yet.",
  "04-repair":
    "Using only my locked rule and the counterexample you got back, repair the candidate: change the occurrence count from three to two and nothing else. Stage the replacement and run every test again. Report the page's counts and whether it is eligible for my acceptance. Do not accept it.",
};

const sections = [
  {
    id: "01",
    caption: "Same clause. Same facts. $80,000 apart.",
    narration:
      "Same contract, same bad month, eighty thousand dollars apart. That is what one clause with two reasonable readings costs, and nobody sees it until the dispute. ClauseProof runs the clause first.",
    still: "02-two-futures.png",
  },
  {
    id: "02",
    caption:
      "WebMCP: inspect_contract_case → stage_interpretations → run_contract_crash_test\nThe page does the math. The agent never calculates money.",
    narration:
      "One prompt. Through WebMCP the agent reads the clauses, stages a vendor-favorable and a customer-favorable reading, and runs both. The page does the math: two thousand dollars in credits either way, but one reading leaves eighty thousand in fees on the table, and the other lets the customer walk.",
  },
  {
    id: "03",
    caption:
      "set_scenario_facts · the page re-runs both readings on the new facts",
    narration:
      "Before deciding anything, a what-if. What if March also misses? The agent changes the facts through a tool, the page re-runs both readings, and the gap moves. Nothing has been decided yet.",
  },
  {
    id: "04",
    caption: "No tool for this. Locking intent is person-only.",
    narration:
      "Now the part that stays human. I decide what this clause should mean: two misses in six months, ten-day cure, credits preserved. There is no tool for this, and the agent's tool list changes the moment I lock it.",
  },
  {
    id: "05",
    caption:
      "Rule → generated wording → parsed back → 6 outcome tests + 8 altered rules\n5/6 · 7/8 · exact counterexample",
    narration:
      "I ask the agent to try a stricter rule first: three misses. It sends a structured rule, not prose. The page compiles it into real clause wording, parses that wording back, and runs six outcome tests and eight altered-rule challenges. Five of six. Seven of eight. And the failing test says exactly why: after two misses, termination was expected, and the three-miss rule gave none.",
  },
  {
    id: "06",
    caption:
      "Repair from evidence, not guesses\n6/6 · 8/8 · eligible, not accepted",
    narration:
      "The agent reads the counterexample and repairs only the occurrence count. Six of six. Eight of eight. Eligible. Not accepted, because the agent cannot accept.",
  },
  {
    id: "07",
    caption: "Revision 1 · every step attributed to who did it",
    narration:
      "I accept. Revision one. The ledger keeps the whole story: the wrong candidate, the failing test, the repair, the pass, and my acceptance, each attributed to whoever actually did it.",
  },
  {
    id: "08",
    caption:
      "6 typed WebMCP tools · registered per phase · strict schemas · no tool for decisions\ngithub.com/by42ppcrps-dev/clauseproof · MIT",
    narration:
      "Six typed WebMCP tools, registered per phase, strict schemas, and no tool for the decisions. One synthetic case today, not legal advice. The pattern is the point: agents propose and repair, the page proves, people decide.",
    still: "05-authority-boundary.png",
  },
];

// FALLBACK=1 renders a variant whose narration and captions describe the
// B-roll honestly: the registered tools are executed through
// document.modelContext by the test harness, with no chat agent on screen.
if (process.env.FALLBACK === "1") {
  const byId = Object.fromEntries(
    sections.map((section) => [section.id, section]),
  );
  byId["02"].caption =
    "Registered WebMCP tools called through document.modelContext\n(tool calls replayed by the test harness; no chat agent on screen)";
  byId["02"].narration =
    "One prompt to a browser agent produces three WebMCP calls: inspect the case, stage two readings, run the crash test. Here those exact registered tools run through document model context. The page does the math: two thousand dollars in credits either way, but one reading leaves eighty thousand in fees on the table, and the other lets the customer walk.";
  byId["05"].narration =
    "Next, a deliberately wrong candidate: three misses instead of two. It arrives as a structured rule, not prose. The page compiles it into real clause wording, parses that wording back, and runs six outcome tests and eight altered-rule challenges. Five of six. Seven of eight. And the failing test says exactly why: after two misses, termination was expected, and the three-miss rule gave none.";
  byId["06"].narration =
    "The repair changes only the occurrence count, exactly what the counterexample pointed at. Six of six. Eight of eight. Eligible. Not accepted, because no tool can accept.";
  byId["08"].narration =
    "Six typed WebMCP tools, registered per phase, strict schemas, and no tool for the decisions. One synthetic case today, not legal advice. The pattern is the point: agents propose and repair, the page proves, people decide.";
}

await rm(path.join(kit, "prompts"), { recursive: true, force: true });
await rm(path.join(kit, "captions"), { recursive: true, force: true });
await rm(path.join(kit, "narration"), { recursive: true, force: true });
for (const dir of [
  "prompts",
  "narration",
  "captions",
  "stills",
  "clips",
  "build",
]) {
  await mkdir(path.join(kit, dir), { recursive: true });
}

for (const [name, text] of Object.entries(prompts)) {
  await writeFile(path.join(kit, "prompts", `${name}.txt`), `${text}\n`);
}

let totalSeconds = 0;
for (const section of sections) {
  const aiff = path.join(kit, "narration", `${section.id}.aiff`);
  const m4a = path.join(kit, "narration", `${section.id}.m4a`);
  await synthesize(section.narration, aiff, m4a);
  const seconds = Number(
    execFileSync("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "csv=p=0",
      m4a,
    ]).toString(),
  );
  totalSeconds += seconds;
  await writeFile(
    path.join(kit, "captions", `${section.id}.txt`),
    section.caption,
  );
  await writeFile(
    path.join(kit, "narration", `${section.id}.txt`),
    `${section.narration}\n`,
  );
  if (section.still) {
    await copyFile(
      path.join("docs/media", section.still),
      path.join(kit, "stills", `${section.id}.png`),
    );
  }
  console.log(`${section.id}: ${seconds.toFixed(1)}s narration`);
}

// Caption overlays: transparent 1920x220 PNGs the assembly script composites
// onto each segment (this avoids depending on ffmpeg's optional drawtext).
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 220 } });
for (const section of sections) {
  const lines = section.caption.split("\n");
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent;display:flex;align-items:flex-end;justify-content:center;height:220px;font-family:-apple-system,'Helvetica Neue',Helvetica,Arial,sans-serif">
    <div style="max-width:1560px;margin-bottom:14px;padding:18px 30px;border-radius:16px;background:rgba(23,25,29,.82);color:#fff;font-size:36px;line-height:1.35;text-align:center;font-weight:600;letter-spacing:.2px">
      ${lines.map((line) => `<div>${line.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</div>`).join("")}
    </div></body></html>`);
  await page.screenshot({
    path: path.join(kit, "captions", `${section.id}.png`),
    omitBackground: true,
  });
}
await browser.close();
await copyFile(
  "docs/media/broll-walkthrough.mp4",
  path.join(kit, "stills", "broll-walkthrough.mp4"),
);
console.log(
  `Total narration: ${totalSeconds.toFixed(1)}s (video budget is 180s)`,
);

await writeFile(
  path.join(kit, "assemble.sh"),
  `#!/usr/bin/env bash
# Stitches numbered clips + pre-rendered narration + captions into final.mp4.
# Put your screen recordings in clips/ as 02.mov … 06.mov (01 and 07 fall back
# to the stills in stills/ unless you record them too). Then: ./assemble.sh
set -euo pipefail
cd "$(dirname "$0")"
TAIL="\${TAIL:-0.6}"   # seconds of picture held after narration ends
rm -f build/*.mp4 build/list.txt
for n in $(ls narration/*.m4a | xargs -n1 basename | sed 's/\\.m4a$//' | sort); do
  narr="narration/$n.m4a"
  ndur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$narr")
  target=$(python3 -c "print($ndur + $TAIL)")
  src=$(ls clips/$n.mov clips/$n.mp4 clips/$n.png 2>/dev/null | head -1 || true)
  [ -n "$src" ] || src="stills/$n.png"
  [ -f "$src" ] || { echo "missing clips/$n.mov (and no still)"; exit 1; }
  fit="scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=#17191d"
  case "$src" in
    *.png)
      ffmpeg -y -loglevel error -loop 1 -framerate 30 -t "$target" -i "$src" -i "captions/$n.png" -i "$narr" \\
        -filter_complex "[0:v]$fit[base];[base][1:v]overlay=(W-w)/2:H-h,format=yuv420p[v];[2:a]apad=whole_dur=$target[a]" \\
        -map "[v]" -map "[a]" -t "$target" -c:v libx264 -crf 20 -c:a aac "build/$n.mp4" ;;
    *)
      cdur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
      factor=$(python3 -c "print(max(1.0, $cdur / $target))")   # speed up long clips, never slow down
      ffmpeg -y -loglevel error -i "$src" -i "captions/$n.png" -i "$narr" \\
        -filter_complex "[0:v]setpts=PTS/$factor,$fit,tpad=stop_mode=clone:stop_duration=$target,trim=duration=$target[base];[base][1:v]overlay=(W-w)/2:H-h,format=yuv420p[v];[2:a]apad=whole_dur=$target[a]" \\
        -map "[v]" -map "[a]" -t "$target" -r 30 -c:v libx264 -crf 20 -c:a aac "build/$n.mp4" ;;
  esac
  echo "file '$n.mp4'" >> build/list.txt
  echo "$n: source=$src target=\${target}s"
done
ffmpeg -y -loglevel error -f concat -safe 0 -i build/list.txt -c copy final.mp4
echo "final.mp4: $(ffprobe -v error -show_entries format=duration -of csv=p=0 final.mp4) seconds (limit 180)"
`,
);
execFileSync("chmod", ["+x", path.join(kit, "assemble.sh")]);

await writeFile(
  path.join(kit, "README.md"),
  `# ClauseProof demo kit

Generated by \`node scripts/build-demo-kit.mjs\`. Everything you need to produce the sub-three-minute video without typing live or reading a script on camera.

1. Record six clips in the ChatGPT desktop app's built-in browser, one per section, and save them as \`clips/02.mov\` … \`clips/07.mov\`. Section 01 (hook) and 08 (close) use the stills provided unless you record them.
   - 02: paste \`prompts/01-stage-readings.txt\`; capture the tool calls and the two futures.
   - 03: paste \`prompts/02-what-if.txt\`; capture the facts changing and the gap updating.
   - 04: click **Lock this outcome**; show the tool list change.
   - 05: paste \`prompts/03-wrong-candidate.txt\`; capture the 3-miss clause, 5/6, 7/8, the failed test.
   - 06: paste \`prompts/04-repair.txt\`; capture the 2-miss clause, 6/6, 8/8.
   - 07: click **Accept tested revision**; show Revision 1 and the ledger.
2. Run \`./assemble.sh\`. It speeds up long clips to fit their narration, burns the captions, and writes \`final.mp4\`.
3. Watch it once against the checklist in \`docs/DEMO.md\`, then upload to YouTube as Public.

Narration voice: ${process.env.OPENAI_TTS_VOICE ? `OpenAI ${process.env.OPENAI_TTS_VOICE}` : `macOS ${voice}`}. Re-run with \`VOICE="Daniel" node scripts/build-demo-kit.mjs\` for another voice, or record your own and replace the files in \`narration/\` (keep the numbering).
`,
);
console.log(`Kit written to ${kit}`);
