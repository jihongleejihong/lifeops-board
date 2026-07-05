---
name: lifeops-board
description: Initialize an iCloud-backed LifeOps schedule root, interpret conversational schedules into schedule.json, and render static output/latest.html and output/YYYY-MM-DD.html from a bundled lifeop-board.html template. Use when the user wants to register schedules, tasks, routines, behavior-change goals, or maintain an iPhone-readable local HTML LifeOps board.
---

# LifeOps Board

## Workflow

Use this skill when the user wants schedule conversation saved into a static LifeOps HTML board.

1. Read `references/lifeops-glossary-policy.md`.
2. Confirm the LifeOps root path if it has not been initialized.
3. Route focused work to the narrower skill when possible:
   - `$lifeops-add-event` for fixed schedules and appointments.
   - `$lifeops-add-task` for unscheduled backlog capture.
   - `$lifeops-rebalance-flex` for flexible task redistribution.
   - `$lifeops-generate-insights` for tips and board diagnosis.
   - `$lifeops-update-reference` for glossary/policy/reference edits.
4. If handling directly, interpret the user's schedule into a `schedule.json.items[]` object.
5. If title, date, or start time is ambiguous for a fixed-time event, ask before saving.
6. Run `node scripts/lifeops-board.mjs add --root <path> --item-json '<json>'`.
7. Rebalance the affected week after fixed events or urgent tasks.
8. Report the item id and `output/latest.html`.

## Commands

Initialize a root:

```bash
node scripts/lifeops-board.mjs init --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board"
```

Add or replace an item by id:

```bash
node scripts/lifeops-board.mjs add \
  --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board" \
  --item-json '{"id":"evt_20260707_meeting","title":"상담 미팅","type":"event","dimension":"일정","status":"대기","importance":"중","start":"2026-07-07T13:00:00+09:00","end":"2026-07-07T14:00:00+09:00","source_text":"상담 미팅"}'
```

Update an item:

```bash
node scripts/lifeops-board.mjs update \
  --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board" \
  --id evt_20260707_ringle \
  --item-json '{"status":"완료"}'
```

Remove an item:

```bash
node scripts/lifeops-board.mjs remove \
  --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board" \
  --id evt_20260707_ringle
```

Rebalance flexible tasks for a week:

```bash
node scripts/lifeops-board.mjs rebalance \
  --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board" \
  --week 2026-07-07
```

Render after manual edits:

```bash
node scripts/lifeops-board.mjs render --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board"
```

## Data Model

`schedule.json` is the source of truth:

- `timezone`: default `Asia/Seoul`.
- `items[]`: events, tasks, routines, and behavior-change goals.
- `daily_logs[]`: daily load and condition records.

Use this item shape:

```json
{
  "id": "evt_20260707_meeting",
  "title": "상담 미팅",
  "type": "event",
  "dimension": "일정",
  "status": "대기",
  "importance": "중",
  "start": "2026-07-07T13:00:00+09:00",
  "end": "2026-07-07T14:00:00+09:00",
  "source_text": "상담 미팅"
}
```

Supported `type` values:

- `event`: fixed-time schedule item shown in the grid.
- `task`: task or backlog item.
- `routine`: recurring habit.
- `behavior_change`: long-running behavior-change goal.

Runtime root layout:

```text
config.json
schedule.json
template/lifeop-board.html
output/latest.html
output/YYYY-MM-DD.html
snapshots/YYYY-MM-DD.json
```

## Handling Conversation

- Interpret relative dates using the current date and `Asia/Seoul` unless the user says otherwise.
- Preserve Korean text exactly in `title`, `notes`, and `source_text`.
- Prefer stable ids such as `evt_YYYYMMDD_slug` for events.
- Fixed-time events require `start`; include `end` when known.
- Date-only tasks may use `date`; unscheduled backlog items may omit `date`, `start`, and `end`.
- Date-only flexible tasks are soft-placed into open prime during render/rebalance.
- For cancellation, prefer updating `status` unless the user explicitly asks to delete.
- After every write, render immediately so `output/latest.html` remains current.
