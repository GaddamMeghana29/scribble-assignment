# Tasks: Room Setup & Lobby

**Input**: Design documents from `specs/001-room-setup-lobby/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/api.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Maps to user story from spec.md (US1–US4)

---

## Phase 1: Setup (Bug Fix & Prerequisites)

**Purpose**: Fix the known API URL bug that breaks all frontend requests before any feature work begins.

- [x] T001 Fix `VITE_API_URL` default from `"http://localhost:3001/bug"` to `"http://localhost:3001"` in `frontend/src/services/api.ts` line 22

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend model and code-generation changes required by all four user stories. Must complete before any user story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Add `isHost: boolean` field to `Participant` interface in `backend/src/models/game.ts`
- [x] T003 [P] Update `generateCode()` alphabet in `backend/src/services/roomStore.ts` from `"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"` to `"ABCDEFGHIJKLMNOPQRSTUVWXYZ"` (letters only, 4 chars)

**Checkpoint**: Model and code format changes in place — user story phases can now begin.

---

## Phase 3: User Story 1 — Host Creates a Room (Priority: P1) 🎯 MVP

**Goal**: A player can create a room with a valid name and land on the Lobby as the designated host. Empty/whitespace names are rejected with a clear error.

**Independent Test**: Open the app, submit Create Room with a valid name, confirm you reach the Lobby with a visible room code and your name listed with a host marker. Submit with a blank name and confirm an error message appears.

### Implementation for User Story 1

- [x] T004 [US1] Tighten `createRoomSchema.playerName` to `z.string().trim().min(1, "Player name is required")` in `backend/src/api/schemas.ts`
- [x] T005 [US1] Set `isHost: true` on the first participant in `createRoom()` in `backend/src/services/roomStore.ts` (depends on T002)
- [x] T006 [P] [US1] Add `isHost: boolean` to `Participant` type in `frontend/src/services/api.ts`
- [x] T007 [US1] Add client-side trim + empty-name inline error and disable submit while loading in `frontend/src/pages/CreateRoomPage.tsx` (depends on T006)
- [x] T008 [US1] Add unit tests: room creator has `isHost: true`, empty name rejected by schema in `backend/src/services/roomStore.test.ts` (depends on T004, T005)

**Checkpoint**: Create Room flow fully working end-to-end. US1 independently testable.

---

## Phase 4: User Story 2 — Player Joins an Existing Room (Priority: P2)

**Goal**: A second player can join a room by code. Empty name, whitespace-only name, bad code, and duplicate names are all rejected with specific error messages.

**Independent Test**: Create a room in Tab A. In Tab B, join with a different valid name and confirm both appear in the Lobby. Attempt joins with blank name, bad code, and duplicate name; confirm each shows a distinct error.

### Implementation for User Story 2

- [x] T009 [US2] Tighten `joinRoomSchema.playerName` to `z.string().trim().min(1, "Player name is required")` in `backend/src/api/schemas.ts`
- [x] T010 [US2] Add case-insensitive duplicate name check in `joinRoom()` in `backend/src/services/roomStore.ts`: return `{ error: "name_taken" }` sentinel if trimmed lowercase name already exists in room (depends on T002)
- [x] T011 [US2] Map `name_taken` sentinel to `HttpError(409, "Name already taken")` in the `POST /:code/join` handler in `backend/src/api/rooms.ts` (depends on T010)
- [x] T012 [P] [US2] Add client-side trim + empty-name/code inline errors and disable submit while loading in `frontend/src/pages/JoinRoomPage.tsx`
- [x] T013 [US2] Add unit tests: `isHost: false` on joiner, empty name rejected, duplicate name rejected (case-insensitive), non-existent code returns null in `backend/src/services/roomStore.test.ts` (depends on T009, T010)

**Checkpoint**: Join Room flow fully working. US1 and US2 independently testable.

---

## Phase 5: User Story 3 — Lobby Refreshes Automatically (Priority: P3)

**Goal**: The Lobby participant list updates within ~2 seconds of a new player joining, with no manual action required.

**Independent Test**: Create a room in Tab A. In Tab B, join. Without clicking anything in Tab A, confirm Tab A's participant list shows both players within 2 seconds.

### Implementation for User Story 3

- [x] T014 [US3] Replace manual Refresh button in `frontend/src/pages/LobbyPage.tsx` with a `useEffect` that calls `roomStore.fetchRoom()` every 2 000 ms via `setInterval`; clear interval in cleanup

**Checkpoint**: Automatic polling working. All three stories testable in sequence.

---

## Phase 6: User Story 4 — Host Starts the Game (Priority: P4)

**Goal**: Host sees a Start Game button (disabled with 1 player, enabled with 2+). Non-host sees "Waiting for host to start the game…" with no button. Clicking Start Game validates preconditions on the backend and navigates to the Game screen.

**Independent Test**: Create room (Tab A = host). Confirm Start Game button is disabled. Join in Tab B. Confirm button enables in Tab A. Confirm Tab B shows waiting message. Click Start in Tab A; confirm navigation to `/game`.

### Implementation for User Story 4

- [x] T015 [US4] Add `startRoomSchema` with required `participantId: z.string()` to `backend/src/api/schemas.ts`
- [x] T016 [US4] Add `startRoom(code, participantId)` to `backend/src/services/roomStore.ts`: validate caller is host (`isHost: true`), validate `participants.length >= 2`, return room or `{ error: "not_host" | "too_few_players" }` (depends on T002)
- [x] T017 [US4] Add `POST /:code/start` route to `backend/src/api/rooms.ts` using `startRoom()`, mapping `not_host` → `HttpError(403, "Only the host can start the game")` and `too_few_players` → `HttpError(400, "At least 2 players are required to start")` (depends on T015, T016)
- [x] T018 [P] [US4] Add `startRoom(code: string, participantId: string)` method to `api` object in `frontend/src/services/api.ts` calling `POST /rooms/:code/start`
- [x] T019 [US4] Derive `isHost` by matching `participantId` against `room.participants`; render `"(Host)"` label next to the host's name in the participant list in `frontend/src/pages/LobbyPage.tsx` (depends on T006)
- [x] T020 [US4] Add conditional Start Game / waiting-message logic to `frontend/src/pages/LobbyPage.tsx`: if host show button (disabled + message when `participants.length < 2`, enabled otherwise, calls `api.startRoom` then navigates to `/game`); if not host show "Waiting for host to start the game…" paragraph with no button (depends on T018, T019)
- [x] T021 [US4] Add unit tests: `startRoom` with non-host caller returns `not_host`, with fewer than 2 players returns `too_few_players`, with valid host and 2+ players returns room in `backend/src/services/roomStore.test.ts` (depends on T015, T016)

**Checkpoint**: All four user stories complete and independently testable.

---

## Phase 7: Polish & Validation

**Purpose**: Build verification and end-to-end manual validation against acceptance criteria.

- [x] T022 [P] Run `cd backend && npm run build` — confirm zero TypeScript errors
- [x] T023 [P] Run `cd frontend && npm run build` — confirm zero TypeScript errors
- [x] T024 Complete two-browser-tab verification per `specs/001-room-setup-lobby/quickstart.md` validation checklist

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Bug Fix)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Start alongside or after Phase 1; T002 and T003 are independent of each other [P]
- **Phase 3 (US1)**: Requires Phase 2 complete (T004 needs T002 model)
- **Phase 4 (US2)**: Requires Phase 2 complete (T010 needs T002 model); can start in parallel with Phase 3
- **Phase 5 (US3)**: Requires Phase 1 complete (needs working API URL); can start in parallel with Phases 3–4
- **Phase 6 (US4)**: Requires Phase 2 (T016 needs T002) and Phase 3 T006 (isHost on frontend type)
- **Phase 7 (Polish)**: Requires all prior phases complete

### Within Each User Story

| Task | Depends on |
|------|-----------|
| T005 | T002 (isHost on model) |
| T007 | T006 (isHost on frontend type) |
| T008 | T004, T005 |
| T010 | T002 (isHost on model) |
| T011 | T010 |
| T013 | T009, T010 |
| T016 | T002 (isHost on model) |
| T017 | T015, T016 |
| T019 | T006 (isHost on frontend type) |
| T020 | T018, T019 |
| T021 | T015, T016 |

### Parallel Opportunities

Within Phase 2: T002 and T003 touch different sections of `roomStore.ts` — can run in parallel.

Within Phase 3: T004 (schemas) and T006 (frontend type) touch different files — can run in parallel.

Within Phase 4: T009 (schemas) and T012 (JoinRoomPage) touch different files — can run in parallel.

Within Phase 6: T015 (schemas) and T018 (frontend api.ts) touch different files — can run in parallel.

---

## Parallel Example: Phase 2

```
T002 — Add isHost to backend/src/models/game.ts
T003 — Update generateCode() in backend/src/services/roomStore.ts
(Both touch different files; run together)
```

## Parallel Example: Phase 3 (US1)

```
T004 — Tighten createRoomSchema in backend/src/api/schemas.ts
T006 — Add isHost to Participant in frontend/src/services/api.ts
(Different codebases; run together, then T005 and T007 proceed)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (T001) — fix API URL
2. Complete Phase 2 (T002, T003) — model + code format
3. Complete Phase 3 (T004–T008) — host creates room
4. **STOP and VALIDATE**: Create a room, confirm host flag, confirm empty name rejected
5. Proceed to US2 once US1 is verified

### Incremental Delivery

1. Phase 1 + 2 → bug fixed, model ready
2. Phase 3 (US1) → room creation with host flag ✅
3. Phase 4 (US2) → join with validation ✅
4. Phase 5 (US3) → automatic polling ✅
5. Phase 6 (US4) → host gate + start button ✅
6. Phase 7 → build clean, quickstart verified ✅

---

## Notes

- [P] tasks operate on different files with no cross-task dependencies at that point in the sequence
- Commit after each task or checkpoint — keep commits traceable to task IDs
- Run `npm test` in backend after each Group A task to catch regressions early
- The `isHost` field added in T002 flows through all subsequent phases — ensure `toRoomSnapshot()` spreads it correctly (it uses `{ ...participant }` already, so no extra change needed)
