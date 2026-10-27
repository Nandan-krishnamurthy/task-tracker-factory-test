# Stories: 004-edit-priority-due-today

Stories are cut from [04-implementation-plan.md](04-implementation-plan.md), in build order. Each is meant to be reviewable in about 15 minutes and to leave `main` working. `Blocked by` lists the stories that must be merged first. Editing a task's priority (FR-017) is already delivered by REQ-010, so no story plans it. Revised after the Gate A feedback on PR #40.

## M1: "Due today" label, refreshed at midnight

### STORY-018: Show a "Due today" label on active tasks due today
- Traces to: REQ-037, REQ-038, REQ-039, REQ-040
- Blocked by: None
- Milestone: M1
- Files: src/domain/task.ts (~16), src/domain/task.test.ts (~55), src/app/controller.ts (~28), src/app/controller.test.ts (~65), src/main.ts (~4), src/ui/render.ts (~10), src/ui/render.test.ts (~55), index.html (~6), tests/e2e/due-today.spec.ts (~100), tests/e2e/accessibility.spec.ts (~25), docs/factory/traceability.md (~4)
#### Story
As an individual user, I want my active tasks that are due today to be marked "Due today", and to turn "Overdue" when the day ends, so that I can see at a glance what needs doing today without reloading the page.
#### Acceptance criteria
- AC1: Given today is 2026-10-07 on the device, when the Active view shows active tasks due 2026-10-06, 2026-10-07 and 2026-10-08 and one with no due date, then only the task due 2026-10-07 shows the text "Due today", next to its due date, and the task due 2026-10-06 still shows "Overdue".
- AC2: Given an active task due today that shows "Due today", when the user marks it complete, then its row in the Completed view shows no "Due today" label, and when the user reopens it, then its row in the Active view shows "Due today" again.
- AC3: Given the app is open at 23:59 on 2026-10-07 with an active task due 2026-10-07 that shows "Due today", when the device clock passes midnight with no user action and no reload, then that task's row shows "Overdue" and no longer shows "Due today".
- AC4: Given an active task due today that shows "Due today", when the user edits its due date to tomorrow or clears it, then the label disappears as part of the same action; and given an active task due tomorrow, when its due date is changed to today, then the label appears.
- AC5: Given an active task due today in the Active view, when axe scans the page (including the colour-contrast rule), then it reports no violations, and the task's accessible text includes both its title and "Due today".
#### Out of scope
- Editing a task's priority: already delivered by REQ-010 and unchanged (`02-requirements.md`, Out of scope).
- A "Due soon" label, and a filter, view or new order for tasks due today (Out of scope in `02-requirements.md`).
- Any change to `isOverdue`, to the "Overdue" text or style, or to the stored format `task-tracker:v1`.
#### Technical notes
- `domain/task.ts`: add `isDueToday(task, today): boolean`, true only when `!task.completed && task.dueDate !== null && task.dueDate === today`, and `msUntilNextMidnight(now: Date): number`, from local date parts (`new Date(y, m, d + 1)`), never from UTC.
- `app/controller.ts`: add the optional `setTimer?: (callback, ms) => cancel` to `ControllerDeps`. When given, schedule one refresh at `msUntilNextMidnight(now())` on creation; the refresh calls `update({ ...current })` and schedules the next one. Keep at most one pending timer. Without `setTimer`, schedule nothing (decision 5 in `03-architecture.md`).
- `main.ts`: pass `setTimer` built on `setTimeout` and `clearTimeout`.
- `ui/render.ts`: `taskItem(task, today)` appends `<span class="task-due-today">Due today</span>` after the `<time class="task-due">`, in the same place as "Overdue", when `isDueToday` is true; no `today` means no label. `editItem` is unchanged.
- `index.html`: one `.task-due-today` rule in the inline `<style>` with WCAG AA contrast; the words carry the meaning, not the style.
- E2E tests use Playwright's clock API: `page.clock.install({ time })` and `page.clock.runFor(…)` for AC3, as the clock is already used in `tests/e2e/overdue.spec.ts`. Select the label by its class: `#27 AC2` in that spec has a task titled "Due today", so a lookup by text could match the title. No new dependencies.
- If an existing assertion breaks because a row now also shows "Due today", update it and explain it in the PR (rule H3).
#### Test plan
- Unit: `isDueToday` for yesterday, today, tomorrow, no due date and a completed task due today; `msUntilNextMidnight` mid-day, just before and just after midnight; the controller with a fake `setTimer` schedules the next midnight, re-renders with the new `today` when the timer fires and schedules again, and schedules nothing without `setTimer`; `render` shows the label only for active tasks due today, after the due date, and none when `today` is absent.
- End-to-end: with the clock installed at 2026-10-07, add tasks due 2026-10-06, 2026-10-07, 2026-10-08 and none, and check the labels; complete and reopen the task due today; edit its due date forwards and clear it, and edit another task's date to today; install the clock at 23:59 and run it past midnight to see "Overdue"; run axe in the Active view with the label present.
