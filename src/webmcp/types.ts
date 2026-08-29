import type { WebMcpToolName } from "../domain/model.js";

export interface ToolAnnotations {
  readOnlyHint: boolean;
  idempotentHint: boolean;
  untrustedContentHint: boolean;
}

export interface ToolExecutionContext {
  signal: AbortSignal;
}

export interface RegisteredTool {
  name: WebMcpToolName;
  title: string;
  description: string;
  inputSchema: object;
  annotations: ToolAnnotations;
  execute(input: unknown, context: ToolExecutionContext): Promise<unknown>;
}

export interface ModelContextLike {
  registerTool(
    tool: RegisteredTool,
    options?: { signal?: AbortSignal },
  ): Promise<void>;
}
