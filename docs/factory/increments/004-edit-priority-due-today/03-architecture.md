# Architecture: 004-edit-priority-due-today

This increment changes an existing system. Only the change is designed here. Everything else stays as the codebase analysis and the earlier increments' architecture describe it.

## Overview
An active task whose due date is today gets a visible "Due today" label (REQ-037, REQ-038). Like "Overdue" (002-add-due-dates), it is a **derived** property: it is computed when rendering, from the task's `dueDate`, its `completed` flag and today's local date, which the controller already puts into the state it renders. Nothing new is stored.

Two behaviours come from the Gate A feedback on PR #40. A due-date edit updates the label in the same action (REQ-040), which the existing "today is read on every update" design already gives. And the labels change at local midnight while the app stays open (REQ-039): the controller schedules one refresh at the next local midnight, through an injected timer. That one refresh re-renders every row for the new date, so a task that was due today becomes "Overdue" and a task due on the new day starts showing "Due today" (REQ-041, from the second `/changes` on PR #40), without any user action.

Editing a task's priority (FR-017) is already delivered by REQ-010 and is not changed (`02-requirements.md`).

The change follows the existing layering, recorded in [knowledge.md](../../knowledge.md) (Conventions, Architecture decisions). Pure domain functions decide whether a task is due today and when the next midnight is; the controller owns the clock and the timer; the renderer adds the label.

```text
main.ts ── setTimer: (callback, ms) ⇒ setTimeout / clearTimeout ─┐
                                                                   ▼
app/controller.ts ── now() ──► AppState.today ──► render(state)   schedule(msUntilNextMidnight(now()))
                        ▲                                          │ at local midnight
                        └──────────── refresh: update(current) ◄───┘ (then schedule the next one)

ui/render.ts ── taskItem(task, today) ── isDueToday(task, today)? ──► <span class="task-due-today">Due today</span>
```

## Current architecture
- `src/domain/task.ts`: the `Task` type (`dueDate: string | null` as `YYYY-MM-DD`, `completed: boolean`), `localDate(now)` and `isOverdue(task, today)` (002), and the pure task operations. No DOM, no clock.
- `src/app/controller.ts`: `createController(deps)` with `ControllerDeps` (`tasks`, `priorityFilter`, `storage`, `render`, `now`, `newId`). Every action goes through `update(next)`, which saves, sets `today: localDate(now())` and renders. Nothing runs between user actions: there is no timer (002 decision 4).
- `src/ui/render.ts`: `taskItem(task, today)` builds each row: the done checkbox, the title, `<time class="task-due">Due <date></time>`, then `<span class="task-overdue">Overdue</span>` when `isOverdue(task, today)`, then `<span class="task-priority">`, then the Edit and Delete buttons.
- `src/main.ts`: creates the controller with `now: () => new Date()` and renders the first state.
- `index.html`: the inline `<style>`, with one rule for `.task-overdue` (dark red bold text, about 8:1 contrast).

## Changes
| Component | Change | Responsibility and interfaces |
|---|---|---|
| `src/domain/task.ts` | Changed | Adds two pure functions. `isDueToday(task: Task, today: string): boolean` is true only when `task.completed` is false, `task.dueDate` is not `null`, and `task.dueDate === today` (REQ-037, REQ-038). `msUntilNextMidnight(now: Date): number` returns the milliseconds from `now` to the start of the next local calendar day, built from local date parts (`new Date(y, m, d + 1)`), so a daylight-saving change cannot shift it. |
| `src/app/controller.ts` | Changed | `ControllerDeps` gains an optional `setTimer?: (callback: () => void, ms: number) => () => void`, which starts a timer and returns a function that cancels it. When it is given, the controller schedules one refresh at `msUntilNextMidnight(now())` when it is created; the refresh calls `update({ ...current })`, which reads today again and renders, and then schedules the next one. Only one timer is pending at a time. Without `setTimer`, nothing is scheduled, as today. |
| `src/main.ts` | Changed | Passes `setTimer: (callback, ms) => { const id = setTimeout(callback, ms); return () => clearTimeout(id); }` to the controller. |
| `src/ui/render.ts` | Changed | `taskItem(task, today)` appends `<span class="task-due-today">Due today</span>` right after the due date, in the same place as "Overdue", when `isDueToday(task, today)` is true. With no `today` in the state, no label is shown. `editItem` is unchanged. |
| `index.html` | Changed | One CSS rule for `.task-due-today` that meets WCAG AA contrast. The words "Due today" carry the meaning, not the style. |

`src/ui/events.ts`, the stores, and `src/domain/filter.ts` and `sort.ts` are unchanged.

## Data model
None. `Task`, `AppState` and the stored format `task-tracker:v1` are unchanged. "Due today" is derived at render time and never saved; the pending timer is in-memory controller state.

## Key decisions
1. **Derive "due today" at render time; never store it.** The same reasons as "Overdue" (002 decision 1): a stored flag goes stale as days pass and would change the stored format. *Chosen: derive* from `dueDate`, `completed` and `AppState.today`.
2. **Equality of `YYYY-MM-DD` strings against the local date.** "Due today" is `dueDate === today` on an open task; "Overdue" is `dueDate < today` on an open task. The two can never both be true for one task, so REQ-023 ("a task due today shows no 'Overdue' label") stays as it is, and the row never shows both labels.
3. **A separate function, not a change to `isOverdue`.** `isOverdue` and its tests (REQ-022 to REQ-026) stay exactly as they are. *Chosen: a new `isDueToday` next to it*, unit-tested on its own.
4. **Active tasks only** (Gate A feedback on PR #40). `isDueToday` returns false for a completed task, as `isOverdue` does (REQ-024), so the Completed view never shows the label and reopening a task due today shows it again.
5. **Refresh at local midnight with one injected timer** (REQ-039, REQ-041; supersedes 002 decision 4, "refresh on render, not on a timer"). The refresh re-renders the whole list, so both midnight changes come from the same mechanism: no row needs its own timer.
   Options: poll every minute; schedule one timer for the next local midnight; or listen for `visibilitychange` only. Polling does work all day for a change that happens once. `visibilitychange` misses a page that stays visible. *Chosen: one timer at the next midnight*, rescheduled after each refresh. The timer is injected (`setTimer`), like `now` (001 decision 7), so unit tests drive it with a fake and e2e tests with Playwright's clock (`page.clock.install` and `page.clock.runFor`), which also fires `setTimeout`. If the timer fires late (for example after the device slept), the refresh still reads the real date from `now()`, so the labels are right; a missed day is caught at the next refresh or user action.
6. **Due-date edits need no new mechanism** (REQ-040). `editTask` already goes through `update()`, which reads today and renders, so the label follows the new date in the same action.
7. **A text label next to the due date.** As for "Overdue" (002 decision 5): a `<span>` inside the row is read with the task by screen readers (Open question 4) and is easy to assert in tests, and the `<time>` element stays unchanged, so existing tests that read `Due <date>` keep passing.

## Technology choices
The existing stack is kept: TypeScript, Vite, Vitest with jsdom, Playwright with `@axe-core/playwright`. Playwright's clock API (`page.clock`), already used by `tests/e2e/overdue.spec.ts`, fixes "today" and runs the clock past midnight in the e2e tests; Vitest's fake timers or a hand-written fake `setTimer` drive the controller's timer in unit tests. New third-party dependencies: None.

## Compatibility and migration
- No data migration: stored tasks are read exactly as before, and existing active tasks due today simply start showing the label.
- The list order (REQ-012), the `Due <date>` text and the priority filter are unchanged. The "Overdue" label is unchanged except that it now also appears at local midnight (REQ-022, changed by REQ-039).
- Existing tests that create a controller without `setTimer` still work: no timer is scheduled, exactly as today. Existing tests that build an `AppState` without `today` still work, because a missing `today` shows no label.
- Existing e2e tests that create an active task due on the day their clock is fixed to will now also see "Due today" in that row. Their assertions must still pass. Any test whose exact-text assertion breaks is updated and explained in the PR (rule H3), not weakened.
- `page.clock.setFixedTime`, used by `tests/e2e/overdue.spec.ts`, keeps `Date` fixed while timers keep running in real time. With today fixed at 10:00, the midnight timer is about 14 hours away, so it never fires during an existing spec.
- The accessibility audit (`tests/e2e/accessibility.spec.ts`, axe including colour contrast) must still pass with the new style.

## Requirement mapping
| Requirement | Component(s) |
|---|---|
| REQ-037 | `domain/task` (`isDueToday`), `ui/render` ("Due today" label after the due date), `index.html` (`.task-due-today` style with AA contrast) |
| REQ-038 | `domain/task` (`isDueToday`: false when completed, for any other date, or with no due date), `ui/render` |
| REQ-039 | `domain/task` (`msUntilNextMidnight`), `app/controller` (`setTimer`, the midnight refresh), `main.ts` (wires `setTimeout`) |
| REQ-040 | `app/controller` (`editTask` → `update()` reads today and renders), `ui/render` |
| REQ-041 | `app/controller` (the same midnight refresh re-renders every row), `domain/task` (`isDueToday` for the new date), `ui/render` |
