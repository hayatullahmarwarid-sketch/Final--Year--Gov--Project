#!/usr/bin/env node
/**
 * Sets REACT_NATIVE_PACKAGER_HOSTNAME from EXPO_PUBLIC_API_BASE_URL so the QR code
 * uses your PC's IP (e.g. hotspot). Without this, Expo often prints exp://127.0.0.1
 * and Expo Go on the phone fails ("Something went wrong").
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env');

function parseApiHost() {
  if (!existsSync(envPath)) {
    console.error(`Missing ${envPath}. Copy from .env.example and set EXPO_PUBLIC_API_BASE_URL.`);
    process.exit(1);
  }
  const raw = readFileSync(envPath, 'utf8');
  const line = raw.split(/\r?\n/).find((l) => /^\s*EXPO_PUBLIC_API_BASE_URL\s*=/.test(l));
  if (!line) {
    console.error('.env must define EXPO_PUBLIC_API_BASE_URL=... (host must match hotspot/LAN IP).');
    process.exit(1);
  }
  const value = line
    .replace(/^\s*EXPO_PUBLIC_API_BASE_URL\s*=\s*/, '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
  const m = value.match(/^https?:\/\/([^/:]+)/i);
  if (!m) {
    console.error(`Could not parse host from EXPO_PUBLIC_API_BASE_URL="${value}"`);
    process.exit(1);
  }
  return m[1];
}

const host = parseApiHost();
process.env.REACT_NATIVE_PACKAGER_HOSTNAME = host;

const passthrough = process.argv.slice(2);
const wantsOffline = passthrough.includes('--offline');
// Expo CLI forbids combining --offline with --host / --lan.
const args = wantsOffline
  ? ['expo', 'start', ...passthrough]
  : ['expo', 'start', '--host', 'lan', ...passthrough];

console.error(
  `[expo-phone] REACT_NATIVE_PACKAGER_HOSTNAME=${host} (parsed from EXPO_PUBLIC_API_BASE_URL). Expect exp://${host}:<port> below, not 127.0.0.1.`,
);
if (wantsOffline) {
  console.error('[expo-phone] --offline set: not passing --host lan (Expo disallows both). Host override still applies.');
}

const child = spawn('npx', args, {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
