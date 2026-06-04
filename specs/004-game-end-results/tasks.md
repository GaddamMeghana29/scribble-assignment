# Tasks: Game End & Results

**Input**: Design documents from `specs/004-game-end-results/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user story from spec.md (US1–US3)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Extend the `RoomStatus` type and mirror the change in the frontend — required by every subsequent task.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 Add `"ended"` to `RoomStatus` union in `backend/src/models/game.ts`: change `export type RoomStatus = "lobby" | "game"` to `export type RoomStatus = "lobby" | "game" | "ended"`
- [x] T002 [P] Update `RoomSnapshot.status` type in `frontend/src/services/api.ts` from `"lobby" | "game"` to `"lobby" | "game" | "ended"` (mirrors T001 for TypeScript correctness across the stack)

**Checkpoint**: Both `RoomStatus` and the frontend snapshot type include `"ended"` — all user story phases can now begin.

---

## Phase 2: User Story 1 — Game Ends on Correct Guess (Priority: P1) 🎯 MVP

**Goal**: When a guesser submits the correct word, `submitGuess()` atomically sets `room.status = "ended"`. All players (drawer and guessers) are automatically redirected to `/results` within ~2 seconds via the existing polling mechanism. A player who refreshes the page while the game is in `"ended"` state lands on the Results screen rather than the Game screen.

**Independent Test**: Create a room as Alice (Tab A = drawer), join as Bob (Tab B = guesser), start the game. In Tab B, submit the correct secret word. Within ~2 seconds, confirm both Tab A and Tab B automatically navigate to the Results screen. Confirm neither tab stays on the Game screen.

### Implementation for User Story 1

- [x] T003 [US1] Modify `submitGuess()` in `backend/src/services/roomStore.ts`: after `room.guesses.push(guess)`, add `if (isCorrect) { room.status = "ended"; }` before `room.updatedAt = now()`. The existing `if (room.status !== "game")` guard at the top already rejects submissions when the room is `"ended"` (FR-013 — no extra check needed) (depends on T001)
- [x] T004 [US1] Modify `toRoomSnapshot()` in `backend/src/services/roomStore.ts`: replace `currentWord: isDrawer ? room.currentWord : null` with `currentWord: (isDrawer || room.status === "ended") ? room.currentWord : null` so all players see the revealed word when the game has ended (depends on T001)
- [x] T005 [P] [US1] Add unit tests in `backend/src/services/roomStore.test.ts`: `submitGuess` transitions room to `"ended"` when guess is correct; `submitGuess` does NOT transition to `"ended"` when guess is incorrect (room stays `"game"`); `submitGuess` returns `error: "not_in_game"` when room is already in `"ended"` state (FR-013) (depends on T003)
- [x] T006 [P] [US1] Add unit tests in `backend/src/services/roomStore.test.ts`: `toRoomSnapshot()` reveals `currentWord` to non-drawer when `status === "ended"`; `toRoomSnapshot()` still hides `currentWord` from non-drawer when `status === "game"` (depends on T004)
- [x] T007 [US1] Add a `useEffect` in `frontend/src/pages/GamePage.tsx` that watches `room?.status` and calls `navigate("/results", { replace: true })` when `room.status === "ended"` — fires within the existing ~2-second polling cycle for all players (depends on T002)
- [x] T008 [US1] Create `frontend/src/pages/ResultsPage.tsx`: import `useEffect`, `useCallback`, `useNavigate`, `api`, `Card`, `RoomCodeBadge`, `useRoomState`, `useRoomStore`; guard redirect to `"/"` if no room; guard redirect to `"/lobby"` if `status === "lobby"`, redirect to `"/game"` if `status === "game"`; `setInterval` polling at 2000 ms with `clearInterval` on unmount (same pattern as `GamePage.tsx`); render a `<section>` with a "Game Over" heading and `<RoomCodeBadge code={room.code} />` — content cards filled in T010 (depends on T002)
- [x] T009 [US1] Add `/results` route to `frontend/src/routes/index.tsx`: import `ResultsPage` and add `<Route path="/results" element={<ResultsPage />} />` before the catch-all `<Navigate>` (depends on T008)

**Checkpoint**: Game end fully working end-to-end. Submit correct word → both tabs navigate to Results screen within ~2 s. US1 independently testable with two browser tabs.

---

## Phase 3: User Story 2 — Results Screen Shows Outcome (Priority: P2)

**Goal**: The Results screen displays the revealed secret word (full spelling, not underscores), the name of the player who guessed correctly (the winner), and the complete guess history in chronological order with correct and incorrect entries visually distinguished. All information is restored after a page refresh.

**Independent Test**: After a game ends (correct guess submitted), confirm the Results screen shows: the revealed secret word, the winner's name, and all guesses in order with correct/incorrect labels. Verify the information is still present after refreshing either tab.

### Implementation for User Story 2

- [x] T010 [US2] Update `frontend/src/pages/ResultsPage.tsx` to render result content: (1) a `<Card title="Secret Word">` showing `room.currentWord`; (2) a `<Card title="Winner">` showing `room.guesses.find(g => g.isCorrect)?.name ?? "No winner recorded"`; (3) a `<Card title="Guess History">` rendering `room.guesses` as an `<ol className="player-list">` with the same correct/incorrect styling used in `GamePage.tsx` (`color: "#16a34a"`, `fontWeight: 600`, `"✓ correct"` meta tag for `isCorrect: true` entries) (depends on T008)

**Checkpoint**: Results screen shows correct content for all players. Refresh restores all data. US1 + US2 testable end-to-end.

---

## Phase 4: User Story 3 — Host Restarts the Game (Priority: P3)

**Goal**: The host sees a "Play Again" button on the Results screen; non-host players see a message indicating the host must initiate the next game. When the host clicks "Play Again", the room resets to `"lobby"` status (strokes, guesses, drawer, and word cleared; participants preserved). All players are automatically redirected to the Lobby screen within ~2 seconds via polling. A non-host attempt to reset is rejected by the server.

**Independent Test**: After a game ends, in the host's tab click "Play Again". Within ~2 seconds, confirm both tabs navigate automatically to the Lobby screen. Confirm the lobby shows no active word or drawer. Confirm the non-host tab does NOT show a "Play Again" button.

### Implementation for User Story 3

- [x] T011 [P] [US3] Add `resetRoomSchema` to `backend/src/api/schemas.ts`: `export const resetRoomSchema = z.object({ participantId: z.string() });`
- [x] T012 [US3] Add `resetRoom(code, participantId)` export to `backend/src/services/roomStore.ts`: validate room exists (error `room_not_found`), caller is host (error `not_host`), room status is `"ended"` (error `not_ended`); then set `room.status = "lobby"`, `room.drawerId = null`, `room.currentWord = null`, `room.strokes = []`, `room.guesses = []`, `room.updatedAt = now()`; save and return `{ room: cloneRoom(room) }` (depends on T001)
- [x] T013 [US3] Add `POST /:code/reset` route handler to `backend/src/api/rooms.ts`: import `resetRoom` from roomStore and `resetRoomSchema` from schemas; parse params with `roomCodeParamsSchema`, body with `resetRoomSchema`; call `resetRoom(code.toUpperCase(), participantId)`; map `room_not_found` → 404, `not_host` → 403, `not_ended` → 400; respond `{ room: toRoomSnapshot(room, participantId) }` (depends on T011, T012)
- [x] T014 [P] [US3] Add unit tests in `backend/src/services/roomStore.test.ts`: `resetRoom` resets status to `"lobby"` and clears strokes, guesses, drawerId, currentWord; `resetRoom` preserves existing participants; `resetRoom` returns `error: "not_host"` when caller is not the host; `resetRoom` returns `error: "not_ended"` when room status is not `"ended"`; `resetRoom` returns `error: "room_not_found"` for unknown code (depends on T012)
- [x] T015 [P] [US3] Add `api.resetRoom(code, participantId)` method to `frontend/src/services/api.ts`: `resetRoom(code: string, participantId: string) { return request<{ room: RoomSnapshot }>(\`/rooms/${encodeURIComponent(code)}/reset\`, { method: "POST", body: JSON.stringify({ participantId }) }); }` (depends on T002)
- [x] T016 [US3] Update `frontend/src/pages/ResultsPage.tsx`: (1) add `useCallback`-wrapped `handlePlayAgain` that calls `api.resetRoom(room.code, participantId)` (fire-and-forget, errors swallowed — polling detects lobby); (2) add a `<Card title="Next Game">` that renders a `<button className="button button--primary" onClick={handlePlayAgain}>Play Again</button>` for the host and `<p>Waiting for the host to start a new game…</p>` for non-hosts — use `room.participants.find(p => p.id === participantId)?.isHost === true` to detect host; (3) extend the existing polling `useEffect` (or add a separate one) to call `navigate("/lobby", { replace: true })` when `room.status === "lobby"` (depends on T010, T015)

**Checkpoint**: All three user stories complete and independently testable. Two-tab verification covers game end, results display, and Play Again.

---

## Phase 5: Polish & Validation

**Purpose**: Build verification and end-to-end manual validation against acceptance criteria.

- [x] T017 [P] Run `cd backend && npm run build` — confirm zero TypeScript errors
- [x] T018 [P] Run `cd frontend && npm run build` — confirm zero TypeScript errors
- [x] T019 Run `cd backend && npm test` — confirm all unit tests pass (depends on T017)
- [ ] T020 Complete two-browser-tab (and optional three-tab for race condition) verification per `specs/004-game-end-results/quickstart.md` acceptance checklist (depends on T018, T019)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately; T001 and T002 touch different files [P]
- **Phase 2 (US1)**: Requires Phase 1 complete; T003/T004 modify the same file (`roomStore.ts`) — run sequentially; T005/T006 are backend tests [P]; T007/T008/T009 are frontend files touching different locations [P within their own group]
- **Phase 3 (US2)**: Requires T008 (ResultsPage shell) — T010 is the only task
- **Phase 4 (US3)**: Requires Phase 1 complete; T011/T012/T013 are backend additions; T012 must precede T013; T014 tests require T012; T015 is independent [P]; T016 requires T010 + T015
- **Phase 5 (Polish)**: Requires all prior phases complete; T017/T018 [P]

### Within Each User Story

| Task | Depends on |
|------|-----------|
| T003 | T001 |
| T004 | T001 |
| T005 | T003 |
| T006 | T004 |
| T007 | T002 |
| T008 | T002 |
| T009 | T008 |
| T010 | T008 |
| T011 | (none) |
| T012 | T001 |
| T013 | T011, T012 |
| T014 | T012 |
| T015 | T002 |
| T016 | T010, T015 |
| T017 | All prior |
| T018 | All prior |
| T019 | T017 |
| T020 | T018, T019 |

### Parallel Opportunities

Within Phase 1: T001 and T002 touch different files — run together.

Within Phase 2: T003 and T004 modify `roomStore.ts` (same file) — run sequentially. T005 and T006 are test additions in `roomStore.test.ts` (different describes/tests) — can be written in the same file sequentially. T007 and T008 are different frontend files — run together once T002 is done.

Within Phase 4: T011, T012, T014, and T015 have no cross-dependencies (different files) — T011 and T015 can start immediately; T012 starts after T001; T014 after T012.

Within Phase 5: T017 (backend build) and T018 (frontend build) are independent [P].

---

## Parallel Example: Phase 1

```
T001 — Add "ended" to RoomStatus in backend/src/models/game.ts
T002 — Update RoomSnapshot.status in frontend/src/services/api.ts
(Different files, no cross-dependency)
```

## Parallel Example: Phase 4 (US3 start)

```
Track A — Backend:
  T011 (resetRoomSchema in schemas.ts) → T012 (resetRoom in roomStore.ts) → T013 (POST /reset in rooms.ts)
  T014 — unit tests for resetRoom (depends T012)

Track B — Frontend:
  T015 — api.resetRoom() in api.ts (no dependency on Track A)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001–T002) — type changes
2. Complete T003–T009 — backend game-end + frontend redirect + ResultsPage shell
3. **STOP and VALIDATE**: Submit correct word in two tabs, confirm both navigate to `/results` within ~2 s
4. Proceed to US2 once US1 is verified

### Incremental Delivery

1. Phase 1 → `"ended"` type in place
2. Phase 2 (US1) → game end + redirect working ✅
3. Phase 3 (US2) → results content visible ✅
4. Phase 4 (US3) → Play Again working ✅
5. Phase 5 → builds clean, quickstart verified ✅

---

## Notes

- [P] tasks operate on different files with no cross-task logic dependencies at that point in the sequence
- T003 modifies `submitGuess()` — the existing `if (room.status !== "game")` guard at the top already covers FR-013 (rejects guesses when "ended") without additional code
- T004 modifies `toRoomSnapshot()` — the change is a one-line condition update; both the `isDrawer` and `status === "ended"` cases must be handled
- T008 creates a working ResultsPage shell (polling, guard redirects) — T010 adds the display content; T016 adds the Play Again interaction
- T016's Play Again is fire-and-forget (same pattern as `addStroke` in Scenario 3): the room state change is detected by polling within ~2 s
- `hasGuessedCorrectly` state in GamePage.tsx is unaffected — the game-end redirect (T007) fires independently of it
- Run `npm test` in backend after Phase 2 to catch regressions before US2/US3 work begins
