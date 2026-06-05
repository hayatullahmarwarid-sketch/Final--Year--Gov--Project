/**
 * Normalizes every Docs tree purpose markdown (-purpose.md) to narrative sections plus Roles.
 * Template docs (static-analysis skeleton): full rewrite from source.
 * Existing narrative docs: append ## Roles if missing (body preserved).
 * Prepends <!-- purpose-doc: normalized --> so generate-architecture-docs.mjs skips them.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOCS = path.join(ROOT, "Docs");

const CODE_EXT = [".tsx", ".ts", ".jsx", ".js", ".mjs", ".cjs"];

function walkPurposeDocs(dir, out) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkPurposeDocs(p, out);
    else if (ent.name.endsWith("-purpose.md")) out.push(p);
  }
}

function isTemplateDoc(content) {
  return content.includes("from static analysis") || content.includes("generate-architecture-docs.mjs");
}

function hasRolesSection(content) {
  return /\n## Roles\s*(\n|$)/.test(content);
}

function stripMarker(content) {
  if (content.startsWith("<!-- purpose-doc: normalized -->\n")) {
    return content.slice("<!-- purpose-doc: normalized -->\n".length);
  }
  return content;
}

function relFromDocs(docAbs) {
  return path.relative(DOCS, docAbs).split(path.sep).join("/");
}

function resolveSourceFile(docRel) {
  // docRel: "components/haptic-tab-purpose.md" -> components/haptic-tab
  const base = path.posix.basename(docRel, "-purpose.md");
  const dir = path.posix.dirname(docRel);
  const tryDir = dir === "." ? "" : dir;
  for (const ext of CODE_EXT) {
    const rel = tryDir ? path.posix.join(tryDir, base + ext) : base + ext;
    const tryAbs = path.join(ROOT, ...rel.split("/"));
    if (fs.existsSync(tryAbs)) return { abs: tryAbs, rel };
  }
  return null;
}

function pseudoSourceRelFromDoc(docRel) {
  return docRel.slice(0, -"-purpose.md".length);
}

function titleFromPath(fileName) {
  const stem = fileName.replace(/\.[^.]+$/, "");
  return stem
    .split(/[-_.]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function parseImportsExportsFull(content) {
  const lines = content.split(/\n/);
  const imports = [];
  const exports = [];
  const requires = [];
  const moduleExports = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) continue;
    let m = t.match(/^import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]\s*;?$/);
    if (m) {
      imports.push({ spec: m[1].trim(), from: m[2] });
      continue;
    }
    m = t.match(/^import\s+['"]([^'"]+)['"]\s*;?$/);
    if (m) {
      imports.push({ spec: "(side-effect)", from: m[1] });
      continue;
    }
    if (/^export\s/.test(t)) {
      const shortened = t.length > 300 ? `${t.slice(0, 297)}…` : t;
      if (exports.length < 100) exports.push(shortened);
      continue;
    }
    m = t.match(/(?:const|let|var)\s+[\w$]+\s*=\s*require\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m) requires.push(m[1]);
    m = t.match(/require\(\s*['"]([^'"]+)['"]\s*\)/);
    if (m && requires.length < 200) requires.push(m[1]);
    if (/^module\.exports\s*=/.test(t) && moduleExports.length < 50) {
      moduleExports.push(t.length > 300 ? `${t.slice(0, 297)}…` : t);
    }
    if (/^exports\.\w+\s*=/.test(t) && moduleExports.length < 50) {
      moduleExports.push(t.length > 300 ? `${t.slice(0, 297)}…` : t);
    }
  }
  return { imports, exports, requires, moduleExports };
}

function internalImports(imports) {
  const internal = [];
  for (const im of imports) {
    if (im.from.startsWith(".") || im.from.startsWith("@/")) {
      internal.push({ spec: im.spec, from: im.from });
    }
  }
  return internal;
}

function externalPackageName(from) {
  if (from.startsWith("@")) return from.split("/").slice(0, 2).join("/");
  return from.split("/")[0] || from;
}

function externalImports(imports) {
  const pkgs = new Set();
  for (const im of imports) {
    if (im.from.startsWith(".") || im.from.startsWith("@/")) continue;
    pkgs.add(externalPackageName(im.from));
  }
  return [...pkgs].sort();
}

function describeImport(from) {
  if (from.startsWith("@/")) {
    if (from.includes("/api/")) return "app API and data access helper";
    if (from.includes("contexts/")) return "shared React context";
    if (from.includes("components/")) return "UI component";
    if (from.includes("lib/")) return "shared library code";
    if (from.includes("constants/")) return "shared constants";
    if (from.includes("hooks/")) return "custom React hook";
    return "project module";
  }
  if (from.startsWith(".")) return "relative project import";
  return "package";
}

function buildLibrariesSection(imports, requires) {
  const lines = [];
  const ext = externalImports(imports);
  for (const p of ext) {
    lines.push(`- **${p}** – third-party dependency for this module.`);
  }
  const int = internalImports(imports);
  for (const im of int.slice(0, 60)) {
    lines.push(`- **${im.from}** (\`${im.spec}\`) – ${describeImport(im.from)}.`);
  }
  const reqUniq = [...new Set(requires)].slice(0, 30);
  for (const r of reqUniq) {
    if (r.startsWith(".") || r.startsWith("@/")) {
      lines.push(`- **\`${r}\`** – \`require\` target in this back-end area.`);
    } else {
      lines.push(`- **\`${r}\`** – CommonJS dependency.`);
    }
  }
  if (lines.length === 0) {
    lines.push("- **(none beyond language built-ins)** – the file only uses local control flow or relative imports not listed above.");
  }
  return lines.join("\n");
}

function buildScenario(relSource) {
  const p = relSource.replace(/\\/g, "/");
  if (p.startsWith("app/") && p.includes("system-admin")) {
    return "A **system administrator** uses the system-admin area of the mobile app. This module is involved when that part of the product loads, routes, or performs an action. It should stay consistent with server-side authorization for elevated operations.";
  }
  if (p.startsWith("app/") && p.includes("inspector-admin")) {
    return "An **inspector admin** (regional/organizational coordination) works in the inspector-admin section. This code runs as they navigate, review, or manage inspection-related data. It assumes an authenticated staff session with the appropriate role.";
  }
  if (p.startsWith("app/") && p.includes("dept-upload")) {
    return "A **decree upload department** user operates the department portal experience (uploads, dashboards, settings). This module participates when they move through those screens or trigger workflows tied to decree publication.";
  }
  if (p.startsWith("app/inspector/")) {
    return "A **field inspector** uses the inspector mobile workflow (tasks, forms, sync). This code runs during their session while they complete assignments, capture evidence, or stay in sync with the server.";
  }
  if (p.startsWith("app/") && /\(tabs\)/.test(p)) {
    return "A **signed-in public user** browses the main tabbed area (home, decrees, exams, profile, etc.). This screen or layout participates in everyday navigation after login.";
  }
  if (p.startsWith("app/") && /login|register|forgot-password|verify-email|language|index/.test(p)) {
    return "The user is in an **unauthenticated or onboarding** flow (language selection, login, registration, password recovery, or email verification). This module runs as part of that journey before or outside the main signed-in experience.";
  }
  if (p.startsWith("app/")) {
    return "This **Expo Router** module participates in file-based navigation for the mobile app: it renders when the matching route is active, participates in layout nesting, or supplies UI for a specific path.";
  }
  if (p.startsWith("components/")) {
    return "The app composes screens from reusable pieces. This component is used whenever its parent screen or layout needs this UI behaviour or presentation pattern.";
  }
  if (p.startsWith("hooks/")) {
    return "Multiple screens share behaviour through hooks. This hook runs when any consumer component mounts or when its dependencies change, encapsulating stateful logic.";
  }
  if (p.startsWith("contexts/")) {
    return "Global or subtree state is provided through React context. This module is active while its provider wraps part of the tree and consumers read or update that shared state.";
  }
  if (p.startsWith("lib/api/")) {
    return "The mobile client calls the back-end over HTTP. These helpers run whenever application code needs to perform the corresponding API operation (often after user action or navigation).";
  }
  if (p.startsWith("lib/")) {
    return "Shared **library** code runs wherever imported—typically during screen render, event handlers, or background sync—to centralise formatting, storage, or cross-cutting behaviour.";
  }
  if (p.startsWith("constants/")) {
    return "Static configuration and design tokens are read whenever modules import this file—often during render to keep UI and behaviour consistent.";
  }
  if (p.startsWith("data/")) {
    return "Bundled or typed **data modules** are loaded when features need catalogues, stores, or model shapes shared across the app.";
  }
  if (p.startsWith("scripts/")) {
    return "A maintainer runs **Node tooling** locally (maintenance, codegen, or environment setup). This script executes in the developer shell, not on end-user devices.";
  }
  if (p.includes("back-end/database/models/")) {
    return "The API layer reads and writes documents through Mongoose models. This schema participates whenever persistence code queries or mutates the corresponding entity.";
  }
  if (p.includes("back-end/database/repositories/")) {
    return "Repositories isolate data access. This module runs when services or controllers perform database operations for the related domain.";
  }
  if (p.includes("back-end/database/migrations/")) {
    return "During deployment or a migration run, this script or definition evolves indexes/schema so production data stays aligned with the application.";
  }
  if (p.includes("back-end/src/modules/") && p.includes(".routes.")) {
    return "HTTP requests hit this router after the server maps a URL prefix here. It runs for each matching request (with middleware such as auth and validation applied upstream or inline).";
  }
  if (p.includes("back-end/src/modules/") && p.includes(".controller.")) {
    return "A controller handles a specific HTTP action: it runs when a route delegates to it, validates input, calls services, and returns a response.";
  }
  if (p.includes("back-end/src/modules/") && p.includes(".service.")) {
    return "Business rules for this domain execute when controllers, jobs, or other services call into this service layer.";
  }
  if (p.startsWith("back-end/src/middlewares/")) {
    return "Every request passing through the mounted middleware chain may execute this module—depending on how the server registers it—shaping auth, errors, logging, or request context.";
  }
  if (p.startsWith("back-end/src/jobs/") || p.includes("/jobs/")) {
    return "Background work (queues, cron, or in-process handlers) runs on a schedule or when jobs are enqueued. This file participates in that asynchronous pipeline.";
  }
  if (p.startsWith("back-end/src/services/")) {
    return "Infrastructure services (email, storage, cache, push, etc.) are invoked when domain logic or jobs need that capability.";
  }
  if (p.includes("back-end/database/connection/")) {
    return "At server startup and shutdown, the process establishes or tears down the database connection so API handlers can rely on a healthy pool.";
  }
  if (p.startsWith("back-end/")) {
    return "This **back-end** module participates in server-side request handling, persistence, or operational workflows when the process runs.";
  }
  if (p.startsWith("services/")) {
    return "Client-side service helpers run when app code imports them (for example portal login or specialised integrations).";
  }
  return "This module runs whenever other code imports it or when the runtime loads it as part of the build graph.";
}

function buildWhatItDoes(fileName, exports, moduleExports, relSource) {
  const name = path.posix.basename(relSource);
  const parts = [];
  const exportLines = exports.length ? exports.slice(0, 18) : [];
  const modLines = moduleExports.length ? moduleExports.slice(0, 12) : [];
  if (exportLines.length) {
    parts.push("The file exports the following surface (representative `export` lines):");
    parts.push("");
    for (const e of exportLines) parts.push(`- \`${e.replace(/`/g, "'")}\``);
    if (exports.length > 18) parts.push(`- … (${exports.length - 18} additional export lines in file)`);
    parts.push("");
  } else if (modLines.length) {
    parts.push("The module uses CommonJS exports:");
    parts.push("");
    for (const e of modLines) parts.push(`- \`${e.replace(/`/g, "'")}\``);
    parts.push("");
  } else {
    parts.push("The file may register effects at load time, re-export from another path, or use patterns outside a simple `export` line scan; reading the full source is required for exact exports.");
    parts.push("");
  }
  parts.push(
    `Path in repo: \`${relSource}\`. Together, these exports and any side effects at import time define how the rest of the project interacts with \`${name}\`.`
  );
  return parts.join("\n");
}

function buildLogicImplemented(content, relSource, exports) {
  const p = relSource.replace(/\\/g, "/");
  const steps = [];
  let n = 1;
  const push = (s) => steps.push(`${n++}. ${s}`);

  push("The module loads its imports and establishes any top-level constants or configuration.");
  if (/useEffect\s*\(/.test(content)) {
    push("React `useEffect` hooks run after render when dependencies change, coordinating subscriptions, fetches, or cleanup.");
  }
  if (/useState\s*\(/.test(content) || /useReducer\s*\(/.test(content)) {
    push("Local component state is managed with React hooks and drives re-renders when updated.");
  }
  if (/router\.(push|replace|back)/.test(content) || /useRouter\s*\(/.test(content)) {
    push("Expo Router (`useRouter` or imperative navigation) changes the active screen based on user actions or completion of async work.");
  }
  if (/Haptics\.|expo-haptics/.test(content)) {
    push("On supported devices, Expo Haptics provides tactile feedback tied to user gestures.");
  }
  if (/PlatformPressable|Pressable/.test(content)) {
    push("Press handling flows through a pressable component that merges props and optional platform ripple behaviour.");
  }
  if (/fetch\s*\(/.test(content) || /\baxios\b|node-fetch|undici/.test(content)) {
    push("Outbound HTTP client calls request or mutate remote services; responses drive behaviour.");
  }
  if (/new\s+Schema\s*\(|mongoose\.model\s*\(|Schema\s*\(\s*\{/.test(content)) {
    push("Mongoose schema and model definitions describe stored documents and any middleware or methods attached to the model.");
  }
  if (/express\.Router\s*\(/.test(content) || /\.(get|post|put|patch|delete)\s*\(\s*['"]/.test(content)) {
    push("Express routing maps HTTP methods and paths to handlers (often composed with `asyncHandler` and validation middleware).");
  }
  if (/asyncHandler\s*\(/.test(content)) {
    push("Async route handlers are wrapped so thrown errors reach the global error middleware.");
  }
  if (/zod/.test(content) && /\.(parse|safeParse)\s*\(/.test(content)) {
    push("Zod validates structured input before business logic runs.");
  }
  if (/cron|schedule|queue|Bull|Redis/i.test(content) && /job|Worker/i.test(content)) {
    push("Job or cron wiring schedules background execution or processes queued payloads.");
  }
  if (exports.length > 0) {
    push("Callers import the exported functions, components, or objects and integrate them into routes, UI trees, or services.");
  }
  push("Edge cases and validation branches follow the source literally—this narrative summarizes dominant patterns only.");

  return steps.join("\n");
}

function buildRolesSection(relSource) {
  const p = relSource.replace(/\\/g, "/").toLowerCase();

  const pub = { direct: false, note: "" };
  const ins = { direct: false, note: "" };
  const iadm = { direct: false, note: "" };
  const dept = { direct: false, note: "" };
  const sys = { direct: false, note: "" };

  const mark = (which, direct, note) => {
    which.direct = direct;
    which.note = note;
  };

  if (p.startsWith("app/system-admin") || p.includes("/system-admin/")) {
    mark(sys, true, "Primary UI for system administration features.");
    mark(pub, false, "No direct use; admin-only routes.");
  } else if (p.startsWith("app/inspector-admin") || p.includes("/inspector-admin/")) {
    mark(iadm, true, "Inspector admin dashboards and tools.");
    mark(ins, false, "Distinct from field inspector app subtree unless shared component.");
  } else if (p.startsWith("app/dept-upload") || p.includes("/dept-upload") || p.includes("decree-upload")) {
    mark(dept, true, "Department decree upload portal and related APIs.");
  } else if (p.startsWith("app/inspector/")) {
    mark(ins, true, "Field inspector workflow.");
  } else if (
    p.includes("/login") ||
    p.includes("/register") ||
    p.includes("forgot-password") ||
    p.includes("/language") ||
    p.includes("/verify-email") ||
    p.includes("app/index.") ||
    /\(tabs\)/.test(p) ||
    p.includes("public-users") ||
    p.includes("certificates-public") ||
    p.includes("auth.routes") ||
    p.includes("auth.service") ||
    p.includes("auth.controller")
  ) {
    mark(pub, true, "Public authentication, catalog, or signed-in public user experiences.");
  }

  if (p.includes("back-end/src/modules/public-users") || p.includes("certificates-public")) {
    mark(pub, true, "Public HTTP surface for end users.");
  }
  if (p.includes("back-end/src/modules/inspectors/") && !p.includes("inspector-admin")) {
    mark(ins, true, "Inspector-specific back-end resources (field users).");
  }
  if (p.includes("back-end/src/modules/inspector-admin")) {
    mark(iadm, true, "Inspector admin APIs and workflows.");
  }
  if (p.includes("back-end/src/modules/decree-upload")) {
    mark(dept, true, "Decree upload department APIs.");
  }
  if (p.includes("back-end/src/modules/system-admin") || p.includes("super-admin")) {
    mark(sys, true, "Elevated administration APIs.");
  }

  // Shared / indirect
  const lines = [];
  const fmt = (label, o) => {
    const scope = o.direct ? "Direct" : "Indirect / shared";
    lines.push(`- **${label}** — ${scope}: ${o.note || "see source and routes that import this module."}`);
  };

  if (!pub.note) pub.note = "May apply if the module is used from public routes, auth flows, or shared layouts.";
  if (!ins.note) ins.note = "Relevant when inspector mobile features or inspector APIs use this code.";
  if (!iadm.note) iadm.note = "Relevant when inspector-admin surfaces or APIs use this code.";
  if (!dept.note) dept.note = "Relevant when decree upload portal features use this code.";
  if (!sys.note) sys.note = "Relevant for operational/admin tooling, audits, or platform configuration.";

  fmt("public", pub);
  fmt("inspector", ins);
  fmt("inspector_admin", iadm);
  fmt("decree_upload_department", dept);
  fmt("system_admin", sys);

  return lines.join("\n");
}

function buildFullMarkdown(relSource, sourceContent, analysis) {
  const fileName = path.posix.basename(relSource);
  const human = `${titleFromPath(fileName)} (\`${fileName}\`)`;
  const scenario = buildScenario(relSource);
  const what = buildWhatItDoes(fileName, analysis.exports, analysis.moduleExports, relSource);
  const libs = buildLibrariesSection(analysis.imports, analysis.requires);
  const logic = buildLogicImplemented(sourceContent, relSource, analysis.exports);
  const roles = buildRolesSection(relSource);

  return [
    `# ${human}`,
    "",
    "## Scenario",
    "",
    scenario,
    "",
    "## What it does",
    "",
    what,
    "",
    "## Libraries used",
    "",
    libs,
    "",
    "## Logic implemented",
    "",
    logic,
    "",
    "## Roles",
    "",
    roles,
    "",
  ].join("\n");
}

function main() {
  const purposeFiles = [];
  walkPurposeDocs(DOCS, purposeFiles);
  purposeFiles.sort();

  let fullRewrites = 0;
  let roleAppends = 0;
  let markerPrependedOnly = 0;
  let missingSource = 0;

  for (const docAbs of purposeFiles) {
    const docRel = relFromDocs(docAbs);
    const existing = fs.readFileSync(docAbs, "utf8");
    const src = resolveSourceFile(docRel);

    if (!isTemplateDoc(existing)) {
      if (hasRolesSection(existing)) {
        if (!existing.startsWith("<!-- purpose-doc: normalized -->\n")) {
          fs.writeFileSync(
            docAbs,
            `<!-- purpose-doc: normalized -->\n${stripMarker(existing)}`,
            "utf8"
          );
          markerPrependedOnly++;
        }
        continue;
      }
      const rolesRel = src ? src.rel : pseudoSourceRelFromDoc(docRel);
      const rolesBlock = `\n\n## Roles\n\n${buildRolesSection(rolesRel)}\n`;
      const updated = `<!-- purpose-doc: normalized -->\n${stripMarker(existing).trimEnd()}${rolesBlock}`;
      fs.writeFileSync(docAbs, updated, "utf8");
      roleAppends++;
      continue;
    }

    if (!src) {
      const pseudo = pseudoSourceRelFromDoc(docRel);
      const fallback = buildFullMarkdown(
        `${pseudo}.tsx`,
        "",
        { imports: [], exports: [], requires: [], moduleExports: [] }
      );
      fs.writeFileSync(
        docAbs,
        `<!-- purpose-doc: normalized -->\n${fallback}`,
        "utf8"
      );
      missingSource++;
      fullRewrites++;
      continue;
    }

    let sourceContent = fs.readFileSync(src.abs, "utf8");
    if (sourceContent.length > 1_200_000) sourceContent = sourceContent.slice(0, 800_000);
    const analysis = parseImportsExportsFull(sourceContent);
    const md = buildFullMarkdown(src.rel, sourceContent, analysis);
    fs.writeFileSync(docAbs, `<!-- purpose-doc: normalized -->\n${md}`, "utf8");
    fullRewrites++;
  }

  console.log(
    JSON.stringify(
      {
        purpose_files: purposeFiles.length,
        template_full_rewrites: fullRewrites,
        narrative_role_appends: roleAppends,
        marker_or_roles_no_change: markerPrependedOnly,
        missing_source_fallbacks: missingSource,
      },
      null,
      2
    )
  );
}

main();
