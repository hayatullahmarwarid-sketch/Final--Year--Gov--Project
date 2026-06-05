/**
 * One-shot inventory: counts template vs narrative purpose docs under Docs/.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "Docs");

function walk(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith("-purpose.md")) out.push(p);
  }
}

const files = [];
walk(DOCS, files);
let template = 0;
let narrative = 0;
for (const f of files) {
  const c = fs.readFileSync(f, "utf8");
  const isTemplate =
    c.includes("from static analysis") || c.includes("generate-architecture-docs.mjs");
  if (isTemplate) template++;
  else narrative++;
}

const report = [
  `total: ${files.length}`,
  `template_skeleton: ${template}`,
  `narrative_or_other: ${narrative}`,
  `generated_at: ${new Date().toISOString()}`,
].join("\n");
console.log(report);
