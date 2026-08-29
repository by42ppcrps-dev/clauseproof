import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App.js";
import "./styles/tokens.css";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("ClauseProof could not find its root element.");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
