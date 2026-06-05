# Feature Specification: Room Setup & Lobby

**Feature Branch**: `scribble-app`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Room Setup & Lobby"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host Creates a Room (Priority: P1)

A player wants to start a new game session. They open the app, choose to create a room, enter their name, and are assigned a unique room code. The system automatically designates the creator as the host. The player lands on the Lobby screen and sees themselves listed as a participant.

**Why this priority**: Room creation is the entry point for the entire game. Without a valid room, no other scenario is possible. It must work correctly before anything else can be tested.

**Independent Test**: Open the app, create a room with a valid name, confirm you land on the Lobby, confirm the room code is visible, and confirm the participant list shows your name.

**Acceptance Scenarios**:

1. **Given** the Start screen is displayed, **When** a player enters a non-empty name and submits the Create Room form, **Then** a room is created with a unique code, the player is recorded as the host, and the Lobby screen is displayed showing the room code and the player's name in the participant list.
2. **Given** the Create Room form is displayed, **When** a player submits with an empty or whitespace-only name, **Then** the room is not created and a clear error message is shown prompting the player to enter a valid name.
3. **Given** two separate players each create their own rooms, **When** each player views their respective Lobby screen, **Then** each room is fully isolated — participants, codes, and state do not bleed between rooms.

---

### User Story 2 - Player Joins an Existing Room (Priority: P2)

A player wants to join a game created by someone else. They enter the room code shared by the host, provide their name, and land on the Lobby screen alongside the host and any other players already present.

**Why this priority**: Without join functionality, multiplayer is impossible. This is the second essential step after room creation.

**Independent Test**: Create a room in one browser tab. Open a second tab, enter the room code and a different name, confirm both players appear in the Lobby.

**Acceptance Scenarios**:

1. **Given** a room exists with a valid code, **When** a second player enters that code and a non-empty name, **Then** the player is added to the room and the Lobby screen is displayed showing both participants.
2. **Given** the Join Room form is displayed, **When** a player submits with an empty or whitespace-only name, **Then** the player is not added and a clear error message is shown.
3. **Given** the Join Room form is displayed, **When** a player submits with an empty, whitespace-only, or non-existent room code, **Then** the join is rejected and a clear error message is shown indicating the code is invalid.
4. **Given** two rooms exist simultaneously, **When** a player joins one room, **Then** the other room's participant list is unaffected.
5. **Given** a player named "Alice" is already in a room, **When** a second player attempts to join the same room with the name "Alice" (or "alice" after trimming), **Then** the join is rejected and a clear error message states the name is already taken.

---

### User Story 3 - Lobby Refreshes Automatically (Priority: P3)

Players in the Lobby can see the current participant list without manually refreshing the page. When a new player joins the room, all players already in the Lobby see the updated list within approximately 2 seconds.

**Why this priority**: Automatic refresh is needed for the host to know when enough players have joined to start the game. Without it, players have no visibility into the current state of the room.

**Independent Test**: Create a room in Tab A. In Tab B, join the same room. Without any manual action in Tab A, confirm Tab A's participant list updates to include the Tab B player within 2 seconds.

**Acceptance Scenarios**:

1. **Given** a player is on the Lobby screen, **When** a new participant joins the room, **Then** the Lobby participant list updates automatically within approximately 2 seconds without requiring a manual refresh.
2. **Given** a player is on the Lobby screen with automatic refresh active, **When** no changes occur in the room, **Then** the participant list remains stable and no visible flicker or disruption occurs.

---

### User Story 4 - Host Starts the Game (Priority: P4)

Once at least 2 players are present in the Lobby, the host can start the game. Non-host players cannot start the game. The Start Game button is only enabled when the minimum player count is met.

**Why this priority**: The host-only start gate is required to ensure fair and intentional game initiation. This builds directly on the lobby polling that confirms enough players have joined.

**Independent Test**: Create a room (you are host). Confirm the Start Game button is disabled with only 1 player. In a second tab join the same room. Confirm the Start Game button becomes enabled in the host tab. Confirm the button is absent or disabled in the non-host tab.

**Acceptance Scenarios**:

1. **Given** only 1 player is in the Lobby, **When** the host views the Lobby screen, **Then** the Start Game button is visible but disabled, with a message indicating more players are needed.
2. **Given** at least 2 players are in the Lobby, **When** the host views the Lobby screen, **Then** the Start Game button becomes enabled.
3. **Given** at least 2 players are in the Lobby, **When** a non-host player views the Lobby screen, **Then** no Start Game button is shown to that player; instead, a "Waiting for host to start the game…" message is displayed.
4. **Given** the host clicks Start Game with at least 2 players present, **When** the action is submitted, **Then** the game transitions out of the Lobby state (progression to the Game Start scenario is handled in a separate spec).

---

### Edge Cases

- What happens when a player tries to join a room that does not exist? → Clear error message; player remains on the Join screen.
- What happens when the room code field contains only whitespace? → Treated as empty; join is rejected with an error message.
- What happens if the player name contains only spaces? → Treated as empty; create/join is rejected with an error message.
- What happens if the backend restarts while players are in the Lobby? → All room state is lost (in-memory only); this is a known limitation and out of scope to handle gracefully.
- What happens when multiple rooms exist simultaneously? → Each room is isolated; participants, codes, and state do not bleed between rooms.
- What happens if a player tries to join with a name already used in that room? → The join is rejected with a clear error message; the player must choose a different name.

## Clarifications

### Session 2026-06-04

- Q: What is the format of room codes? → A: 4–6 uppercase alphabetic characters (e.g., `WXYZ`)
- Q: What happens if two players in the same room try to use the same name? → A: Reject the join; show a clear error message that the name is already taken in that room
- Q: What do non-host players see in the Lobby while waiting for the game to start? → A: No Start Game button; a "Waiting for host to start the game…" message is displayed instead

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow a player to create a new room by entering a non-empty, non-whitespace-only name.
- **FR-002**: The system MUST automatically assign the room creator the role of host.
- **FR-003**: The system MUST generate a unique room code for each newly created room. Room codes MUST consist of 4–6 uppercase alphabetic characters (e.g., `WXYZ`).
- **FR-004**: The system MUST allow a player to join an existing room by entering a valid room code and a non-empty, non-whitespace-only name.
- **FR-005**: The system MUST reject join attempts that use a room code that does not correspond to any existing room, and MUST display a clear error message.
- **FR-006**: The system MUST reject create and join attempts where the player name is empty or whitespace-only, and MUST display a clear error message.
- **FR-014**: The system MUST reject a join attempt if the trimmed player name is already in use by another participant in the same room, and MUST display a clear error message indicating the name is taken.
- **FR-007**: The Lobby screen MUST display the room code and the current list of participants.
- **FR-008**: The Lobby screen MUST automatically refresh the participant list at approximately 2-second intervals without requiring manual user action.
- **FR-009**: The system MUST display a Start Game button visible to the host on the Lobby screen.
- **FR-010**: The Start Game button MUST be disabled when fewer than 2 players are in the room, with a message indicating more players are needed.
- **FR-011**: The Start Game button MUST become enabled when at least 2 players are present.
- **FR-012**: Non-host players MUST NOT see a Start Game button on the Lobby screen. Instead, a "Waiting for host to start the game…" message MUST be displayed.
- **FR-013**: Each room MUST be fully isolated — participants, state, and codes MUST NOT bleed between rooms.

### Key Entities

- **Room**: Represents a game session. Has a unique code, a list of participants, and a designated host. Created fresh for each game; destroyed when the backend restarts.
- **Participant**: A player in a room. Has a name and a flag indicating whether they are the host. Names are trimmed of leading/trailing whitespace before storage.
- **Room Code**: A short, unique identifier used to join a specific room. Consists of 4–6 uppercase alphabetic characters (e.g., `WXYZ`). Generated at room creation and shared by the host.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A player can create a room and reach the Lobby screen in under 10 seconds from the Start screen.
- **SC-002**: A player can join an existing room using a valid code in under 10 seconds from the Start screen.
- **SC-003**: The Lobby participant list reflects a newly joined player within 2 seconds of the join, without any manual refresh.
- **SC-004**: Invalid inputs (empty name, bad code) are rejected 100% of the time with a visible error message.
- **SC-005**: Two rooms created simultaneously remain fully isolated — no participant or state data from one room appears in the other.
- **SC-006**: The Start Game button correctly reflects player count: disabled with 1 player, enabled with 2 or more, in all tested scenarios.

## Assumptions

- Player names are trimmed of leading/trailing whitespace before validation; a name that becomes empty after trimming is rejected.
- Room codes consist of 4–6 uppercase alphabetic characters. Matching is case-insensitive (e.g., `WXYZ` and `wxyz` refer to the same room) as a usability default.
- The minimum number of players required to start a game is exactly 2.
- There is no maximum room size defined for this scenario; the system accepts any number of participants.
- All room state is held in server memory only; a backend restart clears all rooms. This is a known constraint, not a bug.
- The game transition triggered by Start Game (drawer assignment, word selection, etc.) is out of scope for this spec and covered in the Game Start & Drawer Flow spec.
- No authentication is required; any player can create or join a room with just a name.
- Room codes are generated by the server, not chosen by the player.
- Player names are unique within a room (case-insensitive comparison after trimming); duplicate names are rejected at join time.
