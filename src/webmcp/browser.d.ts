import type { ModelContextLike } from "./types.js";

declare global {
  interface Document {
    readonly modelContext?: ModelContextLike;
  }
}

export {};
