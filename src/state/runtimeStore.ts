import { createBrowserDependencies } from "../application/runtime.js";
import { createClauseProofStore } from "./createStore.js";
import { JsonStatePersistence } from "./persistence.js";
import { createAgentClauseProofPort } from "./agentPort.js";

export const clauseProofStore = createClauseProofStore(
  createBrowserDependencies(),
  new JsonStatePersistence(globalThis.localStorage),
);

export const agentClauseProofPort =
  createAgentClauseProofPort(clauseProofStore);
