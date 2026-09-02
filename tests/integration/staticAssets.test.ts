import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const projectRoot = new URL("../../", import.meta.url);

describe("production document assets", () => {
  it("declares a bundled favicon", async () => {
    const [document, favicon] = await Promise.all([
      readFile(new URL("index.html", projectRoot), "utf8"),
      readFile(new URL("public/favicon.svg", projectRoot), "utf8"),
    ]);

    expect(document).toContain(
      '<link rel="icon" type="image/svg+xml" href="./favicon.svg" />',
    );
    expect(favicon).toContain("<svg");
    expect(favicon).toContain("CP");
  });
});
