# Feature Specification: Gameplay Interaction

**Feature Branch**: `scribble-app`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "Gameplay Interaction."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drawer Draws on Canvas (Priority: P1)

As the drawer, I can draw freehand strokes on a shared canvas. My drawing is visible to all other players within approximately 2 seconds. Guessers cannot draw on the canvas — it is read-only for them.

**Why this priority**: Drawing is the core mechanic of the game. Without a functional canvas that syncs across players, gameplay cannot proceed. All other stories depend on an active game with a drawing in progress.

**Independent Test**: Create a room as Alice (Tab A = host/drawer), join as Bob (Tab B = guesser), start the game. In Tab A, draw strokes on the canvas. Within ~2 seconds, confirm Tab B shows the same strokes. Confirm Tab B cannot draw on the canvas.

**Acceptance Scenarios**:

1. **Given** the game has started and I am the drawer, **When** I press, drag, and release the pointer on the canvas, **Then** a visible stroke is drawn on my canvas immediately.
2. **Given** I have completed a stroke (released the pointer), **When** approximately 2 seconds elapse, **Then** all guessers see the same stroke on their canvas.
3. **Given** the game has started and I am a guesser, **When** I view the canvas, **Then** the canvas is read-only and I cannot draw anything.
4. **Given** the drawer has drawn multiple strokes, **When** a guesser's canvas refreshes, **Then** all strokes drawn so far are visible in the correct order.
5. **Given** I am a player who refreshes the page mid-game, **When** the page reloads, **Then** all strokes drawn so far are restored on my canvas within one refresh cycle.

---

### User Story 2 - Guesser Submits a Guess (Priority: P2)

As a guesser, I can type and submit a text guess. I am told immediately whether my guess is correct. If correct, my input is disabled — I cannot guess again. The drawer does not see or interact with the guess input.

**Why this priority**: Guessing is the second half of the gameplay loop. Without it, players have no way to participate or win.

**Independent Test**: Start a game (Alice draws, Bob guesses). In Bob's tab, type the secret word exactly and submit. Confirm immediate "Correct!" feedback. Confirm Bob's input is disabled. Confirm Alice has no guess input.

**Acceptance Scenarios**:

1. **Given** the game has started and I am a guesser, **When** I type a word and submit, **Then** my guess is recorded and I receive an immediate response indicating whether it is correct.
2. **Given** I submit the exact secret word (case-insensitive), **When** the guess is processed, **Then** I see a "Correct!" indicator and my guess input is disabled immediately.
3. **Given** I submit an incorrect word, **When** the guess is processed, **Then** I see no "Correct!" indicator and my input remains active for further guesses.
4. **Given** the game has started and I am the drawer, **When** I view the game screen, **Then** there is no guess input field visible to me.
5. **Given** I have already guessed correctly, **When** I view the guess input, **Then** it is disabled and I cannot submit further guesses.

---

### User Story 3 - Shared Guess History (Priority: P3)

All players — drawer and guessers alike — see a live, chronological log of every guess submitted. Each entry shows the submitter's name, what they guessed, and whether it was correct. The history updates within approximately 2 seconds of a new guess being submitted.

**Why this priority**: Shared visibility keeps all players engaged and informed. It depends on US2 for guess data to exist.

**Independent Test**: Start a game (Alice draws, Bob and Carol guess). Bob submits an incorrect guess. Carol submits the correct guess. In Alice's tab, confirm both guesses appear in the history with submitter names and correct/incorrect status, within ~2 seconds.

**Acceptance Scenarios**:

1. **Given** a guesser has submitted a guess, **When** approximately 2 seconds elapse, **Then** all players (including the drawer) see the guess in the history list.
2. **Given** multiple guesses have been submitted, **When** any player views the history, **Then** entries appear in chronological order (oldest first).
3. **Given** a guess is correct, **When** it appears in the history, **Then** it is visually distinguished from incorrect guesses.
4. **Given** the drawer views the history, **When** a correct guess entry is displayed, **Then** the drawer can see who guessed correctly.

---

### Edge Cases

- What happens when the drawer tries to submit a guess? → The guess input is not shown to the drawer; any direct server call is rejected.
- What happens when a guesser who already guessed correctly tries to submit again? → The input is disabled client-side; the server rejects any direct call.
- What happens when a guess is empty or whitespace-only? → Submission is prevented; the server rejects it.
- What happens if two guessers submit the correct word nearly simultaneously? → Both are recorded as correct; both have their inputs disabled.
- What happens to strokes and guesses if a player refreshes mid-game? → All accumulated strokes and guesses are returned in the room snapshot, restoring canvas and history state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The drawer MUST be able to draw freehand strokes on the canvas using pointer events (mouse or touch).
- **FR-002**: Each completed stroke MUST be transmitted to the server immediately when the pointer is released (one request per stroke), then persisted in the room's in-memory state as an ordered list of normalized coordinate points.
- **FR-003**: All players MUST receive all strokes drawn so far within approximately 2 seconds via polling.
- **FR-004**: Guessers MUST NOT be able to draw on the canvas; the canvas MUST be read-only for non-drawers.
- **FR-005**: Guessers MUST be able to submit a text guess via an input field and submit button.
- **FR-006**: The system MUST compare guesses case-insensitively against the secret word.
- **FR-007**: The guess submission response MUST return whether the guess was correct (`isCorrect: true/false`) immediately, so the guesser receives feedback without waiting for the next polling cycle.
- **FR-008**: Correct guesses MUST be stored with a `isCorrect: true` marker; incorrect guesses with `isCorrect: false`.
- **FR-009**: A guesser who has submitted a correct guess MUST have their guess input disabled for the remainder of the game.
- **FR-010**: The drawer MUST NOT see or interact with the guess input.
- **FR-011**: All players MUST see a chronological guess history list showing each entry's submitter name, guess text, and correct/incorrect status.
- **FR-012**: The guess history MUST update within approximately 2 seconds of a new guess being submitted, for all players.
- **FR-013**: The server MUST reject guess submissions from the drawer or from a guesser who has already guessed correctly.
- **FR-014**: The server MUST reject empty or whitespace-only guess submissions.
- **FR-015**: The room snapshot MUST include all strokes and all guess entries so any player can restore canvas and history state after a page refresh.
- **FR-016**: The Game screen MUST poll for room updates at approximately 2-second intervals to keep strokes and guesses live for all players.

### Key Entities

- **Stroke**: A single freehand drawing action. Represented as an ordered array of normalized `{x, y}` coordinate points (values 0.0–1.0 relative to canvas dimensions). Each stroke is recorded on pointer-up and stored atomically.
- **GuessEntry**: A single submitted guess. Contains the submitting participant's ID, display name, the guess text (trimmed), a boolean `isCorrect` flag, and a submission timestamp.
- **Room (extended)**: The existing Room entity gains two new fields: `strokes: Stroke[]` (initially empty) and `guesses: GuessEntry[]` (initially empty).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A stroke drawn by the drawer appears on all guessers' canvases within 2 seconds of the pointer being released.
- **SC-002**: A submitted guess appears in all players' guess history within 2 seconds of submission.
- **SC-003**: Correct guess detection is 100% accurate for case-insensitive exact matches against the secret word.
- **SC-004**: A guesser's input is disabled immediately upon receiving a correct-guess response — no additional guess is possible after that point.
- **SC-005**: The canvas state and guess history are fully restored after a page refresh within one polling cycle (~2 seconds).
- **SC-006**: The secret word is never transmitted to a non-drawer via any guess-related response — 0% word leakage through guess endpoints.

## Assumptions

- The canvas is rendered in the browser using native drawing APIs; no server-side image processing is required.
- Stroke coordinates are normalized (0.0–1.0) relative to the canvas element's rendered dimensions at the time of drawing, so they render correctly regardless of screen size differences between players.
- No undo, color selection, brush size, or eraser features are in scope for this scenario.
- A correct guess does NOT end the game or rotate the drawer — that behavior belongs to a subsequent scenario.
- Only one word can be correct per round (the current secret word); partial or fuzzy matches are not accepted.
- The Game screen gains a ~2-second polling interval in this scenario, replacing the one-time fetch from Scenario 2.
- No new third-party drawing libraries are introduced; canvas drawing uses native browser APIs.
- Stroke data volume is not a concern for the assignment duration — no pruning, compression, or pagination is required.
- The server determines `isCorrect` by comparing the trimmed, lowercased guess text against the trimmed, lowercased secret word.
- "Already guessed correctly" is determined server-side by checking whether any existing GuessEntry for that participant has `isCorrect: true`.
