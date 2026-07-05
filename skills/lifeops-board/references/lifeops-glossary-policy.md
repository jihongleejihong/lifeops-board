# LifeOps Glossary and Operating Policy

> Source-of-truth reference for LifeOps Board agents. Update this file when the user's schedule vocabulary, operating rules, or long-term tracks change.

## Glossary

- Principal: the user. The agent acts as chief of staff, not as the decision owner.
- Fixed event: A commitment with a clear date and start time, such as a meeting, class, appointment, travel block, or ceremony. Store as `type:"event"` with `start` and usually `end`.
- Unscheduled task: A backlog item with no `date`, `start`, or `end`. Store as `type:"task"` or `type:"behavior_change"` without a date.
- Flexible task: A task with a date but no exact start time. The board may soft-place it into open prime slots at render time.
- Open prime: A usable deep-work block. Current board rule: starts before or at 19:00 and is at least 2.5 hours before flexible placement.
- Tired/buffer time: Short or late leftover time. Use for recovery, meals, admin, cleanup, or reflection. Do not display it as a board block.
- Hard deadline: A deadline that should beat condition/capacity in priority, but still frame nudges as a small negotiation.
- Soft deadline: A preferred timing target. Move it when the week becomes too tight.
- First action: The smallest next step for a long-term track, usually 30-90 minutes.

## Dimensions

Use dimensions consistently. Prefer the user's existing dimension names; common examples are:

- 업무: workload, meetings, project archive, work deliverables.
- 일정: fixed commitments and appointments.
- 개인할일: study, applications, personal admin.
- 장기프로젝트: applications, research, portfolio, or other multi-week tracks.
- 커리어: job search, interviews, networking, work archive for career capital.
- 운동: running, gym, movement.
- 수면: bedtime and wake-up protection.
- 식사: meal timing and energy management.
- 멘탈: journaling, weekly review, recovery, emotional load.
- 관계: family, friends, and social commitments.

## Item Types

- `event`: fixed-time schedule. Ask before saving if title, date, or start time is unclear.
- `task`: single-action or project task. If no date is given, keep it unscheduled.
- `routine`: recurring habit. Track gently; do not overload prime unless the user asks.
- `behavior_change`: long-running behavior-change goal. Keep tone soft; use experiments and pattern tracking, not pressure.

## Scheduling Policy

1. Save everything, but show one clean board.
2. Put fixed events on the grid. Use a default 1-hour duration only when the end time is unknown.
3. Keep fixed templates such as running, commute, work, and WFH as availability constraints, not visible board blocks.
4. After fixed events are saved, recalculate open prime and soft-place flexible tasks into those slots.
5. Rebalance existing flexible tasks when a new fixed event or urgent task changes prime capacity.
6. Sort flexible work by: `오늘` status, hard deadline, earliest deadline, importance, original order.
7. Morning and long prime blocks are for the most important deep work. Avoid admin in morning prime.
8. Keep at least one empty evening block of 2.5h+ per week when possible.
9. Do not treat tired/buffer time as productive capacity. Use it for recovery, meals, admin, cleanup, or light reflection.
10. If flexible work does not fit, suggest deferring, splitting into a first action, or negotiating scope.
11. If the user asks to import, reconcile, or verify real calendar commitments, use Google Calendar with a bounded date range before saving or diagnosing events.

## Nudge and Tone Policy

- Default tone: soft encouragement, low pressure, small start.
- Overload day: only one hard-deadline nudge; carry the rest silently.
- Normal day: today's one thing plus 1-2 core nudges.
- Light day: today's one thing plus optional extra suggestions.
- Behavior-change items: never guilt or force. Suggest observation, a small experiment, or a replacement recovery route.

## Long-Term Tracks

Convert long-term tracks into first actions before scheduling them.

- Archive or portfolio tracks: schedule the structure/design step before content-filling.
- Application or exam tracks: convert broad milestones into dated first actions and hard/soft deadlines.
- Career tracks: maintain recurring momentum without crowding out current-week hard deadlines.
- Relationship or family tracks: convert to fixed events once dates are known.
- Meal, recovery, or behavior-change tracks: observe triggers first, then suggest small experiments.
- Morning routine tracks: check time math before treating a target arrival time as realistic.
- Mental health tracks: keep journaling and weekly review as maintenance, not pressure tasks.

## Insight Policy

Generate board tips from current schedule facts:

- Call out flexible tasks that do not fit into prime.
- Warn when hard deadlines exceed available prime.
- Suggest the best use of remaining prime, especially morning or one long evening block.
- Flag more than two weekly appointments as a coordination risk.
- Flag absence of a 2.5h+ empty evening as a recovery risk.
- Prefer one concrete next action over broad advice.
- When calendar reality is uncertain and the user permits lookup, inspect Google Calendar for the relevant bounded period instead of guessing.

## Changelog

- 2026-07-05: Added optional Google Calendar verification/import policy for bounded schedule lookup.
- 2026-07-05: Sanitized bundled reference to remove private example details while preserving reusable operating rules.
- 2026-07-05: Created shared glossary/policy reference from operating policy and long-term track patterns.
