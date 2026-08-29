import type { WorkflowPhase } from "../domain/model.js";
import type { AgentClauseProofPort } from "../state/agentPort.js";
import { createToolDefinitions } from "./definitions.js";
import { createToolHandlers } from "./handlers.js";
import type { ModelContextLike, RegisteredTool } from "./types.js";

export type { ModelContextLike, RegisteredTool } from "./types.js";

const dynamicNames: Record<WorkflowPhase, RegisteredTool["name"][]> = {
  ready: ["inspect_contract_case", "stage_interpretations"],
  interpretations_staged: ["inspect_contract_case", "run_contract_crash_test"],
  divergence_visible: ["inspect_contract_case"],
  outcome_locked: ["inspect_contract_case", "propose_clarifying_redline"],
  redline_staged: ["inspect_contract_case", "verify_contract_tests"],
  verified: ["inspect_contract_case"],
  accepted: ["inspect_contract_case"],
};

export class WebMcpRegistry {
  private controller: AbortController | null = null;
  private unsubscribe: (() => void) | null = null;
  private mounted = false;
  private readonly definitions: RegisteredTool[];

  public constructor(
    private readonly context: ModelContextLike,
    private readonly store: AgentClauseProofPort,
    private readonly mode: "dynamic" | "static" = "dynamic",
    private readonly onError: (error: unknown) => void = (error) =>
      console.error("WebMCP registration failed.", error),
  ) {
    this.definitions = createToolDefinitions(createToolHandlers(store));
  }

  public async mount(): Promise<void> {
    if (this.mounted) this.unmount();
    this.mounted = true;
    this.unsubscribe = this.store.subscribe(() => {
      void this.refresh().catch(this.onError);
    });
    await this.refresh();
  }

  private async refresh(): Promise<void> {
    if (!this.mounted) return;
    this.controller?.abort();
    const controller = new AbortController();
    this.controller = controller;
    const names =
      this.mode === "static"
        ? this.definitions.map(({ name }) => name)
        : dynamicNames[this.store.getSnapshot().phase];
    const definitions = this.definitions.filter(({ name }) =>
      names.includes(name),
    );
    await Promise.all(
      definitions.map((definition) =>
        this.context.registerTool(definition, { signal: controller.signal }),
      ),
    );
  }

  public unmount(): void {
    this.mounted = false;
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.controller?.abort();
    this.controller = null;
  }
}
