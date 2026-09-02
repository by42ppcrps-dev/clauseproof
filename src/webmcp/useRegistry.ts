import { useEffect, useState } from "react";

import { agentClauseProofPort } from "../state/runtimeStore.js";
import { WebMcpRegistry } from "./registry.js";
import type { ModelContextLike } from "./types.js";

export const webMcpUnavailableHint =
  "No WebMCP agent detected. Open this page in ChatGPT's built-in browser or in Chrome 149+ with chrome://flags/#enable-webmcp-testing enabled. The manual fallback buttons below drive the same application service.";

/**
 * The WebMCP draft exposes the registration surface on `document.modelContext`.
 * Earlier Chrome previews exposed it on `navigator.modelContext`; both are
 * accepted so the same build works in ChatGPT's browser and in Chrome.
 */
export function resolveModelContext(): ModelContextLike | null {
  const candidates = [document.modelContext, navigator.modelContext];
  for (const candidate of candidates) {
    if (candidate && typeof candidate.registerTool === "function") {
      return candidate;
    }
  }
  return null;
}

export function useWebMcpRegistry(): string {
  const [status, setStatus] = useState("WebMCP · checking browser");

  useEffect(() => {
    const context = resolveModelContext();
    if (!context) {
      setStatus("WebMCP · not detected · manual fallback");
      return;
    }
    const mode =
      new URLSearchParams(globalThis.location.search).get("toolMode") ===
      "static"
        ? "static"
        : "dynamic";
    const registry = new WebMcpRegistry(
      context,
      agentClauseProofPort,
      mode,
      () => {
        setStatus("WebMCP · registration error");
      },
    );
    let active = true;
    void registry
      .mount()
      .then(() => {
        if (active) setStatus(`WebMCP · ${mode} tools live`);
      })
      .catch(() => {
        if (active) setStatus("WebMCP · registration error");
      });
    return () => {
      active = false;
      registry.unmount();
    };
  }, []);

  return status;
}
