# OpenCode terminal bridge instructions

These instructions are for OpenCode only.

Watch `prompts.json` for newly created prompts with status `pending`. When one appears:
1. Mark it `detected`.
2. Execute its command in the local terminal in the repository workspace.
3. Capture the command, exit code, stdout, and stderr.
4. Append the result to `tasksRes.json` with the prompt serial and iteration number, and tag the result `first output` on the first attempt.
5. Update the prompt status to `ran (int 1)` (or the appropriate iteration number).
6. Do not run prompts already completed unless ChatGPT explicitly creates a new iteration.
7. Do not run destructive commands, commands requiring elevated permissions, or commands that access secrets unless the prompt explicitly asks and the user has approved.

Use the working repository root as the terminal directory. Preserve valid JSON when updating either file.