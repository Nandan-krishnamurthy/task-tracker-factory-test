# Codebase analysis: 002-add-due-dates

Date: 2026-10-07. Commit of `main` analysed: `e691d55d05dd6834f5a325fad98c3b60f16b71d1` (merge of PR #25, the last story of increment 001-initial).

## Stack

- Language: TypeScript 7.0.2 (`strict`, `noEmit`, ES2022 target, bundler module resolution; `tsconfig.json`).
- App: a client-side single-page app with no framework and no backend. The DOM is built by hand in `src/ui/`, and tasks are stored in `localStorage` under the key `task-tracker:v1`.
- Build/dev server: Vite 8.3.1 (`vite build`, `vite preview`).
- Unit tests: Vitest 5.0.2 with jsdom 29.
- End-to-end tests: Playwright 1.63 (Chromium only), with `@axe-core/playwright` for accessibility audits.
- Package manager: npm (`package-lock.json`). Runtime used here: Node v24.12.0, npm 11.6.2. No `engines` field is declared.
- No runtime dependencies; all packages are devDependencies.

## Layout

- `src/domain/`: pure logic with no DOM or storage. `task.ts` holds the `Task` type, validation, create, update, complete and delete; `sort.ts` holds the list order; `filter.ts` holds the views.
- `src/storage/`: `taskStore.ts` encodes and decodes the versioned `localStorage` value.
- `src/app/`: `controller.ts` holds the app state and orchestrates domain, store and render; `ids.ts` generates ids; `title.ts` holds the app title.
- `src/ui/`: `render.ts` builds the DOM; `events.ts` wires DOM events to the controller.
- `src/main.ts`, `index.html`: bootstrap and page shell.
- Unit tests sit next to their code as `src/**/*.test.ts`.
- `tests/e2e/*.spec.ts`: Playwright acceptance tests, run against the static build served by `vite preview` on port 4173.
- `docs/factory/`: factory planning docs (`increments/001-initial/…`), `traceability.md`, and `Task Tracker.pdf` (the original PRD source).
- `.factory/`: factory config and log.
- Generated and ignored: `node_modules/`, `dist/`, `test-results/`, `playwright-report/`.

## Conventions

- Layering (001-initial architecture): UI → app → domain/store, with dependencies pointing inwards only. Domain functions are pure, never mutate their input, and return `{ok: false, error}` instead of throwing.
- Naming: camelCase functions, PascalCase types, user-facing messages as exported constants (e.g. `INVALID_DUE_DATE`). Two-space indent, single quotes, semicolons, trailing commas. No formatter or linter is configured, so follow the existing style.
- Tests: Vitest unit tests in `<module>.test.ts` beside the module; Playwright specs in `tests/e2e/<feature>.spec.ts`, with acceptance tests per story.
- Commits: conventional-commit prefixes (`feat:`, `test:`, `docs:`, `perf:`, `chore:`) ending in `(#<issue>)`. Branches: `story/<issue>-<slug>`; planning branches: `factory/plan-<INC>`.
- No `CLAUDE.md` exists in the target.
- No external resources may be loaded at runtime (REQ-018), and the build must stay static with no backend (REQ-021).

## Commands

| Command | Value | Evidence | Baseline result |
|---|---|---|---|
| install | `npm ci && npx playwright install chromium` | Existing `.factory/config.json` value (recorded in 001-initial). `discover` proposes `npm ci` (package-lock.json); the config value is kept. | exit 0; added 80 packages (npm audit reports 1 high-severity vulnerability) |
| build | `npm run build` | `.factory/config.json`; `package.json: scripts.build` | exit 0; `✓ built` |
| lint | `null` | No lint script, Makefile target, linter configuration or documented command exists; `discover` reports it missing. | skipped |
| typecheck | `npm run typecheck` | `.factory/config.json`; `package.json: scripts.typecheck` | exit 0 (`tsc --noEmit`, no errors) |
| test | `npm test` | `.factory/config.json`; `package.json: scripts.test` (unit + e2e) | exit 0; unit `Tests 107 passed (107)` in 7 files; e2e `65 passed` |

## Baseline

Green.

- install: `npm ci && npx playwright install chromium`: exit 0
- build: `npm run build`: exit 0
- lint: null, skipped
- typecheck: `npm run typecheck`: exit 0
- test: `npm test`: exit 0; Vitest `Tests 107 passed (107)`, Playwright `65 passed`

## Hotspots

- **Due dates already exist.** `Task.dueDate` (`YYYY-MM-DD` or `null`), its validation (`isCalendarDate`, `INVALID_DUE_DATE`), create and edit (`createTask`, `updateTask`), sorting (`sortTasks`), persistence and the UI inputs all shipped in 001-initial under REQ-003, REQ-009, REQ-012 and REQ-014, which are all Done. The e2e specs `due-date-priority`, `edit-due-date-priority` and `sort-by-due-date` cover them. A change request to "add due dates" overlaps existing behaviour.
- `src/ui/render.ts` (240 lines) and `src/ui/render.test.ts` (326 lines) are the largest modules; any change to how due dates are shown touches them.
- The stored format `task-tracker:v1` is validated all-or-nothing (REQ-020). Any change to the `Task` shape needs a version bump and a migration, or existing users lose their data.
- 001-initial records that overdue tasks get no special treatment and that reminders are a non-goal; changing either is new scope.
- npm audit reports 1 high-severity vulnerability in the devDependency tree (not investigated; dev-only).
- No secrets or credentials files were found.

## Notes for planning

- The change request "Add due dates to tasks" is already satisfied by the existing code (REQ-003, REQ-009, REQ-012, REQ-014). S02 must settle with the human what new behaviour, if any, is wanted (for example overdue highlighting, a "due soon" view, relative dates or a time of day) rather than re-implement existing features. This is an ambiguous requirement (rule H6).
- `discover` proposed `npm ci` for install; the config value (`npm ci && npx playwright install chromium`) is kept because the e2e tests need the Chromium browser.
- Lint stays `null`; PRs must say that the lint gate is skipped.
- Next free IDs: REQ-022, STORY-013.
