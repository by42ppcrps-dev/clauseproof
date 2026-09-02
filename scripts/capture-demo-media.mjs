// Captures README screenshots and a B-roll recording by driving the real
// registered WebMCP tools through a fake document.modelContext. Usage:
//   BASE_URL=http://localhost:5173 node scripts/capture-demo-media.mjs
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium } from "@playwright/test";

const baseUrl = process.env.BASE_URL ?? "http://localhost:5173";
const outDir = path.resolve(process.env.OUT_DIR ?? "docs/media");
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
await context.addInitScript(() => {
  const tools = new Map();
  Object.defineProperty(globalThis, "__clauseProofTools", { value: tools });
  Object.defineProperty(document, "modelContext", {
    configurable: true,
    value: {
      async registerTool(tool, options) {
        tools.set(tool.name, tool);
        options?.signal?.addEventListener(
          "abort",
          () => {
            if (tools.get(tool.name) === tool) tools.delete(tool.name);
          },
          { once: true },
        );
      },
    },
  });
});
const page = await context.newPage();
const t0 = Date.now();
const marks = {};
function mark(name) {
  marks[name] = (Date.now() - t0) / 1000;
}

async function tool(name, input) {
  return page.evaluate(
    async ({ name, input }) => {
      const registered = globalThis.__clauseProofTools.get(name);
      if (!registered) throw new Error(`${name} is not registered`);
      return registered.execute(input, {
        signal: new AbortController().signal,
      });
    },
    { name, input },
  );
}

async function pause(ms) {
  await page.waitForTimeout(ms);
}

async function shot(name, locator) {
  const target = locator ?? page;
  await target.screenshot({ path: path.join(outDir, name) });
}

await page.goto(baseUrl);
await page.getByRole("button", { name: "Reset" }).click();
await page.getByText("WebMCP · dynamic tools live").waitFor();
await pause(1200);
await shot("01-hero.png");

const staged = await tool("stage_interpretations", {
  baseRevision: 0,
  interpretations: [
    {
      label: "Vendor-favorable reading",
      clauseIds: ["sla-commitment", "sla-exclusive-remedy", "material-breach"],
      semantics: {
        exclusiveRemedyScope: "all_sla_related_remedies",
        repeatedSlaFailureMayBeMaterialBreach: false,
        creditsSurviveTermination: true,
      },
      rationale:
        "'Sole and exclusive remedy' is read to displace every remedy for SLA failures, so repeated misses never reach the material-breach termination path.",
    },
    {
      label: "Customer-favorable reading",
      clauseIds: ["sla-exclusive-remedy", "material-breach"],
      semantics: {
        exclusiveRemedyScope: "sla_compensation_only",
        repeatedSlaFailureMayBeMaterialBreach: true,
        creditsSurviveTermination: true,
      },
      rationale:
        "The exclusive-remedy sentence only caps compensation; the separate material-breach clause still lets the customer terminate after notice and no cure.",
    },
  ],
});
await pause(800);
await tool("run_contract_crash_test", {
  baseRevision: 0,
  interpretationSetId: staged.data.interpretationSetId,
});
await page.getByText("$80,000", { exact: true }).first().waitFor();
mark("crashTest");
await pause(2500);
const futures = page.getByRole("region", { name: "Two commercial futures" });
await futures.scrollIntoViewIfNeeded();
await pause(1800);
await shot("02-two-futures.png", futures);

await page
  .getByRole("button", { name: "Lock this outcome" })
  .scrollIntoViewIfNeeded();
await pause(600);
await page.getByRole("button", { name: "Lock this outcome" }).click();
await page.getByText("Locked by person", { exact: true }).waitFor();
mark("locked");
await pause(2500);
const authority = page.locator(".authority-boundary");
await authority.scrollIntoViewIfNeeded();
await pause(600);
await shot("05-authority-boundary.png", authority);

const workflow = await tool("inspect_contract_case", { view: "workflow" });
const lockedRule = workflow.data.lockedExpectedRule;
const wrong = await tool("propose_clarifying_redline", {
  baseRevision: 0,
  outcomeLockId: workflow.data.outcomeLockId,
  targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
  semanticRule: {
    ...lockedRule,
    trigger: { ...lockedRule.trigger, requiredOccurrences: 3 },
  },
  rationale:
    "Deliberately stricter candidate: three qualifying misses instead of the locked two, every other term unchanged, to see what the tests catch.",
});
await pause(1000);
await tool("verify_contract_tests", {
  baseRevision: 0,
  proposalId: wrong.data.proposalId,
});
await page.getByText("Repair required", { exact: true }).waitFor();
mark("failedVerify");
await pause(2500);
const bench = page.locator(".testbench-panel");
await bench.scrollIntoViewIfNeeded();
await pause(1800);
await shot("03-failed-tests.png", bench);

const repaired = await tool("propose_clarifying_redline", {
  baseRevision: 0,
  outcomeLockId: workflow.data.outcomeLockId,
  targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
  semanticRule: lockedRule,
  rationale:
    "Repair from the positive-trigger counterexample: occurrence count back to the locked two; window, cure, credits, and effect unchanged.",
});
await pause(1000);
await tool("verify_contract_tests", {
  baseRevision: 0,
  proposalId: repaired.data.proposalId,
});
await page.getByText("All tests passed", { exact: true }).waitFor();
mark("passedVerify");
await pause(3000);
await page.getByRole("button", { name: "Accept tested revision" }).click();
await page.getByText("Revision 1", { exact: true }).waitFor();
mark("accepted");
await pause(2500);
await page.evaluate(() => window.scrollTo(0, 0));
await pause(600);
await shot("04-accepted.png");
const ledger = page.locator(".activity-rail");
await ledger.scrollIntoViewIfNeeded();
await pause(800);
await shot("06-proof-ledger.png", ledger);
await pause(1500);

mark("end");
await writeFile(
  path.join(outDir, "broll-marks.json"),
  JSON.stringify(marks, null, 2),
);
const video = page.video();
await context.close();
await browser.close();
if (video) {
  const recorded = await video.path();
  await rename(recorded, path.join(outDir, "broll-walkthrough.webm"));
}
console.log(`Media written to ${outDir}`);
