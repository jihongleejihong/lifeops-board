---
name: lifeops-add-task
description: Register unscheduled LifeOps backlog tasks, first actions, routines, and behavior-change goals into schedule.json without assigning an exact time. Use when the user captures a task, todo, long-term track action, routine, or behavior-change item that should be saved but not yet fixed on the calendar.
---

# LifeOps Add Task

## Workflow

1. Read the shared reference at repository path `skills/lifeops-board/references/lifeops-glossary-policy.md` (from this skill folder, `../lifeops-board/references/lifeops-glossary-policy.md`).
2. Decide the item type:
   - `task` for single-action work.
   - `routine` for recurring habits.
   - `behavior_change` for long-running behavior experiments.
3. Preserve the user's Korean wording in `title`, `notes`, and `source_text`.
4. Do not invent `date`, `start`, `end`, or `deadline`. Use them only when the user clearly gives them.
5. Run:

```bash
node scripts/lifeops-board.mjs add --root "<iCloud path>" --item-json '<json>'
```

6. If the user asks to place it this week, invoke the `lifeops-rebalance-flex` skill or run the rebalance command directly.
7. Report the item id and `output/latest.html`.

## Item Shape

For a pure backlog task:

```json
{
  "id": "task_20260705_prepare_materials",
  "title": "자료 정리 첫 단계",
  "type": "task",
  "dimension": "개인할일",
  "status": "대기",
  "importance": "중",
  "estimate": "2h",
  "source_text": "자료 정리 첫 단계"
}
```

For behavior-change goals, use softer wording and store the first observable action when available.
