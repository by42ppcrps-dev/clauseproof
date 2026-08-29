import { useEffect, useState } from "react";

import { agentClauseProofPort } from "../state/runtimeStore.js";
import { WebMcpRegistry } from "./registry.js";

export function useWebMcpRegistry(): string {
  const [status, setStatus] = useState("WebMCP · checking browser");

  useEffect(() => {
    const context = document.modelContext;
    if (!context) {
      setStatus("WebMCP · manual fallback");
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
