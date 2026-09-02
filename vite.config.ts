import react from "@vitejs/plugin-react";
import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";

// VITE_BASE lets the same build deploy under a sub-path (GitHub Pages project
// sites). Every other host serves the app from the origin root.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  build: {
    outDir: "dist/client",
  },
  plugins: [react(), sites()],
});
