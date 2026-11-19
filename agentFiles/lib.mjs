// Shared helpers for the ChatGPT <-> OpenCode terminal bridge.
// No dependencies: Node 20+ only.

import { spawn } from 'node:child_process';
import { appendFile, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(
  process.env.BRIDGE_REPO ?? path.dirname(path.dirname(fileURLToPath(import.meta.url))),
);
export const AGENT_DIR = path.join(ROOT, 'agentFiles');
export const PROMPTS_FILE = path.join(AGENT_DIR, 'prompts.json');
export const RESULTS_FILE = path.join(AGENT_DIR, 'tasksRes.json');
export const LOG_FILE = path.join(AGENT_DIR, '.bridge.log');

export const POLL_MS = Number(process.env.BRIDGE_POLL_MS ?? 3000);
export const TIMEOUT_MS = Number(process.env.BRIDGE_TIMEOUT_MS ?? 300_000);
export const MAX_OUTPUT = Number(process.env.BRIDGE_MAX_OUTPUT ?? 20_000);
export const SYNC = process.env.BRIDGE_SYNC !== '0';
export const PUSH = process.env.BRIDGE_PUSH !== '0';
export const ALLOW_UNSAFE = process.env.BRIDGE_ALLOW_UNSAFE === '1';

const RAW_BASE =
  process.env.BRIDGE_RAW_BASE ??
  'https://raw.githubusercontent.com/mahimator/corporatetragedy/main/agentFiles';

export function rawUrls() {
  return {
    prompts: `${RAW_BASE}/prompts.json`,
    results: `${RAW_BASE}/tasksRes.json`,
  };
}

export function nowIso() {
  return new Date().toISOString();
}

export async function log(line) {
  const stamp = nowIso();
  const message = `[${stamp}] ${line}\n`;
  process.stdout.write(message);
  try {
    await appendFile(LOG_FILE, message);
  } catch {
    // Logging must never break the bridge.
  }
}

export async function readJson(file, fallback) {
  try {
    const text = await readFile(file, 'utf8');
    if (!text.trim()) return fallback;
    return JSON.parse(text);
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

export async function writeJson(file, value) {
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(tmp, file);
}

export function runProcess(command, args, options = {}) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, args, {
      cwd: options.cwd ?? ROOT,
      env: { ...process.env, ...options.env },
      shell: options.shell ?? false,
      detached: true, // own process group so timeouts kill the whole tree
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let truncated = false;
    let timedOut = false;

    const collect = (which) => (chunk) => {
      if (which === 'out') {
        if (stdout.length < MAX_OUTPUT) stdout += chunk.toString();
        else truncated = true;
      } else if (stderr.length < MAX_OUTPUT) stderr += chunk.toString();
      else truncated = true;
    };

    child.stdout.on('data', collect('out'));
    child.stderr.on('data', collect('err'));

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    }, options.timeoutMs ?? TIMEOUT_MS);

    const finish = (code, signal) => {
      clearTimeout(timer);
      resolve({
        exitCode: timedOut ? 124 : (code ?? -1),
        signal: signal ?? null,
        timedOut,
        stdout,
        stderr,
        truncated,
        durationMs: Date.now() - started,
      });
    };

    child.on('close', finish);
    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        exitCode: 127,
        signal: null,
        timedOut: false,
        stdout: '',
        stderr: `${stderr}${error.message}\n`,
        truncated,
        durationMs: Date.now() - started,
      });
    });
  });
}

export async function git(args, options = {}) {
  return runProcess('git', args, { ...options, timeoutMs: options.timeoutMs ?? 120_000 });
}

let gitRepoCache;
async function isGitRepo() {
  if (gitRepoCache === undefined) {
    const probe = await git(['rev-parse', '--git-dir']);
    gitRepoCache = probe.exitCode === 0;
  }
  return gitRepoCache;
}

/** Pull the shared bus. Never throws: a failed pull must not stop the bridge. */
export async function syncPull(label = 'sync') {
  if (!SYNC) return { ok: true, skipped: true };
  if (!(await isGitRepo())) return { ok: false, reason: 'not-a-repo' };

  const status = await git(['status', '--porcelain']);
  if (status.stdout.trim()) {
    // Rebase with local edits is brittle; the bridge commits before syncing.
    await log(`${label}: working tree dirty, skipping pull`);
    return { ok: false, reason: 'dirty' };
  }
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const pull = await git(['pull', '--rebase', '--autostash', '--quiet']);
    if (pull.exitCode === 0) return { ok: true };
    await log(`${label}: pull failed (attempt ${attempt}): ${pull.stderr.trim()}`);
    if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
  }
  return { ok: false, reason: 'pull-failed' };
}

/** Commit and push the given repo-relative paths, if they changed. */
export async function pushFiles(files, message) {
  if (!PUSH) return { ok: true, skipped: true };

  const add = await git(['add', '--', ...files]);
  if (add.exitCode !== 0) {
    await log(`push: git add failed: ${add.stderr.trim()}`);
    return { ok: false };
  }

  const staged = await git(['diff', '--cached', '--quiet']);
  if (staged.exitCode === 0) return { ok: true, unchanged: true };

  const commit = await git(['commit', '--quiet', '-m', message]);
  if (commit.exitCode !== 0) {
    await log(`push: commit failed: ${commit.stderr.trim()}`);
    return { ok: false };
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const push = await git(['push', '--quiet']);
    if (push.exitCode === 0) return { ok: true };
    await log(`push: push failed (attempt ${attempt}): ${push.stderr.trim()}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
    await git(['pull', '--rebase', '--autostash', '--quiet']);
  }
  return { ok: false, reason: 'push-failed' };
}

export function newSerial(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const day = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}${pad(date.getMinutes())}`;
  const suffix = String(Math.floor(Math.random() * 90) + 10);
  return `CT-${day}-${time}-${suffix}`;
}

/** Turn "run the command ls -la in terminal" into "ls -la". */
export function extractCommand(text) {
  let command = String(text ?? '').trim();
  command = command.replace(/^run the command\s+/i, '');
  command = command.replace(/\s+in (the )?(local )?terminal\s*[.!]?$/i, '');
  command = command.replace(/\s+in the repo\s*[.!]?$/i, '');
  if (/^`[^`]*`$/.test(command)) command = command.slice(1, -1);
  if (command.startsWith('$ ')) command = command.slice(2);
  return command.trim().replace(/[.;]$/, '');
}

const DENY = [
  /\bsudo\b/,
  /\b(shutdown|reboot|halt|diskutil|mkfs\w*)\b/,
  /\brm\s+(-[a-z]*[rf][a-z]*\s+)*(\/|~|\$HOME)(\s|$)/,
  /\bgit\s+push\s+--force/,
  /\bgit\s+reset\s+--hard/,
  /:\s*\(\s*\)\s*\{/,
  /\bchmod\s+-R\s+777\s+\//,
];

/** Returns null when allowed, otherwise a human-readable denial reason. */
export function guard(command) {
  if (!command) return 'empty command';
  if (ALLOW_UNSAFE) return null;
  for (const rule of DENY) {
    if (rule.test(command)) return `blocked by safety rule ${rule}`;
  }
  return null;
}

const SECRETS = [
  /\b(sk|rk)-[A-Za-z0-9_-]{16,}/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\b(Bearer)\s+[A-Za-z0-9._-]{20,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

/** Results land in a public repo, so scrub obvious credential shapes. */
export function redact(text) {
  return SECRETS.reduce((acc, rule) => acc.replace(rule, '[REDACTED]'), String(text ?? ''));
}

export function isPending(entry) {
  return ['pending', 'new'].includes(String(entry?.status ?? '').toLowerCase());
}

export function iterationOf(entry) {
  const n = Number(entry?.iteration);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : 1;
}
