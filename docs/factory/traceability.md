# Traceability

Requirement → Story → PR → Test, across every increment of this project. S05 creates this file and adds one row per requirement; each story PR updates its own rows at S11, so a row is merged together with the code it describes.

A requirement is **Done** when its row says `Implemented` and every PR listed for it is merged. `/factory-status` works that out from GitHub; it is not written here.

Status is one of: `Not started`, `In progress`, `Implemented`, `Deferred`.

| REQ | Stories | PRs | Tests | Status |
|---|---|---|---|---|
| REQ-001 | STORY-002 (#3) | #15 | `#3 AC2: Enter adds the task without a reload and clears the field`; `#3 AC2: the Add button adds the task too`; `#3 AC2: appends in creation order with the injected id and time` | Implemented |
| REQ-002 | STORY-002 (#3) | #15 | `#3 AC3: an empty or whitespace-only title adds nothing and shows a message`; `#3 AC4: the message disappears after a valid title is added`; `#3 AC5: shows the trimmed title`; `#3 AC3: rejects a whitespace-only title` | Implemented |
| REQ-003 | STORY-005 | — | — | Not started |
| REQ-004 | STORY-005 | — | — | Not started |
| REQ-005 | STORY-007 | — | — | Not started |
| REQ-006 | STORY-007 | — | — | Not started |
| REQ-007 | STORY-007 | — | — | Not started |
| REQ-008 | STORY-008 | — | — | Not started |
| REQ-009 | STORY-009 | — | — | Not started |
| REQ-010 | STORY-009 | — | — | Not started |
| REQ-011 | STORY-010 | — | — | Not started |
| REQ-012 | STORY-006 | — | — | Not started |
| REQ-013 | STORY-003, STORY-004 | — | — | Not started |
| REQ-014 | STORY-003 | — | — | Not started |
| REQ-015 | STORY-002 (#3) | #15 | `#3 AC1: opens straight onto the add-task form, with no setup step`; `#3 AC1: shows a labelled title field and an Add button` | Implemented |
| REQ-016 | STORY-011 | — | — | Not started |
| REQ-017 | STORY-011 | — | — | Not started |
| REQ-018 | STORY-001 (#2), STORY-012 | #14 | `#2 AC3 AC4: shows the heading and requests only its own files` | In progress |
| REQ-019 | STORY-012 | — | — | Not started |
| REQ-020 | STORY-004 | — | — | Not started |
| REQ-021 | STORY-001 (#2) | #14 | `#2 AC1: the build writes index.html and its assets to dist/`; `#2 AC3 AC4: shows the heading and requests only its own files` | Implemented |
