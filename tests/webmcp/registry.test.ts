import { describe, expect, it } from "vitest";

import { DeterministicFingerprintProvider } from "../../src/application/fingerprint.js";
import {
  canonicalCustomerInterpretation,
  canonicalVendorInterpretation,
} from "../../src/domain/seed.js";
import { createClauseProofStore } from "../../src/state/createStore.js";
import {
  WebMcpRegistry,
  type ModelContextLike,
  type RegisteredTool,
} from "../../src/webmcp/registry.js";

class FakeModelContext implements ModelContextLike {
  public readonly tools = new Map<string, RegisteredTool>();

  public async registerTool(
    tool: RegisteredTool,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    this.tools.set(tool.name, tool);
    options?.signal?.addEventListener(
      "abort",
      () => this.tools.delete(tool.name),
      { once: true },
    );
  }
}

function harness(mode: "dynamic" | "static" = "dynamic") {
  let id = 0;
  const store = createClauseProofStore({
    clock: { now: () => "2026-08-29T00:00:00.000Z" },
    fingerprintProvider: new DeterministicFingerprintProvider(),
    idGenerator: { next: (prefix) => `${prefix}-${++id}` },
  });
  const context = new FakeModelContext();
  const registry = new WebMcpRegistry(context, store, mode);
  return { context, registry, store };
}

async function flushRegistration() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("phase-aware registry", () => {
  it("registers only relevant tools and revokes the previous generation", async () => {
    const { context, registry, store } = harness();
    await registry.mount();
    expect([...context.tools.keys()].sort()).toEqual([
      "inspect_contract_case",
      "stage_interpretations",
    ]);

    await store.stageInterpretations(
      { kind: "manual-fallback" },
      {
        baseRevision: 0,
        interpretations: [
          canonicalVendorInterpretation,
          canonicalCustomerInterpretation,
        ],
      },
    );
    await flushRegistration();
    expect([...context.tools.keys()].sort()).toEqual([
      "inspect_contract_case",
      "run_contract_crash_test",
    ]);
    registry.unmount();
    expect(context.tools.size).toBe(0);
  });

  it("registers all five in static fallback mode", async () => {
    const { context, registry } = harness("static");
    await registry.mount();
    expect(context.tools.size).toBe(5);
    registry.unmount();
  });

  it("remounts cleanly without duplicate registrations", async () => {
    const { context, registry } = harness();
    await registry.mount();
    registry.unmount();
    await registry.mount();
    expect(context.tools.size).toBe(2);
    registry.unmount();
  });
});
