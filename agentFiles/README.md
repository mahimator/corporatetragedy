# Terminal bridge

ChatGPT Web cannot reach this machine, but it can read and write GitHub. So GitHub is the
wire: ChatGPT queues commands in `prompts.json`, a local daemon runs them, and results land
in `tasksRes.json` where ChatGPT reads them.

```
ChatGPT Web ──PUT prompts.json──▶ github.com/mahimator/corporatetragedy (main)
                                          │
                                   git pull │ git push
                                          ▼
                              bridge.mjs on this Mac
                                          │
                                    zsh in repo root
```

## 1. Start the daemon

```bash
cd ~/corporatetragedy
npm install            # only needed for the Electron app, not the bridge
npm run bridge         # leave running; Ctrl-C to stop
```

Keep it alive across terminal closes:

```bash
nohup npm run bridge >/dev/null 2>&1 &
# or
tmux new -s bridge 'npm run bridge'
```

One-shot mode for debugging: `npm run bridge:once`.

## 2. Give ChatGPT write access

1. GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token.
2. Repository access: **Only select repositories** → `mahimator/corporatetragedy`.
3. Permissions: **Contents: Read and write**. Nothing else.
4. Paste the token into the ChatGPT conversation, plus the text of
   [`instructionsChatGPT.md`](./instructionsChatGPT.md) as a Project/Custom GPT instruction.

At minimum ChatGPT needs to know: it reads `agentFiles/prompts.json`, writes only
`prompts.json`, never `tasksRes.json`, and only trusts results that carry its serial.

## 3. The loop

1. You ask ChatGPT for something that needs a shell.
2. It appends a `pending` entry to `prompts.json` (`serial`, `iteration`, `prompt`).
3. The bridge pulls, marks `detected`, commits, pushes.
4. The bridge runs the command and writes `tasksRes.json` with `tag: "first output"`,
   then sets the prompt to `ran (1)` and pushes.
5. ChatGPT reads the result, marks `passed`, or marks `failed` and queues iteration 2 with
   `retryOf` pointing at the failed serial.

## 4. Doing it by hand

```bash
npm run prompt -- "run the command git status in terminal"
npm run bridge:status
npm run mark -- CT-20261119-1032-01 passed
npm run mark -- CT-20261119-1032-01 failed --next "run the command npm test in terminal"
```

`npm run prompt` prints a JSON block you can paste into ChatGPT when it cannot write to
GitHub itself.

## Safety rails

- Commands run in the repo root with a 5-minute timeout and 20 KB captured per stream.
- `sudo`, shutdown/disk tools, `rm -rf /|~`, force-push, hard reset, and fork bombs are refused
  (`BRIDGE_ALLOW_UNSAFE=1` overrides — don't).
- Obvious credential shapes (`sk-`, `ghp_`, `github_pat_`, `AKIA`, bearer tokens, PEM keys)
  are replaced with `[REDACTED]` before writing.
- Results are committed to a **public** repo. Assume anything printed is permanent and public.
  Never queue commands that read `.env`, `~/.ssh`, keychains, or browser profiles.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Prompt stays `pending` | daemon not running, or `git pull` failing: `npm run bridge:once`, check `agentFiles/.bridge.log` |
| Prompt stuck `detected` | bridge was killed mid-run; restart it, stale entries are re-armed |
| `push failed` in log | credentials: `gh auth status`, `git push` manually once |
| ChatGPT sees old results | raw URLs are CDN-cached; use the Contents API with `?ref=main` |
| ChatGPT `409` on write | bridge committed first; re-GET the `sha` and retry |
| Both edited `prompts.json` | bridge pulls with `--rebase --autostash`; re-read before every write |
