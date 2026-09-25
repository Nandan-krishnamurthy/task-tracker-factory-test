# Traceability

Requirement → Story → PR → Test, across every increment of this project. S05 creates this file and adds one row per requirement; each story PR updates its own rows at S11, so a row is merged together with the code it describes.

A requirement is **Done** when its row says `Implemented` and every PR listed for it is merged. `/factory-status` works that out from GitHub; it is not written here.

Status is one of: `Not started`, `In progress`, `Implemented`, `Deferred`.

| REQ | Stories | PRs | Tests | Status |
|---|---|---|---|---|
| REQ-001 | STORY-002 (#3) | #15 | `#3 AC2: Enter adds the task without a reload and clears the field`; `#3 AC2: the Add button adds the task too`; `#3 AC2: appends in creation order with the injected id and time` | Implemented |
| REQ-002 | STORY-002 (#3) | #15 | `#3 AC3: an empty or whitespace-only title adds nothing and shows a message`; `#3 AC4: the message disappears after a valid title is added`; `#3 AC5: shows the trimmed title`; `#3 AC3: rejects a whitespace-only title` | Implemented |
| REQ-003 | STORY-005 (#6) | #18 | `#6 AC1: a task added with a due date shows that date`; `#6 AC3: a task added with neither shows neither`; `#6 AC4: due date and priority are unchanged after a reload`; `#6 AC1: rejects a due date that is not a calendar day` | Implemented |
| REQ-004 | STORY-005 (#6) | #18 | `#6 AC2: a task added with priority Low/Medium/High shows that priority`; `#6 AC3: a task added with neither shows neither`; `#6 AC5: the priority choices are only none, Low, Medium and High`; `#6 AC2: rejects a priority that is not low, medium or high` | Implemented |
| REQ-005 | STORY-007 | — | — | Not started |
| REQ-006 | STORY-007 | — | — | Not started |
| REQ-007 | STORY-007 | — | — | Not started |
| REQ-008 | STORY-008 | — | — | Not started |
| REQ-009 | STORY-009 | — | — | Not started |
| REQ-010 | STORY-009 | — | — | Not started |
| REQ-011 | STORY-010 | — | — | Not started |
| REQ-012 | STORY-006 | — | — | Not started |
| REQ-013 | STORY-003 (#4), STORY-004 (#5) | #16, #17 | `#4 AC3: once the add has returned, task-tracker:v1 already holds the task`; `#4 AC3: when addTask returns, task-tracker:v1 already holds the new task`; `#4 AC3: writes the exact stored format under task-tracker:v1`; `#5 AC3: when saving throws, the task still appears with an announced warning`; `#5 AC3: a setItem that throws is reported, not thrown` | Implemented |
| REQ-014 | STORY-003 (#4) | #16 | `#4 AC1: after a reload the same tasks are shown, in the same order`; `#4 AC2: a new page in the same browser profile shows the tasks with no user action`; `#4 AC4: on a first visit the list is empty and there is no error`; `#4 AC1: round-trips every Task field, in the same order` | Implemented |
| REQ-015 | STORY-002 (#3) | #15 | `#3 AC1: opens straight onto the add-task form, with no setup step`; `#3 AC1: shows a labelled title field and an Add button` | Implemented |
| REQ-016 | STORY-011 | — | — | Not started |
| REQ-017 | STORY-011 | — | — | Not started |
| REQ-018 | STORY-001 (#2), STORY-012 | #14 | `#2 AC3 AC4: shows the heading and requests only its own files` | In progress |
| REQ-019 | STORY-012 | — | — | Not started |
| REQ-020 | STORY-004 (#5) | #17 | `#5 AC1: text that is not JSON gives an empty list, and a task can be added`; `#5 AC2: a wrong version / tasks not a list / a task with an invalid field gives an empty list without crashing`; `#5 AC4: opening the app with corrupted data and changing nothing leaves it as it was`; `#5 AC4: loading never writes, so corrupted data stays as it was` | Implemented |
| REQ-021 | STORY-001 (#2) | #14 | `#2 AC1: the build writes index.html and its assets to dist/`; `#2 AC3 AC4: shows the heading and requests only its own files` | Implemented |
