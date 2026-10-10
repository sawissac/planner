# Planner skills

Agent skills that work on Planner tasks through the Plan API
(`src/app/api/plan/**`): read a task's thought (the plan), carry it out, solve
open **Bug**/**Fix** sections in a comment, and post the result back as a
comment.

| Folder                                              | Platform                          | Can edit your repo | Reaches `localhost`                                          |
| --------------------------------------------------- | --------------------------------- | ------------------ | ------------------------------------------------------------ |
| [planner-for-claude-code](planner-for-claude-code/) | Claude Code                       | yes                | yes                                                          |
| [planner-for-cursor](planner-for-cursor/)           | Cursor (Agent)                    | yes                | yes                                                          |
| [planner-for-chatgpt](planner-for-chatgpt/)         | ChatGPT (custom GPT with Actions) | no                 | no, needs a public HTTPS URL                                 |
| [planner-for-gemini](planner-for-gemini/)           | Gemini (AI Studio, or `run.mjs`)  | no                 | `run.mjs` yes; the AI Studio playground runs no calls itself |

ChatGPT and Gemini can't touch your files, so for coding plans they write the
code in the chat and say in their comment that it still has to be applied.

## API key

Every platform authenticates with a Plan API key (`pln_…`) from Planner →
**Settings → API keys**. The key acts as you until you revoke it.

- Claude Code, Cursor and `run.mjs` read it from `.claude/planner-token`
  (git-ignored, mode 600). Save it there without pasting it anywhere: press
  **Copy key for CLI**, then run
  `.claude/skills/planner-for-claude-code/scripts/planner.sh login --clipboard`
  (or the Cursor copy of the script), or type "login planner" to the agent.
- ChatGPT keeps it in the GPT's action settings.

Never commit a key or paste it into a chat. If one leaks, revoke it.

## Install

### Claude Code

```bash
mkdir -p .claude/skills
cp -R skills/planner-for-claude-code .claude/skills/
```

Then paste a **Copy context** curl into Claude Code. See
[SKILL.md](planner-for-claude-code/SKILL.md).

### Cursor, ChatGPT, Gemini

See each folder's README.

## Keeping copies in step

`planner-for-claude-code/scripts/planner.sh` and
`planner-for-cursor/scripts/planner.sh` are the same file, and the ChatGPT and
Gemini instructions describe the same workflow as `SKILL.md`. When the Plan API
or the workflow changes, update all four:

```bash
diff skills/planner-for-claude-code/scripts/planner.sh skills/planner-for-cursor/scripts/planner.sh
```
