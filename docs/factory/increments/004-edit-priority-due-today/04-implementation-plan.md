# Implementation plan: 004-edit-priority-due-today

The change is small: one derived label on existing task rows, built the same way as the "Overdue" label of 002-add-due-dates, plus a refresh at local midnight so the labels change while the app stays open (see [03-architecture.md](03-architecture.md); revised after the Gate A feedback on PR #40). Editing a task's priority is already delivered by REQ-010 and needs no work. This is an existing project, so there is no walking skeleton; `main` is green (see [01-codebase-analysis.md](01-codebase-analysis.md)). The commands and conventions below are the ones recorded in [knowledge.md](../../knowledge.md).

## Milestones

### M1: "Due today" label, refreshed at midnight
- **Goal:** an active task whose due date is today's local date shows a "Due today" text label next to its due date, styled with AA contrast; completed tasks and tasks with any other date or none do not; the label follows due-date edits at once and turns into "Overdue" at local midnight while the app stays open.
- **Delivers:** REQ-037, REQ-038, REQ-039, REQ-040.
- **Demonstrable when done:** with the browser clock installed at a known date and time, add tasks due yesterday, today and tomorrow, plus one with no due date: only the one due today shows "Due today", and the one due yesterday still shows "Overdue". Completing the task due today removes the label, and reopening it shows it again. Changing its due date to tomorrow removes the label at once. Running the clock past midnight, with no user action, turns "Due today" into "Overdue". The axe audit passes with the label present.

## Dependencies
- Within M1: `domain/task` (`isDueToday`, `msUntilNextMidnight`) → `ui/render` (the label) and `app/controller` (the midnight timer) → `main.ts` (wires `setTimeout`) → `index.html` (the style). They ship together in one story, because the label and its refresh are one observable result.
- M1 depends on nothing outside this increment: `AppState.today` already exists (002-add-due-dates).

## Testing approach
- **Unit (Vitest, part of `npm test`):** `isDueToday` for yesterday, today, tomorrow, no due date, and a completed task due today; `msUntilNextMidnight` for times just after midnight, mid-day and just before midnight; the controller schedules a refresh at the next midnight when given `setTimer`, re-renders with the new `today` when it fires, schedules the next one, and schedules nothing without `setTimer`; `render` shows the label only for active tasks due today, after the due date, and none when `today` is absent.
- **End-to-end (Playwright, part of `npm test`):** install the browser clock with Playwright's clock API (`page.clock.install`) so the tests do not depend on the real date, and run it past midnight (`page.clock.runFor`) for REQ-039. Cover REQ-037, REQ-038 and REQ-040 through the UI, and the style with the existing `@axe-core/playwright` audit.
- **Gates:** `npm run build`, `npm run typecheck` and `npm test` from `.factory/config.json`. `commands.lint` is `null`, so the lint gate is skipped and the PR says so (rule H4).
- **Regression:** the full existing suite (158 unit, 89 e2e at baseline) must keep passing; see "Unchanged behaviour to protect" in `02-requirements.md`, in particular REQ-010 (`tests/e2e/edit-due-date-priority.spec.ts`) and REQ-022 to REQ-026 (`tests/e2e/overdue.spec.ts`).

## Requirement coverage
| Requirement | Milestone |
|---|---|
| REQ-037 | M1 |
| REQ-038 | M1 |
| REQ-039 | M1 |
| REQ-040 | M1 |

## Risks
- **Story size.** The midnight refresh adds the controller timer and its tests to the label, so the one story is estimated at 368 changed lines, close to `max_diff_lines` (400). Mitigation: the estimate is per file in `05-stories.md` and checked by `plan check`. If the work turns out much larger, the factory stops and asks (rule H6) rather than splitting it silently.
- **Existing tests with a task due on the fixed day.** An e2e test whose clock is fixed to a date on which it also creates an active task due that day (for example `#27 AC2` in `tests/e2e/overdue.spec.ts`, the REQ-023 case, which fixes today to 2026-10-07 and adds a task titled "Due today" due that day) will now also see "Due today" in that row; a lookup by the text "Due today" could then match both the title and the label. Mitigation: the label is a separate `<span>`, so `.task-due`, `.task-title` and `.task-overdue` assertions are unaffected, and new tests select the label by its class. Any existing assertion that breaks is updated and explained in the PR (rule H3), never weakened.
- **Timers in tests.** Specs that use `page.clock.setFixedTime` (`overdue.spec.ts`, `accessibility.spec.ts`, both at 10:00) keep timers on real time, so the midnight timer never fires during them. Specs on the real clock could see one extra re-render if run exactly at midnight; it changes only the labels, which those specs do not assert. Unit tests that create a controller without `setTimer` schedule nothing.
- **A timer that fires late or never** (the device sleeps, or the tab is throttled in the background). Mitigation: the refresh reads the real date from `now()`, and every user action still reads it too, so the labels are never wrong for longer than until the next refresh or action.
- **Daylight-saving days** are 23 or 25 hours long. Mitigation: `msUntilNextMidnight` builds the next midnight from local date parts, with unit tests.
- **Contrast failures.** Mitigation: the axe audit (with colour contrast) runs on a row that has the label; the text, not the colour, carries the meaning.
- **Latency (REQ-019).** One string comparison per row adds negligible work, and the midnight refresh is one render a day; the existing 500-task latency test guards it.
- **The cold-start Vitest worker timeout** seen once in 003 (knowledge base, Known risks) could make a first `npm test` fail for reasons unrelated to the change. Mitigation: a failure is investigated and reported, never retried away silently.
