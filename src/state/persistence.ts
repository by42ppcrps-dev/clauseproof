import { z } from "zod";

import { workflowStateSchema } from "../domain/workflowStateSchema.js";
import type { WorkflowState } from "../domain/workflow.js";

const STORAGE_KEY = "clauseproof-state";
const PERSISTENCE_VERSION = 3;
const persistenceEnvelopeSchema = z.strictObject({
  version: z.literal(PERSISTENCE_VERSION),
  state: workflowStateSchema,
});

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

export class JsonStatePersistence implements StatePersistence {
  public constructor(private readonly storage: StorageAdapter) {}

  public load(): WorkflowState | null {
    const raw = this.storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const envelope: unknown = JSON.parse(raw);
      const parsed = persistenceEnvelopeSchema.safeParse(envelope);
      if (!parsed.success) {
        this.clear();
        return null;
      }
      return parsed.data.state;
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
