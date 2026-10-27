# Requirements: 004-edit-priority-due-today

This increment changes an existing project. These requirements describe the **change** (the delta), not the whole system. Every requirement of the earlier increments stays in force unless it is listed under "Changed or retired requirements".

## Current system
The change request ([00-prd.md](00-prd.md)) has two functional requirements: FR-017, "The user can edit a task's priority", and FR-018, "A task due today shows a 'Due today' badge". The parts of the current system they touch are Done (see [01-codebase-analysis.md](01-codebase-analysis.md) and the conventions in [knowledge.md](../../knowledge.md)):

- REQ-010: the priority (Low, Medium, High) of an existing task, active or completed, can be set, changed or cleared, and the change is shown immediately. The row in edit mode has a "New priority" select (`src/ui/render.ts`, `editItem`).
- REQ-003: an optional due date (`YYYY-MM-DD`) is shown on the task as `Due <date>` in a `<time>` element (`src/ui/render.ts`, `taskItem`).
- REQ-022 to REQ-026: an open task whose due date is earlier than today's local date shows a text label "Overdue" next to its due date; a task due today shows no "Overdue" label (REQ-023). The label is derived at render time from the controller's `today` and never stored (`isOverdue` in `src/domain/task.ts`).

No "Due today" label exists. 002-add-due-dates asked "Should a task due **today** also be marked (for example "Due today")?", assumed no, and left such a label out of scope; FR-018 now asks for it.

FR-017 states exactly what REQ-010 already delivers and names nothing beyond it. Because that part of the request as written was already met, the human was asked in the `/factory-start` session (2026-10-27) what this increment should deliver for it, and chose to treat FR-017 as **already delivered by REQ-010**: it is not planned again, and REQ-010 is protected unchanged. The requirements below describe FR-018 only.

## Functional
- **REQ-037** (PRD §Functional requirements FR-018, §Goals): A task whose due date is today's date (the device's local calendar date) shows a visible text label "Due today".
- **REQ-038** (PRD §Functional requirements FR-018): A task whose due date is earlier or later than today's date, or that has no due date, shows no "Due today" label.

## Non-functional
None. The change request states no non-functional requirement. The existing ones stay in force for the new label: keyboard use and accessible names (REQ-016, REQ-017), no network requests (REQ-018) and changes within 100 ms with 500 tasks (REQ-019).

## Changed or retired requirements
None. REQ-010 stays in force unchanged (FR-017 is already delivered by it). REQ-023 also stays: a task due today still shows no "Overdue" label, and gets the separate "Due today" label instead. Only 002-add-due-dates' out-of-scope item "A 'Due today' … label" is superseded, by REQ-037 and REQ-038.

## Unchanged behaviour to protect
The stories must keep these tests passing:

- REQ-004, REQ-010 (create and edit priority): `tests/e2e/due-date-priority.spec.ts`, `tests/e2e/edit-due-date-priority.spec.ts`, `src/domain/task.test.ts`, `src/app/controller.test.ts`. Editing a task's priority behaves exactly as today.
- REQ-003, REQ-009 (create, show and edit the due date): `tests/e2e/due-date-priority.spec.ts`, `tests/e2e/edit-due-date-priority.spec.ts`, `src/ui/render.test.ts`.
- REQ-022 to REQ-026 (the "Overdue" label): `tests/e2e/overdue.spec.ts`, `src/ui/render.test.ts`. A task is never labelled both "Overdue" and "Due today".
- REQ-005, REQ-006, REQ-007 (complete, reopen, views): `tests/e2e/complete-and-views.spec.ts`, `src/domain/filter.test.ts`.
- REQ-012 (order): `tests/e2e/sort-by-due-date.spec.ts`, `src/domain/sort.test.ts`. Tasks due today are not moved or regrouped.
- REQ-027 to REQ-036 (the priority filter and remembering it): `tests/e2e/priority-filter.spec.ts`, `tests/e2e/remember-priority-filter.spec.ts`, `src/domain/filter.test.ts`, `src/storage/filterStore.test.ts`.
- REQ-013, REQ-014, REQ-020 (persistence and corrupted data): `tests/e2e/persistence.spec.ts`, `tests/e2e/storage-failures.spec.ts`, `src/storage/taskStore.test.ts`. The stored format `task-tracker:v1` does not change.
- REQ-016, REQ-017 (keyboard use and accessible names): `tests/e2e/accessibility.spec.ts`.
- REQ-018, REQ-019 (no network requests; changes within 100 ms with 500 tasks): `tests/e2e/latency-and-network.spec.ts`.
- REQ-021 (static build): `tests/e2e/skeleton.spec.ts` and `npm run build`.

## Assumptions
The change request leaves these details open (its Open questions 1–7). Planning continues on the following, each taken from the change request's own words or from the existing "Overdue" label's behaviour:

- "Due today" means a due date equal to today's local calendar date, compared as `YYYY-MM-DD` strings like "Overdue" (002 decision 2). It and "Overdue" never apply to the same task.
- **Views and completed tasks** (Open questions 1, 2): FR-018 says "a task due today" with no limit, so the label is shown in both views, on open and completed tasks alike. This differs from "Overdue", which completed tasks never show (REQ-024).
- **Placement** (Open question 6): next to the existing `Due <date>` text, where "Overdue" goes.
- **Assistive technology** (Open question 4): the label is text that is part of the task's content, like "Overdue" (002 decision 5); no other announcement is added.
- **Midnight** (Open question 3): "today" is read on every render, as it is for "Overdue" (002 decision 4). The label is not updated live at midnight: an open page refreshes it on its next render (any user action) or reload.
- **Immediate updates** (Open question 7): when a task's due date is set, changed or cleared (REQ-009), the label appears or disappears to match as part of the same action, because it is derived when the list is rendered.
- **Priority** (Open question 5): the change request does not say Must or Should. REQ-037 and REQ-038 are planned for this increment.
- The label is derived when rendering and never stored, so no data migration is needed.

## Out of scope
- FR-017, "The user can edit a task's priority" (PRD §Functional requirements FR-017, §Goals): already delivered by REQ-010. Not planned again, by the human's decision in the `/factory-start` session (2026-10-27).
- A "Due soon" label, a filter or view for tasks due today, and moving tasks due today in the list: not asked for.

## Open questions
These do not block planning; it continues on the assumptions above. Answer at Gate A with `/changes` if any assumption is wrong.

1. In which views does the "Due today" badge appear? (Assumed: both views.)
2. Does a completed task that is due today show the badge? (Assumed: yes, since FR-018 says "a task due today"; note that completed tasks never show "Overdue".)
3. Should the badge appear or disappear when the date changes at midnight while the app stays open? (Assumed: no; it updates on the next render or reload, as "Overdue" does.)
4. How is the badge conveyed to assistive technology? (Assumed: as text in the task's content, like "Overdue".)
5. What priority (Must or Should) do FR-017 and FR-018 have? (Assumed: FR-018 is planned for this increment; FR-017 is already delivered by REQ-010.)
6. Where on the task does the "Due today" badge appear? (Assumed: next to the `Due <date>` text.)
7. Should the badge appear or disappear straight away when a task's due date is set, changed or cleared? (Assumed: yes, as part of the same action.)
8. REQ-037 may restate REQ-022 (Done). Is it new work? (Assumed: yes. REQ-022 labels a task "Overdue" when its due date is before today; REQ-037 adds a separate "Due today" label for a due date equal to today, which no Done requirement labels.)
9. REQ-038 may restate REQ-022 and REQ-023 (Done). Is it new work? (Assumed: yes. REQ-022 and REQ-023 say when the "Overdue" label is or is not shown; REQ-038 says which tasks do not show the new "Due today" label, which neither covers.)

## PRD coverage
| PRD section | Requirements |
|---|---|
| Change request: Edit a task's priority, and show a "Due today" badge | REQ-037, REQ-038 (editing a task's priority: Out of scope, already delivered by REQ-010) |
| Problem | REQ-037, REQ-038 (the request it quotes; editing a task's priority: Out of scope, REQ-010) |
| Goals | REQ-037, REQ-038 ("Allow editing a task's priority": Out of scope, already delivered by REQ-010) |
| Non-goals | Out of scope (the change request states none) |
| User journeys | Out of scope (the change request states none) |
| Functional requirements | REQ-037, REQ-038 (FR-018); FR-017 Out of scope, already delivered by REQ-010 |
| Non-functional requirements | Out of scope (the change request states none; existing REQ-016 to REQ-019 apply) |
| Constraints and assumptions | REQ-037, REQ-038 (existing REQ-003, REQ-004, REQ-022, REQ-023) |
| Verified constraints | REQ-037, REQ-038 (existing REQ-003, REQ-004, REQ-022, REQ-023) |
| Assumptions requiring validation | Out of scope (the change request states none) |
| Decisions | Out of scope (the change request states none) |
| Open questions | REQ-037, REQ-038 (planned on the assumptions above; answer at Gate A) |
