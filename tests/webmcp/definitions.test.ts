import { describe, expect, it } from "vitest";

import { DeterministicFingerprintProvider } from "../../src/application/fingerprint.js";
import { createClauseProofStore } from "../../src/state/createStore.js";
import { createToolDefinitions } from "../../src/webmcp/definitions.js";
import { createToolHandlers } from "../../src/webmcp/handlers.js";

function definitions() {
  let id = 0;
  const store = createClauseProofStore({
    clock: { now: () => "2026-08-29T00:00:00.000Z" },
    fingerprintProvider: new DeterministicFingerprintProvider(),
    idGenerator: { next: (prefix) => `${prefix}-${++id}` },
  });
  return createToolDefinitions(createToolHandlers(store));
}

describe("tool definitions", () => {
  it("defines six unique, concise tools with correct read annotations", () => {
    const tools = definitions();
    expect(tools).toHaveLength(6);
    expect(new Set(tools.map(({ name }) => name)).size).toBe(6);
    expect(tools.every(({ description }) => description.length <= 450)).toBe(
      true,
    );
    const inspect = tools.find(({ name }) => name === "inspect_contract_case");
    expect(inspect?.annotations).toMatchObject({
      readOnlyHint: true,
      idempotentHint: true,
      untrustedContentHint: true,
    });
    expect(
      tools
        .filter(({ name }) => name !== "inspect_contract_case")
        .every(({ annotations }) => annotations?.readOnlyHint === false),
    ).toBe(true);
  });
});
