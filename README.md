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
  --item-json '{"id":"evt_20260707_ringle","title":"링글 수업","type":"event","dimension":"일정","status":"대기","importance":"중","start":"2026-07-07T13:00:00+09:00","end":"2026-07-07T14:00:00+09:00","source_text":"링글 수업"}'
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
node scripts/lifeops-board.mjs render --root "<iCloud path>"
```

## Codex

This repository is a Codex plugin. The plugin exposes the `lifeops-board` skill under `skills/`.

Install it from GitHub as a Codex marketplace source:

```bash
codex plugin marketplace add jihongleejihong/lifeops-board --ref main
codex plugin add lifeops-board@lifeops-board
```

After installation, start a new Codex thread and ask Codex to use `@lifeops-board`.

## Claude

Claude can use the same repository by reading `CLAUDE.md` and running the Node CLI.
