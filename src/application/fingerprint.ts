import { canonicalize } from "./canonicalize.js";

export interface FingerprintProvider {
  create(value: unknown): Promise<string>;
}

export class DeterministicFingerprintProvider implements FingerprintProvider {
  public async create(value: unknown): Promise<string> {
    const canonical = canonicalize(value);
    let hash = 2_166_136_261;
    for (const character of canonical) {
      hash ^= character.codePointAt(0) ?? 0;
      hash = Math.imul(hash, 16_777_619);
    }
    return `test-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }
}

export class WebCryptoFingerprintProvider implements FingerprintProvider {
  public async create(value: unknown): Promise<string> {
    const bytes = new TextEncoder().encode(canonicalize(value));
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
}
