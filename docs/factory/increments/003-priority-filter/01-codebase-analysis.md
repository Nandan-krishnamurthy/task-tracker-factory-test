# Codebase analysis: 003-priority-filter

Date: 2026-10-23. Commit of `main` analysed: `dcbe6e757fcb8327f62a6ee793bf57b13eb5e5c4` (merge of PR #31, which added the Vitest JSON report).

## Stack

- Language: TypeScript 7.0.2 (`strict`, `noEmit`, ES2022 target, bundler module resolution; `tsconfig.json`).
- App: a client-side single-page app with no framework and no backend. The DOM is built by hand in `src/ui/`, and tasks are stored in `localStorage` under the key `task-tracker:v1`.
- Build/dev server: Vite 8.3.1 (`vite build`, `vite preview`).
- Unit tests: Vitest 5.0.2 with jsdom 29. Since PR #31, `vite.config.ts` sets the reporters to `default` and `json`, writing `reports/vitest.json` (gitignored), which `.factory/config.json` lists in `test_reports`.
- End-to-end tests: Playwright 1.63 (Chromium only), with `@axe-core/playwright` for accessibility audits.
- Package manager: npm (`package-lock.json`). No `engines` field is declared.
- No runtime dependencies; all packages are devDependencies.

## Layout

- `src/domain/`: pure logic with no DOM or storage. `task.ts` holds the `Task` type (including `priority: 'low' | 'medium' | 'high' | null` and `PRIORITIES`), validation, create, update, complete and delete; `sort.ts` holds the list order; `filter.ts` holds the views (`View`, `tasksForView`).
- `src/storage/`: `taskStore.ts` encodes and decodes the versioned `localStorage` value (`version: 1`).
- `src/app/`: `controller.ts` holds the app state (`AppState`: tasks, validation message, `view`, today) and orchestrates domain, store and render; `ids.ts` generates ids; `title.ts` holds the app title.
- `src/ui/`: `render.ts` builds the DOM, including the Active/Completed view buttons; `events.ts` wires DOM events to the controller.
- `src/main.ts`, `index.html`: bootstrap and page shell.
- Unit tests sit next to their code as `src/**/*.test.ts`.
- `tests/e2e/*.spec.ts`: Playwright acceptance tests, run against the static build served by `vite preview` on port 4173.
- `docs/factory/`: factory planning docs (`increments/001-initial/…`, `increments/002-add-due-dates/…`), `traceability.md`, and `Task Tracker.pdf` (the original PRD source).
- `.factory/`: factory config and log.
- Generated and ignored: `node_modules/`, `dist/`, `test-results/`, `playwright-report/`, `reports/`.

## Conventions

- Layering (001-initial architecture): UI → app → domain/store, with dependencies pointing inwards only. Domain functions are pure, never mutate their input, and return `{ok: false, error}` instead of throwing.
- Naming: camelCase functions, PascalCase types, user-facing messages as exported constants (e.g. `INVALID_PRIORITY`). Two-space indent, single quotes, semicolons, trailing commas. No formatter or linter is configured, so follow the existing style.
- Tests: Vitest unit tests in `<module>.test.ts` beside the module; Playwright specs in `tests/e2e/<feature>.spec.ts`, with acceptance tests per story. Acceptance tests are named `#<issue> AC<n>: …`.
- Commits: conventional-commit prefixes (`feat:`, `test:`, `docs:`, `perf:`, `chore:`) ending in `(#<issue>)`. Branches: `story/<issue>-<slug>`; planning branches: `factory/plan-<INC>`.
- No `CLAUDE.md` exists in the target.
- No external resources may be loaded at runtime (REQ-018), and the build must stay static with no backend (REQ-021).

## Commands

| Command | Value | Evidence | Baseline result |
|---|---|---|---|
| install | `npm ci && npx playwright install chromium` | Existing `.factory/config.json` value (recorded in 001-initial). `discover` proposes `npm ci` (package-lock.json); the config value is kept. | exit 0; `added 80 packages, and audited 81 packages` (npm audit reports 4 vulnerabilities: 2 moderate, 2 high) |
| build | `npm run build` | `.factory/config.json`; `package.json: scripts.build` | exit 0; `✓ built in 337ms` |
| lint | `null` | No lint script, Makefile target, linter configuration or documented command exists; `discover` reports it missing. | skipped |
| typecheck | `npm run typecheck` | `.factory/config.json`; `package.json: scripts.typecheck` | exit 0 (`tsc --noEmit`, no errors) |
| test | `npm test` | `.factory/config.json`; `package.json: scripts.test` (unit + e2e) | exit 0; unit `Tests 117 passed (117)` in 7 files; e2e `74 passed` |

## Baseline

Green.

- install: `npm ci && npx playwright install chromium`: exit 0
- build: `npm run build`: exit 0
- lint: null, skipped
- typecheck: `npm run typecheck`: exit 0
- test: `npm test`: exit 0; Vitest `Tests 117 passed (117)`, Playwright `74 passed`

## Hotspots

- **Priority already exists; filtering by it does not.** `Task.priority`, `PRIORITIES`, `isPriority`, create and edit shipped in 001-initial under REQ-004 and REQ-010 (Done), and the e2e specs `due-date-priority` and `edit-due-date-priority` cover them. No filter by priority exists. The change request asks only for the filter, so it does not overlap existing behaviour.
- **Views:** `src/domain/filter.ts` has exactly two views (`tasksForView`), and 001-initial decided there is no "All" view (REQ-007). A priority filter is a second, independent selection inside a view, so it must not change `View` or REQ-007's behaviour.
- **App state:** `AppState.view` lives in `controller.ts` and is not stored ("the view is not stored"). `addTask` already sets `view: 'active'` after adding, which is the existing precedent for resetting a selection on add.
- **Order:** REQ-012 says priority does not affect the order; a filter must keep `sortTasks` unchanged.
- `src/ui/render.ts` (247 lines) and `src/ui/render.test.ts` (376 lines) are the largest modules; new controls touch them, and the accessibility test (`tests/e2e/accessibility.spec.ts`) audits the page with axe.
- The stored format `task-tracker:v1` is validated all-or-nothing (REQ-020). A filter that is not saved needs no storage change; saving it would.
- `tests/e2e/latency-and-network.spec.ts` measures 100 ms interactions with 500 stored tasks (REQ-019); a filter change can be measured the same way.
- The first `npm test` after a cold start once failed on this machine before Playwright ran: Vitest could not start a worker for `src/ui/render.test.ts` ("Timeout waiting for worker to respond") while every test that ran passed. Later runs, including this baseline, passed.
- npm audit reports 4 vulnerabilities (2 moderate, 2 high) in the devDependency tree (not investigated; dev-only).
- No secrets or credentials files were found.

## Notes for planning

- The change request is new behaviour: filtering the existing views by the existing priority. Reuse `Priority`, `PRIORITIES` and the view-button pattern (`aria-pressed` toggle buttons in a labelled group) rather than adding new types or a new control style.
- The rule "a task is listed when it is in the view and matches the priority filter" is pure logic that fits `src/domain/filter.ts` next to `tasksForView`, so it can be checked by unit tests alone; its results are read from `reports/vitest.json`.
- `discover` proposed `npm ci` for install; the config value (`npm ci && npx playwright install chromium`) is kept because the e2e tests need the Chromium browser.
- Lint stays `null`; PRs must say that the lint gate is skipped.
- The next free requirement and story IDs come from `python scripts/factory.py increment show` (this analysis names no unallocated ID, because the ID scanner counts mentions in these documents).
