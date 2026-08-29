import { actorSchema, canonicalCaseSchema } from "../domain/schemas.js";
import { workflowPhases } from "../domain/model.js";
import type { WorkflowState } from "../domain/workflow.js";

const STORAGE_KEY = "clauseproof-state";
const PERSISTENCE_VERSION = 1;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StatePersistence {
  load(): WorkflowState | null;
  save(state: WorkflowState): void;
  clear(): void;
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function isAuditEvent(value: unknown): boolean {
  if (!isObject(value)) return false;
  return (
    typeof Reflect.get(value, "id") === "string" &&
    typeof Reflect.get(value, "sequence") === "number" &&
    typeof Reflect.get(value, "occurredAt") === "string" &&
    actorSchema.safeParse(Reflect.get(value, "actor")).success &&
    typeof Reflect.get(value, "action") === "string" &&
    ["completed", "rejected"].includes(String(Reflect.get(value, "outcome"))) &&
    typeof Reflect.get(value, "summary") === "string"
  );
}

function artifactExists(state: object, key: string): boolean {
  return isObject(Reflect.get(state, key));
}

function isWorkflowPhase(value: string): value is WorkflowState["phase"] {
  return workflowPhases.some((phase) => phase === value);
}

function hasRequiredArtifacts(
  state: object,
  phase: WorkflowState["phase"],
): boolean {
  if (phase === "ready") return true;
  if (!artifactExists(state, "interpretationSet")) return false;
  if (phase === "interpretations_staged") return true;
  if (!artifactExists(state, "crashTest")) return false;
  if (phase === "divergence_visible") return true;
  if (!artifactExists(state, "outcomeLock")) return false;
  if (phase === "outcome_locked") return true;
  if (!artifactExists(state, "proposal")) return false;
  if (phase === "redline_staged") return true;
  return artifactExists(state, "verification");
}

function isWorkflowState(value: unknown): value is WorkflowState {
  if (!isObject(value)) return false;
  const phaseValue = Reflect.get(value, "phase");
  if (typeof phaseValue !== "string" || !isWorkflowPhase(phaseValue)) {
    return false;
  }
  const events = Reflect.get(value, "events");
  return (
    canonicalCaseSchema.safeParse(Reflect.get(value, "case")).success &&
    Array.isArray(events) &&
    events.every(isAuditEvent) &&
    hasRequiredArtifacts(value, phaseValue)
  );
}

export class JsonStatePersistence implements StatePersistence {
  public constructor(private readonly storage: StorageAdapter) {}

  public load(): WorkflowState | null {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const envelope: unknown = JSON.parse(raw);
      if (
        !isObject(envelope) ||
        Reflect.get(envelope, "version") !== PERSISTENCE_VERSION
      ) {
        this.clear();
        return null;
      }
      const state = Reflect.get(envelope, "state");
      if (!isWorkflowState(state)) {
        this.clear();
        return null;
      }
      return state;
    } catch {
      this.clear();
      return null;
    }
  }

  public save(state: WorkflowState): void {
    this.storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: PERSISTENCE_VERSION, state }),
    );
  }

  public clear(): void {
    this.storage.removeItem(STORAGE_KEY);
  }
}
