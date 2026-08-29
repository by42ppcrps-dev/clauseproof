import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Reset" }).click();
});

test("completes the human-only canonical journey", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await expect(
    page.getByText("Ready to inspect", { exact: true }),
  ).toBeVisible();
  const judgePath = page.getByRole("region", { name: "Judge path" });
  await expect(judgePath.getByText("Stage two readings")).toBeVisible();
  await page.getByRole("button", { name: "Use sample readings" }).click();
  await expect(judgePath.getByText("Run the same facts")).toBeVisible();
  await page.getByRole("button", { name: "Run crash test" }).click();

  const futures = page.getByRole("region", { name: "Two commercial futures" });
  await expect(
    futures.getByText("$80,000", { exact: true }).first(),
  ).toBeVisible();
  await expect(futures.getByText("$2,000", { exact: true })).toHaveCount(2);
  await expect(futures.getByText("Available", { exact: true })).toBeVisible();
  await expect(futures.getByText("Unavailable", { exact: true })).toBeVisible();
  await expect(
    judgePath.getByText("Person locks intended behavior"),
  ).toBeVisible();

  await page.getByRole("button", { name: "Lock this outcome" }).click();
  await expect(
    page.getByText("Locked by person", { exact: true }),
  ).toBeVisible();
  await expect(
    judgePath.getByText("Agent stages a clarification"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use sample clarification" }).click();
  await expect(page.getByText("Stage ≠ accept", { exact: true })).toBeVisible();
  await expect(
    judgePath.getByText("Run outcome and boundary tests"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Run all contract tests" }).click();

  await expect(page.getByText("6/6", { exact: true })).toBeVisible();
  await expect(page.getByText("8/8", { exact: true })).toBeVisible();
  await expect(
    judgePath.getByText("Person accepts the tested revision"),
  ).toBeVisible();
  const accept = page.getByRole("button", { name: "Accept tested revision" });
  await expect(accept).toBeEnabled();
  await accept.click();
  await expect(page.getByText("Revision 1", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Revision accepted", { exact: true }).first(),
  ).toBeVisible();
  await expect(judgePath.getByText("Proof complete")).toBeVisible();

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("Revision 0", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use sample readings" }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
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

  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toBeVisible();
  const outlineWidth = await focused.evaluate(
    (element) => getComputedStyle(element).outlineWidth,
  );
  expect(outlineWidth).not.toBe("0px");
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
