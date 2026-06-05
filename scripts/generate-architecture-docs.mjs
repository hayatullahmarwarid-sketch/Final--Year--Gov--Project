/**
 * One-shot generator: mirrors project tree under Docs/ with *-purpose.md per source file.
 * Reads-only from the repo; writes only under Docs/. Does not modify app or back-end code.
 *
 * Skips overwriting a purpose doc when it is hand-normalized: first line
 * `<!-- purpose-doc: normalized -->` and/or an existing `## Roles` section (see
 * scripts/normalize-purpose-docs.mjs).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_ROOT = path.join(ROOT, "Docs");

const CODE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const IGNORE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "Docs",
  ".expo",
  "dist",
  "build",
  "coverage",
  ".expo-export-test",
  "Pods",
  ".gradle",
  "DerivedData",
]);

const IGNORE_FILE_NAMES = new Set([".DS_Store"]);

function shouldSkipDir(relPosix) {
  const parts = relPosix.split("/").filter(Boolean);
  if (parts.some((p) => IGNORE_DIR_NAMES.has(p))) return true;
  // Skip heavy/binary vendored trees if present
  if (relPosix.includes("node_modules")) return true;
  return false;
}

function walk(dirAbs, relBase, files) {
  let entries;
  try {
    entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  } catch {
    return;
  }
  const relPosix = relBase.split(path.sep).join("/");
  if (shouldSkipDir(relPosix)) return;

  for (const ent of entries) {
    const name = ent.name;
    if (IGNORE_FILE_NAMES.has(name)) continue;
    const childAbs = path.join(dirAbs, name);
    const childRel = path.join(relBase, name);
    const childPosix = childRel.split(path.sep).join("/");

    if (ent.isDirectory()) {
      if (shouldSkipDir(childPosix)) continue;
      walk(childAbs, childRel, files);
    } else if (ent.isFile()) {
      const ext = path.extname(name).toLowerCase();
      if (!CODE_EXT.has(ext)) continue;
      files.push({ abs: childAbs, relPosix: childPosix });
    }
  }
}

function extractLeadingComment(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length && /^\s*$/.test(lines[i])) i++;
  if (i >= lines.length) return "";

  if (lines[i].includes("/*")) {
    let buf = [];
    for (; i < lines.length && i < 80; i++) {
      buf.push(lines[i]);
      if (lines[i].includes("*/")) break;
    }
    return buf.join("\n").trim();
  }
  if (lines[i].trim().startsWith("//")) {
    for (; i < lines.length && i < 40; i++) {
      if (!/^\s*\/\//.test(lines[i])) break;
      out.push(lines[i].replace(/^\s*\/\/\s?/, ""));
    }
    return out.join("\n").trim();
  }
  return "";
}

function parseImportsExports(content) {
  const lines = content.split(/\n/);
  const imports = [];
  const exports = [];
  const requires = [];
  const moduleExports = [];

  const scanLimit = Math.min(lines.length, 400);

  for (let i = 0; i < scanLimit; i++) {
    const line = lines[i];
    const t = line.trim();
    if (!t || t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) continue;

    // import ... from 'x'
    let m = t.match(/^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?$/);
    if (m) {
      imports.push({ spec: m[1].trim(), from: m[2] });
      continue;
    }
    // import 'side-effect'
    m = t.match(/^import\s+['"]([^'"]+)['"]\s*;?$/);
    if (m) {
      imports.push({ spec: "(side-effect)", from: m[1] });
      continue;
    }

    // export ...
    if (/^export\s/.test(t)) {
      const shortened = t.length > 220 ? `${t.slice(0, 217)}…` : t;
      exports.push(shortened);
      continue;
    }

    // require('...')
    m = t.match(/(?:const|let|var)\s+[\w$]+\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m) {
      requires.push(m[1]);
      continue;
    }
    m = t.match(/require\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m && requires.length < 80) requires.push(m[1]);

    // module.exports = ...
    if (/^module\.exports\s*=/.test(t)) {
      moduleExports.push(shortenedLine(t));
    }
  }

  // Full-file pass for CommonJS / late exports (header scan often misses `server.js`-style entrypoints).
  if (exports.length === 0 && moduleExports.length === 0 && lines.length > scanLimit) {
    const fullLimit = Math.min(lines.length, 12_000);
    for (let i = scanLimit; i < fullLimit; i++) {
      const t = lines[i].trim();
      if (!t) continue;
      if (/^export\s/.test(t)) exports.push(shortenedLine(t, 220));
      if (/^module\.exports\s*=/.test(t)) moduleExports.push(shortenedLine(t, 220));
      if (/^exports\.\w+\s*=/.test(t)) moduleExports.push(shortenedLine(t, 220));
      if (exports.length + moduleExports.length > 60) break;
    }
  }

  return { imports, exports, requires, moduleExports, leadingComment: extractLeadingComment(lines) };
}

function shortenedLine(s, max = 200) {
  const t = s.trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function inferRuntimeBehavior(content, relPosix) {
  const bullets = [];
  const base = path.posix.basename(relPosix);

  if (/http\.createServer\s*\(/.test(content) || /\.listen\s*\(\s*env\.PORT/.test(content)) {
    bullets.push("Creates an HTTP server and binds it to the configured port (API entry behavior).");
  }
  if (/bootstrap\s*\(\s*\)/.test(content) && /\.catch\s*\(\s*\(err\)/.test(content)) {
    bullets.push("Runs an async `bootstrap()` at module load with top-level promise error handling.");
  }
  if (/registerInProcessHandlersIfNeeded\s*\(/.test(content)) {
    bullets.push("May register in-process job handlers when Redis/worker setup allows.");
  }
  if (/connectMongo\s*\(/.test(content) || /disconnectMongo\s*\(/.test(content)) {
    bullets.push("Connects to MongoDB during startup and disconnects during graceful shutdown.");
  }
  if (/ensureModelIndexes\s*\(/.test(content)) {
    bullets.push("Ensures database indexes are applied at startup.");
  }
  if (/getRedis\s*\(/.test(content) || /disconnectRedis\s*\(/.test(content)) {
    bullets.push("Initializes or tears down Redis connectivity for caching/rate limiting/queues.");
  }
  if (/shutdownQueues\s*\(/.test(content)) {
    bullets.push("Shuts down background queues during graceful shutdown.");
  }
  if (/SIGINT/.test(content) && /SIGTERM/.test(content) && /process\.on\s*\(\s*['"]SIG/.test(content)) {
    bullets.push("Registers OS signal handlers for graceful shutdown.");
  }
  if (base === "worker.js" && /require\s*\(|from\s+['"]/.test(content)) {
    bullets.push("Worker-side entry module (loads job/queue handlers relative to the back-end runtime).");
  }

  return bullets.slice(0, 12);
}

function classifyPath(relPosix) {
  const lower = relPosix.replace(/\\/g, "/");
  if (lower.startsWith("app/")) {
    return "Expo Router screen or layout; participates in file-based navigation and deep linking.";
  }
  if (lower.startsWith("components/")) {
    return "Reusable UI building block composed into screens and flows.";
  }
  if (lower.startsWith("hooks/")) {
    return "React hook encapsulating stateful behavior reused across screens.";
  }
  if (lower.startsWith("contexts/")) {
    return "React context provider or consumer wiring shared state across the tree.";
  }
  if (lower.startsWith("lib/api/")) {
    return "Typed HTTP/API client helpers for talking to the back-end.";
  }
  if (lower.startsWith("lib/")) {
    return "Shared library utilities, adapters, or cross-cutting helpers.";
  }
  if (lower.startsWith("constants/")) {
    return "Shared constants (theme, copy tokens, configuration values).";
  }
  if (lower.startsWith("data/")) {
    return "Static or bundled data modules consumed by the mobile app.";
  }
  if (lower.startsWith("scripts/")) {
    return "Node tooling script for maintenance, codegen, or local workflows (not shipped to the app runtime).";
  }
  if (lower.startsWith("back-end/src/modules/") && lower.includes(".routes.")) {
    return "Express (or similar) route module: wires HTTP paths to controllers/services.";
  }
  if (lower.startsWith("back-end/src/modules/") && lower.includes(".controller.")) {
    return "HTTP controller: parses requests, calls services, returns responses.";
  }
  if (lower.startsWith("back-end/src/modules/") && lower.includes(".service.")) {
    return "Domain/service layer: business rules and orchestration for this module.";
  }
  if (lower.startsWith("back-end/database/models/")) {
    return "Mongoose (or ORM) model: persisted entity schema and methods.";
  }
  if (lower.startsWith("back-end/database/repositories/")) {
    return "Repository/data-access layer over models and queries.";
  }
  if (lower.startsWith("back-end/database/migrations/")) {
    return "Database migration: evolves schema or indexes over time.";
  }
  if (lower.startsWith("back-end/src/middlewares/")) {
    return "HTTP middleware: cross-cutting request/response behavior.";
  }
  if (lower.startsWith("back-end/src/jobs/")) {
    return "Background job registration, queue names, or async handlers.";
  }
  if (lower.startsWith("back-end/src/services/")) {
    return "Back-end infrastructure service (email, cache, storage, push, audit, etc.).";
  }
  if (lower.startsWith("back-end/")) {
    return "Back-end source: API, persistence, or server-side workflow.";
  }
  return "Project source module.";
}

function internalImports(imports, relPosix) {
  const dir = path.posix.dirname(relPosix);
  const internal = [];
  for (const im of imports) {
    const f = im.from;
    if (f.startsWith(".") || f.startsWith("@/")) {
      internal.push(`${im.spec} ← ${f}`);
    }
  }
  return internal.slice(0, 40);
}

function externalImports(imports) {
  const pkgs = new Set();
  for (const im of imports) {
    const f = im.from;
    if (f.startsWith(".") || f.startsWith("@/")) continue;
    const pkg = f.startsWith("@") ? f.split("/").slice(0, 2).join("/") : f.split("/")[0];
    if (pkg) pkgs.add(pkg);
  }
  return [...pkgs].sort().slice(0, 35);
}

function buildMarkdown(relPosix, analysis, rawContent) {
  const fileName = path.posix.basename(relPosix);
  const { imports, exports, requires, moduleExports, leadingComment } = analysis;

  const workflow = classifyPath(relPosix);
  const internal = internalImports(imports, relPosix);
  const external = externalImports(imports);
  const inferred = inferRuntimeBehavior(rawContent, relPosix);

  const lines = [];
  lines.push(`# \`${fileName}\``);
  lines.push("");
  lines.push("## Purpose");
  if (leadingComment) {
    lines.push("Derived from the file’s opening comment (when present):");
    lines.push("");
    lines.push("```");
    lines.push(leadingComment.slice(0, 2500));
    lines.push("```");
    lines.push("");
  }
  lines.push(workflow);
  lines.push("");

  lines.push("## What it does (from static analysis)");
  lines.push("");
  if (inferred.length) {
    lines.push("**Observed runtime/workflow signals (heuristic, code-derived):**");
    lines.push("");
    for (const b of inferred) lines.push(`- ${b}`);
    lines.push("");
  }
  if (exports.length) {
    lines.push("**Exported surface (first export statements found in file):**");
    lines.push("");
    for (const e of exports.slice(0, 25)) {
      lines.push(`- ${e}`);
    }
    if (exports.length > 25) {
      lines.push(`- … (${exports.length - 25} more export lines omitted)`);
    }
    lines.push("");
  } else if (moduleExports.length) {
    lines.push("**CommonJS exports:**");
    lines.push("");
    for (const e of moduleExports.slice(0, 15)) {
      lines.push(`- ${e}`);
    }
    lines.push("");
  } else {
    lines.push("- No `export` lines detected in the scanned portion of the file (may use implicit exports, re-exports in later lines, or runtime-only registration).");
    lines.push("");
  }

  if (requires.length) {
    lines.push("**`require()` targets (sample):**");
    lines.push("");
    const uniq = [...new Set(requires)].slice(0, 40);
    for (const r of uniq) lines.push(`- \`${r}\``);
    lines.push("");
  }

  lines.push("## How it interacts with other parts");
  lines.push("");
  if (internal.length) {
    lines.push("**Relative / aliased imports (project-internal):**");
    lines.push("");
    for (const x of internal) lines.push(`- ${x}`);
    lines.push("");
  } else {
    lines.push("- No relative/\`@/\` imports detected in the scanned header region.");
    lines.push("");
  }

  lines.push("## Dependencies (packages)");
  lines.push("");
  if (external.length) {
    for (const p of external) lines.push(`- \`${p}\``);
  } else {
    lines.push("- None detected from import paths in the scanned region (or only relative imports).");
  }
  lines.push("");

  lines.push("## Role in the workflow");
  lines.push("");
  lines.push(`- **Path:** \`${relPosix}\``);
  lines.push(`- **Summary:** ${workflow}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push(
    "*This file was generated by static analysis of the source (imports/exports/comments). Regenerate with `node scripts/generate-architecture-docs.mjs`.*"
  );

  return lines.join("\n");
}

function ensureDirForFile(fileAbs) {
  fs.mkdirSync(path.dirname(fileAbs), { recursive: true });
}

function isHandNormalizedPurposeDoc(markdown) {
  if (markdown.startsWith("<!-- purpose-doc: normalized -->\n")) return true;
  if (/\n## Roles\s*\n/.test(markdown)) return true;
  return false;
}

function main() {
  const files = [];
  walk(ROOT, "", files);
  files.sort((a, b) => a.relPosix.localeCompare(b.relPosix));

  let written = 0;
  let skippedNormalized = 0;
  for (const { abs, relPosix } of files) {
    let content;
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    if (content.length > 1_200_000) {
      content = content.slice(0, 500_000);
    }
    const analysis = parseImportsExports(content);
    const md = buildMarkdown(relPosix, analysis, content);
    const base = path.posix.basename(relPosix);
    const stem = base.slice(0, base.length - path.posix.extname(base).length);
    const ext = path.posix.extname(base);
    const outName = `${stem}-purpose.md`;
    const outRel = path.posix.join(path.posix.dirname(relPosix), outName);
    const outAbs = path.join(OUT_ROOT, ...outRel.split("/"));
    ensureDirForFile(outAbs);
    if (fs.existsSync(outAbs)) {
      const existing = fs.readFileSync(outAbs, "utf8");
      if (isHandNormalizedPurposeDoc(existing)) {
        skippedNormalized++;
        continue;
      }
    }
    fs.writeFileSync(outAbs, md, "utf8");
    written++;
  }

  // eslint-disable-next-line no-console
  console.log(`Wrote ${written} purpose docs under Docs/ (skipped ${skippedNormalized} hand-normalized)`);
}

main();
