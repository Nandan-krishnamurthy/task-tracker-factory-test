# Stories: 004-edit-priority-due-today

Stories are cut from [04-implementation-plan.md](04-implementation-plan.md), in build order. Each is meant to be reviewable in about 15 minutes and to leave `main` working. `Blocked by` lists the stories that must be merged first. Editing a task's priority (FR-017) is already delivered by REQ-010, so no story plans it.

## M1: "Due today" label

### STORY-018: Show a "Due today" label on tasks due today
- Traces to: REQ-037, REQ-038
- Blocked by: None
- Milestone: M1
- Files: src/domain/task.ts (~8), src/domain/task.test.ts (~35), src/ui/render.ts (~10), src/ui/render.test.ts (~55), index.html (~6), tests/e2e/due-today.spec.ts (~90), tests/e2e/accessibility.spec.ts (~25), docs/factory/traceability.md (~2)
#### Story
As an individual user, I want tasks that are due today to be marked "Due today" so that I can see at a glance what needs doing today.
#### Acceptance criteria
- AC1: Given today is 2026-10-07 on the device, when the Active view shows a task due 2026-10-07, then that task's row shows the text "Due today" next to its due date.
- AC2: Given today is 2026-10-07 on the device, when the Active view shows a task due 2026-10-06, a task due 2026-10-08 and a task with no due date, then none of these rows shows "Due today", and the task due 2026-10-06 still shows "Overdue".
- AC3: Given a task due today that shows "Due today", when the user marks it complete, then its row in the Completed view still shows "Due today".
- AC4: Given a task due today that shows "Due today", when the user edits its due date to tomorrow or clears it, then the label disappears as part of the same action; and given a task due tomorrow, when its due date is changed to today, then the label appears.
- AC5: Given a task due today in the Active view and a completed task due today in the Completed view, when axe scans each view (including the colour-contrast rule), then it reports no violations, and the task's accessible text includes both its title and "Due today".
#### Out of scope
- Editing a task's priority: already delivered by REQ-010 and unchanged (`02-requirements.md`, Out of scope).
- A live update at midnight, a "Due soon" label, and a filter, view or new order for tasks due today (assumptions and Out of scope in `02-requirements.md`).
- Any change to the "Overdue" label, `isOverdue`, or the stored format `task-tracker:v1`.
#### Technical notes
- `domain/task.ts`: add `isDueToday(task, today): boolean`, true only when `task.dueDate !== null && task.dueDate === today`. It does not look at `task.completed` (decision 4 in `03-architecture.md`).
- `ui/render.ts`: `taskItem(task, today)` appends `<span class="task-due-today">Due today</span>` after the `<time class="task-due">`, in the same place as "Overdue", when `isDueToday` is true; no `today` means no label. `editItem` is unchanged.
- `index.html`: one `.task-due-today` rule in the inline `<style>` with WCAG AA contrast; the words carry the meaning, not the style.
- E2E tests fix the browser date with Playwright's clock API (`page.clock`), as `tests/e2e/overdue.spec.ts` does, and select the label by its class: `#27 AC2` in that spec has a task titled "Due today", so a lookup by text could match the title. No new dependencies.
- If an existing assertion breaks because a row now also shows "Due today", update it and explain it in the PR (rule H3).
#### Test plan
- Unit: `isDueToday` for yesterday, today, tomorrow, no due date and a completed task due today; `render` shows the label only for tasks due today, after the due date, and none when `today` is absent.
- End-to-end: with the clock fixed to 2026-10-07, add tasks due 2026-10-06, 2026-10-07, 2026-10-08 and none, and check the labels; complete the task due today and check the Completed view; edit its due date forwards and clear it, and edit another task's date to today; run axe in both views with the label present.
