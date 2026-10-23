# Change request: Filter tasks by priority

## Problem

Tasks already have an optional priority (Low, Medium or High), but the list cannot be narrowed by it. With many tasks, finding the High-priority ones means scanning the whole list.

## Goals

- Let the user list only the tasks of one priority within the current view (Active or Completed).

## Non-goals

- Changing the sort order. Priority still does not affect it.
- Sorting or grouping by priority, or showing counts per priority.
- Changing how a priority is set, edited or stored.
- Remembering the filter across reloads (see Open questions).

## User journeys

### Journey 5: Focus on one priority

1. The user is in the Active (or Completed) view, with tasks of mixed priority.
2. They choose "High" in the priority filter.
3. Only that view's High-priority tasks are listed, in the usual order.
4. They choose "All", and every task of the view is listed again.

## Functional requirements

| ID | Requirement | Journey | Priority |
|---|---|---|---|
| FR-011 | The user can filter the current view by priority: All (the default), High, Medium, Low or No priority | Journey 5 | Must |
| FR-012 | A task is listed only if it belongs to the current view and matches the priority filter. "All" matches every task; "No priority" matches the tasks that have none | Journey 5 | Must |
| FR-013 | Filtering keeps the existing order: due date ascending, undated tasks last, ties in creation order | Journey 5 | Must |
| FR-014 | The chosen filter stays selected when the user switches between Active and Completed | Journey 5 | Must |
| FR-015 | When a task stops matching the filter (its priority is changed, or it is completed or reopened), the list updates at once | Journey 5 | Must |
| FR-016 | Adding a task while a filter other than "All" is chosen switches the filter back to "All", so the new task is visible | Journey 5 | Must |

## Non-functional requirements

- **Accessibility:** the filter controls can be reached and operated with the keyboard alone, expose which choice is current (as the Active/Completed controls do), and the page has no automated accessibility violations.
- **Performance:** with 500 tasks stored, changing the filter updates the list within 100 ms.
- **No new dependencies,** and no network requests beyond the page's own files.

## Constraints and assumptions

### Verified constraints

- A task's priority is exactly Low, Medium, High or none.
- The app has exactly two views, Active and Completed; the priority filter works inside them and does not replace them.

### Assumptions requiring validation

- The filter is not saved: every page load starts at "All".
- The rule that decides whether a task is listed (view plus priority) is plain logic with no page involved, so unit tests can check it directly; the controls and the journey are checked end to end.

## Decisions

- "No priority" is a filter choice, because a task may have no priority.
- The priority filter is a second group of controls beside Active/Completed.

## Open questions

1. Should the chosen priority filter be remembered across reloads? (Assumed: no; each load starts at "All".)
