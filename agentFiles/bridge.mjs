#!/usr/bin/env node
// Watches agentFiles/prompts.json and executes pending prompts in this repo.
// Writes agentFiles/tasksRes.json, then commits + pushes so ChatGPT can read results.

import {
  AGENT_DIR,
  PUSH,
  RESULTS_FILE,
  PROMPTS_FILE,
  ROOT,
  POLL_MS,
  extractCommand,
  guard,
  iterationOf,
  isPending,
  log,
  nowIso,
  pushFiles,
  rawUrls,
  readJson,
  redact,
  runProcess,
  syncPull,
  writeJson,
} from './lib.mjs';

const ONCE = process.argv.includes('--once');
const FILES = ['agentFiles/prompts.json', 'agentFiles/tasksRes.json'];
const MAX_RESULTS = 500;

let busy = false;
let stopping = false;

function promptLabel(entry) {
  return `${entry.serial} (iteration ${iterationOf(entry)})`;
}

async function publish(message) {
  if (!PUSH) return;
  const result = await pushFiles(FILES, message);
  if (!result.ok) await log(`publish failed for "${message}"`);
}

/** A crash between "detected" and "ran" would strand a prompt. Re-arm those. */
async function recoverStale(prompts, results) {
  const completed = new Set(results.map((r) => r.serial));
  let changed = false;
  for (const entry of prompts.prompts ?? []) {
    if (String(entry.status).toLowerCase() !== 'detected') continue;
    if (completed.has(entry.serial)) continue;
    entry.status = 'pending';
    entry.recoveredAt = nowIso();
    changed = true;
    await log(`${entry.serial}: recovered stale "detected" prompt`);
  }
  if (changed) await writeJson(PROMPTS_FILE, prompts);
  return changed;
}

async function executePrompt(entry, prompts, results) {
  const serial = entry.serial;
  const iteration = iterationOf(entry);
  const command = extractCommand(entry.prompt);

  entry.status = 'detected';
  entry.detectedAt = nowIso();
  await writeJson(PROMPTS_FILE, prompts);
  await publish(`bridge: detected ${serial}`);
  await log(`${serial}: detected -> ${JSON.stringify(command)}`);

  const denial = guard(command);
  const outcome = denial
    ? {
        exitCode: 126,
        signal: null,
        timedOut: false,
        stdout: '',
        stderr: `Refused to execute: ${denial}\n`,
        truncated: false,
        durationMs: 0,
      }
    : await runProcess(command, [], { cwd: ROOT, shell: '/bin/zsh' });

  const result = {
    serial,
    iteration,
    tag: iteration === 1 ? 'first output' : 'retry output',
    command,
    cwd: ROOT,
    ranAt: nowIso(),
    exitCode: outcome.exitCode,
    signal: outcome.signal,
    timedOut: outcome.timedOut,
    truncated: outcome.truncated,
    durationMs: outcome.durationMs,
    passed: outcome.exitCode === 0,
    stdout: redact(outcome.stdout),
    stderr: redact(outcome.stderr),
  };

  // Re-read prompts before writing: ChatGPT may have touched the file while we ran.
  const fresh = await readJson(PROMPTS_FILE, { prompts: [] });
  const target = (fresh.prompts ?? []).find((p) => p.serial === serial) ?? entry;
  target.status = `ran (${iteration})`;
  target.ranAt = result.ranAt;
  target.exitCode = result.exitCode;
  target.iteration = iteration;

  const freshResults = await readJson(RESULTS_FILE, { results: [] });
  const list = (freshResults.results ?? []).filter(
    (r) => !(r.serial === serial && iterationOf(r) === iteration),
  );
  list.push(result);
  const trimmed = list.slice(-MAX_RESULTS);

  await writeJson(RESULTS_FILE, { results: trimmed });
  await writeJson(PROMPTS_FILE, fresh);
  await publish(`bridge: result for ${serial} (exit ${result.exitCode})`);
  await log(
    `${serial}: ran -> exit ${result.exitCode} in ${result.durationMs}ms` +
      (result.truncated ? ' (output truncated)' : ''),
  );

  return result;
}

async function tick() {
  if (busy) return;
  busy = true;
  try {
    await syncPull('poll');

    const prompts = await readJson(PROMPTS_FILE, { prompts: [] });
    const results = await readJson(RESULTS_FILE, { results: [] });
    const list = prompts.prompts ?? [];

    if (await recoverStale(prompts, results.results ?? [])) {
      await publish('bridge: recovered stale prompt');
    }

    const done = new Set((results.results ?? []).map((r) => r.serial));
    const next = list
      .filter((entry) => isPending(entry) && !done.has(entry.serial))
      .sort((a, b) => String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))[0];

    if (!next) return;

    if (!next.serial) {
      next.serial = `UNSERIALIZED-${Date.now()}`;
    }

    await executePrompt(next, prompts, results);
  } catch (error) {
    await log(`tick error: ${error.stack ?? error.message}`);
  } finally {
    busy = false;
  }
}

async function main() {
  const urls = rawUrls();
  await log(
    `bridge starting in ${ROOT} | poll ${POLL_MS}ms | push ${PUSH ? 'on' : 'off'} | once ${ONCE}`,
  );
  await log(`ChatGPT reads prompts:  ${urls.prompts}`);
  await log(`ChatGPT reads results:  ${urls.results}`);

  if (ONCE) {
    await tick();
    return;
  }

  const shutdown = async (signal) => {
    if (stopping) return;
    stopping = true;
    await log(`bridge stopping (${signal})`);
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  while (!stopping) {
    await tick();
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch(async (error) => {
  await log(`fatal: ${error.stack ?? error.message}`);
  process.exit(1);
});
