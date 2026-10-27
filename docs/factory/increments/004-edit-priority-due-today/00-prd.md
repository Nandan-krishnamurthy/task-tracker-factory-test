# Change request: Edit a task's priority, and show a "Due today" badge

## Problem

Not stated. The request is: "Allow editing a task's priority, and show a 'Due today' badge."

## Goals

- Allow editing a task's priority.
- Show a "Due today" badge.

## Non-goals

None.

## User journeys

None.

## Functional requirements

| ID | Requirement | Journey | Priority |
|---|---|---|---|
| FR-017 | The user can edit a task's priority | None | Not stated |
| FR-018 | A task due today shows a "Due today" badge | None | Not stated |

## Non-functional requirements

None.

## Constraints and assumptions

### Verified constraints

- A task's priority is exactly Low, Medium, High or none.
- A task's due date is optional, and is shown on the task as `Due <date>`.
- A task whose due date is earlier than today's date already shows an "Overdue" label in the Active view; a task due today does not.

### Assumptions requiring validation

None.

## Decisions

None.

## Open questions

1. In which views does the "Due today" badge appear?
2. Does a completed task that is due today show the badge?
3. Should the badge appear or disappear when the date changes at midnight while the app stays open?
4. How is the badge conveyed to assistive technology?
5. What priority (Must or Should) do FR-017 and FR-018 have?
6. Where on the task does the "Due today" badge appear?
7. Should the badge appear or disappear straight away when a task's due date is set, changed or cleared?
