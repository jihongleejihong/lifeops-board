---
name: lifeops-rebalance-flex
description: Rebalance LifeOps flexible tasks into open prime after events, deadlines, or task lists change. Use when the user asks to redistribute flexible tasks, place backlog into this week, respond to a new appointment, or refresh the board's soft plan around remaining prime capacity.
---

# LifeOps Rebalance Flex

## Workflow

1. Read `../lifeops-board/references/lifeops-glossary-policy.md`.
2. Identify the target week. Use the changed event/task date, the user's requested date, or the current week in `Asia/Seoul`.
3. Run the rebalance command:

```bash
node scripts/lifeops-board.mjs rebalance --root "<iCloud path>" --week YYYY-MM-DD
```

4. If the user explicitly asks to pull currently unscheduled backlog into the week, add:

```bash
--include-backlog true
```

Use `--include-backlog all` only when the user clearly wants the whole backlog considered.

5. Read the command output. Report placed count, date updates, unplaced count, and `output/latest.html`.

## Placement Rules

The CLI keeps fixed events as hard constraints, keeps fixed templates hidden but capacity-blocking, and soft-places flexible tasks into open prime. It sorts by `오늘`, hard deadline, earliest deadline, importance, and original order.

If items do not fit, suggest one of: defer, split into a 30-minute first action, reduce scope, or negotiate the deadline.
