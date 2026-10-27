<!-- factory:knowledge checked=e89fbb2181e84c39c268602cb3a0d597d0a410d3 -->
# Target knowledge base

What the factory knows about Task Tracker, kept across increments. S01 writes it (T7.3) and records the commit of `main` its sections were checked against on the first line. The stations read it as project conventions (rules §5, level 4). Each increment's full analysis is in `increments/<INC>/01-codebase-analysis.md`.

## Stack

- Language: TypeScript 7.0.2 (`strict`, `noEmit`, ES2022 target, bundler module resolution; `tsconfig.json`).
- App: a client-side single-page app with no framework and no backend. The DOM is built by hand in `src/ui/`.
- Storage: browser `localStorage`. Tasks under `task-tracker:v1` (a versioned value, `version: 1`); the chosen priority filter under its own key (`src/storage/filterStore.ts`).
- Build/dev server: Vite 8.3.1 (`vite build`, `vite preview`).
- Unit tests: Vitest 5.0.2 with jsdom 29. Reporters `default` and `json`, writing `reports/vitest.json` (gitignored), which `.factory/config.json` lists in `test_reports`.
- End-to-end tests: Playwright 1.63 (Chromium only), with `@axe-core/playwright` for accessibility audits.
- Package manager: npm (`package-lock.json`). No `engines` field is declared.
- No runtime dependencies; all packages are devDependencies.

## Layout

- `src/domain/`: pure logic with no DOM or storage. `task.ts` (the `Task` type, `PRIORITIES`, validation, create, update, complete, delete, `localDate`, `isOverdue`), `sort.ts` (the list order), `filter.ts` (the views and the priority filter).
- `src/storage/`: `taskStore.ts` (the task list) and `filterStore.ts` (the remembered priority filter).
- `src/app/`: `controller.ts` (the app state `AppState` and the orchestration of domain, stores and render), `ids.ts`, `title.ts`.
- `src/ui/`: `render.ts` (the DOM: add form, view buttons, priority filter buttons, task rows and the row in edit mode) and `events.ts` (DOM events to the controller).
- `src/main.ts`, `index.html`: bootstrap and page shell.
- Unit tests beside their code as `src/**/*.test.ts`; Playwright specs in `tests/e2e/*.spec.ts`, run against the static build served by `vite preview` on port 4173.
- `docs/factory/`: the factory's planning docs per increment, `traceability.md`, this file, and `Task Tracker.pdf` (the original PRD source).
- `.factory/`: factory config and log.
- Generated and ignored: `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, `reports/`.

## Conventions

- Layering: UI → app → domain/stores, with dependencies pointing inwards only. Domain functions are pure, never mutate their input, and return `{ok: false, error}` instead of throwing.
- Derived display state is computed at render time and never stored (the "Overdue" label, the filtered list). `today` comes from the controller's injected clock (`AppState.today`, recomputed on every state change), never from `new Date()` in the renderer.
- Status on a task row is text, not colour alone: `Due <date>` in a `<time>` element, `Overdue`, `<Priority> priority`, then the Edit and Delete buttons.
- Selections are toggle-button groups (`role="group"`, `aria-label`, `aria-pressed`), as the views and the priority filter use.
- Naming: camelCase functions, PascalCase types, user-facing messages as exported constants (e.g. `INVALID_PRIORITY`). Two-space indent, single quotes, semicolons, trailing commas. No formatter or linter is configured, so follow the existing style.
- Tests: Vitest unit tests in `<module>.test.ts` beside the module; Playwright specs in `tests/e2e/<feature>.spec.ts`. Acceptance tests are named `#<issue> AC<n>: …`.
- Commits: conventional-commit prefixes (`feat:`, `fix:`, `test:`, `docs:`, `perf:`, `chore:`) ending in `(#<issue>)`. Branches: `story/<issue>-<slug>`; planning branches: `factory/plan-<INC>`.
- No `CLAUDE.md` exists in the target.
- No external resources may be loaded at runtime (REQ-018), and the build must stay static with no backend (REQ-021).

## Commands

| Command | Value | Evidence | Last baseline (004-edit-priority-due-today) |
|---|---|---|---|
| install | `npm ci && npx playwright install chromium` | `.factory/config.json` (since 001-initial). `discover` proposes only `npm ci`; the config value is kept because the e2e tests need Chromium. | exit 0; `added 80 packages, and audited 81 packages in 56s` (npm audit reports 5 vulnerabilities: 2 moderate, 3 high) |
| build | `npm run build` | `package.json: scripts.build` | exit 0; `✓ built in 330ms` |
| lint | `null` | No lint script, linter configuration or documented command exists. PRs say the lint gate is skipped. | skipped |
| typecheck | `npm run typecheck` | `package.json: scripts.typecheck` | exit 0 (`tsc --noEmit`, no errors) |
| test | `npm test` | `package.json: scripts.test` (unit, then e2e) | exit 0; unit `Tests 158 passed (158)` in 8 files; e2e `89 passed (46.9s)` |

## Hotspots

- `src/ui/render.ts` and `src/ui/render.test.ts` are the largest modules; any change to what a task row or the controls show touches both.
- `src/app/controller.ts` holds all app state; `src/app/controller.test.ts` is the second-largest test file.
- `tests/e2e/accessibility.spec.ts` audits the page with axe, including colour contrast; any new control or label must pass it in both views.
- `tests/e2e/latency-and-network.spec.ts` measures 100 ms interactions with 500 stored tasks (REQ-019); per-row work on every render counts against it.
- The stored task format `task-tracker:v1` is validated all-or-nothing (REQ-020): a change to the stored shape needs a migration, while a value derived at render time needs none.
- No secrets or credentials files were found.

## Architecture decisions

- [001-initial](increments/001-initial/03-architecture.md): plain TypeScript and the DOM, no framework; synchronous write-through to `localStorage`; due dates as `YYYY-MM-DD` strings; all-or-nothing decoding of stored data; order derived at render time; a pure domain with injected `Storage`, `now` and `newId`; inline editing in the task row; save failures shown, not fatal.
- [002-add-due-dates](increments/002-add-due-dates/03-architecture.md): the "Overdue" state is derived at render time, never stored; dates compared as `YYYY-MM-DD` strings against the local date; today from the controller's injected clock; refreshed on render, not on a timer; a text label, not colour alone.
- [003-priority-filter](increments/003-priority-filter/03-architecture.md): the priority filter is a separate dimension inside the views, not more views; remembered under its own `localStorage` key; filtering is a pure domain function applied before sorting; toggle buttons as the views use; adding a task resets the filter in the controller; a failed filter save is ignored.

## Known risks

- The first `npm test` after a cold start has failed on this machine before Playwright ran (a Vitest worker timeout in `src/ui/render.test.ts`, seen in 003); later runs passed. It did not recur in this baseline: the first `npm test` of this run passed.
- npm audit reports vulnerabilities in the devDependency tree: 5 vulnerabilities (2 moderate, 3 high), up from 4 (2 moderate, 2 high) in 003 with the same `package-lock.json` (not investigated; dev-only).
- `main` is not branch-protected (`doctor` warns); the factory still never pushes to it.
- Lint is `null`: no automated style check backs the conventions above.
- Date-derived labels refresh only on the next state change, so one shown across midnight is stale until the user acts (002 decision 4).

## Changes

- 2026-10-27, 004-edit-priority-due-today: file created by S01 from this increment's analysis and 003-priority-filter's, checked against `e89fbb2` (merge of PR #39). Since 003's analysis (`dcbe6e7`), 003's stories added the priority filter (`src/domain/filter.ts`), remembering it (`src/storage/filterStore.ts`) and their tests (`tests/e2e/priority-filter.spec.ts`, `tests/e2e/remember-priority-filter.spec.ts`).
