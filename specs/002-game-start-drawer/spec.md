# Feature Specification: Game Start & Drawer Flow

**Feature Branch**: `scribble-app`

**Created**: 2026-06-04

**Status**: Draft

**Input**: User description: "Game Start & Drawer Flow"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Game Starts for All Players (Priority: P1)

When the host clicks Start Game in the Lobby, the room transitions from the waiting state to an active game. All players — whether they are already watching the Lobby or detected via polling — are automatically navigated to the Game screen. No player needs to manually navigate.

**Why this priority**: The game start transition is the gate that unlocks every other gameplay scenario. Without it, no player can reach the Game screen and all subsequent features are inaccessible.

**Independent Test**: Create a room with two players (Tab A = host, Tab B = guest). Click Start Game in Tab A. Confirm Tab A navigates to the Game screen immediately. Confirm Tab B automatically navigates to the Game screen within ~2 seconds without any manual action.

**Acceptance Scenarios**:

1. **Given** two players are in the Lobby and the host clicks Start Game, **When** the action is submitted, **Then** the room transitions to an active game, the host navigates to the Game screen immediately, and the guest navigates within approximately 2 seconds.
2. **Given** a player is on the Lobby screen and the host starts the game in another tab, **When** the lobby polls for updates, **Then** the player is automatically navigated to the Game screen upon detecting the game has started.
3. **Given** a player navigates directly to the Game screen URL without being in an active room, **When** the page loads, **Then** they are redirected to the Start screen.

---

### User Story 2 - Drawer Is Assigned (Priority: P2)

When the game starts, the room creator (host) is designated as the drawer. Every player on the Game screen can see who the drawer is. The drawer's identity is clearly displayed and unambiguous.

**Why this priority**: Drawer assignment is required before gameplay can proceed. Without knowing who draws, neither the canvas nor the word can be meaningfully shown.

**Independent Test**: Create a room as Alice (Tab A), join as Bob (Tab B), start the game. Confirm Alice's Game screen shows her role as "Drawer". Confirm Bob's Game screen shows Alice as the drawer.

**Acceptance Scenarios**:

1. **Given** a game has started with Alice as the room creator and Bob as the second player, **When** both players view the Game screen, **Then** Alice is identified as the drawer on both screens.
2. **Given** a game has started, **When** the drawer views the Game screen, **Then** their own role is displayed as "Drawer" with clear visual identification.
3. **Given** a game has started, **When** a guesser views the Game screen, **Then** the drawer's name is clearly shown (e.g., "Alice is drawing") without labelling the guesser's own role.

---

### User Story 3 - Secret Word Is Visible Only to the Drawer (Priority: P3)

When the game starts, a secret word is selected deterministically from the starter word list. The drawer can see the full secret word. Guessers see a placeholder (underscores matching the word length) — the actual word is never sent to them.

**Why this priority**: The secret word mechanic is the core of the game. Without it, the drawer has nothing to draw and guessers cannot win.

**Independent Test**: Start a game with two players. On the drawer's screen, confirm the secret word is visible (e.g., "castle"). On the guesser's screen, confirm underscores matching the word length are shown and the actual word is not visible anywhere including the browser's network requests.

**Acceptance Scenarios**:

1. **Given** a game has started, **When** the drawer views the Game screen, **Then** the secret word is clearly displayed to them.
2. **Given** a game has started, **When** a guesser views the Game screen, **Then** underscores matching the word length (one per character, space-separated, e.g., `_ _ _ _ _ _` for a 6-letter word) are shown in place of the word.
3. **Given** the same room configuration, **When** the game is started, **Then** the same word is always selected — the selection is deterministic.
4. **Given** a guesser inspects the network response for their room snapshot, **When** they look for the secret word, **Then** `currentWord` is `null` in their snapshot — the word is never transmitted to them.

---

### Edge Cases

- What if fewer than 2 players are in the room when Start Game is clicked? → The Start Game button is disabled client-side when `participants.length < 2`; the server also validates and rejects if not met.
- What if a non-host player triggers the start action directly? → The server rejects the request; the client does not expose the button to non-hosts.
- What if the game screen is opened directly without an active room? → Redirect to Start screen; no game data is shown.
- What if the drawer closes and re-opens their tab during a game? → Their role and the secret word are restored from their persisted identity and the room snapshot.
- What if the backend restarts after the game starts? → All state is lost (in-memory); this is a known limitation — clients with no active room are redirected to Start.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a host starts the game, the room status MUST transition from the lobby state to an active game state.
- **FR-002**: The game start action MUST assign the room creator (first participant, marked as host) as the drawer for the round.
- **FR-003**: The game start action MUST deterministically select a secret word from the predefined starter word list based on the number of participants at start time.
- **FR-004**: The selected secret word MUST be persisted with the room state so it can be retrieved by the drawer on their next fetch.
- **FR-005**: The Game screen MUST display the drawer's identity to all players.
- **FR-006**: The Game screen MUST display the secret word to the drawer only.
- **FR-007**: The Game screen MUST display underscores matching the word length (one underscore per character, space-separated) to all non-drawer players where the secret word would appear.
- **FR-008**: The room snapshot MUST include a `wordLength` field (the character count of the secret word) for all viewers, so guessers can render the correct number of underscores without receiving the word itself.
- **FR-009**: All players on the Lobby screen MUST be automatically navigated to the Game screen within approximately 2 seconds of the game starting, without manual action.
- **FR-010**: The host's client MUST navigate to the Game screen immediately after the game start action succeeds.
- **FR-011**: A player who navigates directly to the Game screen URL without an active room session MUST be redirected to the Start screen.
- **FR-012**: The Game screen MUST fetch room state once on load to retrieve the drawer identity and secret word; continuous polling on the Game screen is not required in this scenario.
- **FR-013**: The Start Game action server-side validation errors (non-host caller, too few players) MUST be caught by the client and logged silently — no user-visible error message is required since the button is disabled client-side when conditions are not met.

### Key Entities

- **Room** *(extended)*: Adds `status: "game"` as a valid state alongside `"lobby"`. Gains `drawerId` (the participant ID of the current drawer) and `currentWord` (the secret word for this round) when the game starts.
- **Participant** *(unchanged)*: Each participant already has `id`, `name`, `isHost`. No new fields needed; drawer role is derived from `room.drawerId`.
- **RoomSnapshot** *(extended)*: `currentWord` is included only when the requesting participant is the drawer; all others receive `currentWord: null`. `drawerId` is always included. `wordLength: number | null` is always included so guessers can render underscore placeholders without seeing the word.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Both players are on the Game screen within 3 seconds of the host clicking Start Game.
- **SC-002**: The drawer sees the secret word 100% of the time on their Game screen.
- **SC-003**: The secret word is never visible to a guesser in any tested scenario — 0% leakage, including via network inspection.
- **SC-004**: The drawer is correctly identified on both the drawer's and the guesser's Game screen in 100% of tested scenarios.
- **SC-005**: The selected word is consistent across multiple page refreshes for the same game session (deterministic selection verified).
- **SC-006**: A direct navigation to the Game screen URL with no active room redirects to Start in under 1 second.

## Assumptions

- The drawer is always the room creator (first participant, `isHost: true`). There is no rotation or random assignment in this scenario.
- The secret word is selected deterministically: `word = STARTER_WORDS[participants.length % STARTER_WORDS.length]`. This produces a consistent result for the same room size.
- The client that initiated the start (host) navigates to the Game screen immediately upon a successful start response. Other clients detect the transition via lobby polling.
- The Game screen performs a single fetch on load to retrieve room state; continuous polling on the Game screen is deferred to Scenario 3 when live canvas and guess data require it.
- The participant's identity (`participantId`) is stored in client-side session storage so it survives page refreshes within the same tab.
- There is no game timer, turn rotation, or round counter in this scenario.
- The Game screen built in this scenario shows drawer identity and word visibility; the drawing canvas and guess input are addressed in Scenario 3.
- Player name validation was implemented in Scenario 1 and is already enforced; this scenario does not re-implement it.
