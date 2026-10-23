# Architecture: 003-priority-filter

This increment changes an existing system. Only the change is designed here. Everything else stays as the codebase analysis and the earlier increments' architecture describe it.

## Overview
Both views get a priority filter: "All", "High", "Medium", "Low" or "No priority" (REQ-027 to REQ-034). The chosen filter is **in-memory UI state**, like the view: the controller holds it in `AppState`, it is never stored, and the app opens on "All". Which tasks are listed is decided by a pure domain function, applied after the existing view filter and before the existing sort, so the order rule (REQ-012) is untouched.

```text
ui/events.ts ── click ──► controller.setPriorityFilter(filter) ──► AppState.priorityFilter
                                                                     │
ui/render.ts ── sortTasks(tasksForPriority(tasksForView(tasks, view), priorityFilter)) ──► rows
```

## Current architecture
- `src/domain/filter.ts`: `View = 'active' | 'completed'` and the pure `tasksForView(tasks, view)` (REQ-007).
- `src/domain/task.ts`: `Priority = 'low' | 'medium' | 'high'`, `PRIORITIES`, and `Task.priority: Priority | null` (REQ-004, REQ-010).
- `src/app/controller.ts`: holds `AppState` (`tasks`, `view`, `editing`, messages, `today`). Every action goes through `update()`, which saves the tasks if they changed and then calls `render(state)`. `addTask` sets `view: 'active'` so the new task is visible; the view is not stored.
- `src/ui/render.ts`: `ensureLayout` creates the form, the "Show" group of two `aria-pressed` toggle buttons (`viewButton`), and the list, once. `render` marks the pressed view button and rebuilds the rows from `sortTasks(tasksForView(state.tasks, view))`.
- `src/ui/events.ts`: wires the form, the view buttons and the row controls to the controller.

## Changes
| Component | Change | Responsibility and interfaces |
|---|---|---|
| `src/domain/filter.ts` | Changed | Adds `PriorityFilter = 'all' \| Priority \| 'none'`, `PRIORITY_FILTERS: readonly PriorityFilter[]` in the order `['all', 'high', 'medium', 'low', 'none']`, and the pure `tasksForPriority(tasks: readonly Task[], filter: PriorityFilter): Task[]`: every task for `'all'`, the tasks whose `priority` equals the filter for a priority, and the tasks whose `priority` is `null` for `'none'`. It keeps the input order and never mutates it. `View` and `tasksForView` are unchanged. |
| `src/app/controller.ts` | Changed | `AppState` gains `readonly priorityFilter?: PriorityFilter` (absent means `'all'`). The first state sets `'all'`. New `setPriorityFilter(filter: PriorityFilter): void` updates it and renders. `addTask` also sets `priorityFilter: 'all'` on success, next to `view: 'active'` (REQ-032). `setView` keeps the filter as it is (REQ-030), and every other action keeps it, because each spreads `current`. |
| `src/ui/render.ts` | Changed | `ensureLayout` adds a second group after the "Show" group: `<div id="task-priority-filter" role="group" aria-label="Priority">` with five `<button type="button" data-priority-filter="…">` toggle buttons labelled "All", "High", "Medium", "Low" and "No priority", in `PRIORITY_FILTERS` order. `Layout` gains `priorityFilters: Record<PriorityFilter, HTMLButtonElement>`. `render` sets `aria-pressed` on each (true only for the chosen filter, `'all'` when absent) and builds the rows from `sortTasks(tasksForPriority(tasksForView(state.tasks, view), filter))`. |
| `src/ui/events.ts` | Changed | One click listener per filter button calls `controller.setPriorityFilter(filter)`. |

## Data model
None. `Task` and the stored format `task-tracker:v1` are unchanged. `AppState.priorityFilter` is in-memory UI state and is never saved.

## Key decisions
1. **A separate filter dimension, not more views.**
   Options: add views such as "Active, High" to `View`, or keep `View` and add an independent priority filter. Extending `View` would change REQ-007, its tests, and 001-initial's decision that there are exactly two views. *Chosen: a separate `PriorityFilter`*, applied after `tasksForView`; "All" is a filter choice, not a third view.
2. **Not stored; the app opens on "All".**
   Options: save the filter in `localStorage`, or keep it in memory like the view. Saving it would change the stored format, which REQ-020 decodes all-or-nothing, so it would need a version bump and a migration. No requirement asks for it (the PRD's open question). *Chosen: in memory*, like `view` in 001-initial.
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

## Technology choices
The existing stack is kept: TypeScript, Vite, Vitest with jsdom (its JSON report at `reports/vitest.json`), Playwright with `@axe-core/playwright`. New third-party dependencies: None.

## Compatibility and migration
- No data migration: stored tasks are read exactly as before.
- With "All" chosen, the default, every view lists exactly what it lists today, so the existing view, order, priority and overdue tests keep passing. Existing tests that build an `AppState` without `priorityFilter` still work, because absent means `'all'`.
- The page gains five buttons after the "Show" group, so the keyboard Tab order gains five stops before the list. Existing tests that move focus by a fixed number of Tab presses, if any, must still pass; any test whose exact keyboard path breaks is updated and explained in the PR (rule H3), not weakened.
- The accessibility audit (`tests/e2e/accessibility.spec.ts`) covers the new buttons automatically, because it scans the whole page.

## Requirement mapping
| Requirement | Component(s) |
|---|---|
| REQ-027 | `domain/filter` (`PRIORITY_FILTERS`, order), `app/controller` (initial `'all'`), `ui/render` (the five buttons) |
| REQ-028 | `domain/filter` (`tasksForPriority`), `ui/render` (applies it after `tasksForView`) |
| REQ-029 | `ui/render` (filter before `sortTasks`), `domain/sort` (unchanged) |
| REQ-030 | `app/controller` (`setView` keeps `priorityFilter`) |
| REQ-031 | `app/controller` (every action re-renders with the same filter), `ui/render` |
| REQ-032 | `app/controller` (`addTask` sets `priorityFilter: 'all'`) |
| REQ-033 | `ui/render` (labelled group, native buttons, `aria-pressed`), `ui/events` |
| REQ-034 | `domain/filter` (one pass over the tasks), `ui/render` |
