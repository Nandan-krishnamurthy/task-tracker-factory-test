# Implementation plan: 001-initial

This is a new project, so the plan starts from an empty repository. Each milestone leaves `main` working and demonstrable. Persistence comes early so that every later feature is saved from the start. Accessibility is built into every story (native controls, labels) and audited as a whole in M6.

## Milestones

### M1: Walking skeleton and task capture
- **Goal:** first, a walking skeleton: the TypeScript + Vite project scaffold, the Vitest and Playwright test runners with one passing test each, the npm scripts, and the factory `commands` recorded in `.factory/config.json`. No CI (no requirement asks for it). Then the first real feature: add a task by title, with validation.
- **Requirements:** REQ-001, REQ-002, REQ-015, REQ-018, REQ-021
- **Demo:** `npm run build` produces static files. The page opens straight onto the add-task form, a titled task appears in the list without a reload, an empty title shows a validation message, and the browser's network log shows no requests after load.

### M2: Persistence
- **Goal:** save every change to `localStorage` synchronously and restore the tasks on load. Survive corrupted data and failed writes.
- **Requirements:** REQ-013, REQ-014, REQ-020
- **Demo:** add tasks, reload or close and reopen the browser, and the tasks are still there. Put garbage in the `task-tracker:v1` key and reload: the app starts empty and still works. Make storage throw: a warning appears and the app keeps working.

### M3: Due date, priority and ordering
- **Goal:** optional due date and priority at creation, shown on each task, and the default due-date order.
- **Requirements:** REQ-003, REQ-004, REQ-012
- **Demo:** add tasks with and without due dates and priorities. The list is soonest-first, undated tasks come last, and ties keep creation order.

### M4: Completing tasks and views
- **Goal:** complete and reopen tasks, and switch between the Active and Completed views.
- **Requirements:** REQ-005, REQ-006, REQ-007
- **Demo:** tick a task and it moves to Completed; untick it and it moves back to Active. The current view is indicated, and the app opens on Active.

### M5: Editing and deleting
- **Goal:** inline editing of title, due date and priority, and deleting, for both active and completed tasks.
- **Requirements:** REQ-008, REQ-009, REQ-010, REQ-011
- **Demo:** edit each field (including clearing the due date and priority), try to save an empty title (rejected), and delete a task from each view. Every change survives a reload.

### M6: Accessibility and performance verification
- **Goal:** audit the finished UI for keyboard operation and accessible names, fix what the audit finds, and verify the latency and no-network requirements across complete journeys.
- **Requirements:** REQ-016, REQ-017, REQ-019
- **Demo:** the end-to-end suite runs axe with zero violations in each view and in edit mode, completes every journey with the keyboard only, and checks UI latency with 500 tasks.

## Dependencies

```text
M1 skeleton ─► M1 add task ─► M2 persistence ─┬─► M3 due date/priority ─► M3 ordering ──┐
                                              ├─► M4 complete + views ─────────────────┼─► M6 audit
                                              └─► M5 edit title ─► M5 edit date/priority┤
                                                  (M4) ─► M5 delete ────────────────────┘
```

- M1 comes first: every story needs the scaffold and test runners, and the task list.
- M2 comes before M3–M5, so that each later feature only has to call the controller's single save path, and is tested for persistence as it is built.
- Editing due date and priority (M5) needs the fields from M3. Deleting from the Completed view needs M4's views.
- M6 needs every interactive element to exist.

## Testing approach

`.factory/config.json` has every command set to `null` today. The walking-skeleton story (the first story of M1) introduces the npm scripts and records the real commands in `commands`. Until then, no gate command exists, and none is guessed (rule H4). The planned scripts are `npm run build`, `npm run typecheck` and `npm test` (unit and end-to-end), with `npm ci` plus the Playwright browser install as `install`. That story confirms the exact commands by running them.

| Kind of requirement | Test level | Runner |
|---|---|---|
| Domain rules: title validation, create/update/complete/delete, sort order, view filter (REQ-001–REQ-012) | Unit, pure functions | Vitest |
| Storage encode/decode, corrupted data, failed writes (REQ-013, REQ-014, REQ-020) | Unit, with a fake `Storage` | Vitest |
| Controller: each action saves then renders (REQ-013) | Unit, with jsdom | Vitest |
| User journeys 1–4, the views and inline editing (REQ-001–REQ-015) | End-to-end in Chromium | Playwright |
| Reload and reopen persistence (REQ-014) | End-to-end: reload the page, and reopen a new page in the same browser context | Playwright |
| No network after load (REQ-018) | End-to-end: record requests during a full journey | Playwright |
| Keyboard operation and accessible names (REQ-016, REQ-017) | End-to-end: keyboard-only journeys and axe scans | Playwright + `@axe-core/playwright` |
| Latency (REQ-019) | End-to-end timing with 500 seeded tasks | Playwright |
| Static build (REQ-021) | The build command, plus an end-to-end run against the built output (`vite preview`) | Vite, Playwright |

Every story adds its own tests. No story deletes or weakens an earlier test.

## Requirement coverage

| Requirement | Milestone |
|---|---|
| REQ-001 | M1 |
| REQ-002 | M1 |
| REQ-003 | M3 |
| REQ-004 | M3 |
| REQ-005 | M4 |
| REQ-006 | M4 |
| REQ-007 | M4 |
| REQ-008 | M5 |
| REQ-009 | M5 |
| REQ-010 | M5 |
| REQ-011 | M5 |
| REQ-012 | M3 |
| REQ-013 | M2 |
| REQ-014 | M2 |
| REQ-015 | M1 |
| REQ-016 | M6 |
| REQ-017 | M6 |
| REQ-018 | M1 |
| REQ-019 | M6 |
| REQ-020 | M2 |
| REQ-021 | M1 |

## Risks

- **Playwright needs a browser download** (about 150 MB for Chromium) on the machine that runs the tests. *Mitigation:* the walking-skeleton story records the install step in `commands.install`. If the install fails, the story stops and asks (rule H6) rather than dropping the end-to-end tests.
- **The walking skeleton is the biggest story, because of generated config and the lock file.** *Mitigation:* keep it to the minimum scaffold. `package-lock.json` is generated, and the PR says so, so that the reviewable diff stays small.
- **The 100 ms latency check can be flaky on a slow or busy machine.** *Mitigation:* measure the time from action to DOM update inside the page (not wall-clock across processes), use the median of several runs, and seed a realistic 500 tasks.
- **Accessibility gaps found late in M6.** *Mitigation:* every story uses native controls with labels from the start, and M6 is an audit plus fixes, not a rewrite.
- **Open questions answered differently at Gate A** (for example: delete confirmation, clearing fields). *Mitigation:* each one affects a single story in M5 or M3, and can be revised in this PR before any code exists.
