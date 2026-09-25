<!--
Transcribed by the factory (S00) from `Task Tracker.pdf` at the repository root
(commit 99e0ddf). The PDF is the source of record. The text is unchanged; only
its tables and lists were restored as Markdown. The PDF's approval checkboxes
carry no text, so their tick state is not reproduced here.
-->
# Product Requirements Document: Task Tracker

**Status:** Approved · **Owner:** chikkannasharath@gmail.com · **Last updated:** 2026-09-11

## Problem

People who want to track a personal list of to-dos are often forced into tools built for teams: account creation, sign-in, and shared workspaces add friction before a single task is captured. There is no lightweight place to jot down tasks, mark them done, and have them still be there next time the same browser is opened, without any setup cost.

## Users and context

| Persona | Context | Need |
|---|---|---|
| Individual user | Using a single browser on a single device to manage their own to-dos | Capture, track, and complete personal tasks with zero setup |

## Desired outcomes

- A user can start recording tasks within seconds of opening the app, with no sign-up or login step.
- A user can tell at a glance which tasks are still open and which are done.
- A user's tasks are still present, unchanged, the next time they open the app in the same browser.

## Goals

- Create a task with a title, an optional due date, and an optional priority.
- Mark a task as complete or incomplete.
- Edit a task's title, due date, and priority.
- Delete a task.
- View tasks filtered by status: active (not done) and completed.
- Persist all tasks in the browser so they survive a page reload or browser restart on the same device.

## Non-goals

- User accounts, sign-in, or authentication of any kind.
- Syncing or accessing tasks from more than one device or browser.
- Sharing tasks or workspaces with other users, or assigning tasks to anyone else.
- Projects, boards, tags, or any grouping of tasks beyond a single personal list.
- Notes or free-text descriptions on a task beyond its title.
- Notifications or reminders for due dates.
- Offline conflict resolution or multi-tab consistency guarantees.

## User journeys

### Journey 1: Capture a new task

1. User opens the app, with or without existing tasks present.
2. User enters a task title (and, optionally, a due date and/or priority) and submits.
3. The system adds the task to the active list immediately, without a page reload.
4. Observable outcome: the new task appears in the active task list with the entered title and any optional attributes.

UI impact: Yes · Service boundary: No

### Journey 2: Complete or reopen a task

1. User has one or more tasks in their list.
2. User marks an active task as complete (e.g., via a checkbox).
3. The system updates the task's status and moves it out of the active view.
4. Observable outcome: the task appears in the completed view and no longer appears in the active view. Reversing the action (marking complete as incomplete) restores it to the active view.

UI impact: Yes · Service boundary: No

### Journey 3: Edit or delete a task

1. User has an existing task, active or completed.
2. User edits the task's title, due date, or priority, or chooses to delete it.
3. The system applies the change (or removal) immediately.
4. Observable outcome: the task list reflects the updated title/due date/priority, or the task is no longer present anywhere in the list after deletion.

UI impact: Yes · Service boundary: No

### Journey 4: Return to the app later

1. User previously created tasks and closes the browser tab or the browser itself.
2. User reopens the app in the same browser on the same device.
3. The system loads the previously saved tasks without any user action.
4. Observable outcome: all previously created tasks appear with the same titles, statuses, due dates, and priorities as when the user left.

UI impact: Yes · Service boundary: No

## Functional requirements

| ID | Requirement | Journey | Priority |
|---|---|---|---|
| FR-001 | User can create a task with a required title | Journey 1 | Must |
| FR-002 | User can optionally set a due date on a task at creation or via edit | Journey 1, 3 | Must |
| FR-003 | User can optionally set a priority (e.g., low/medium/high) on a task at creation or via edit | Journey 1, 3 | Must |
| FR-004 | User can mark a task complete and reopen a completed task | Journey 2 | Must |
| FR-005 | User can edit an existing task's title, due date, and priority | Journey 3 | Must |
| FR-006 | User can delete a task | Journey 3 | Must |
| FR-007 | User can view active (not-done) tasks separately from completed tasks | Journey 2 | Must |
| FR-008 | All task data persists in the browser and reloads automatically on return visits, on the same device/browser | Journey 4 | Must |
| FR-009 | Task creation is rejected with a visible validation message if the title is empty | Journey 1 | Must |
| FR-010 | Tasks are sorted by due date ascending by default (soonest first), with tasks lacking a due date sorted last | Journey 1, 2, 3 | Must |

## Non-functional requirements

- **Accessibility:** All interactive elements (add task, complete checkbox, edit, delete, filter controls) must be keyboard-operable and have accessible labels.
- **Security/privacy:** No task data leaves the user's browser; nothing is transmitted to a server. No personal data is collected.
- **Performance:** Creating, editing, completing, or deleting a task reflects in the UI in under 100ms perceived latency (no network round trip).
- **Reliability:** A browser crash or unintentional tab close must not lose previously saved tasks; only data entered and not yet saved by the persistence mechanism may be at risk.
- **Supportability:** Corrupted or unreadable local storage must degrade to an empty task list rather than crashing the app.

## Success measures

| Measure | Baseline | Target | Evaluation period |
|---|---|---|---|
| Time from app open to first task created (new user) | N/A (no existing tool) | Under 15 seconds | First 30 days after launch |
| Task data loss reports (same-device reload) | N/A | Zero confirmed reports | First 30 days after launch |

## Constraints and assumptions

### Verified constraints

- No backend, account system, or API contract is in scope for v1 (confirmed: local storage only, no login).
- Scope is a single user's personal task list, not a team or multi-user workspace (confirmed).
- In-scope task attributes are limited to title, due date, priority, and complete/incomplete status (confirmed); notes/description are explicitly excluded.
- Priority is a fixed three-level scale: Low, Medium, High (confirmed).
- Default task list order is by due date ascending (soonest first), with tasks that have no due date sorted last (confirmed).

### Assumptions requiring validation

- Browser localStorage (or an equivalent client-side persistence API) is assumed sufficient to meet FR-008; no minimum browser support matrix has been specified.
- No maximum task list size or archiving behavior for completed tasks has been specified; assumed unbounded for v1 unless UX/technical design surfaces a practical limit.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Local-only persistence means clearing browser data or switching browsers/devices permanently loses all tasks | User data loss, no recovery path | Non-goal is explicit and disclosed; revisit account/sync in a future PRD if user feedback demands it |
| No due-date reminders may reduce usefulness for time-sensitive tasks | Lower perceived value | Explicitly scoped as a non-goal for v1; can be reconsidered in a later iteration |

## Rollout and rollback

Single-stage rollout: ship as a standalone client-side web app. No migration is required since there is no prior version or stored data format to preserve. Rollback is simply reverting the deployed build; no server-side state exists to roll back.

## Decisions

| Decision | Choice | Owner | Date |
|---|---|---|---|
| Primary scope for v1 | Solo personal tracker (not team/multi-user) | chikkannasharath@gmail.com | 2026-09-11 |
| Access/persistence model | Local-only browser storage, no login or sync | chikkannasharath@gmail.com | 2026-09-11 |
| In-scope task attributes | Title, due date, priority, complete/incomplete status | chikkannasharath@gmail.com | 2026-09-11 |
| Priority levels | Low / Medium / High | chikkannasharath@gmail.com | 2026-09-11 |
| Default task list order | By due date ascending (soonest first); no-due-date tasks last | chikkannasharath@gmail.com | 2026-09-11 |

## Open questions

Blocking questions must be resolved before approval and story decomposition.

None outstanding. Priority levels and default sort order were resolved on 2026-09-11 (see Decisions).

## Approval

- Product scope approved
- Non-goals approved
- User journeys approved
- Blocking questions resolved
