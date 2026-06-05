import fs from 'node:fs';
import path from 'node:path';

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name === 'node_modules' || name.name === '.git') continue;
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name.name)) out.push(p);
  }
  return out;
}

/** Single-line guard */
function stripInline(s) {
  return s.replace(/if \(Platform\.OS !== 'web'\) void /g, 'void ');
}

/** Multiline: if (Platform.OS !== 'web') { ... Haptics...; } */
function stripBlocks(s) {
  const re =
    /^([\t ]*)if \(Platform\.OS !== 'web'\) \{\s*\r?\n[\t ]*((?:void )?Haptics\.[^;\r\n]+;)\s*\r?\n[\t ]*\}/gm;
  let prev;
  let out = s;
  do {
    prev = out;
    out = out.replace(re, (_, lineIndent, stmt) => {
      const t = stmt.trim();
      const line = t.startsWith('void ') ? t : `void ${t}`;
      return `${lineIndent}${line}`;
    });
  } while (out !== prev);
  return out;
}

function strip(content) {
  return stripBlocks(stripInline(content));
}

const roots = [
  path.join(process.cwd(), 'app'),
  path.join(process.cwd(), 'components'),
  path.join(process.cwd(), 'hooks'),
  path.join(process.cwd(), 'lib'),
];
const files = roots.flatMap((d) => walk(d));
let changed = 0;
for (const f of files) {
  const before = fs.readFileSync(f, 'utf8');
  if (!before.includes("Platform.OS !== 'web'")) continue;
  const after = strip(before);
  if (after !== before) {
    fs.writeFileSync(f, after);
    changed++;
  }
}
console.log('Updated files:', changed);
