# Architecture: 002-add-due-dates

This increment changes an existing system. Only the change is designed here. Everything else stays as the codebase analysis and the earlier increments' architecture describe it.

## Overview
Active tasks whose due date is before today get a visible "Overdue" label (REQ-022 to REQ-026). Overdue is a **derived** property, like the list order: it is computed when rendering, from the task's `dueDate`, its `completed` flag and today's local date. Nothing new is stored.

The change follows the existing layering. A pure domain function decides whether a task is overdue. The controller, which already owns the injected clock (`now`), puts today's date into the state it renders. The renderer adds the label to the task row.

```text
app/controller.ts ── now() ──► localDate(now()) ──► AppState.today ("YYYY-MM-DD")
                                                         │
ui/render.ts ── taskItem(task, today) ── isOverdue(task, today)? ──► <span class="task-overdue">Overdue</span>
```

## Current architecture
- `src/domain/task.ts`: the `Task` type (`dueDate: string | null` as `YYYY-MM-DD`, `completed: boolean`) and the pure task operations, including `isCalendarDate`. No DOM, no clock.
- `src/app/controller.ts`: holds `AppState` (`tasks`, `view`, `editing`, messages) and is created with an injected `now: () => Date` (today only used for `createdAt`). Every action goes through `update()`, which saves and then calls `render(state)`.
- `src/ui/render.ts`: `render(root, state)` builds each row in `taskItem(task)`. A due date is shown as `<time class="task-due" datetime="YYYY-MM-DD">Due <date></time>`; styles live in the inline `<style>` of `index.html`.
- `src/main.ts`: wires `now: () => new Date()` into the controller and renders the first view.

## Changes
| Component | Change | Responsibility and interfaces |
|---|---|---|
| `src/domain/task.ts` | Changed | Adds two pure functions. `localDate(now: Date): string` returns the local calendar date of `now` as `YYYY-MM-DD`. `isOverdue(task: Task, today: string): boolean` is true only when `task.completed` is false, `task.dueDate` is not `null`, and `task.dueDate < today` (ISO date strings compare correctly as strings). |
| `src/app/controller.ts` | Changed | `AppState` gains `readonly today?: string` (`YYYY-MM-DD`). The controller sets `today: localDate(now())` on every state it renders, including the first one, so every user action refreshes it. |
| `src/main.ts` | Changed (only if needed) | The first render must carry `today`. If the first render is built in `main.ts` rather than by the controller, it uses `controller.state()`, which includes `today`. |
| `src/ui/render.ts` | Changed | `taskItem(task, today)` appends `<span class="task-overdue">Overdue</span>` right after the due date when `isOverdue(task, today)` is true. With no `today` in the state, no label is shown. |
| `index.html` | Changed | One CSS rule for `.task-overdue` (for example bold text with a contrasting colour) that meets WCAG AA contrast. The text "Overdue" carries the meaning, not the style. |

## Data model
None. `Task` and the stored format `task-tracker:v1` are unchanged. `AppState.today` is in-memory UI state and is never saved.

## Key decisions
1. **Derive overdue at render time; never store it.**
   Options: store an `overdue` flag, or derive it from `dueDate`, `completed` and today. A stored flag goes stale as days pass and would change the stored format (REQ-020's all-or-nothing decoding means a migration). *Chosen: derive*, like the order in 001-initial (decision 6).
2. **Compare `YYYY-MM-DD` strings against the local date.**
   Options: compare `Date` objects or timestamps, or compare ISO date strings. 001-initial chose ISO date strings to avoid time-zone off-by-one bugs (decision 4). Formatting today in **local** time (`getFullYear`, `getMonth`, `getDate`, not `toISOString`, which is UTC) keeps a task due today from showing as overdue late in the evening. *Chosen: string comparison against `localDate(now())`.*
3. **Today comes from the controller's injected clock, not from `new Date()` in the renderer.**
   This keeps `render` and the domain deterministic and unit-testable with a fixed date (001-initial decision 7). E2E tests fix the browser clock with Playwright's clock API (`page.clock`), which is already part of `@playwright/test`.
4. **Refresh on render, not on a timer.**
   Options: a midnight timer, or recompute on each render. No requirement asks for a live update, and a timer adds state and test complexity. *Chosen: recompute on every render* (the assumption in `02-requirements.md`).
5. **A text label, not colour alone.**
   REQ-026 and the existing accessibility audit (REQ-017) need the state as text. A separate `<span>` inside the row is read with the task by screen readers and is easy to assert in tests. The `<time>` element stays unchanged, so existing tests that read `Due <date>` keep passing.

## Technology choices
The existing stack is kept: TypeScript, Vite, Vitest with jsdom, Playwright with `@axe-core/playwright`. Playwright's built-in clock API is used to fix "today" in e2e tests. New third-party dependencies: None.

## Compatibility and migration
- No data migration: stored tasks are read exactly as before, and existing tasks with past due dates simply start showing the label.
- The list order (REQ-012) and the `Due <date>` text are unchanged, so the existing e2e and unit tests keep passing. Existing tests that build an `AppState` without `today` still work, because a missing `today` shows no label.
- Existing e2e tests that create tasks with past due dates will now also see an "Overdue" label in those rows. Their assertions must still pass. Any test whose exact-text assertion breaks is updated and explained in the PR (rule H3), not weakened.

## Requirement mapping
| Requirement | Component(s) |
|---|---|
| REQ-022 | `domain/task` (`localDate`, `isOverdue`), `app/controller` (`AppState.today`), `ui/render` (Overdue label) |
| REQ-023 | `domain/task` (`isOverdue`: strictly before today), `ui/render` |
| REQ-024 | `domain/task` (`isOverdue`: false when completed), `ui/render` |
| REQ-025 | `app/controller` (`today` set on every rendered state), `ui/render` |
| REQ-026 | `ui/render` (text label in the row), `index.html` (`.task-overdue` style with AA contrast) |
