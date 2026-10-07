# Implementation plan: 002-add-due-dates

The change is small: one derived label on existing task rows (see [03-architecture.md](03-architecture.md)). It is split into two milestones so that the behaviour and its accessible presentation can each be reviewed on their own. This is an existing project, so there is no walking skeleton; `main` is green (see [01-codebase-analysis.md](01-codebase-analysis.md)).

## Milestones

### M1: Overdue label
- **Goal:** Active tasks with a past due date show an "Overdue" label, computed from today's local date, and the label follows completion and due-date edits.
- **Delivers:** REQ-022, REQ-023, REQ-024, REQ-025.
- **Demonstrable when done:** With the browser clock fixed to a known date, add tasks due yesterday, today and tomorrow, plus one with no due date: only the one due yesterday shows "Overdue". Completing it removes the label; reopening it shows the label again; changing its due date to tomorrow removes the label at once.

### M2: Overdue styling and accessibility
- **Goal:** The label is visually distinct, meets colour-contrast rules, and is read with its task by assistive technology.
- **Delivers:** REQ-026.
- **Demonstrable when done:** The axe audit passes with an overdue task present in the Active view and an overdue-dated completed task in the Completed view, and the label is part of the task row's text for screen readers.

## Dependencies
- M1 → M2: M2 styles and audits the label that M1 adds.
- Within M1: `domain/task` (`localDate`, `isOverdue`) → `app/controller` (`AppState.today`) → `ui/render` (label). These ship together in one story, because the label is the only observable result.

## Testing approach
- **Unit (Vitest, part of `npm test`):** `localDate` for a fixed `Date` near local midnight; `isOverdue` for yesterday, today, tomorrow, no due date and completed tasks; the controller puts `today` in every rendered state; `render` shows the label only when `isOverdue` is true and shows none when `today` is absent.
- **End-to-end (Playwright, part of `npm test`):** fix "today" with Playwright's clock API (`page.clock.setFixedTime` or `page.clock.install`), so the tests do not depend on the real date. Cover REQ-022 to REQ-025 through the UI, and REQ-026 with the existing `@axe-core/playwright` audit.
- **Gates:** `npm run build`, `npm run typecheck` and `npm test` from `.factory/config.json`. `commands.lint` is `null`, so the lint gate is skipped and each PR says so (rule H4).
- **Regression:** the full existing suite (107 unit, 65 e2e at baseline) must keep passing; see "Unchanged behaviour to protect" in `02-requirements.md`.

## Requirement coverage
| Requirement | Milestone |
|---|---|
| REQ-022 | M1 |
| REQ-023 | M1 |
| REQ-024 | M1 |
| REQ-025 | M1 |
| REQ-026 | M2 |

## Risks
- **Tests that depend on the real date.** Several existing e2e tests create tasks with fixed dates in 2026 (for example `2026-05-05` in `accessibility.spec.ts`, and `2026-10-01` to `2026-10-05` elsewhere), which are already in the past or will soon be. Those rows will start showing "Overdue". Mitigation: the label is a separate `<span>`, so `.task-due` and `.task-title` assertions are unaffected. New tests fix the clock. Any existing assertion that breaks is updated and explained in the PR (rule H3), never weakened.
- **Time-zone off-by-one.** Using `toISOString()` (UTC) for today would mark tasks due today as overdue in the evening in time zones behind UTC, or miss overdue ones ahead of it. Mitigation: `localDate` uses local date parts, with unit tests on dates near midnight.
- **Contrast failures.** A red label on white can fail WCAG AA. Mitigation: M2 runs axe (with colour-contrast) on rows that have the label; the text, not the colour, carries the meaning.
- **Latency (REQ-019).** One string comparison per row adds negligible work; the existing 500-task latency test guards it.
