# Codebase analysis: 004-edit-priority-due-today

Date: 2026-10-27. Commit of `main` analysed: `e89fbb2181e84c39c268602cb3a0d597d0a410d3` (merge of PR #39, the last story of 003-priority-filter).

This analysis reuses [003-priority-filter's analysis](../003-priority-filter/01-codebase-analysis.md) and records what changed since its commit (`dcbe6e7`): 003's three stories (PRs #37, #38 and #39) added the priority filter and remembering it.

## Stack

- Language: TypeScript 7.0.2 (`strict`, `noEmit`, ES2022 target, bundler module resolution; `tsconfig.json`).
- App: a client-side single-page app with no framework and no backend. The DOM is built by hand in `src/ui/`. Tasks are stored in `localStorage` under the key `task-tracker:v1`, and since 003 the chosen priority filter under its own key (`src/storage/filterStore.ts`).
- Build/dev server: Vite 8.3.1 (`vite build`, `vite preview`).
- Unit tests: Vitest 5.0.2 with jsdom 29. `vite.config.ts` sets the reporters to `default` and `json`, writing `reports/vitest.json` (gitignored), which `.factory/config.json` lists in `test_reports`.
- End-to-end tests: Playwright 1.63 (Chromium only), with `@axe-core/playwright` for accessibility audits.
- Package manager: npm (`package-lock.json`). No `engines` field is declared. Node `v24.12.0` and npm `11.6.2` on this machine.
- No runtime dependencies; all six packages are devDependencies. `package.json` and `package-lock.json` are unchanged since 003's analysis.

## Layout

- `src/domain/`: pure logic with no DOM or storage.
  - `task.ts` (149 lines): the `Task` type (`priority: 'low' | 'medium' | 'high' | null`, `dueDate: string | null` as `YYYY-MM-DD`), `PRIORITIES`, validation, create, update, complete, delete, and `isOverdue(task, today)`.
  - `sort.ts`: the list order.
  - `filter.ts`: the views (`View`, `tasksForView`) and, since 003, the priority filter (`PriorityFilter`, `PRIORITY_FILTERS`, `tasksForPriority`).
- `src/storage/`: `taskStore.ts` encodes and decodes the versioned task list (`version: 1`); `filterStore.ts` (new in 003) saves and loads the chosen priority filter.
- `src/app/`: `controller.ts` (146 lines) holds the app state (`AppState`: tasks, validation message, `view`, `priorityFilter`, `editing`, `storageWarning`, `today`) and orchestrates domain, stores and render; `ids.ts` generates ids; `title.ts` holds the app title.
- `src/ui/`: `render.ts` (292 lines) builds the DOM: the add form, the Active/Completed view buttons, the priority filter buttons, each task row (`taskItem`) and the row in edit mode (`editItem`). `events.ts` wires DOM events to the controller.
- `src/main.ts`, `index.html`: bootstrap and page shell. `main.ts` also loads the remembered filter.
- Unit tests sit next to their code as `src/**/*.test.ts`.
- `tests/e2e/*.spec.ts`: 15 Playwright specs, run against the static build served by `vite preview` on port 4173. New in 003: `priority-filter.spec.ts` and `remember-priority-filter.spec.ts`.
- `docs/factory/`: factory planning docs (`increments/001-initial/…`, `002-add-due-dates/…`, `003-priority-filter/…`), `traceability.md`, and `Task Tracker.pdf` (the original PRD source).
- `.factory/`: factory config and log.
- Generated and ignored: `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, `reports/`.

## Conventions

- Layering (001-initial architecture): UI → app → domain/stores, with dependencies pointing inwards only. Domain functions are pure, never mutate their input, and return `{ok: false, error}` instead of throwing.
- Derived display state is computed at render time and never stored: the "Overdue" label (002 decision 1) and the filtered list (003 decision 3). `today` comes from the controller's injected clock (`AppState.today`, recomputed on every state change), never from `new Date()` in the renderer (002 decision 3).
- Status shown on a task row is text, not colour alone (002 decision 5): `Due <date>` in a `<time>` element, then `Overdue` (`span.task-overdue`), then `<Priority> priority` (`span.task-priority`), then the Edit and Delete buttons.
- Toggle-button groups (`role="group"`, `aria-label`, `aria-pressed`) for the views and the priority filter (003 decision 5).
- Naming: camelCase functions, PascalCase types, user-facing messages as exported constants (e.g. `INVALID_PRIORITY`). Two-space indent, single quotes, semicolons, trailing commas. No formatter or linter is configured, so follow the existing style.
- Tests: Vitest unit tests in `<module>.test.ts` beside the module; Playwright specs in `tests/e2e/<feature>.spec.ts`, with acceptance tests per story, named `#<issue> AC<n>: …`.
- Commits: conventional-commit prefixes (`feat:`, `fix:`, `test:`, `docs:`, `perf:`, `chore:`) ending in `(#<issue>)`. Branches: `story/<issue>-<slug>`; planning branches: `factory/plan-<INC>`.
- No `CLAUDE.md` exists in the target.
- No external resources may be loaded at runtime (REQ-018), and the build must stay static with no backend (REQ-021).

## Commands

| Command | Value | Evidence | Baseline result |
|---|---|---|---|
| install | `npm ci && npx playwright install chromium` | Existing `.factory/config.json` value (recorded in 001-initial). `discover` proposes `npm ci` (package-lock.json); the config value is kept. | exit 0; `added 80 packages, and audited 81 packages in 56s` (npm audit reports 5 vulnerabilities: 2 moderate, 3 high) |
| build | `npm run build` | `.factory/config.json`; `package.json: scripts.build` | exit 0; `✓ built in 330ms` |
| lint | `null` | No lint script, Makefile target, linter configuration or documented command exists; `discover` reports it missing. | skipped |
| typecheck | `npm run typecheck` | `.factory/config.json`; `package.json: scripts.typecheck` | exit 0 (`tsc --noEmit`, no errors) |
| test | `npm test` | `.factory/config.json`; `package.json: scripts.test` (unit + e2e) | exit 0; unit `Tests 158 passed (158)` in 8 files; e2e `89 passed (46.9s)` |

## Baseline

Green.

- install: `npm ci && npx playwright install chromium`: exit 0
- build: `npm run build`: exit 0
- lint: null, skipped
- typecheck: `npm run typecheck`: exit 0
- test: `npm test`: exit 0; Vitest `Test Files 8 passed (8)`, `Tests 158 passed (158)`; Playwright `89 passed (46.9s)`

The full output is not committed; it was run on `factory/plan-004-edit-priority-due-today` at `54bd184`, whose code is identical to `main` at `e89fbb2` (S00 added only planning files).

## Hotspots

- **Editing a task's priority already exists.** `editItem` in `src/ui/render.ts` renders a "New priority" select (`select.task-edit-priority`) holding the current value, and the controller saves it through `updateTask` in `src/domain/task.ts`. It shipped in 001-initial under REQ-010 (Done: "The user can set, change or clear the priority (Low, Medium, High) of an existing task (active or completed), and the change is shown immediately"), covered by `tests/e2e/edit-due-date-priority.spec.ts`, `src/domain/task.test.ts` and `src/app/controller.test.ts`. 003 also relies on it (REQ-031). The change request's FR-017, "The user can edit a task's priority", states that same behaviour and names nothing beyond it.
- **No "Due today" label exists.** `taskItem` shows `Due <date>`, then "Overdue" only when `isOverdue(task, today)` holds (an open task whose due date is before today, REQ-022 to REQ-024). A task due today shows no label (REQ-023), and 002 left "Should a task due today also be marked (for example "Due today")?" open with the answer "no", putting such a label out of scope. FR-018 asks for it now.
- **"Today" refreshes on render, not on a timer** (002 decision 4): `controller.ts` sets `today: localDate(now())` on every state change. A date-derived label therefore changes at midnight only after the next user action (the change request's Open question 3).
- `src/ui/render.ts` (292 lines) and `src/ui/render.test.ts` (539 lines) are the largest modules; a new label touches both, and `src/app/controller.test.ts` (437 lines) is next. The accessibility test (`tests/e2e/accessibility.spec.ts`) audits the page with axe, including colour contrast (REQ-026).
- `tests/e2e/latency-and-network.spec.ts` measures 100 ms interactions with 500 stored tasks (REQ-019); a per-row label adds work to every render.
- The stored format `task-tracker:v1` is validated all-or-nothing (REQ-020). A label derived at render time needs no storage change.
- The first `npm test` after a cold start once failed on this machine before Playwright ran (a Vitest worker timeout in `src/ui/render.test.ts`, recorded in 003's analysis). It did not recur in this baseline: the first `npm test` of this run passed.
- npm audit: 5 vulnerabilities (2 moderate, 3 high), up from 4 (2 moderate, 2 high) in 003 with the same `package-lock.json` in the devDependency tree (not investigated; dev-only).
- No secrets or credentials files were found.

## Notes for planning

- FR-017 restates REQ-010, which is Done (see Hotspots). S02 should check it against REQ-010 rather than plan it as new work.
- FR-018 is new behaviour. The existing "Overdue" label is the pattern to follow: derived at render time from `AppState.today` with a pure domain predicate next to `isOverdue`, shown as text in the task row, covered by `src/ui/render.test.ts` and an e2e spec. The change request leaves open which views show it, completed tasks, placement, midnight, assistive technology, immediate updates and the requirement priority (its Open questions 1–7); S02 records assumptions for them.
- The definitions to reuse: a due date is a `YYYY-MM-DD` string compared with the local date (002 decision 2); "Overdue" means strictly before today, so "due today" and "Overdue" can never both hold for one task.
- `discover` proposed `npm ci` for install; the config value (`npm ci && npx playwright install chromium`) is kept because the e2e tests need the Chromium browser.
- Lint stays `null`; PRs must say that the lint gate is skipped.
- This is the target's first `docs/factory/knowledge.md`. It is written from this analysis and 003's.
- The next free requirement and story IDs come from `python scripts/factory.py increment show`.
