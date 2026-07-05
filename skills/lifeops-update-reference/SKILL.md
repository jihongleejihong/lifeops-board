---
name: lifeops-update-reference
description: Update LifeOps glossary, operating policy, scheduling rules, long-term tracks, and other reference Markdown used by LifeOps skills. Use when the user provides new policy notes, glossary terms, preference changes, or reference examples that should guide future event registration, task registration, rebalancing, or insight generation.
---

# LifeOps Update Reference

## Workflow

1. Read `../lifeops-board/references/lifeops-glossary-policy.md`.
2. Read any user-provided reference files or notes.
3. Patch the shared reference instead of scattering rules across individual skills:

```text
skills/lifeops-board/references/lifeops-glossary-policy.md
```

4. Preserve existing policy unless the user clearly replaces it.
5. Add a dated changelog line for every durable reference update.
6. If a reference change affects rendering or scheduling behavior, update the relevant CLI/template code or skill instructions in the same pass.

## Editing Rules

- Keep the reference short enough to load during routine LifeOps work.
- Use concrete terms the user actually uses.
- Separate facts, preferences, scheduling rules, and long-term tracks.
- Avoid turning tentative observations into hard rules unless the user confirms them.
- Put connector guidance, such as when to consult Google Calendar, in the shared reference so all LifeOps skills inherit the same rule.
