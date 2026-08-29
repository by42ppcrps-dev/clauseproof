import type { ClauseProofDependencies } from "./serviceTypes.js";
import { WebCryptoFingerprintProvider } from "./fingerprint.js";

class BrowserIdGenerator {
  public next(prefix: string): string {
    return `${prefix}-${globalThis.crypto.randomUUID()}`;
  }
}

export function createBrowserDependencies(): ClauseProofDependencies {
  return {
    clock: { now: () => new Date().toISOString() },
    fingerprintProvider: new WebCryptoFingerprintProvider(),
    idGenerator: new BrowserIdGenerator(),
  };
}
