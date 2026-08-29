import { access, readFile } from "node:fs/promises";
import path from "node:path";

const definitionsPath = path.resolve("src/webmcp/definitions.ts");

try {
  await access(definitionsPath);
  const text = await readFile(definitionsPath, "utf8");
  const names = [...text.matchAll(/name:\s*["']([^"']+)["']/g)].map(
    (match) => match[1],
  );
  if (new Set(names).size !== 5 || names.length !== 5) {
    throw new Error(
      "WebMCP definitions must contain exactly five unique tool names.",
    );
  }
  console.log("Tool surface checks passed.");
} catch (error) {
  if (error instanceof Error && "code" in error && error.code === "ENOENT") {
    console.log("Tool surface not implemented yet; no definitions to check.");
  } else {
    throw error;
  }
}
