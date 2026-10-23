# Implementation plan: 003-priority-filter

The change is small: a second group of toggle buttons that narrows the current view by priority, decided by one pure function (see [03-architecture.md](03-architecture.md)). It is split into two milestones so that the filter itself and the rules that keep it right as tasks change, together with its accessibility and speed, can each be reviewed on their own. This is an existing project, so there is no walking skeleton; `main` is green (see [01-codebase-analysis.md](01-codebase-analysis.md)).

## Milestones

### M1: Filter the view by priority
- **Goal:** Both views show the five filter choices, "All" is chosen when the app opens, and choosing a priority lists only the matching tasks of the view, in the usual order, also after switching views.
- **Delivers:** REQ-027, REQ-028, REQ-029, REQ-030.
- **Demonstrable when done:** Add tasks with High, Medium and Low priority and one with none, with different due dates. Choose "High": only the High task is listed. Choose "No priority": only the task without one is listed. With two High tasks, they keep their due-date order. Complete a High task and switch to Completed with "High" still chosen: it is listed there. Choose "All": every task of the view is back.

### M2: Filter updates, accessibility and speed
- **Goal:** The filtered list stays right when tasks change, adding a task brings back "All", the filter controls are accessible, and filtering stays fast.
- **Delivers:** REQ-031, REQ-032, REQ-033, REQ-034.
- **Demonstrable when done:** With "High" chosen, change a listed task's priority to Low: it leaves the list at once; completing a listed task removes it from the Active list. With "Low" chosen, add a task: "All" is chosen and the new task is listed. The filter buttons can be reached and pressed with the keyboard alone, the chosen one is announced as pressed, the axe audit passes in both views with a filter chosen, and with 500 tasks stored a filter change is reflected within 100 ms.

## Dependencies
- M1 → M2: M2 tests and refines the filter that M1 adds.
- Within M1: `domain/filter` (`PriorityFilter`, `PRIORITY_FILTERS`, `tasksForPriority`) → `app/controller` (`AppState.priorityFilter`, `setPriorityFilter`) → `ui/render` and `ui/events` (the buttons). They ship together in one story, because the filtered list is the only observable result.
- Within M2: `app/controller` (`addTask` resets the filter); the rest is tests on the M1 code, and fixes if they find gaps.

## Testing approach
- **Unit (Vitest, part of `npm test`; results also in `reports/vitest.json`):** `tasksForPriority` for every choice ("All", each priority, "No priority"), including that it keeps the input order and does not mutate it (REQ-028); the controller starts on `'all'`, `setPriorityFilter` changes it, `setView` keeps it, and a successful `addTask` resets it while a rejected one does not; `render` presses exactly one filter button and lists only the matching rows in sorted order.
- **End-to-end (Playwright, part of `npm test`):** the journey through the UI for REQ-027 to REQ-032; keyboard use and `aria-pressed` for REQ-033 with the existing `@axe-core/playwright` audit; the 500-task latency measurement for REQ-034, in the same way as `tests/e2e/latency-and-network.spec.ts`.
- **Gates:** `npm run build`, `npm run typecheck` and `npm test` from `.factory/config.json`. `commands.lint` is `null`, so the lint gate is skipped and each PR says so (rule H4).
- **Regression:** the full existing suite (117 unit, 74 e2e at baseline) must keep passing; see "Unchanged behaviour to protect" in `02-requirements.md`.

## Requirement coverage
| Requirement | Milestone |
|---|---|
| REQ-027 | M1 |
| REQ-028 | M1 |
| REQ-029 | M1 |
| REQ-030 | M1 |
| REQ-031 | M2 |
| REQ-032 | M2 |
| REQ-033 | M2 |
| REQ-034 | M2 |

## Risks
- **Keyboard order changes.** Five new buttons come after the "Show" group, so tests that count Tab presses could break. Mitigation: the accessibility tests find controls by role and name; any test whose keyboard path breaks is updated and explained in the PR (rule H3), never weakened.
- **"All" confused with a third view.** REQ-007 keeps exactly two views. Mitigation: the filter is a separate `PriorityFilter` type and button group, and `View` and `tasksForView` stay unchanged; with "All" chosen, every existing view test is unchanged.
- **Order broken by filtering.** Mitigation: filter first, then `sortTasks` unchanged; a unit test and an e2e test check the order of several matching tasks (REQ-029).
- **Unit-test result missing from the evidence.** The rule that decides which tasks are listed is covered by unit tests, whose passing names only `reports/vitest.json` records. Mitigation: that report is configured in `test_reports`, and `verify run` refuses evidence when it is missing.
- **A cold-start test timeout.** One earlier `npm test` failed before Playwright ran because Vitest could not start a worker in time. Mitigation: re-run once and report it if it repeats; it is not caused by this change.
- **Latency (REQ-034).** Filtering is one pass over at most a few hundred tasks; the 500-task latency test guards it.
