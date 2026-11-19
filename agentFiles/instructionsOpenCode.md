# OpenCode terminal bridge instructions

These instructions apply to OpenCode only, never to ChatGPT.

## What this is

`agentFiles/` is the message bus between ChatGPT Web and this machine. ChatGPT can read
`main` on GitHub but cannot reach this disk, so it queues commands in `prompts.json` and
OpenCode executes them and publishes `tasksRes.json`.

| File | Writer | Purpose |
| --- | --- | --- |
| `agentFiles/prompts.json` | ChatGPT (status, prompt) and bridge (detected/ran metadata) | work queue |
| `agentFiles/tasksRes.json` | bridge only | command output |
| `agentFiles/bridge.mjs` | daemon | watches, executes, publishes |
| `agentFiles/cli.mjs` | human / OpenCode | queue and mark prompts by hand |
| `agentFiles/lib.mjs` | shared code | git, safety, redaction helpers |

## Running the bridge

```bash
npm run bridge          # foreground, polls every 3s
npm run bridge:once     # process whatever is pending, then exit
```

Environment switches:

| Variable | Default | Effect |
| --- | --- | --- |
| `BRIDGE_POLL_MS` | `3000` | poll interval |
| `BRIDGE_TIMEOUT_MS` | `300000` | per-command timeout |
| `BRIDGE_MAX_OUTPUT` | `20000` | bytes kept per stream |
| `BRIDGE_SYNC` | `1` | `git pull --rebase` before each poll |
| `BRIDGE_PUSH` | `1` | commit + push every state change |
| `BRIDGE_ALLOW_UNSAFE` | `0` | disable the command deny list |
| `BRIDGE_REPO` | repo root | workspace to run commands in |

## What the daemon does each poll

1. `git pull --rebase --autostash` so ChatGPT's queue edits are visible.
2. Re-arm any prompt stuck at `detected` with no result (crash recovery).
3. Take the oldest `pending` prompt with no result for that serial.
4. Write `detected` + `detectedAt`, commit, push (fast feedback for ChatGPT).
5. Extract the command, check it against the safety list, run it with `cwd` = repo root.
6. Append a result to `tasksRes.json`, set the prompt to `ran (<iteration>)`, commit, push.

It never re-runs a serial that already has a result, and never touches a prompt ChatGPT has
marked `passed` or `failed`.

## Manual operation

```bash
npm run prompt -- "run the command npm test in terminal"
npm run prompt -- "run the command ls -la in terminal" --no-push
npm run mark -- CT-20261119-1032-01 passed
npm run mark -- CT-20261119-1032-01 failed --note "tests failed" \
  --next "run the command npm test -- --reporter=verbose in terminal"
npm run bridge:status
```

## Rules for OpenCode as an agent

- Claims about terminal output must come from `tasksRes.json`, not memory.
- Do not rewrite ChatGPT's `prompt` text, `serial`, or `iteration`. Only the bridge writes
  `detected`, `detectedAt`, `ranAt`, `exitCode`, and `status: ran (n)`.
- Do not edit `tasksRes.json` by hand. To re-run, queue a new serial with `retryOf` and
  `iteration + 1`.
- Keep commands inside this repo unless the prompt explicitly needs otherwise.
- Never disable the safety list or enable force-push to satisfy a prompt. Refuse and report.
- `agentFiles` and `tasksRes.json` are public. Output is redacted for common credential
  shapes, but that is a backstop, not permission to print secrets. Prefer commands that do
  not read `.env`, keychains, or `~/.ssh`.
- Preserve valid JSON in both files; write atomically (the helpers already do).

## Schemas

`prompts.json`

```json
{
  "prompts": [
    {
      "serial": "CT-20261119-1032-01",
      "status": "pending | detected | ran (1) | passed | failed",
      "iteration": 1,
      "prompt": "run the command ls -la in terminal",
      "createdAt": "2026-11-19T10:32:00.000Z",
      "retryOf": null,
      "detectedAt": null,
      "ranAt": null,
      "exitCode": null
    }
  ]
}
```

`tasksRes.json`

```json
{
  "results": [
    {
      "serial": "CT-20261119-1032-01",
      "iteration": 1,
      "tag": "first output | retry output",
      "command": "ls -la",
      "cwd": "/Users/madhavtrivedi/corporatetragedy",
      "ranAt": "2026-11-19T10:32:04.000Z",
      "exitCode": 0,
      "signal": null,
      "timedOut": false,
      "truncated": false,
      "durationMs": 42,
      "passed": true,
      "stdout": "...",
      "stderr": "..."
    }
  ]
}
```
