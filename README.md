# LifeOps Board

LifeOps Board is a Codex plugin and Claude-compatible CLI for turning schedule conversations into an iCloud-backed `schedule.json` and a static HTML weekly board.

The main file to open on iPhone is:

```text
<your iCloud root>/output/latest.html
```

The renderer pre-fills the HTML body, so iPhone Files / Quick Look can show the board even when JavaScript is not executed.

## Requirements

- Node.js 18 or newer
- No npm install required

## Quick Start

```bash
node scripts/lifeops-board.mjs init --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board"

node scripts/lifeops-board.mjs add \
  --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board" \
  --item-json '{"id":"evt_20260707_meeting","title":"상담 미팅","type":"event","dimension":"일정","status":"대기","importance":"중","start":"2026-07-07T13:00:00+09:00","end":"2026-07-07T14:00:00+09:00","source_text":"상담 미팅"}'
```

## Runtime Layout

```text
config.json
schedule.json
template/lifeop-board.html
output/latest.html
output/YYYY-MM-DD.html
snapshots/YYYY-MM-DD.json
```

## CLI

```bash
node scripts/lifeops-board.mjs --help
node scripts/lifeops-board.mjs init --root "<iCloud path>"
node scripts/lifeops-board.mjs add --root "<iCloud path>" --item-json '<json>'
node scripts/lifeops-board.mjs update --root "<iCloud path>" --id <id> --item-json '<json>'
node scripts/lifeops-board.mjs remove --root "<iCloud path>" --id <id>
node scripts/lifeops-board.mjs rebalance --root "<iCloud path>" --week YYYY-MM-DD
node scripts/lifeops-board.mjs render --root "<iCloud path>"
```

## Codex

This repository is a Codex plugin. The plugin exposes the `lifeops-board` skill under `skills/`.

Install it from GitHub as a Codex marketplace source:

```bash
codex plugin marketplace add jihongleejihong/lifeops-board --ref main
codex plugin add lifeops-board@lifeops-board
```

Update an existing installation:

```bash
codex plugin marketplace upgrade lifeops-board
codex plugin add lifeops-board@lifeops-board
```

Verify the marketplace and plugin:

```bash
codex plugin marketplace list
codex plugin list
```

After installation or update, start a new Codex thread and ask Codex to use `@lifeops-board`.
Focused skills are also available for event registration, backlog task capture, flexible-task rebalancing, insight generation, and reference updates.

## Claude

Claude Code can install the plugin from the same GitHub marketplace.

```bash
claude plugin marketplace add https://github.com/jihongleejihong/lifeops-board.git
claude plugin install lifeops-board@lifeops-board
```

If GitHub shorthand is supported in your Claude Code version, this also works:

```bash
claude plugin marketplace add jihongleejihong/lifeops-board
claude plugin install lifeops-board@lifeops-board
```

Update an existing installation:

```bash
claude plugin marketplace update lifeops-board
claude plugin update lifeops-board@lifeops-board
```

Verify the marketplace and plugin:

```bash
claude plugin marketplace list
claude plugin list
```

After installation or update, start a new Claude Code session and ask Claude to use `lifeops-board`. Claude can also use the repository by reading `CLAUDE.md` and running the Node CLI directly.

## Skills

| Skill | Trigger |
|---|---|
| `lifeops-board` | Initialize the root, register any schedule item, or render the board. General-purpose entry point. |
| `lifeops-add-event` | Add a fixed-time appointment, meeting, class, or travel block to `schedule.json`. Automatically rebalances the affected week. |
| `lifeops-add-task` | Capture a backlog task, routine, or behavior-change goal without assigning an exact time. |
| `lifeops-rebalance-flex` | Re-fit unscheduled flexible tasks into remaining open prime slots after events or deadlines change. |
| `lifeops-generate-insights` | Diagnose the week: capacity risks, hard deadlines, best next action, recovery gaps. |
| `lifeops-update-reference` | Edit the shared glossary and policy file (`skills/lifeops-board/references/lifeops-glossary-policy.md`) that all skills read. |
