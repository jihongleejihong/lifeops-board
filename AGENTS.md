# LifeOps Board

Use this repository's Node CLI to maintain the user's LifeOps board.

## Commands

- Initialize: `node scripts/lifeops-board.mjs init --root "<iCloud path>"`
- Add item: `node scripts/lifeops-board.mjs add --root "<iCloud path>" --item-json '<json>'`
- Update item: `node scripts/lifeops-board.mjs update --root "<iCloud path>" --id <id> --item-json '<json>'`
- Remove item: `node scripts/lifeops-board.mjs remove --root "<iCloud path>" --id <id>`
- Rebalance flexible tasks: `node scripts/lifeops-board.mjs rebalance --root "<iCloud path>" --week YYYY-MM-DD`
- Render: `node scripts/lifeops-board.mjs render --root "<iCloud path>"`

Ask before saving when a fixed-time schedule lacks a clear title, date, or start time. After every write, make sure `output/latest.html` is regenerated.

The runtime root contains `schedule.json`, `config.json`, `template/lifeop-board.html`, `output/latest.html`, date-stamped output HTML, and date snapshots.
