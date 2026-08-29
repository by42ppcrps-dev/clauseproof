import { describe, expect, it } from "vitest";

import { canonicalize } from "../../src/application/canonicalize.js";
import {
  DeterministicFingerprintProvider,
  WebCryptoFingerprintProvider,
} from "../../src/application/fingerprint.js";

describe("canonical fingerprints", () => {
  it("is independent of object key insertion order", async () => {
    const first = { revision: 0, nested: { beta: 2, alpha: 1 } };
    const second = { nested: { alpha: 1, beta: 2 }, revision: 0 };
    expect(canonicalize(first)).toBe(canonicalize(second));
    const provider = new DeterministicFingerprintProvider();
    await expect(provider.create(first)).resolves.toBe(
      await provider.create(second),
    );
  });

  it("changes when state-bearing input changes", async () => {
    const provider = new WebCryptoFingerprintProvider();
    const first = await provider.create({
      revision: 0,
      outcomeLockId: "lock-1",
    });
    const second = await provider.create({
      revision: 1,
      outcomeLockId: "lock-1",
    });
    expect(first).not.toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
  });
});
