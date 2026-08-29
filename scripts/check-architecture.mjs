import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const sourceRoot = path.resolve("src");
const violations = [];

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return sourceFiles(entryPath);
      return /\.tsx?$/.test(entry.name) ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

for (const file of await sourceFiles(sourceRoot)) {
  const relative = path.relative(process.cwd(), file);
  const text = await readFile(file, "utf8");
  const lineCount = text.split("\n").length;

  if (relative.startsWith("src/domain/")) {
    const forbiddenImport =
      /from ["'](?:react|[^"']*\/(?:application|state|webmcp|app|features)(?:\/|["']))/;
    const forbiddenRuntime = /\b(?:Date\.now|Math\.random|fetch\s*\()/;
    if (forbiddenImport.test(text) || forbiddenRuntime.test(text)) {
      violations.push(
        `${relative}: forbidden domain dependency or nondeterminism`,
      );
    }
  }

  if (/\b(TODO|FIXME|HACK)\b|@ts-ignore|:\s*any\b|<any>/.test(text)) {
    violations.push(`${relative}: prohibited source marker or explicit any`);
  }

  if (lineCount > 300) {
    violations.push(
      `${relative}: ${lineCount} lines exceeds the 300-line source limit`,
    );
  }
}

if (violations.length > 0) {
  console.error(violations.join("\n"));
  process.exitCode = 1;
} else {
  console.log("Architecture checks passed.");
}
