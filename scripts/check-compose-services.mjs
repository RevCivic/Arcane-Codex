import { readFile } from "node:fs/promises";

const composePath = process.argv[2] ?? new URL("../docker-compose.yml", import.meta.url);
const compose = await readFile(composePath, "utf8");
const lines = compose.split(/\r?\n/);
const serviceLines = new Map();
let inServices = false;

for (const [index, line] of lines.entries()) {
  if (line === "services:") {
    inServices = true;
    continue;
  }

  if (inServices && /^\S/.test(line)) {
    break;
  }

  const match = inServices ? line.match(/^  ([A-Za-z0-9][A-Za-z0-9._-]*):\s*$/) : null;
  if (!match) continue;

  const name = match[1];
  const lineNumber = index + 1;
  const previousLine = serviceLines.get(name);
  if (previousLine) {
    throw new Error(
      `Duplicate Compose service "${name}" at lines ${previousLine} and ${lineNumber}`,
    );
  }
  serviceLines.set(name, lineNumber);
}

if (!serviceLines.size) {
  throw new Error("No services found in docker-compose.yml");
}

console.log(`Validated ${serviceLines.size} unique Compose service names.`);
