---
name: lifeops-generate-insights
description: Generate practical LifeOps board insights, weekly tips, risks, and next-action suggestions from schedule.json, flexible placement results, and the user's glossary/policy reference. Use when the user asks for board insights, planning tips, schedule diagnosis, or what to do next after a LifeOps update.
---

# LifeOps Generate Insights

## Workflow

1. Read the shared reference at repository path `skills/lifeops-board/references/lifeops-glossary-policy.md` (from this skill folder, `../lifeops-board/references/lifeops-glossary-policy.md`).
2. Inspect `schedule.json` and, when useful, render the board:

```bash
node scripts/lifeops-board.mjs render --root "<iCloud path>"
```

3. Base insights on facts from the board: fixed events, hard deadlines, remaining prime, unplaced flexible tasks, appointment count, and recovery gaps.
4. If the user asks to include real calendar reality or the board looks incomplete, use Google Calendar with a bounded date range before diagnosing conflicts or free time.
5. Keep tips concrete and small. Prefer one next action over broad advice.
6. Do not edit `schedule.json` unless the user explicitly asks.

## Output Shape

Return 2-4 concise bullets in Korean:

- A capacity or deadline risk.
- The best next action for remaining prime.
- A recovery or buffer warning when relevant.
- A reference-policy note when a long-term track or behavior-change rule applies.
