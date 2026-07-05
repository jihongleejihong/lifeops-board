---
name: lifeops-board
description: Initialize an iCloud-backed LifeOps schedule root, interpret conversational schedules into schedule.json, and render static output/latest.html and output/YYYY-MM-DD.html from a bundled lifeop-board.html template. Use when the user wants to register schedules, tasks, routines, behavior-change goals, or maintain an iPhone-readable local HTML LifeOps board.
---

# LifeOps Board

## Workflow

Use this skill when the user wants schedule conversation saved into a static LifeOps HTML board.

1. Read the shared reference at repository path `skills/lifeops-board/references/lifeops-glossary-policy.md` (from this skill folder, `references/lifeops-glossary-policy.md`).
2. Confirm the LifeOps root path if it has not been initialized.
3. When initializing or re-initializing a root, check whether the current GitHub remote has newer template/renderer files before running `init`; see "Initialization Template Refresh".
4. Route focused work to the narrower skill when possible:
   - Invoke the `lifeops-add-event` skill for fixed schedules and appointments.
   - Invoke the `lifeops-add-task` skill for unscheduled backlog capture.
   - Invoke the `lifeops-rebalance-flex` skill for flexible task redistribution.
   - Invoke the `lifeops-generate-insights` skill for tips and board diagnosis.
   - Invoke the `lifeops-update-reference` skill for glossary/policy/reference edits.
5. If handling directly, interpret the user's schedule into a `schedule.json.items[]` object.
6. If title, date, or start time is ambiguous for a fixed-time event, ask before saving.
7. Run `node scripts/lifeops-board.mjs add --root <path> --item-json '<json>'`.
8. Rebalance the affected week after fixed events or urgent tasks.
9. Report the item id and `output/latest.html`.

## Initialization Template Refresh

Before `init`, check whether the GitHub remote has template or renderer updates:

```bash
git remote get-url origin
git fetch --quiet origin
git diff --name-only HEAD..@{u} -- assets/templates/lifeop-board.html scripts/lifeops-board.mjs skills/lifeops-board
```

If the branch has no upstream, compare against `origin/main` instead of `@{u}`.

- If relevant files changed upstream and the worktree is clean, run `git pull --ff-only` before initializing.
- If the worktree is dirty, ahead, or the pull is not fast-forwardable, do not overwrite local work. Report that remote template updates exist and ask the user how to proceed.
- Always initialize or reinitialize with the bundled template path so the runtime root's `template/lifeop-board.html` is refreshed:

```bash
node scripts/lifeops-board.mjs init \
  --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board" \
  --template "$(pwd)/assets/templates/lifeop-board.html"
```

## Commands

Initialize a root:

```bash
node scripts/lifeops-board.mjs init \
  --root "$HOME/Library/Mobile Documents/com~apple~CloudDocs/lifeops-board" \
  --template "$(pwd)/assets/templates/lifeop-board.html"
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
