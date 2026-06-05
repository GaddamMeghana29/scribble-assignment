# Tasks: Game Start & Drawer Flow

**Input**: Design documents from `specs/002-game-start-drawer/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user story from spec.md (US1–US3)

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Backend model changes required by all three user stories. Must complete before any user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T001 [P] Add `"game"` to `RoomStatus` union type in `backend/src/models/game.ts` (change from `"lobby"` to `"lobby" | "game"`)
- [x] T002 [P] Add `drawerId: string | null` and `currentWord: string | null` fields to the `Room` interface in `backend/src/models/game.ts`
- [x] T003 [P] Add `drawerId: string | null`, `currentWord: string | null`, and `wordLength: number | null` fields to the `RoomSnapshot` interface in `backend/src/models/game.ts`; also update `status` type to `"lobby" | "game"`

**Checkpoint**: Model changes in place — all three user story phases can now begin.

---

## Phase 2: User Story 1 — Game Starts for All Players (Priority: P1) 🎯 MVP

**Goal**: Host clicks Start Game → room status becomes `"game"` → host navigates to Game screen immediately → guest auto-navigates within ~2 s via lobby polling.

**Independent Test**: Create a room (Tab A = host), join (Tab B = guest). Click Start Game in Tab A. Confirm Tab A reaches `/game` immediately. Confirm Tab B reaches `/game` within ~2 seconds without any manual action.

### Implementation for User Story 1

- [x] T004 [US1] Implement `startRoom()` mutation in `backend/src/services/roomStore.ts`: after existing host/player-count validation, set `room.status = "game"`, `room.drawerId = caller.id`, `room.currentWord = STARTER_WORDS[room.participants.length % STARTER_WORDS.length]`, `room.updatedAt = now()`, save back to Map, return `{ room: cloneRoom(room) }`
- [x] T005 [US1] Set `drawerId: null` and `currentWord: null` in the `Room` object literal inside `createRoom()` in `backend/src/services/roomStore.ts` (depends on T002)
- [x] T006 [P] [US1] Update `RoomSnapshot` interface in `frontend/src/services/api.ts`: change `status` type to `"lobby" | "game"` and add `drawerId: string | null`, `currentWord: string | null`, `wordLength: number | null` fields (depends on T001, T003)
- [x] T007 [US1] Add `useEffect` in `frontend/src/pages/LobbyPage.tsx` that navigates to `/game` (with `replace: true`) when `room?.status === "game"` — this is the guest auto-redirect fired when polling detects the game has started (depends on T006)
- [x] T008 [US1] Add unit tests in `backend/src/services/roomStore.test.ts`: `startRoom()` sets `status: "game"`; `startRoom()` sets `drawerId` to host's participant ID; `startRoom()` sets a non-null `currentWord` from `STARTER_WORDS`; `startRoom()` with 2 players selects index 2 (`"castle"`) (depends on T004)

**Checkpoint**: Game start transition fully working end-to-end. US1 independently testable.

---

## Phase 3: User Story 2 — Drawer Is Assigned (Priority: P2)

**Goal**: After the game starts, the Game screen shows the drawer's identity to all players. The drawer sees "You are the Drawer". Guessers see "Alice is drawing".

**Independent Test**: Create room as Alice (Tab A), join as Bob (Tab B), start the game. Confirm Alice's Game screen labels her as the drawer. Confirm Bob's Game screen shows Alice as the drawer without labelling Bob's own role.

### Implementation for User Story 2

- [x] T009 [US2] Persist `participantId` to `sessionStorage` under key `"scribble_participantId"` in `setRoomSession()` in `frontend/src/state/roomStore.ts`; read it back during `RoomStore` class initialisation (`participantId: sessionStorage.getItem("scribble_participantId")`) so page-refresh restores the viewer's identity (depends on T006)
- [x] T010 [US2] Add a one-time `useEffect` in `frontend/src/pages/GamePage.tsx` that calls `roomStore.fetchRoom().catch(() => {})` on mount — re-fetches room state with `participantId` from sessionStorage so the correct snapshot is shown after a page refresh (depends on T009)
- [x] T011 [US2] Derive `drawer` and `isDrawer` in `frontend/src/pages/GamePage.tsx`: `const drawer = room.participants.find(p => p.id === room.drawerId) ?? null` and `const isDrawer = participantId != null && participantId === room.drawerId`; render `"{drawer.name} is drawing"` visible to all players; render `"Your role: Drawer"` label only when `isDrawer` is true (depends on T010)
- [x] T012 [US2] Add unit test in `backend/src/services/roomStore.test.ts`: `toRoomSnapshot()` always includes `drawerId` matching the host's participant ID when the game has started (depends on T004)

**Checkpoint**: Drawer identity displayed correctly on both screens. US1 + US2 testable in sequence.

---

## Phase 4: User Story 3 — Secret Word Visible Only to Drawer (Priority: P3)

**Goal**: Drawer sees the secret word. Guessers see underscores matching the word length. Server never sends the word to a non-drawer client.

**Independent Test**: Start a game. On the drawer's screen, confirm the secret word is shown (e.g., "castle"). On the guesser's screen, confirm `_ _ _ _ _ _` (6 underscores) is shown. Check DevTools Network — guesser's room snapshot must have `currentWord: null`.

### Implementation for User Story 3

- [x] T013 [US3] Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts`: remove the `void viewerParticipantId` no-op; compute `const isDrawer = viewerParticipantId != null && viewerParticipantId === room.drawerId`; return `drawerId: room.drawerId`, `wordLength: room.currentWord?.length ?? null`, `currentWord: isDrawer ? room.currentWord : null` (depends on T003, T004)
- [x] T014 [US3] Render word display in `frontend/src/pages/GamePage.tsx`: when `isDrawer && room.currentWord`, show the actual word; when `!isDrawer && room.wordLength != null`, show `Array.from({ length: room.wordLength }, () => "_").join(" ")` as the placeholder (depends on T011, T013)
- [x] T015 [US3] Add unit tests in `backend/src/services/roomStore.test.ts`: `toRoomSnapshot()` returns the actual word for the drawer; `toRoomSnapshot()` returns `currentWord: null` for a guesser; `wordLength` equals the selected word's character count for both viewer types (depends on T013)

**Checkpoint**: All three user stories complete and independently testable.

---

## Phase 5: Polish & Validation

**Purpose**: Build verification and end-to-end manual validation against acceptance criteria.

- [x] T016 [P] Run `cd backend && npm run build` — confirm zero TypeScript errors
- [x] T017 [P] Run `cd frontend && npm run build` — confirm zero TypeScript errors
- [x] T018 Run `cd backend && npm test` — confirm all unit tests pass (depends on T016)
- [x] T019 Complete two-browser-tab verification per `specs/002-game-start-drawer/quickstart.md` acceptance checklist (depends on T017, T018)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational)**: No dependencies — start immediately; T001, T002, T003 touch different interface sections and are mutually independent [P]
- **Phase 2 (US1)**: Requires Phase 1 complete (T004 needs Room model; T006 needs RoomSnapshot update)
- **Phase 3 (US2)**: Requires Phase 2 complete (T009 needs frontend types from T006; T010 needs T009)
- **Phase 4 (US3)**: Requires Phase 2 complete for T013 (needs T004 room mutation); T014 requires T011 (US2 display scaffold)
- **Phase 5 (Polish)**: Requires all prior phases complete

### Within Each User Story

| Task | Depends on |
|------|-----------|
| T004 | T001, T002 (Room model) |
| T005 | T002 (drawerId/currentWord fields) |
| T006 | T001, T003 (RoomSnapshot type) |
| T007 | T006 (frontend types) |
| T008 | T004 |
| T009 | T006 (frontend RoomSnapshot type) |
| T010 | T009 (sessionStorage restore in place) |
| T011 | T010 (fetch-on-mount in place) |
| T012 | T004 |
| T013 | T003, T004 |
| T014 | T011, T013 |
| T015 | T013 |
| T016 | All prior |
| T017 | All prior |
| T018 | T016 |
| T019 | T017, T018 |

### Parallel Opportunities

Within Phase 1: T001, T002, T003 are three separate interface changes in the same file — edit sequentially but they carry no cross-task logic dependency.

Within Phase 2: T006 (frontend types) can start as soon as Phase 1 completes, in parallel with T004 (backend mutation logic) since they touch different files.

Within Phase 2 after T004: T005 (createRoom defaults) and T008 (tests) can run in parallel [P].

Within Phase 5: T016 (backend build) and T017 (frontend build) are independent [P].

---

## Parallel Example: Phase 1

```
T001 — Add "game" to RoomStatus in backend/src/models/game.ts
T002 — Add drawerId/currentWord to Room in backend/src/models/game.ts
T003 — Add drawerId/currentWord/wordLength to RoomSnapshot in backend/src/models/game.ts
(Sequential edits to the same file; no cross-task logic dependency)
```

## Parallel Example: Phase 2

```
T004 — Implement startRoom() mutation in backend/src/services/roomStore.ts
T006 — Update RoomSnapshot types in frontend/src/services/api.ts
(Different codebases; run together once Phase 1 is complete)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001–T003) — model changes
2. Complete T004 + T005 — backend mutation
3. Complete T006 + T007 — frontend types + lobby redirect
4. **STOP and VALIDATE**: Start game in two tabs, confirm auto-navigate
5. Proceed to US2 once US1 is verified

### Incremental Delivery

1. Phase 1 → model ready
2. Phase 2 (US1) → game start transition ✅
3. Phase 3 (US2) → drawer identity + sessionStorage persistence ✅
4. Phase 4 (US3) → word visibility + snapshot filtering ✅
5. Phase 5 → build clean, quickstart verified ✅

---

## Notes

- [P] tasks operate on different files with no cross-task dependencies at that point in the sequence
- Commit after each checkpoint — keep commits traceable to task IDs
- Run `npm test` in backend after each Phase to catch regressions early
- T013 removes a `void viewerParticipantId` no-op — the parameter was already threaded through the entire call stack; this is a safe activation not a new plumbing change
- T009 reads `sessionStorage` in the `RoomStore` constructor — Vitest runs in jsdom which supports sessionStorage, so this is safe in test environments
