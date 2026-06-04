# Tasks: Gameplay Interaction

**Input**: Design documents from `specs/003-gameplay-interaction/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user story from spec.md (US1–US3)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Backend model changes and shared type/service scaffolding required by all three user stories. Must complete before any user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [P] Add `StrokePoint` and `Stroke` interfaces to `backend/src/models/game.ts`
- [x] T002 [P] Add `GuessEntry` interface to `backend/src/models/game.ts`
- [x] T003 [P] Add `strokes: Stroke[]` and `guesses: GuessEntry[]` to the `Room` interface in `backend/src/models/game.ts`
- [x] T004 [P] Add `strokes: Stroke[]` and `guesses: GuessEntry[]` to the `RoomSnapshot` interface in `backend/src/models/game.ts`
- [x] T005 Initialize `strokes: []` and `guesses: []` in the `Room` object literal inside `createRoom()` in `backend/src/services/roomStore.ts` (depends on T001–T003)
- [x] T006 Reset `room.strokes = []` and `room.guesses = []` inside `startRoom()` (after existing validation, before `room.updatedAt = now()`) in `backend/src/services/roomStore.ts` (depends on T003)
- [x] T007 Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts` to return `strokes: room.strokes.map(s => ({ points: [...s.points] }))` and `guesses: room.guesses.map(g => ({ ...g }))` (depends on T003, T004)
- [x] T008 Add `StrokePoint`, `Stroke`, `GuessEntry` types and add `strokes: Stroke[]` and `guesses: GuessEntry[]` to the `RoomSnapshot` interface in `frontend/src/services/api.ts` (depends on T001–T004)

**Checkpoint**: Model and shared type changes in place — all three user story phases can now begin.

---

## Phase 2: User Story 1 — Drawer Draws on Canvas (Priority: P1) 🎯 MVP

**Goal**: Drawer draws freehand strokes on a canvas using native pointer events. Each completed stroke is POSTed to the server immediately on pointer-up (one request per stroke). Guessers see all strokes within ~2 seconds via polling. Guessers cannot draw. Page-refresh restores all strokes.

**Independent Test**: Create a room as Alice (Tab A = host/drawer), join as Bob (Tab B = guesser), start the game. In Tab A, draw strokes on the canvas. Within ~2 seconds, confirm Tab B shows the same strokes. Confirm Tab B cannot draw on the canvas. Refresh Tab B and confirm strokes reappear within ~2 seconds.

### Implementation for User Story 1

- [x] T009 [P] [US1] Add `addStrokeSchema` (validates `participantId: string` and `stroke: { points: [{x,y}] }` with `x,y` in `[0,1]`) to `backend/src/api/schemas.ts`
- [x] T010 [US1] Add `addStroke(code, participantId, stroke)` export to `backend/src/services/roomStore.ts`: validate room exists, status is `"game"`, caller is drawer; push stroke; update `updatedAt`; return `{ room: cloneRoom(room) }` or typed error (depends on T005, T006, T007)
- [x] T011 [US1] Add `POST /:code/strokes` route handler to `backend/src/api/rooms.ts`: parse params with `roomCodeParamsSchema`, body with `addStrokeSchema`; call `addStroke()`; map errors to 404/400/403; respond `{ room: toRoomSnapshot(room, participantId) }` (depends on T009, T010)
- [x] T012 [P] [US1] Add `api.addStroke(code, participantId, stroke)` method to `frontend/src/services/api.ts` (depends on T008)
- [x] T013 [US1] Replace the one-time `useEffect` that calls `roomStore.fetchRoom()` in `frontend/src/pages/GamePage.tsx` with a `setInterval`-based poll at 2000 ms; fetch immediately on mount and every 2 s thereafter; `clearInterval` on unmount (depends on T008)
- [x] T014 [US1] Add `<canvas ref={canvasRef}>` element to the Canvas card in `frontend/src/pages/GamePage.tsx`; when `isDrawer`, attach `onPointerDown`/`onPointerMove`/`onPointerUp` handlers that track normalized `{x: e.offsetX/canvas.width, y: e.offsetY/canvas.height}` points into a `currentStroke` ref; set `cursor: "crosshair"` for drawer and `cursor: "default"` for guessers (depends on T013)
- [x] T015 [US1] Add a `useEffect` on `[room.strokes, currentStroke]` in `frontend/src/pages/GamePage.tsx` that clears the canvas and redraws all committed strokes from `room.strokes` plus the in-progress `currentStroke`; denormalize coordinates as `x * canvas.width` and `y * canvas.height`; use `moveTo` on the first point and `lineTo` for subsequent points of each stroke (depends on T014)
- [x] T016 [US1] On `pointerUp` in `frontend/src/pages/GamePage.tsx`, if `currentStroke.length > 0` call `api.addStroke()` (fire-and-forget, errors swallowed silently), then clear `currentStroke` (depends on T015, T012)
- [x] T017 [P] [US1] Add unit tests in `backend/src/services/roomStore.test.ts`: `addStroke` appends a stroke to `room.strokes`; `addStroke` returns `error: "not_drawer"` when caller is not the drawer; `addStroke` returns `error: "not_in_game"` when room status is not `"game"`; `addStroke` returns `error: "room_not_found"` for unknown code (depends on T010)
- [x] T018 [P] [US1] Add unit test in `backend/src/services/roomStore.test.ts`: `toRoomSnapshot()` includes all committed strokes in the `strokes` array (depends on T007)

**Checkpoint**: Drawing fully working end-to-end. US1 independently testable with two browser tabs.

---

## Phase 3: User Story 2 — Guesser Submits a Guess (Priority: P2)

**Goal**: Guessers can type and submit a text guess. The POST response returns `isCorrect` immediately (no polling wait). A correct guess disables the guess input instantly. The drawer has no guess input.

**Independent Test**: Start a game (Alice draws, Bob guesses). In Bob's tab, submit an incorrect word — confirm no "Correct!" indicator and input stays active. Submit the correct word — confirm "Correct!" appears immediately and the input becomes disabled. Confirm Alice has no guess input field.

### Implementation for User Story 2

- [x] T019 [P] [US2] Add `submitGuessSchema` (validates `participantId: string` and `text: string`) to `backend/src/api/schemas.ts`
- [x] T020 [US2] Add `submitGuess(code, participantId, text)` export to `backend/src/services/roomStore.ts`: validate room exists and is in `"game"` state; reject empty/whitespace text (error `empty_guess`); reject if caller is drawer (error `drawer_cannot_guess`); reject if caller not found (error `participant_not_found`); reject if caller already has `isCorrect: true` in `room.guesses` (error `already_correct`); compute `isCorrect = trimmed.toLowerCase() === room.currentWord!.trim().toLowerCase()`; append `GuessEntry`; return `{ isCorrect, guess: { ...entry } }` (depends on T005, T006)
- [x] T021 [US2] Add `POST /:code/guesses` route handler to `backend/src/api/rooms.ts`: parse params with `roomCodeParamsSchema`, body with `submitGuessSchema`; call `submitGuess()`; map errors to 400/403/404; respond `{ isCorrect, guess }` — do NOT include `currentWord` in response (depends on T019, T020)
- [x] T022 [P] [US2] Add `api.submitGuess(code, participantId, text)` method to `frontend/src/services/api.ts` returning `{ isCorrect: boolean; guess: GuessEntry }` (depends on T008)
- [x] T023 [US2] Add guess input section to `frontend/src/pages/GamePage.tsx` (visible only when `!isDrawer`): local state `guessText` and `hasGuessedCorrectly`; initialize `hasGuessedCorrectly` from `room.guesses.some(g => g.participantId === participantId && g.isCorrect)` to restore state after page refresh; on submit call `api.submitGuess()` and set `hasGuessedCorrectly = true` when `isCorrect` is true (depends on T013, T022)
- [x] T024 [US2] Show "Correct!" indicator and disable the guess input and button when `hasGuessedCorrectly` is true in `frontend/src/pages/GamePage.tsx` (depends on T023)
- [x] T025 [P] [US2] Add unit tests in `backend/src/services/roomStore.test.ts`: `submitGuess` returns `isCorrect: true` for case-insensitive exact match; `submitGuess` returns `isCorrect: false` for non-matching guess; `submitGuess` appends a `GuessEntry` to `room.guesses`; `submitGuess` returns `error: "drawer_cannot_guess"` when caller is the drawer; `submitGuess` returns `error: "already_correct"` when caller already guessed correctly; `submitGuess` returns `error: "empty_guess"` for whitespace-only text (depends on T020)
- [x] T026 [P] [US2] Add unit test in `backend/src/services/roomStore.test.ts`: `toRoomSnapshot()` includes all submitted guesses in the `guesses` array (depends on T007)

**Checkpoint**: Guess submission working end-to-end. US1 + US2 testable in sequence.

---

## Phase 4: User Story 3 — Shared Guess History (Priority: P3)

**Goal**: All players see a live chronological list of every guess — submitter name, guess text, and correct/incorrect status. Updates within ~2 seconds of a new guess being submitted.

**Independent Test**: Start a game (Alice draws, Bob and Carol guess). Bob submits an incorrect guess. Carol submits the correct guess. In Alice's tab, confirm both guesses appear in the history with submitter names and correct/incorrect status within ~2 seconds.

### Implementation for User Story 3

- [x] T027 [US3] Add a guess history list to `frontend/src/pages/GamePage.tsx` that renders `room.guesses` in order (oldest first); each entry shows `{guess.name}: "{guess.text}"` with a CSS class or inline style distinguishing correct (`isCorrect: true`) entries from incorrect ones; the list is visible to all players (drawer and guessers) and updates automatically on each polling cycle (depends on T013)

**Checkpoint**: All three user stories complete and independently testable.

---

## Phase 5: Polish & Validation

**Purpose**: Build verification and end-to-end manual validation against acceptance criteria.

- [x] T028 [P] Run `cd backend && npm run build` — confirm zero TypeScript errors
- [x] T029 [P] Run `cd frontend && npm run build` — confirm zero TypeScript errors
- [x] T030 Run `cd backend && npm test` — confirm all unit tests pass (depends on T028)
- [x] T031 Complete two-browser-tab (and optional three-tab for simultaneous correct guesses) verification per `specs/003-gameplay-interaction/quickstart.md` acceptance checklist (depends on T029, T030)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately; T001–T004 touch different sections of the same file and carry no cross-task logic dependency [P]
- **Phase 2 (US1)**: Requires Phase 1 complete (T010 needs Room model changes; T012 needs frontend types from T008)
- **Phase 3 (US2)**: Requires Phase 1 complete; T020 needs T005/T006 from Phase 1; can run in parallel with Phase 2 since different functions/files
- **Phase 4 (US3)**: Requires T013 from Phase 2 (polling in place) to receive guess data
- **Phase 5 (Polish)**: Requires all prior phases complete

### Within Each User Story

| Task | Depends on |
|------|-----------|
| T009 | Phase 1 complete |
| T010 | T005, T006, T007 |
| T011 | T009, T010 |
| T012 | T008 |
| T013 | T008 |
| T014 | T013 |
| T015 | T014 |
| T016 | T015, T012 |
| T017 | T010 |
| T018 | T007 |
| T019 | Phase 1 complete |
| T020 | T005, T006 |
| T021 | T019, T020 |
| T022 | T008 |
| T023 | T013, T022 |
| T024 | T023 |
| T025 | T020 |
| T026 | T007 |
| T027 | T013 |
| T028 | All prior |
| T029 | All prior |
| T030 | T028 |
| T031 | T029, T030 |

### Parallel Opportunities

Within Phase 1: T001–T004 are four independent interface additions in the same file — edit sequentially but no cross-task logic dependency.

Within Phase 2 vs. Phase 3: T009/T010/T011 (stroke service+route) and T019/T020/T021 (guess service+route) touch different functions — can proceed simultaneously once Phase 1 is done.

Within Phase 2: T012 (frontend types) and T009 (stroke schema) touch different files — can start together once Phase 1 completes.

Within Phase 5: T028 (backend build) and T029 (frontend build) are independent [P].

---

## Parallel Example: Phase 1

```
T001 — Add StrokePoint + Stroke to backend/src/models/game.ts
T002 — Add GuessEntry to backend/src/models/game.ts
T003 — Add strokes/guesses to Room in backend/src/models/game.ts
T004 — Add strokes/guesses to RoomSnapshot in backend/src/models/game.ts
(Sequential edits to the same file; no cross-task logic dependency)
```

## Parallel Example: Phase 2 vs. Phase 3 (once Phase 1 is done)

```
Track A — User Story 1:
  T009 → T010 → T011 (backend stroke route)
  T012 → T013 → T014 → T015 → T016 (frontend canvas)

Track B — User Story 2 (can start simultaneously):
  T019 → T020 → T021 (backend guess route)
  T022 → T023 → T024 (frontend guess input)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001–T008) — model changes and shared types
2. Complete T009–T016 — backend stroke route + frontend canvas
3. **STOP and VALIDATE**: Draw in two tabs, confirm ~2 s sync, confirm page-refresh restoration
4. Proceed to US2 once US1 is verified

### Incremental Delivery

1. Phase 1 → models and types ready
2. Phase 2 (US1) → canvas drawing ✅
3. Phase 3 (US2) → guess submission with immediate feedback ✅
4. Phase 4 (US3) → shared guess history ✅
5. Phase 5 → builds clean, quickstart verified ✅

---

## Notes

- [P] tasks operate on different files with no cross-task dependencies at that point in the sequence
- Commit after each checkpoint — keep commits traceable to task IDs
- Run `npm test` in backend after each Phase to catch regressions early
- Fire-and-forget on `addStroke()` POST is intentional: the next poll will confirm server sync; no error recovery UI needed for this assignment
- `hasGuessedCorrectly` must be initialized from `room.guesses` (not just local state) to survive page refresh — this is the key correctness requirement for SC-004
- Canvas `useEffect` should depend on `room.strokes` (from snapshot) and `currentStroke` (local ref) — redraw entirely on change rather than incrementally
