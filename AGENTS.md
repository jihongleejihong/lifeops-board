# LifeOps Board

Use this repository's Node CLI to maintain the user's LifeOps board.

## Commands

- Initialize or refresh template: `node scripts/lifeops-board.mjs init --root "<iCloud path>" --template "$(pwd)/assets/templates/lifeop-board.html"`
- Add item: `node scripts/lifeops-board.mjs add --root "<iCloud path>" --item-json '<json>'`
- Update item: `node scripts/lifeops-board.mjs update --root "<iCloud path>" --id <id> --item-json '<json>'`
- Remove item: `node scripts/lifeops-board.mjs remove --root "<iCloud path>" --id <id>`
- Rebalance flexible tasks: `node scripts/lifeops-board.mjs rebalance --root "<iCloud path>" --week YYYY-MM-DD`
- Render: `node scripts/lifeops-board.mjs render --root "<iCloud path>"`

Ask before saving when a fixed-time schedule lacks a clear title, date, or start time. After every write, make sure `output/latest.html` is regenerated.
Before initialization, check the current GitHub remote for newer `assets/templates/lifeop-board.html`, `scripts/lifeops-board.mjs`, or `skills/lifeops-board` changes. Fast-forward only when the worktree is clean; otherwise report the remote template update instead of overwriting local work.

The runtime root contains `schedule.json`, `config.json`, `template/lifeop-board.html`, `output/latest.html`, date-stamped output HTML, and date snapshots.
