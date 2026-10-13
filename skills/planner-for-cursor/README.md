# Planner for Cursor

A Cursor project rule ([planner.mdc](planner.mdc)) plus the same
`planner.sh` client the Claude Code skill uses. Cursor's Agent runs the script
in its terminal, edits your repo to carry out the plan, shows its progress
live under the task's comments (as "Cursor"), and posts the result back to the
task.

## Install

From the repo root:

```bash
mkdir -p .cursor/rules .cursor/skills/planner-for-cursor/scripts
cp skills/planner-for-cursor/planner.mdc .cursor/rules/planner.mdc
cp skills/planner-for-cursor/scripts/planner.sh .cursor/skills/planner-for-cursor/scripts/
chmod +x .cursor/skills/planner-for-cursor/scripts/planner.sh
```

The script must sit exactly at `.cursor/skills/planner-for-cursor/scripts/`:
it finds the repo root four folders up, and the `.cursor/` in its path makes it
report progress as "Cursor" (set `PLANNER_AGENT` to change that). It needs
`bash`, `curl` and `jq`.

## Key

The script reads the key from the repo's `.claude/planner-token`. That path
must be git-ignored (this repo ignores `.claude`); `login` refuses to write a
key to a tracked file. To share the key the global Claude Code skill uses, set
`PLANNER_TOKEN_FILE=~/.claude/planner-token`.

1. Planner → Settings → API keys → **Copy key for CLI**.
2. Tell the Agent "login planner", or run
   `.cursor/skills/planner-for-cursor/scripts/planner.sh login --clipboard`.

## Use

Start the app (`pnpm dev`), press **Copy context** on a task or comment in
Planner, and paste the link into Cursor's Agent chat. The rule is "Agent
Requested", so the Agent loads it when the request matches its description;
mention `@planner` to attach it by hand.
