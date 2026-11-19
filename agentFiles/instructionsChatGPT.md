# ChatGPT terminal bridge instructions

These instructions are for ChatGPT Web only, never for OpenCode. You have no shell. OpenCode
runs one on a Mac and publishes results to GitHub. The repository is the message bus.

- Repo: `mahimator/corporatetragedy`, branch `main`
- Queue: `agentFiles/prompts.json`
- Output: `agentFiles/tasksRes.json`

## Access

Reading needs no auth (public repo). Writing needs a fine-grained PAT with
**Contents: Read and write** on this repository only. The user pastes it once per conversation.
Treat it as a secret: never echo it, never put it in a file you commit, never send it anywhere else.

```
GITHUB_TOKEN=<token>
OWNER=mahimator
REPO=corporatetragedy
```

## The loop

1. **Read the queue and the results.**
2. If a prompt of yours is `pending` or `detected`, wait and re-read. Do not duplicate it.
3. If it is `ran (n)`, read its result entry by serial and iteration, then judge it.
4. **Write the verdict** (`passed` or `failed`) into `prompts.json`.
5. On `failed`, append a new prompt: fresh serial, `iteration` = previous + 1,
   `retryOf` = previous serial, and a command that addresses the failure.
6. Only `passed` authorises you to treat the command's output as real. Never state that
   something ran, passed, or was installed without a matching entry in `tasksRes.json`.

Serial format: `CT-YYYYMMDD-HHMM-NN` (local time, two random digits). Serials are unique
forever; never reuse or edit one.

Command phrasing: `run the command <command> in terminal`. One command per prompt. Prefer
non-interactive flags (`-y`, `--no-pager`, `CI=1`). No `sudo`, no force-push, no reading
secrets.

## Reading

Cache-safe read through the API:

```bash
curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" \
  "https://api.github.com/repos/$OWNER/$REPO/contents/agentFiles/prompts.json?ref=main"
```

That returns `content` (base64) and the `sha` you must supply when writing. Public raw reads
also work but the CDN can be minutes stale:

```
https://raw.githubusercontent.com/mahimator/corporatetragedy/main/agentFiles/tasksRes.json
```

Python equivalent used inside the sandbox:

```python
import base64, json, os, requests

API = "https://api.github.com/repos/mahimator/corporatetragedy/contents/agentFiles"
H = {"Authorization": f"Bearer {os.environ['GITHUB_TOKEN']}",
     "Accept": "application/vnd.github+json"}

def read(name):
    r = requests.get(f"{API}/{name}?ref=main", headers=H, timeout=30)
    r.raise_for_status()
    return json.loads(base64.b64decode(r.json()["content"])), r.json()["sha"]

def write(name, data, sha):
    body = {"message": f"chatgpt: update {name}",
            "content": base64.b64encode(json.dumps(data, indent=2).encode()).decode(),
            "sha": sha, "branch": "main"}
    r = requests.put(f"{API}/{name}", headers=H, json=body, timeout=30)
    r.raise_for_status()
```

## Writing the verdict

Get `sha` immediately before every write, and retry once on `409`/`422` by re-reading: the
bridge also commits to `prompts.json` while a command runs.

```python
prompts, sha = read("prompts.json")
entry = next(p for p in prompts["prompts"] if p["serial"] == serial)
entry["status"] = "passed"          # or "failed"
entry["markedAt"] = datetime.now(timezone.utc).isoformat()
entry["verdictNote"] = "short reason"
write("prompts.json", prompts, sha)
```

On failure, append the retry to the same array before writing:

```python
prompts["prompts"].append({
    "serial": "CT-20261119-1105-42",
    "status": "pending",
    "iteration": entry["iteration"] + 1,
    "retryOf": entry["serial"],
    "prompt": "run the command npm test -- --reporter=verbose in terminal",
    "createdAt": datetime.now(timezone.utc).isoformat(),
})
```

## Hard rules

- You may edit `prompts.json`. You must never edit `tasksRes.json`; it is bridge-only evidence.
- Never change `status` to `pending` on an already-run serial. Queue a new serial instead.
- Do not invent output, exit codes, or file contents. Quote `stdout`/`stderr` from the result.
- Do not ask for credentials to be printed. If a command needs one, ask the user to set it
  locally and have the prompt reference the env var only.
- This file and its results are in a public repo. Keep commands and notes free of personal
  data, and say so if the user asks for something that would leak it.
- If nothing is pending and the user has no task, do nothing; do not write to the queue to
  "check liveness".

## Result shape

```json
{
  "serial": "CT-20261119-1032-01",
  "iteration": 1,
  "tag": "first output",
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
```

Judge on `exitCode`, `timedOut`, `stderr`, and whether `stdout` answers the actual question.
`exitCode` 0 alone is not a pass when the output is empty or irrelevant.
