---
name: lifeops-add-event
description: Register fixed-time LifeOps schedules, appointments, meetings, classes, travel blocks, and commitments into schedule.json. Use when the user gives a schedule with a clear or inferable date and start time, or asks to add an appointment/event to the LifeOps board.
---

# LifeOps Add Event

## Workflow

1. Read the shared reference at repository path `skills/lifeops-board/references/lifeops-glossary-policy.md` (from this skill folder, `../lifeops-board/references/lifeops-glossary-policy.md`).
2. Interpret relative dates using the current date and `Asia/Seoul`.
3. If the user asks to import, reconcile, or verify existing calendar commitments, use Google Calendar with a bounded window before writing.
4. Ask before saving if title, date, or start time is unclear after any available lookup.
5. Create a stable `event` item id such as `evt_YYYYMMDD_slug`.
6. Run:

```bash
node scripts/lifeops-board.mjs add --root "<iCloud path>" --item-json '<json>'
```

7. Rebalance the affected week because new fixed events change open prime:

```bash
node scripts/lifeops-board.mjs rebalance --root "<iCloud path>" --week YYYY-MM-DD
```

8. Report the item id, any unplaced flexible-task count from rebalance, and `output/latest.html`.

## Item Shape

Use `type:"event"` and include timezone offsets:

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

If the end time is not given, omit `end`; the board uses a 1-hour display default.
