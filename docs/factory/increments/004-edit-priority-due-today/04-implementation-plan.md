# Implementation plan: 004-edit-priority-due-today

The change is small: one derived label on existing task rows (see [03-architecture.md](03-architecture.md)), built the same way as the "Overdue" label of 002-add-due-dates. Editing a task's priority is already delivered by REQ-010 and needs no work. This is an existing project, so there is no walking skeleton; `main` is green (see [01-codebase-analysis.md](01-codebase-analysis.md)). The commands and conventions below are the ones recorded in [knowledge.md](../../knowledge.md).

## Milestones

### M1: "Due today" label
- **Goal:** a task whose due date is today's local date shows a "Due today" text label next to its due date, styled with AA contrast, and no other task does.
- **Delivers:** REQ-037, REQ-038.
- **Demonstrable when done:** with the browser clock fixed to a known date, add tasks due yesterday, today and tomorrow, plus one with no due date: only the one due today shows "Due today", and the one due yesterday still shows "Overdue". Completing the task due today keeps the label (the assumption in `02-requirements.md`); changing its due date to tomorrow removes the label at once. The axe audit passes with the label present.

## Dependencies
- Within M1: `domain/task` (`isDueToday`) → `ui/render` (the label) → `index.html` (its style). They ship together in one story, because the label is the only observable result.
- M1 depends on nothing outside this increment: `AppState.today` already exists (002-add-due-dates).

## Testing approach
- **Unit (Vitest, part of `npm test`):** `isDueToday` for yesterday, today, tomorrow, no due date, and a completed task due today; `render` shows the label only when `isDueToday` is true, places it after the due date, and shows none when `today` is absent.
- **End-to-end (Playwright, part of `npm test`):** fix "today" with Playwright's clock API, as `tests/e2e/overdue.spec.ts` does, so the tests do not depend on the real date. Cover REQ-037 and REQ-038 through the UI, including a due-date edit, and the style with the existing `@axe-core/playwright` audit.
- **Gates:** `npm run build`, `npm run typecheck` and `npm test` from `.factory/config.json`. `commands.lint` is `null`, so the lint gate is skipped and the PR says so (rule H4).
- **Regression:** the full existing suite (158 unit, 89 e2e at baseline) must keep passing; see "Unchanged behaviour to protect" in `02-requirements.md`, in particular REQ-010 (`tests/e2e/edit-due-date-priority.spec.ts`) and REQ-022 to REQ-026 (`tests/e2e/overdue.spec.ts`).

## Requirement coverage
| Requirement | Milestone |
|---|---|
| REQ-037 | M1 |
| REQ-038 | M1 |

## Risks
- **Existing tests with a task due on the fixed day.** An e2e test whose clock is fixed to a date on which it also creates a task due that day (for example `#27 AC2` in `tests/e2e/overdue.spec.ts`, the REQ-023 case, which fixes today to 2026-10-07 and adds a task titled "Due today" due that day) will now also see "Due today" in that row; a lookup by the text "Due today" could then match both the title and the label. Mitigation: the label is a separate `<span>`, so `.task-due`, `.task-title` and `.task-overdue` assertions are unaffected, and new tests select the label by its class. Any existing assertion that breaks is updated and explained in the PR (rule H3), never weakened.
- **The open questions change the scope.** If the reviewer answers at Gate A that completed tasks, or the Completed view, must not show the label, `isDueToday` gains one condition and a test; the milestone is unchanged.
- **Contrast failures.** Mitigation: the axe audit (with colour contrast) runs on a row that has the label; the text, not the colour, carries the meaning.
- **Latency (REQ-019).** One string comparison per row adds negligible work; the existing 500-task latency test guards it.
- **The cold-start Vitest worker timeout** seen once in 003 (knowledge base, Known risks) could make a first `npm test` fail for reasons unrelated to the change. Mitigation: a failure is investigated and reported, never retried away silently.
