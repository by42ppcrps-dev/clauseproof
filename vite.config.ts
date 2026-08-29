import react from "@vitejs/plugin-react";
import { sites } from "@openai/sites-vite-plugin";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  plugins: [react(), sites()],
});
