# Architecture: 001-initial

## Overview

Task Tracker is a single-page, client-side web app with no backend (REQ-021). Everything runs in the browser: tasks are held in memory, saved to `localStorage` on every change, and loaded again when the page opens. The build is a folder of static files.

The code is split into three layers. Dependencies point inwards only: the UI knows the app layer, the app layer knows the domain and the store, and the domain knows nothing else.

```text
┌──────────────────────────── browser ────────────────────────────┐
│  index.html ─► main.ts (bootstrap)                              │
│                   │                                             │
│   ui/  (DOM rendering + event wiring)                           │
│     │  user action (add, toggle, edit, delete, switch view)     │
│     ▼                                                           │
│   app/controller.ts  ── state: tasks[] + current view           │
│     │  1. apply pure domain function                            │
│     │  2. save via store (synchronous)                          │
│     │  3. re-render                                             │
│     ├──────────────► domain/  (Task, validation, sorting; pure) │
│     └──────────────► storage/taskStore.ts ──► window.localStorage│
└─────────────────────────────────────────────────────────────────┘
```

## Components

| Component | Responsibility | Interface |
|---|---|---|
| `src/domain/task.ts` | The `Task` type and the pure operations on a task list: validate a title, create, update fields, toggle completion, delete. Invalid input returns an error instead of throwing. No DOM, no storage. | `validateTitle(raw): {ok: true, title} \| {ok: false, error}`; `createTask(list, input, now, newId)`; `updateTask(list, id, patch)`; `setCompleted(list, id, done)`; `deleteTask(list, id)`. All return a new list, or a validation error. |
| `src/domain/sort.ts` | The one list order (REQ-012): due date ascending, tasks without a due date last, ties in creation order. | `sortTasks(tasks): Task[]` (stable; does not mutate its input) |
| `src/domain/filter.ts` | Picks the tasks of a view (REQ-007). | `tasksForView(tasks, view: 'active' \| 'completed'): Task[]` |
| `src/storage/taskStore.ts` | Encodes and decodes the stored data, and reads and writes it through an injected `Storage`. Decoding is all-or-nothing: any missing, unparsable or invalid data yields an empty list plus a reason (REQ-020). A failed write is reported, not thrown. | `loadTasks(storage): {tasks, problem?}`; `saveTasks(storage, tasks): {ok: true} \| {ok: false, error}` |
| `src/app/controller.ts` | Holds the app state (`tasks`, `view`, the current validation message and storage warning). For each user action it calls the domain, then `saveTasks`, then asks the UI to render. The only component with mutable state. | `createController({storage, render, now, newId})` returning `addTask`, `editTask`, `toggleTask`, `removeTask`, `setView`, `state()` |
| `src/ui/render.ts` | Builds the DOM from the state: add-task form, validation message, Active/Completed filter, the sorted task list, and the storage warning. Each task row has a completion checkbox, its title, due date and priority, and Edit and Delete buttons. Edit mode swaps the row for an inline form. | `render(root, state, handlers)` |
| `src/ui/events.ts` | Turns DOM events (submit, change, click, keyboard) into controller calls, using native form controls so keyboard use works (REQ-016). | `bindEvents(root, controller)` |
| `src/main.ts` | Bootstrap: reads `localStorage`, creates the controller, renders the first view. | none |
| `index.html` | The page shell and the root element. It loads no external resources: no CDN, fonts or analytics (REQ-018). | none |

## Data model

**Task**

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | Unique, generated at creation. It never changes. |
| `title` | `string` | Trimmed, and at least 1 character long (REQ-002, REQ-008). |
| `dueDate` | `string \| null` | Calendar date `YYYY-MM-DD` (local date, no time and no time zone), or `null` (REQ-003, REQ-009). |
| `priority` | `'low' \| 'medium' \| 'high' \| null` | Shown as Low, Medium or High; `null` means none (REQ-004, REQ-010). |
| `completed` | `boolean` | `false` at creation (REQ-005, REQ-006). |
| `createdAt` | `string` | ISO 8601 timestamp of creation. Informational; the creation order itself is the array order. |

The task list is an array in **creation order**. New tasks are appended, and edits keep a task in its place. The display order is derived at render time by `sortTasks` and is never stored.

**Stored format:** one `localStorage` key, `task-tracker:v1`, holding JSON:

```json
{ "version": 1, "tasks": [ { "id": "…", "title": "…", "dueDate": "2026-10-01", "priority": "high", "completed": false, "createdAt": "2026-09-25T08:00:00.000Z" } ] }
```

The `version` field allows a future migration. A value that fails validation (wrong version, not an array, a task with a bad field) is treated as corrupted, and the app starts empty (REQ-020). The bad value stays in place until the next successful save overwrites it.

## Key decisions

1. **No UI framework: plain TypeScript and the DOM.**
   Options: React/Preact/Vue/Svelte, or plain DOM. The UI is one form, one filter and one list. A framework would add dependencies, build complexity and review surface for no requirement. Full re-render of the list on each change is easily fast enough for the assumed list sizes (REQ-019). *Chosen: plain DOM.*
2. **Synchronous write-through persistence.**
   Options: save on every change, debounce saves, or save on `beforeunload`. Only saving on every change, before the action returns, meets REQ-013: a crash or tab close right after an action loses nothing. `localStorage` is synchronous and the data is small. *Chosen: save on every change.*
3. **`localStorage`, not IndexedDB.**
   The data is a small JSON document and the API is synchronous, which keeps decision 2 simple. IndexedDB is asynchronous and adds complexity for no requirement (PRD §Assumptions requiring validation). *Chosen: `localStorage`, behind the `taskStore` interface so it can be replaced later.*
4. **Due date as a `YYYY-MM-DD` string, not a `Date`.**
   A due date is a calendar day, not an instant. Storing a `Date` or a timestamp causes off-by-one-day bugs across time zones. ISO date strings sort correctly as plain strings and match `<input type="date">` values directly. *Chosen: ISO date string.*
5. **All-or-nothing decoding of stored data.**
   Options: repair partially valid data, or reject the whole value. Partial repair can silently show a wrong list, and it is hard to test. REQ-020 only asks that the app starts empty instead of crashing. *Chosen: reject the whole value, start empty, and do not delete it until the next save.*
6. **Order derived at render time from creation order.**
   Options: store a sort index, or derive the order. Deriving it with a stable sort over a creation-ordered array gives REQ-012's tie rule for free, and there is nothing to keep in sync. *Chosen: derive.*
7. **A pure domain and an injected `Storage`, `now` and `newId`.**
   This makes the domain and the store unit-testable without a browser or clock. Only the UI needs end-to-end tests.
8. **Inline editing in the task row.**
   Options: inline edit, modal dialog, or a separate page. Inline is the simplest to make keyboard-accessible: no focus trap and no routing (REQ-016). Escape cancels, Enter saves, and focus returns to the row's Edit button.
9. **IDs from `crypto.randomUUID()` where available, else a time-plus-counter fallback.**
   `randomUUID` needs a secure context, and the app may be opened from `file://` or plain HTTP. The fallback is unique within one browser, which is all the app needs.
10. **Save failures are shown, not fatal.**
    If `setItem` throws (quota exceeded, storage disabled), the change stays in memory and a visible, announced warning says it may not be saved. This is the assumption in `02-requirements.md`.

## Technology choices

- **Language:** TypeScript (strict mode), compiled for current evergreen browsers (ES2022).
- **Runtime for tooling:** Node.js LTS (20 or later) with npm and a committed `package-lock.json`.
- **App runtime dependencies:** none. The shipped bundle contains only this project's code.
- **Development dependencies** (all third-party; none ships to users):
  - `typescript`: type checking and the `typecheck` gate. This is the project's language.
  - `vite`: dev server and production build into static files (REQ-021). It is the standard, low-configuration bundler for a plain TypeScript web app.
  - `vitest`: unit tests for `domain/`, `storage/` and `app/`. It shares Vite's config and TypeScript support, so no separate test transpiler is needed.
  - `jsdom`: a DOM environment for Vitest, used only by the controller and render unit tests that need `document` or `localStorage`.
  - `@playwright/test`: end-to-end tests in a real browser (Chromium). These cover the user journeys, persistence across reloads (REQ-014), keyboard operation (REQ-016), the absence of network requests (REQ-018) and UI latency (REQ-019).
  - `@axe-core/playwright`: automated accessibility checks for accessible names and roles in end-to-end tests (REQ-017). Hand-writing these checks would be incomplete and brittle.
- **No linter** is added in this increment. `typecheck` (strict `tsc`) is the static gate. `commands.lint` stays `null`, and the PR says that gate is skipped (rule H4).
- **No CI and no deployment** in this increment. No requirement asks for them (factory rules S5, S8).

## Requirement mapping

| Requirement | Component(s) |
|---|---|
| REQ-001 | `ui/render`, `ui/events`, `app/controller`, `domain/task` (`createTask`) |
| REQ-002 | `domain/task` (`validateTitle`), `app/controller`, `ui/render` (validation message) |
| REQ-003 | `domain/task` (`createTask`), `ui/render` (date input, due date display) |
| REQ-004 | `domain/task` (`createTask`, priority values), `ui/render` (priority select and display) |
| REQ-005 | `domain/task` (`setCompleted`), `domain/filter`, `app/controller`, `ui/events` (checkbox) |
| REQ-006 | `domain/task` (`setCompleted`), `domain/filter`, `app/controller`, `ui/events` (checkbox) |
| REQ-007 | `domain/filter`, `app/controller` (`view`), `ui/render` (Active/Completed filter, current view indicator) |
| REQ-008 | `domain/task` (`updateTask`, `validateTitle`), `ui/render` (inline edit form), `ui/events` |
| REQ-009 | `domain/task` (`updateTask`), `ui/render` (inline edit form), `ui/events` |
| REQ-010 | `domain/task` (`updateTask`), `ui/render` (inline edit form), `ui/events` |
| REQ-011 | `domain/task` (`deleteTask`), `app/controller`, `ui/events` (Delete button) |
| REQ-012 | `domain/sort`, `ui/render` |
| REQ-013 | `app/controller` (save after every action), `storage/taskStore` (`saveTasks`) |
| REQ-014 | `storage/taskStore` (`loadTasks`), `main.ts` |
| REQ-015 | `index.html`, `main.ts`, `ui/render` (add-task form shown at start) |
| REQ-016 | `ui/render` (native controls, focus management), `ui/events` (keyboard handling) |
| REQ-017 | `ui/render` (labels, `aria-live` validation and warning messages) |
| REQ-018 | `index.html` (no external resources), whole app (no network code) |
| REQ-019 | `app/controller` (synchronous update), `ui/render` (full synchronous re-render) |
| REQ-020 | `storage/taskStore` (all-or-nothing decode), `main.ts` |
| REQ-021 | Vite build configuration (`vite.config.ts`), `index.html` |
