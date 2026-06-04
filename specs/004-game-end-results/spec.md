# Feature Specification: Game End & Results

**Feature Branch**: `scribble-app`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "Scenario 4 game end and results"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Game Ends on Correct Guess (Priority: P1)

As a player, when any guesser submits the correct word the game immediately ends. All players — the drawer and every guesser — are automatically shown a Results screen within approximately 2 seconds without needing to do anything. The transition happens via the existing polling mechanism.

**Why this priority**: This is the missing capstone of the gameplay loop. Scenarios 2 and 3 were explicitly built with the assumption that game-end belongs here. Without it, the game never concludes — guesses pile up indefinitely and players have no signal that the round is over.

**Independent Test**: Create a room as Alice (Tab A = drawer), join as Bob (Tab B = guesser), start the game. In Tab B, submit the correct secret word. Within ~2 seconds, confirm both Tab A and Tab B automatically navigate to a Results screen. Confirm neither tab stays on the Game screen.

**Acceptance Scenarios**:

1. **Given** the game is in progress and I am a guesser, **When** I submit the exact secret word, **Then** the game ends immediately — the room transitions to an "ended" state in the same operation that records my guess.
2. **Given** the game has just ended, **When** approximately 2 seconds elapse, **Then** all players (drawer and all guessers) are automatically redirected to a Results screen without any manual action.
3. **Given** a second guesser submits the correct word at approximately the same time as the first, **When** the server processes both, **Then** the first received correct guess ends the game; the second is rejected because the game is already ended.
4. **Given** I am a player on the Game screen and the room transitions to "ended", **When** the page polls next, **Then** I am redirected to the Results screen even if I did not personally guess.
5. **Given** I refresh the page while the game is in "ended" state, **When** the page reloads and polls, **Then** I land on the Results screen — not the Game screen — within one polling cycle.

---

### User Story 2 - Results Screen Shows Outcome (Priority: P2)

As a player, the Results screen reveals the secret word to everyone, names the winner, and shows the complete guess history. All this information is available immediately without any additional action. Refreshing the page restores the same view.

**Why this priority**: Players need confirmation of what happened — who won and what the word was. Without this, a correct guess is anticlimactic and the round has no resolution. Depends on US1 (the "ended" state must exist before the Results screen can display it).

**Independent Test**: After a game ends (correct guess submitted), confirm the Results screen shows: the revealed secret word (correct spelling visible to all), the winner's name, and all guesses in order with correct/incorrect labels. Verify the information is still present after refreshing either tab.

**Acceptance Scenarios**:

1. **Given** the game has ended and I am on the Results screen, **When** I view the screen, **Then** I see the secret word revealed — the full word, not underscores.
2. **Given** the game has ended, **When** I view the Results screen, **Then** I see the name of the player who guessed correctly (the winner).
3. **Given** multiple guesses were submitted before the correct one, **When** I view the Results screen, **Then** I see all guesses in chronological order with correct and incorrect entries distinguished.
4. **Given** I am the drawer, **When** I view the Results screen, **Then** I see the same outcome information as guessers — there is no special drawer-only view.
5. **Given** I refresh the Results screen, **When** the page reloads and polls, **Then** all result information is restored within one polling cycle — word revealed, winner shown, history intact.

---

### User Story 3 - Host Restarts the Game (Priority: P3)

As the host, I can reset the room back to lobby state from the Results screen so that all players can play again. All players are automatically redirected to the Lobby screen within approximately 2 seconds of my action. Non-host players see a message that the host needs to initiate the next game.

**Why this priority**: Without a restart path, players must close tabs and create a new room for each game. This provides the natural loop-back. Depends on US1 and US2 (the Results screen must exist first).

**Independent Test**: After a game ends, in the host's tab click the "Play Again" button. Within ~2 seconds, confirm both tabs navigate automatically to the Lobby screen. Confirm the lobby shows no active word or drawer — the room is in a clean lobby state. Confirm the non-host tab does NOT show a "Play Again" button.

**Acceptance Scenarios**:

1. **Given** the game has ended and I am the host, **When** I view the Results screen, **Then** I see a "Play Again" button; non-host players see a message that the host can start a new game.
2. **Given** I am the host and click "Play Again", **When** the action is processed, **Then** the room resets to "lobby" status with all game data cleared (strokes, guesses, secret word, drawer assignment).
3. **Given** the host has clicked "Play Again", **When** approximately 2 seconds elapse, **Then** all players automatically navigate to the Lobby screen — the same transition mechanism used when waiting for the game to start.
4. **Given** a non-host player tries to directly trigger a restart, **When** the server receives the request, **Then** it is rejected — only the host may reset the room.
5. **Given** the room has reset to "lobby" and players are back on the Lobby screen, **When** the host clicks Start Game again, **Then** a new game begins following the same flow as Scenario 2.

---

### Edge Cases

- What happens if two guessers submit the correct answer simultaneously? → The first recorded correct guess ends the game. Any subsequent correct guess submitted after the room is in "ended" state is rejected.
- What happens if a player refreshes while mid-transition (game → ended)? → Polling resolves within one cycle; they land on the appropriate screen based on current room status.
- What happens if the host leaves during the Results screen? → Non-host players remain on the Results screen with no auto-resolve. Handling host disconnection is out of scope.
- What happens if a guesser's input submits just as the game ends (race condition)? → Server rejects the submission because the game is already in "ended" state.
- What happens to the "Play Again" action if only one player remains? → The host can reset the room to lobby; the existing minimum-player validation on start prevents a new game from beginning with only one player.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a correct guess is submitted, the room status MUST transition to `"ended"` atomically — in the same server operation that records the guess.
- **FR-002**: The room snapshot MUST expose `"ended"` status so all players detect the game-over transition within approximately 2 seconds via the existing polling interval.
- **FR-003**: All players MUST be automatically redirected to a Results screen when polling detects `status === "ended"`, without any manual action.
- **FR-004**: The Results screen MUST display the secret word revealed in full to all players when the game status is `"ended"` (the word is no longer hidden from guessers).
- **FR-005**: The Results screen MUST show the display name of the winning participant — the first player whose guess entry has `isCorrect: true`.
- **FR-006**: The Results screen MUST display the complete final guess history in chronological order, with correct and incorrect entries visually distinguished.
- **FR-007**: A player who refreshes the page while in the `"ended"` state MUST be restored to the Results screen with all result data within one polling cycle.
- **FR-008**: Only the host MUST see a "Play Again" button on the Results screen; non-host players MUST see a message indicating the host needs to initiate a new game.
- **FR-009**: When the host activates "Play Again", the room MUST reset to `"lobby"` status with all game-specific data cleared: strokes, guesses, drawerId, and currentWord set back to null or empty.
- **FR-010**: All players MUST be automatically redirected to the Lobby screen when polling detects `status === "lobby"` while on the Results screen — the same redirect mechanism used in Scenario 2.
- **FR-011**: The "Play Again" action MUST be restricted to the host; any non-host attempt MUST be rejected.
- **FR-012**: After the room resets to `"lobby"` state, the existing Start Game flow from Scenario 2 MUST function normally — the host can start a new game with the same participants.
- **FR-013**: Guess submissions when the room is in `"ended"` state MUST be rejected by the server.

### Key Entities

- **RoomStatus (extended)**: The existing `"lobby" | "game"` union gains `"ended"` — representing a completed round awaiting restart.
- **Room (unchanged structure)**: No new fields needed. The winner is the participant whose `participantId` appears in the first `GuessEntry` with `isCorrect: true`. The secret word remains stored as `currentWord` on the room for the Results screen.
- **RoomSnapshot (modified behavior)**: When `status === "ended"`, the snapshot reveals `currentWord` to ALL players (not just the drawer) — the game is over and the word can be shown.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All players navigate to the Results screen within 2 seconds of a correct guess being submitted — measured from the moment the server records the correct guess.
- **SC-002**: The secret word is correctly revealed and displayed on the Results screen for 100% of ended games.
- **SC-003**: The winner's name is correctly identified and displayed for 100% of games where at least one correct guess was recorded.
- **SC-004**: All players navigate to the Lobby screen within 2 seconds of the host activating "Play Again".
- **SC-005**: Results screen data (word, winner, guess history) is fully restored after page refresh within one polling cycle (~2 seconds).
- **SC-006**: Zero successful guess submissions are accepted once the room is in `"ended"` state — all such attempts result in a rejection response.

## Assumptions

- The winner is defined as the first participant with `isCorrect: true` in `room.guesses` (chronologically first recorded correct guess).
- The only trigger for the "ended" state is a correct guess (FR-001). There is no host-forced early game termination — if no player ever guesses correctly, the game remains in "game" state indefinitely until a correct guess is submitted.
- "Play Again" resets to lobby but does NOT remove participants — all players who were in the game remain in the room.
- The drawer for the next game is still always the host (no rotation), consistent with Scenario 2.
- The word for the next game is re-selected by the existing word-selection logic when `startRoom()` is called again.
- The Results screen is a new route (e.g., `/results`) separate from `/game` and `/lobby`.
- Polling on the Results screen continues at the same ~2-second interval to detect the host's "Play Again" action.
- No scoring, point tally, or leaderboard is maintained across games — each game is independent.
- The "ended" state is not persisted across backend restarts (same in-memory model as all other state).
- Depends on Scenario 3 (Gameplay Interaction) being fully functional — specifically the `submitGuess` flow and the ~2-second Game screen polling.
