import { createBrowserDependencies } from "../application/runtime.js";
import { createClauseProofStore } from "./createStore.js";
import { JsonStatePersistence } from "./persistence.js";

export const clauseProofStore = createClauseProofStore(
  createBrowserDependencies(),
  new JsonStatePersistence(globalThis.localStorage),
);
