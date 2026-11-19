#!/usr/bin/env node
// Human/agent CLI for the terminal bridge.
//   node agentFiles/cli.mjs prompt "run the command ls -la in terminal"
//   node agentFiles/cli.mjs mark <serial> passed
//   node agentFiles/cli.mjs mark <serial> failed --next "run the command npm test in terminal"
//   node agentFiles/cli.mjs status

import {
  PUSH,
  PROMPTS_FILE,
  RESULTS_FILE,
  extractCommand,
  iterationOf,
  log,
  newSerial,
  nowIso,
  pushFiles,
  rawUrls,
  readJson,
  syncPull,
  writeJson,
} from './lib.mjs';

const FILES = ['agentFiles/prompts.json', 'agentFiles/tasksRes.json'];

function usage() {
  console.log(`terminal bridge CLI

  prompt <text> [--serial ID] [--iteration N] [--retry-of ID] [--no-push]
      Queue a terminal task. Text may be "run the command <cmd> in terminal".

  mark <serial> <passed|failed> [--note "..."] [--next "run the command ... in terminal"]
      Record ChatGPT's verdict. --next queues the retry in one step.

  status
      Show every prompt and its result.

  pull
      Fetch the latest bus state from GitHub.

The bridge daemon is a separate process: npm run bridge
`);
}

function parse(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      if (key === 'no-push') flags.push = false;
      else {
        flags[key] = argv[i + 1];
        i += 1;
      }
    } else positional.push(token);
  }
  return { positional, flags };
}

async function publish(message) {
  if (!PUSH) return { ok: true, skipped: true };
  return pushFiles(FILES, message);
}

async function cmdPrompt(text, flags) {
  if (!text) throw new Error('prompt needs text, e.g. "run the command ls -la in terminal"');

  const store = await readJson(PROMPTS_FILE, { prompts: [] });
  const serial = flags.serial ?? newSerial();
  if ((store.prompts ?? []).some((p) => p.serial === serial)) {
    throw new Error(`serial ${serial} already exists`);
  }

  const entry = {
    serial,
    status: 'pending',
    iteration: Number(flags.iteration ?? 1),
    prompt: text,
    createdAt: nowIso(),
  };
  if (flags['retry-of']) entry.retryOf = flags['retry-of'];
  if (flags.note) entry.note = flags.note;

  store.prompts = [...(store.prompts ?? []), entry];
  await writeJson(PROMPTS_FILE, store);

  const shouldPush = flags.push !== false;
  const published = shouldPush ? await publish(`bridge: queued ${serial}`) : { ok: true, skipped: true };

  console.log(`queued ${serial} -> ${JSON.stringify(extractCommand(text))}`);
  if (published.skipped) console.log('not pushed (--no-push or BRIDGE_PUSH=0)');
  else if (!published.ok) console.log('WARNING: queued locally but push failed');

  const urls = rawUrls();
  console.log(`
Paste this to ChatGPT:

\`\`\`json
${JSON.stringify(entry, null, 2)}
\`\`\`

It can confirm the run at:
  ${urls.results}
`);
}

async function cmdMark(serial, verdict, flags) {
  if (!serial || !verdict) throw new Error('mark needs <serial> <passed|failed>');
  if (!['passed', 'failed'].includes(verdict)) throw new Error('verdict must be passed or failed');

  const store = await readJson(PROMPTS_FILE, { prompts: [] });
  const entry = (store.prompts ?? []).find((p) => p.serial === serial);
  if (!entry) throw new Error(`no prompt with serial ${serial}`);

  entry.status = verdict;
  entry.markedAt = nowIso();
  if (flags.note) entry.verdictNote = flags.note;

  if (flags.next) {
    const retry = {
      serial: newSerial(),
      status: 'pending',
      iteration: iterationOf(entry) + 1,
      retryOf: entry.serial,
      prompt: flags.next,
      createdAt: nowIso(),
      note: flags.note,
    };
    store.prompts.push(retry);
    console.log(`queued retry ${retry.serial} (iteration ${retry.iteration})`);
  }

  await writeJson(PROMPTS_FILE, store);

  const shouldPush = flags.push !== false;
  const published = shouldPush ? await publish(`bridge: ${serial} ${verdict}`) : { ok: true, skipped: true };

  console.log(`${serial} -> ${verdict}`);
  if (published.skipped) console.log('not pushed (--no-push or BRIDGE_PUSH=0)');
  else if (!published.ok) console.log('WARNING: updated locally but push failed');
}

async function cmdStatus() {
  const store = await readJson(PROMPTS_FILE, { prompts: [] });
  const results = await readJson(RESULTS_FILE, { results: [] });
  const byserial = new Map();
  for (const result of results.results ?? []) {
    const list = byserial.get(result.serial) ?? [];
    list.push(result);
    byserial.set(result.serial, list);
  }

  if (!(store.prompts ?? []).length) {
    console.log('no prompts queued');
    return;
  }

  for (const entry of store.prompts) {
    const runs = byserial.get(entry.serial) ?? [];
    const last = runs.at(-1);
    const exit = last ? `exit ${last.exitCode}` : 'no output';
    console.log(
      `${entry.serial}  [${entry.status}]  it=${iterationOf(entry)}  ${exit}  ${extractCommand(entry.prompt)}`,
    );
  }
}

async function main() {
  const { positional, flags } = parse(process.argv.slice(2));
  const [command, ...rest] = positional;

  switch (command) {
    case 'prompt':
      await cmdPrompt(rest.join(' '), flags);
      break;
    case 'mark':
      await cmdMark(rest[0], rest[1], flags);
      break;
    case 'status':
      await cmdStatus();
      break;
    case 'pull': {
      const result = await syncPull('cli');
      console.log(result.ok ? 'pulled' : `pull failed: ${result.reason}`);
      break;
    }
    default:
      usage();
      if (command) {
        await log(`cli: unknown command ${command}`);
        process.exitCode = 1;
      }
  }
}

main().catch((error) => {
  console.error(`error: ${error.message}`);
  process.exitCode = 1;
});
