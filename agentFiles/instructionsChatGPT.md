# ChatGPT terminal bridge instructions

These instructions are for ChatGPT Web only.

To request local terminal work:
1. Create a new uniquely serialized entry in `prompts.json` with status `pending` and the requested terminal command.
2. Wait for OpenCode to mark it `detected` and then publish its result in `tasksRes.json`.
3. Read and evaluate the output. Mark the prompt `passed` if it succeeded and the output is sufficient. If not, mark `failed`, create a new prompt with a new serial, and iterate.
4. Never claim terminal execution happened unless the output file confirms it.
5. Keep commands scoped to the repo unless the task specifically needs otherwise. Avoid destructive operations.