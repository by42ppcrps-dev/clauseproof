import { expect, test, type Page } from "@playwright/test";

interface ToolRegistration {
  execute(input: unknown, context: { signal: AbortSignal }): Promise<unknown>;
  name: string;
}

interface StageInterpretationsResult {
  ok: true;
  data: { interpretationSetId: string };
}

interface InspectWorkflowResult {
  ok: true;
  data: { outcomeLockId: string };
}

interface StageRedlineResult {
  ok: true;
  data: { proposalId: string };
}

interface VerificationResult {
  ok: true;
  data: {
    outcomeTestsPassed: number;
    outcomeTestsTotal: number;
    failedTestCounterexamples: string[];
    boundaryRulesCaught: number;
    boundaryRulesTotal: number;
    boundarySurvivors: string[];
    eligibleForHumanAcceptance: boolean;
  };
}

const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/");
  await page.getByRole("button", { name: "Reset" }).click();
});

test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page)).toEqual([]);
});

async function installBrowserModelContext(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tools = new Map<string, ToolRegistration>();
    Object.defineProperty(globalThis, "__clauseProofTools", {
      configurable: true,
      value: tools,
    });
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        async registerTool(
          tool: ToolRegistration,
          options?: { signal?: AbortSignal },
        ) {
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
  await page.reload();
  await expect(page.getByText("WebMCP · dynamic tools live")).toBeVisible();
}

async function executeBrowserTool<T>(
  page: Page,
  name: string,
  input: unknown,
): Promise<T> {
  return page.evaluate(
    async ({ inputValue, toolName }) => {
      const browserGlobal = globalThis as typeof globalThis & {
        __clauseProofTools?: Map<string, ToolRegistration>;
      };
      const tool = browserGlobal.__clauseProofTools?.get(toolName);
      if (!tool) throw new Error(`Browser tool ${toolName} is not registered.`);
      return tool.execute(inputValue, {
        signal: new AbortController().signal,
      });
    },
    { inputValue: input, toolName: name },
  ) as Promise<T>;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);
}

async function expectCriticalEvidenceReadable(page: Page): Promise<void> {
  const evidence = page.locator(
    ".citation-list code, .semantic-list li, .test-result-heading > strong, .result-status, .test-evidence, .target-clauses",
  );
  const count = await evidence.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const fontSize = await evidence
      .nth(index)
      .evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      );
    expect(fontSize).toBeGreaterThanOrEqual(10);
  }
}

async function completeManualThroughDivergence(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Stage sample readings (manual fallback)" })
    .click();
  await expect(page.locator(".agent-instruction")).toContainText(
    "Run the current staged readings against the same visible facts",
  );
  await page.getByRole("button", { name: "Run crash test" }).click();
}

test("completes the honest manual fallback journey", async ({ page }) => {
  await expect(
    page.getByText("Ready to inspect", { exact: true }),
  ).toBeVisible();
  const freshAgentTask = page.locator(".agent-instruction");
  await expect(freshAgentTask).toContainText(
    "exclusiveRemedyScope=all_sla_related_remedies, repeatedSlaFailureMayBeMaterialBreach=false, creditsSurviveTermination=true",
  );
  await expect(freshAgentTask).toContainText(
    "exclusiveRemedyScope=sla_compensation_only, repeatedSlaFailureMayBeMaterialBreach=true, creditsSurviveTermination=true",
  );
  const judgePath = page.getByRole("region", { name: "Judge path" });
  await expect(judgePath.getByText("Stage two readings")).toBeVisible();
  await completeManualThroughDivergence(page);

  const futures = page.getByRole("region", { name: "Two commercial futures" });
  await expect(
    futures.getByText("Vendor-favorable reading", { exact: true }),
  ).toBeVisible();
  await expect(
    futures.getByText("Customer-favorable reading", { exact: true }),
  ).toBeVisible();
  await expect(
    futures.getByText(
      "The exclusive-remedy clause is modeled as displacing every remedy arising from the SLA failures, including termination.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    futures.getByText("Material breach", { exact: true }).last(),
  ).toBeVisible();
  await expect(
    futures.getByText("$80,000", { exact: true }).first(),
  ).toBeVisible();
  await expect(futures.getByText("$2,000", { exact: true })).toHaveCount(2);
  await expect(futures.getByText("Available", { exact: true })).toBeVisible();
  await expect(futures.getByText("Unavailable", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Lock this outcome" }).click();
  await expect(
    page.getByText("Locked by person", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Stage locked-rule sample (manual fallback)",
    })
    .click();
  await expect(page.getByText("Stage ≠ accept", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Run all contract tests" }).click();

  await expect(
    page.getByText("All tests passed", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("6/6", { exact: true })).toBeVisible();
  await expect(page.getByText("8/8", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("list", { name: "Outcome test results" }).getByText("Pass"),
  ).toHaveCount(6);
  await expect(
    page
      .getByRole("list", { name: "Boundary strength results" })
      .getByText("Pass"),
  ).toHaveCount(8);

  const accept = page.getByRole("button", { name: "Accept tested revision" });
  await expect(accept).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  const redline = page.getByRole("region", { name: "Clarifying redline" });
  const beforeText = redline.locator(".diff-block.removed p");
  const afterText = redline.locator(".diff-block.added p");
  await expect(beforeText).toBeVisible();
  await expect(afterText).toBeVisible();
  await expect(beforeText).toHaveText(
    "If Monthly Uptime Percentage is below 99.5%, Customer’s sole and exclusive remedy is the applicable service credit in Exhibit A.",
  );
  await expect(afterText).toContainText(
    "Customer’s sole and exclusive monetary remedy is its Exhibit A service credit",
  );
  await expect(afterText).toContainText(
    "For those SLA failures, despite Section 3, Customer may terminate without penalty",
  );
  await expect(afterText).toContainText(
    "below 99.5% in at least 2 distinct calendar months within a rolling 6-month period",
  );
  expect(await beforeText.textContent()).not.toBe(
    await afterText.textContent(),
  );

  await accept.click();
  await expect(page.getByText("Revision 1", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Revision accepted", { exact: true }).first(),
  ).toBeVisible();
  await expect(beforeText).toBeVisible();
  await expect(afterText).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("Revision 0", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Stage sample readings (manual fallback)",
    }),
  ).toBeEnabled();
});

test("renders a custom supported locked rule from workflow data", async ({
  page,
}) => {
  await completeManualThroughDivergence(page);
  await page.getByLabel("Qualifying misses").fill("3");
  await page.getByLabel("Rolling window").fill("9");
  await page.getByLabel("Cure period").fill("15");
  await page.getByLabel("Preserve accrued credits").uncheck();
  await page.getByRole("button", { name: "Lock this outcome" }).click();
  await expect(page.locator(".agent-instruction")).toContainText(
    "candidate that requires four qualifying misses",
  );
  await expect(page.getByRole("region", { name: "Judge path" })).toContainText(
    "Agent stages 4 misses against the locked 3",
  );
  await expect(
    page.getByRole("region", { name: "Clarifying redline" }),
  ).toContainText(
    "Current lock requires 3 qualifying misses. Stage a 4-occurrence candidate",
  );
  await page
    .getByRole("button", {
      name: "Stage locked-rule sample (manual fallback)",
    })
    .click();

  const redline = page.getByRole("region", { name: "Clarifying redline" });
  await expect(redline.getByText("3 misses", { exact: true })).toBeVisible();
  await expect(
    redline.getByText("9-month window", { exact: true }),
  ).toBeVisible();
  await expect(redline.getByText("15-day cure", { exact: true })).toBeVisible();
  await expect(
    redline.getByText("Accrued credits not preserved", { exact: true }),
  ).toBeVisible();
  await expect(
    redline.getByText(
      /below 99.5% in at least 3 distinct calendar months within a rolling 9-month period/,
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Run all contract tests" }).click();
  await expect(
    page.getByText("All tests passed", { exact: true }),
  ).toBeVisible();
  const positiveOutcome = page
    .getByRole("list", { name: "Outcome test results" })
    .getByRole("listitem")
    .filter({ hasText: "positive trigger" });
  await expect(
    positiveOutcome.getByText("Expected: termination available; $0 credits", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept tested revision" }),
  ).toBeEnabled();
  await expectNoHorizontalOverflow(page);
});

test("derives candidate copy for every supported occurrence lock", async ({
  page,
}) => {
  const cases = [
    { candidate: 3, locked: 2, word: "three" },
    { candidate: 4, locked: 3, word: "four" },
    { candidate: 3, locked: 4, word: "three" },
  ];

  for (const value of cases) {
    await completeManualThroughDivergence(page);
    await page.getByLabel("Qualifying misses").fill(String(value.locked));
    await page.getByRole("button", { name: "Lock this outcome" }).click();
    await expect(page.locator(".agent-instruction")).toContainText(
      `candidate that requires ${value.word} qualifying misses`,
    );
    await expect(
      page.getByRole("region", { name: "Judge path" }),
    ).toContainText(
      `Agent stages ${value.candidate} misses against the locked ${value.locked}`,
    );
    await expect(
      page.getByRole("region", { name: "Clarifying redline" }),
    ).toContainText(
      `Current lock requires ${value.locked} qualifying misses. Stage a ${value.candidate}-occurrence candidate`,
    );
    await page.getByRole("button", { name: "Reset" }).click();
  }
});

test("uses real WebMCP tools for a failed candidate and agent repair", async ({
  page,
}) => {
  await installBrowserModelContext(page);

  const staged = await executeBrowserTool<StageInterpretationsResult>(
    page,
    "stage_interpretations",
    {
      baseRevision: 0,
      interpretations: [
        {
          label: "Credits displace every SLA remedy",
          clauseIds: [
            "sla-commitment",
            "sla-exclusive-remedy",
            "material-breach",
          ],
          semantics: {
            exclusiveRemedyScope: "all_sla_related_remedies",
            repeatedSlaFailureMayBeMaterialBreach: false,
            creditsSurviveTermination: true,
          },
          rationale:
            "The exclusive-remedy sentence is modeled as replacing every remedy caused by the repeated SLA misses.",
        },
        {
          label: "Breach termination remains independent",
          clauseIds: ["sla-exclusive-remedy", "material-breach"],
          semantics: {
            exclusiveRemedyScope: "sla_compensation_only",
            repeatedSlaFailureMayBeMaterialBreach: true,
            creditsSurviveTermination: true,
          },
          rationale:
            "The remedy sentence limits compensation while the separate material-breach clause preserves a termination route.",
        },
      ],
    },
  );
  expect(staged.ok).toBe(true);

  await executeBrowserTool(page, "run_contract_crash_test", {
    baseRevision: 0,
    interpretationSetId: staged.data.interpretationSetId,
  });
  await expect(
    page.getByRole("heading", {
      name: "Credits displace every SLA remedy",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "The remedy sentence limits compensation while the separate material-breach clause preserves a termination route.",
      { exact: true },
    ),
  ).toBeVisible();

  await page.getByRole("button", { name: "Lock this outcome" }).click();
  const workflow = await executeBrowserTool<InspectWorkflowResult>(
    page,
    "inspect_contract_case",
    { view: "workflow" },
  );
  expect(workflow.ok).toBe(true);

  const lockedRule = {
    trigger: {
      metric: "monthly_uptime_percentage",
      comparator: "below",
      thresholdBps: 9_950,
      requiredOccurrences: 2,
      rollingWindowMonths: 6,
    },
    noticeRequired: true,
    cureDays: 10,
    effect: "customer_may_terminate_without_penalty",
    preserveAccruedCredits: true,
    overridesClauseIds: ["sla-exclusive-remedy", "material-breach"],
  };
  const failedProposal = await executeBrowserTool<StageRedlineResult>(
    page,
    "propose_clarifying_redline",
    {
      baseRevision: 0,
      outcomeLockId: workflow.data.outcomeLockId,
      targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
      semanticRule: {
        ...lockedRule,
        trigger: { ...lockedRule.trigger, requiredOccurrences: 3 },
      },
      rationale:
        "This candidate deliberately requires three occurrences so the deterministic outcome and boundary tests can expose the mismatch.",
    },
  );
  expect(failedProposal.ok).toBe(true);
  const failedVerification = await executeBrowserTool<VerificationResult>(
    page,
    "verify_contract_tests",
    {
      baseRevision: 0,
      proposalId: failedProposal.data.proposalId,
    },
  );
  expect(failedVerification).toMatchObject({
    ok: true,
    data: {
      outcomeTestsPassed: 5,
      outcomeTestsTotal: 6,
      failedTestCounterexamples: [
        "positive-trigger|Expected termination available.|actual:termination=false,creditsCents=200000",
      ],
      boundaryRulesCaught: 7,
      boundaryRulesTotal: 8,
      boundarySurvivors: ["occurrences-lower"],
      eligibleForHumanAcceptance: false,
    },
  });

  await expect(
    page.getByText("Repair required", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("5/6", { exact: true })).toBeVisible();
  await expect(page.getByText("7/8", { exact: true })).toBeVisible();
  const failedOutcome = page
    .getByRole("list", { name: "Outcome test results" })
    .getByRole("listitem")
    .filter({ hasText: "positive trigger" });
  await expect(failedOutcome.getByText("Fail", { exact: true })).toBeVisible();
  await expect(
    failedOutcome.getByText("Expected termination available.", {
      exact: true,
    }),
  ).toBeVisible();
  const survivingBoundary = page
    .getByRole("list", { name: "Boundary strength results" })
    .getByRole("listitem")
    .filter({ hasText: "Requires 2 misses instead of 3." });
  await expect(
    survivingBoundary.getByText("Fail", { exact: true }),
  ).toBeVisible();
  await expect(
    survivingBoundary.getByText(
      "Repair evidence: this altered rule matches every locked outcome example.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept tested revision" }),
  ).toBeDisabled();
  await expect(
    page
      .locator(".repair-callout")
      .getByText(/Ask the browser agent to repair the semantic rule/),
  ).toBeVisible();
  await expect(page.locator(".agent-instruction")).toContainText(
    "Staged candidate: 3 qualifying misses. Locked intent: 2 qualifying misses.",
  );
  await expectCriticalEvidenceReadable(page);
  await expectNoHorizontalOverflow(page);

  const repairedProposal = await executeBrowserTool<StageRedlineResult>(
    page,
    "propose_clarifying_redline",
    {
      baseRevision: 0,
      outcomeLockId: workflow.data.outcomeLockId,
      targetClauseIds: ["sla-exclusive-remedy", "material-breach"],
      semanticRule: lockedRule,
      rationale:
        "The repaired candidate matches the person's two-miss trigger and keeps every notice, cure, effect, and credit boundary explicit.",
    },
  );
  expect(repairedProposal.ok).toBe(true);
  const repairedVerification = await executeBrowserTool<VerificationResult>(
    page,
    "verify_contract_tests",
    {
      baseRevision: 0,
      proposalId: repairedProposal.data.proposalId,
    },
  );
  expect(repairedVerification).toMatchObject({
    ok: true,
    data: {
      outcomeTestsPassed: 6,
      outcomeTestsTotal: 6,
      failedTestCounterexamples: [],
      boundaryRulesCaught: 8,
      boundaryRulesTotal: 8,
      boundarySurvivors: [],
      eligibleForHumanAcceptance: true,
    },
  });

  await expect(
    page.getByText("All tests passed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Accept tested revision" }),
  ).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  await expect(
    page.getByText("Browser agent", { exact: true }).last(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Accept tested revision" }).click();
  await expect(
    page.getByText("Revision accepted", { exact: true }).first(),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("has no horizontal overflow and exposes visible keyboard focus", async ({
  page,
}) => {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);

  const controls = page.locator(
    "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]",
  );
  const controlCount = await controls.count();
  expect(controlCount).toBeGreaterThan(0);
  for (let index = 0; index < controlCount; index += 1) {
    const focused = controls.nth(index);
    await focused.focus();
    await expect(focused).toBeVisible();
    expect(
      await focused.evaluate((element) => document.activeElement === element),
    ).toBe(true);
  }

  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await page.keyboard.press("Tab");
  const keyboardFocused = page.locator(":focus");
  await expect(keyboardFocused).toBeVisible();
  const keyboardFocusStyle = await keyboardFocused.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
    };
  });
  expect(keyboardFocusStyle.outlineStyle).not.toBe("none");
  expect(keyboardFocusStyle.outlineWidth).not.toBe("0px");
});

test("keeps the judge prompt available when the Clipboard API stalls", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () => new Promise<void>(() => undefined),
      },
    });
  });
  await page.reload();

  await page.getByRole("button", { name: "Copy judge prompt" }).click();
  const fallback = page.getByRole("textbox", { name: "Judge prompt" });
  await expect(fallback).toBeVisible();
  await expect(fallback).toHaveValue(
    /Inspect the SLA remedy and material-breach clauses/,
  );
});
