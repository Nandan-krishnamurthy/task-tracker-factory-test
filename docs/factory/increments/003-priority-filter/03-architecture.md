# Architecture: 003-priority-filter

This increment changes an existing system. Only the change is designed here. Everything else stays as the codebase analysis and the earlier increments' architecture describe it.

## Overview
Both views get a priority filter: "All", "High", "Medium", "Low" or "No priority" (REQ-027 to REQ-036). The controller holds the chosen filter in `AppState`, like the view, and **remembers** it in `localStorage` under its own key, `task-tracker:priority-filter`, apart from the tasks (REQ-035, the Gate A feedback on PR #33). The app opens on the remembered choice, or on "All" when there is none or it is not valid (REQ-036). Which tasks are listed is decided by a pure domain function, applied after the existing view filter and before the existing sort, so the order rule (REQ-012) is untouched.

```text
ui/events.ts ── click ──► controller.setPriorityFilter(filter) ──► AppState.priorityFilter
                                                                     │ savePriorityFilter
                                                                     ▼
main.ts ── loadPriorityFilter(localStorage) ──► createController({ priorityFilter })   localStorage["task-tracker:priority-filter"]

ui/render.ts ── sortTasks(tasksForPriority(tasksForView(tasks, view), priorityFilter)) ──► rows
```

## Current architecture
- `src/domain/filter.ts`: `View = 'active' | 'completed'` and the pure `tasksForView(tasks, view)` (REQ-007).
- `src/domain/task.ts`: `Priority = 'low' | 'medium' | 'high'`, `PRIORITIES`, and `Task.priority: Priority | null` (REQ-004, REQ-010).
- `src/app/controller.ts`: holds `AppState` (`tasks`, `view`, `editing`, messages, `today`). Every action goes through `update()`, which saves the tasks if they changed and then calls `render(state)`. `addTask` sets `view: 'active'` so the new task is visible; the view is not stored.
- `src/ui/render.ts`: `ensureLayout` creates the form, the "Show" group of two `aria-pressed` toggle buttons (`viewButton`), and the list, once. `render` marks the pressed view button and rebuilds the rows from `sortTasks(tasksForView(state.tasks, view))`.
- `src/ui/events.ts`: wires the form, the view buttons and the row controls to the controller.
- `src/storage/taskStore.ts`: the tasks under `task-tracker:v1`, "the one localStorage key the app uses" (001-initial §Data model), decoded all or nothing (REQ-020); `loadTasks` and `saveTasks` never throw.
- `src/main.ts`: loads the tasks with `loadTasks(localStorage)` and creates the controller with `storage: localStorage`.

## Changes
| Component | Change | Responsibility and interfaces |
|---|---|---|
| `src/domain/filter.ts` | Changed | Adds `PriorityFilter = 'all' \| Priority \| 'none'`, `PRIORITY_FILTERS: readonly PriorityFilter[]` in the order `['all', 'high', 'medium', 'low', 'none']`, and the pure `tasksForPriority(tasks: readonly Task[], filter: PriorityFilter): Task[]`: every task for `'all'`, the tasks whose `priority` equals the filter for a priority, and the tasks whose `priority` is `null` for `'none'`. It keeps the input order and never mutates it. `View` and `tasksForView` are unchanged. |
| `src/app/controller.ts` | Changed | `AppState` gains `readonly priorityFilter?: PriorityFilter` (absent means `'all'`). `ControllerDeps` gains `priorityFilter?: PriorityFilter`, the remembered choice, and the first state uses it (`'all'` when absent). New `setPriorityFilter(filter: PriorityFilter): void` updates it and renders. `addTask` also sets `priorityFilter: 'all'` on success, next to `view: 'active'` (REQ-032). `setView` keeps the filter as it is (REQ-030), and every other action keeps it, because each spreads `current`. Whenever the filter changes, `update()` calls `savePriorityFilter(storage, filter)` (REQ-035); its result is ignored (decision 8). |
| `src/storage/filterStore.ts` | New | `FILTER_KEY = 'task-tracker:priority-filter'`. `loadPriorityFilter(storage: Pick<Storage, 'getItem'>): PriorityFilter` returns the stored string if it is one of `PRIORITY_FILTERS`, and `'all'` if it is missing, not valid, or reading throws (REQ-036). `savePriorityFilter(storage: Pick<Storage, 'setItem'>, filter: PriorityFilter): boolean` writes it and returns whether that worked. Neither throws, and neither reads or writes `task-tracker:v1`. |
| `src/main.ts` | Changed | Passes `priorityFilter: loadPriorityFilter(localStorage)` to `createController`. |
| `src/ui/render.ts` | Changed | `ensureLayout` adds a second group after the "Show" group: `<div id="task-priority-filter" role="group" aria-label="Priority">` with five `<button type="button" data-priority-filter="…">` toggle buttons labelled "All", "High", "Medium", "Low" and "No priority", in `PRIORITY_FILTERS` order. `Layout` gains `priorityFilters: Record<PriorityFilter, HTMLButtonElement>`. `render` sets `aria-pressed` on each (true only for the chosen filter, `'all'` when absent) and builds the rows from `sortTasks(tasksForPriority(tasksForView(state.tasks, view), filter))`. |
| `src/ui/events.ts` | Changed | One click listener per filter button calls `controller.setPriorityFilter(filter)`. |

## Data model
- New `localStorage` key `task-tracker:priority-filter`: the chosen filter as a plain string, one of `all`, `high`, `medium`, `low` or `none`. Any other value, or no value, means "All" (REQ-036).
- `Task` and the stored format `task-tracker:v1` are unchanged.

## Key decisions
1. **A separate filter dimension, not more views.**
   Options: add views such as "Active, High" to `View`, or keep `View` and add an independent priority filter. Extending `View` would change REQ-007, its tests, and 001-initial's decision that there are exactly two views. *Chosen: a separate `PriorityFilter`*, applied after `tasksForView`; "All" is a filter choice, not a third view.
2. **Remembered under its own `localStorage` key** (revised at Gate A, PR #33).
   Options: keep it in memory only (the first plan, before the reviewer asked to remember it); add it to the `task-tracker:v1` data; or store it under a second key. Adding it to `task-tracker:v1` changes that format: it needs a version bump and a migration of every user's data, and because REQ-020 decodes it all or nothing, a bad filter value would make the app drop all the tasks. A second key departs from 001-initial's "one localStorage key" design, but keeps the task data, its format and its tests exactly as they are, and a missing or bad filter value can only fall back to "All" (REQ-036). *Chosen: a second key*, `task-tracker:priority-filter`, read and written only by `src/storage/filterStore.ts`.
3. **Filtering is a pure domain function.**
   This follows 001-initial decision 7 (a pure domain): `tasksForPriority` can be unit-tested directly with plain task lists, without the DOM or the controller (REQ-028).
4. **Filter first, then sort.**
   `sortTasks` orders whatever list it is given by due date, undated last, then creation order, so sorting the filtered subset gives exactly the REQ-012 order of those tasks (REQ-029). No change to `sort.ts`.
5. **Toggle buttons, as the views use.**
   Options: a `<select>`, radio buttons, or `aria-pressed` toggle buttons. The "Show" group already uses native buttons in a labelled group with `aria-pressed`, which are keyboard-operable and announce whether they are pressed (REQ-016, REQ-017). *Chosen: the same pattern* (REQ-033), so both groups look and behave alike.
6. **Adding resets the filter in the controller.**
   `addTask` already resets the view so the new task is visible; resetting the filter to "All" at the same place keeps that rule in one function (REQ-032). A rejected add (empty title) changes neither.
7. **No special empty state.**
   A filter that matches nothing renders an empty list, exactly as an empty view does today (the assumption in `02-requirements.md`).
8. **A failed filter save is ignored.**
   Options: show the existing storage warning, or ignore the failure. The warning (REQ-013) tells the user their tasks may be lost; a lost filter choice loses no data, and the filter still applies until the page is closed. *Chosen: ignore it*, so the warning keeps meaning "your tasks may not be saved" (the assumption in `02-requirements.md`).
9. **Saved from the controller, loaded in `main.ts`.**
   The controller already owns the injected `storage` and saves the tasks in `update()`; saving the filter there, only when it changed, keeps one save path. Loading in `main.ts`, as the tasks are loaded, keeps the controller free of reads and testable with plain values (001-initial decision 7).

## Technology choices
The existing stack is kept: TypeScript, Vite, Vitest with jsdom (its JSON report at `reports/vitest.json`), Playwright with `@axe-core/playwright`. New third-party dependencies: None.

## Compatibility and migration
- No data migration: stored tasks are read exactly as before, and a browser that has no `task-tracker:priority-filter` yet opens on "All".
- With "All" chosen, the default, every view lists exactly what it lists today, so the existing view, order, priority and overdue tests keep passing. Existing tests that build an `AppState` without `priorityFilter` still work, because absent means `'all'`.
- The page gains five buttons after the "Show" group, so the keyboard Tab order gains five stops before the list. Existing tests that move focus by a fixed number of Tab presses, if any, must still pass; any test whose exact keyboard path breaks is updated and explained in the PR (rule H3), not weakened.
- The accessibility audit (`tests/e2e/accessibility.spec.ts`) covers the new buttons automatically, because it scans the whole page.

## Requirement mapping
| Requirement | Component(s) |
|---|---|
| REQ-027 | `domain/filter` (`PRIORITY_FILTERS`, order), `app/controller` (initial filter, `'all'` when none is remembered), `ui/render` (the five buttons) |
| REQ-028 | `domain/filter` (`tasksForPriority`), `ui/render` (applies it after `tasksForView`) |
| REQ-029 | `ui/render` (filter before `sortTasks`), `domain/sort` (unchanged) |
| REQ-030 | `app/controller` (`setView` keeps `priorityFilter`) |
| REQ-031 | `app/controller` (every action re-renders with the same filter), `ui/render` |
| REQ-032 | `app/controller` (`addTask` sets `priorityFilter: 'all'`) |
| REQ-033 | `ui/render` (labelled group, native buttons, `aria-pressed`), `ui/events` |
| REQ-034 | `domain/filter` (one pass over the tasks), `ui/render` |
| REQ-035 | `storage/filterStore` (`savePriorityFilter`, `loadPriorityFilter`), `app/controller` (saves on change, starts from the remembered choice), `main.ts` |
| REQ-036 | `storage/filterStore` (`loadPriorityFilter` falls back to `'all'`, never touches `task-tracker:v1`) |
