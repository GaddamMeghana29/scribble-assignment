# Research: Game End & Results

**Feature**: Scenario 4 — Game end on correct guess, Results screen, host Play Again
**Date**: 2026-06-04

## Decision Log

### 1. Atomic Game-End in submitGuess

**Decision**: Modify `submitGuess()` in `backend/src/services/roomStore.ts` to set `room.status = "ended"` in the same operation that records the correct guess — no separate endpoint or deferred transition.

**Rationale**: FR-001 mandates atomicity. A separate endpoint would create a window where the room is in an inconsistent state (guess recorded, game still running). The current `submitGuess` already has exclusive access to the room object; setting `room.status` there is the simplest correct approach.

**Alternatives considered**: A separate `endGame()` call after `submitGuess()` — rejected because it introduces a non-atomic two-step and requires caller coordination. A status queue — rejected as over-engineering.

---

### 2. RoomStatus Extension — "ended"

**Decision**: Extend the `RoomStatus` type in `backend/src/models/game.ts` from `"lobby" | "game"` to `"lobby" | "game" | "ended"`. The same type change is mirrored in `frontend/src/services/api.ts`.

**Rationale**: The spec's Key Entities section names `"ended"` as the only change to the Room structure. `addStroke()` already guards on `status !== "game"`, so it naturally rejects strokes in the `"ended"` state without further changes. `submitGuess()` similarly guards on `status !== "game"` and must be updated to also use `"ended"` for its rejection path (FR-013).

**Alternatives considered**: A boolean `isEnded` flag — rejected because `RoomStatus` is already a discriminated union used in the frontend for routing; a string literal union is cleaner.

---

### 3. Word Reveal in toRoomSnapshot

**Decision**: Modify `toRoomSnapshot()` to expose `currentWord` to ALL players (not just the drawer) when `room.status === "ended"`. When status is `"lobby"` or `"game"`, the existing filter logic is preserved.

**Rationale**: FR-004 mandates the full word is visible on the Results screen. `toRoomSnapshot()` is the single place where the drawer/guesser visibility split is enforced; patching it here avoids duplicating the reveal logic across routes.

**Alternatives considered**: A separate `/results` endpoint that returns `currentWord` unconditionally — rejected because it would bypass the existing snapshot contract and require additional route+service changes.

---

### 4. resetRoom Function Design

**Decision**: Add `resetRoom(code, participantId)` to `backend/src/services/roomStore.ts`. It validates that the caller is the host, then sets `room.status = "lobby"` and clears `room.strokes`, `room.guesses`, `room.drawerId`, and `room.currentWord` to empty/null. Participants are preserved.

**Rationale**: FR-009 specifies exactly these fields to clear. The existing `startRoom()` already resets strokes and guesses when starting a new game, so `resetRoom` mirrors that cleanup pattern. Preserving participants means players do not need to re-join for the next game (per Assumptions in spec).

**Alternatives considered**: Re-using `startRoom()` for reset — rejected because `startRoom()` immediately advances to `"game"` state, whereas the spec requires returning to `"lobby"` so the host can choose when to start the next game.

---

### 5. POST /rooms/:code/reset Route

**Decision**: Add `POST /rooms/:code/reset` as a new route handler in `backend/src/api/rooms.ts`. Uses a new `resetRoomSchema` with `{ participantId: string }`. Error mapping: `room_not_found` → 404, `not_host` → 403, `not_ended` → 400.

**Rationale**: FR-011 requires the server to reject non-host reset attempts. A dedicated route keeps the reset operation explicit and separately auditable. Adding a `not_ended` guard prevents accidental mid-game resets.

**Alternatives considered**: Reusing `/:code/start` with a flag — rejected because start and reset are semantically distinct; conflating them would require branching on a request flag inside a route that currently has well-defined semantics.

---

### 6. ResultsPage Routing and Polling

**Decision**: Create a new `frontend/src/pages/ResultsPage.tsx` reachable at `/results`. It polls every ~2 s via `setInterval`. On mount, redirect to `/` if room state is missing. On each poll, redirect to `/lobby` when `room.status === "lobby"` (Play Again detected). The `/results` route is added to `frontend/src/routes/index.tsx`.

**Rationale**: The spec's Assumptions section designates `/results` as a new separate route. Polling on the Results screen for `status === "lobby"` is the same redirect mechanism used on the Lobby screen for `status === "game"` — consistent with constitution Principle II. A shared polling hook was considered but rejected per Principle I (extend existing patterns; each page manages its own interval as established by Scenario 3's GamePage).

**Alternatives considered**: A shared `useRoomPoller` hook — rejected per Brownfield-First (constitution Principle I); each page already duplicates the `setInterval` pattern, and introducing a new hook abstraction is out of scope.

---

### 7. GamePage Redirect to Results

**Decision**: In `GamePage.tsx`, add a `useEffect` (or extend the existing poll handler) that calls `navigate("/results", { replace: true })` when the polled snapshot returns `room.status === "ended"`. This handles all players (drawer and guessers) uniformly.

**Rationale**: FR-003 requires all players to be auto-redirected. The polling `useEffect` already runs every ~2 s; adding a status check there is minimal and consistent with how `LobbyPage` redirects to `/game` on `status === "game"`.

---

### 8. Winner Determination

**Decision**: The winner is the participant whose entry is the first `GuessEntry` with `isCorrect: true` in `room.guesses`. The Results screen finds this by doing `room.guesses.find(g => g.isCorrect)` and reading `.name`.

**Rationale**: Per the spec Assumptions section: "The winner is the first participant with `isCorrect: true` in `room.guesses`". `GuessEntry` already contains `name` (set at submission time), so no participant lookup is needed.

---

### 9. Guess Rejection When Ended

**Decision**: `submitGuess()` already guards `if (room.status !== "game") return { error: "not_in_game" }`. After adding `"ended"` to `RoomStatus`, a room in `"ended"` state will fail this guard and return `not_in_game` (→ 400), satisfying FR-013.

**Rationale**: No additional code change is needed for this guard; the existing `!== "game"` check covers `"ended"` as well. This is verified explicitly by a new unit test.

---

### 10. addStroke Rejection When Ended

**Decision**: `addStroke()` has the same `if (room.status !== "game")` guard as `submitGuess()`. It will automatically reject strokes in `"ended"` state without any code change.

**Rationale**: No spec requirement explicitly mentions stroke rejection after game end, but it is the correct behavior. The guard is already in place.
