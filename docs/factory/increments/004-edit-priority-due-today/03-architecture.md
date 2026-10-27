# Architecture: 004-edit-priority-due-today

This increment changes an existing system. Only the change is designed here. Everything else stays as the codebase analysis and the earlier increments' architecture describe it.

## Overview
A task whose due date is today gets a visible "Due today" label (REQ-037, REQ-038). Like "Overdue" (002-add-due-dates), it is a **derived** property: it is computed when rendering, from the task's `dueDate` and today's local date, which the controller already puts into the state it renders. Nothing new is stored, and no new state is added.

Editing a task's priority (FR-017) is already delivered by REQ-010 and is not changed (`02-requirements.md`).

The change follows the existing layering, recorded in [knowledge.md](../../knowledge.md) (Conventions, Architecture decisions). A pure domain function decides whether a task is due today, and the renderer adds the label to the task row.

```text
app/controller.ts ── AppState.today ("YYYY-MM-DD", already set on every render; 002)
                                  │
ui/render.ts ── taskItem(task, today) ── isDueToday(task, today)? ──► <span class="task-due-today">Due today</span>
```

## Current architecture
- `src/domain/task.ts`: the `Task` type (`dueDate: string | null` as `YYYY-MM-DD`, `completed: boolean`), `localDate(now)` and `isOverdue(task, today)` (002), and the pure task operations. No DOM, no clock.
- `src/app/controller.ts`: holds `AppState`, including `today?: string`, which it sets to `localDate(now())` on every state it renders (002 decision 3). Editing a task's due date or priority goes through `updateTask` and then renders (REQ-009, REQ-010).
- `src/ui/render.ts`: `taskItem(task, today)` builds each row: the done checkbox, the title, `<time class="task-due">Due <date></time>`, then `<span class="task-overdue">Overdue</span>` when `isOverdue(task, today)`, then `<span class="task-priority">`, then the Edit and Delete buttons.
- `index.html`: the inline `<style>`, with one rule for `.task-overdue` (dark red bold text, about 8:1 contrast).

## Changes
| Component | Change | Responsibility and interfaces |
|---|---|---|
| `src/domain/task.ts` | Changed | Adds one pure function, `isDueToday(task: Task, today: string): boolean`: true only when `task.dueDate` is not `null` and equals `today`. It does not look at `task.completed` (the assumption in `02-requirements.md`: completed tasks show it too). |
| `src/ui/render.ts` | Changed | `taskItem(task, today)` appends `<span class="task-due-today">Due today</span>` right after the due date, in the same place as "Overdue", when `isDueToday(task, today)` is true. With no `today` in the state, no label is shown. `editItem` is unchanged. |
| `index.html` | Changed | One CSS rule for `.task-due-today` that meets WCAG AA contrast. The words "Due today" carry the meaning, not the style. |

`src/app/controller.ts`, `src/main.ts`, `src/ui/events.ts`, the stores and `src/domain/filter.ts` and `sort.ts` are unchanged.

## Data model
None. `Task`, `AppState` and the stored format `task-tracker:v1` are unchanged. "Due today" is derived at render time and never saved.

## Key decisions
1. **Derive "due today" at render time; never store it.** The same reasons as "Overdue" (002 decision 1): a stored flag goes stale as days pass and would change the stored format. *Chosen: derive* from `dueDate` and `AppState.today`.
2. **Equality of `YYYY-MM-DD` strings against the local date.** "Due today" is `dueDate === today`; "Overdue" is `dueDate < today` and requires an open task. The two can never both be true for one task, so REQ-023 ("a task due today shows no 'Overdue' label") stays as it is, and the row never shows both labels.
3. **A separate function, not a change to `isOverdue`.** `isOverdue` and its tests (REQ-022 to REQ-026) stay exactly as they are. *Chosen: a new `isDueToday` next to it*, unit-tested on its own.
4. **Shown on completed tasks too.** FR-018 says "a task due today" with no limit, so `isDueToday` ignores `completed` (Open question 2 in `02-requirements.md`). If the reviewer answers otherwise at Gate A, this is a one-condition change in `isDueToday`.
5. **Refresh on render, not on a timer.** As for "Overdue" (002 decision 4): `today` is recomputed on every rendered state, so a due-date edit updates the label in the same action (Open question 7), and the label is not updated live at midnight (Open question 3).
6. **A text label next to the due date.** As for "Overdue" (002 decision 5): a `<span>` inside the row is read with the task by screen readers (Open question 4) and is easy to assert in tests, and the `<time>` element stays unchanged, so existing tests that read `Due <date>` keep passing.

## Technology choices
The existing stack is kept: TypeScript, Vite, Vitest with jsdom, Playwright with `@axe-core/playwright`. Playwright's clock API (`page.clock`), already used by `tests/e2e/overdue.spec.ts`, fixes "today" in the e2e tests. New third-party dependencies: None.

## Compatibility and migration
- No data migration: stored tasks are read exactly as before, and existing tasks due today simply start showing the label.
- The list order (REQ-012), the `Due <date>` text, the "Overdue" label and the priority filter are unchanged.
- Existing tests that build an `AppState` without `today` still work, because a missing `today` shows no label.
- Existing e2e tests that create a task due on the day their clock is fixed to will now also see "Due today" in that row. Their assertions must still pass. Any test whose exact-text assertion breaks is updated and explained in the PR (rule H3), not weakened.
- The accessibility audit (`tests/e2e/accessibility.spec.ts`, axe including colour contrast) must still pass with the new style.

## Requirement mapping
| Requirement | Component(s) |
|---|---|
| REQ-037 | `domain/task` (`isDueToday`), `ui/render` ("Due today" label after the due date), `index.html` (`.task-due-today` style with AA contrast) |
| REQ-038 | `domain/task` (`isDueToday`: false for any other date or no due date), `ui/render` |
