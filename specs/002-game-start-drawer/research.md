# Research: Game Start & Drawer Flow

**Feature**: Game Start & Drawer Flow
**Date**: 2026-06-04

## Decision 1: Drawer Assignment Strategy

**Decision**: The drawer is always the room creator — the participant with `isHost: true`.

**Rationale**: The spec requires deterministic drawer assignment in this scenario with no rotation. The host is already tracked via `isHost` on the `Participant` model. Using `drawerId = caller.id` (where caller is verified to be the host in `startRoom()`) keeps the assignment atomic with the game start action.

**Alternatives considered**:
- Random assignment: rejected — spec explicitly states no rotation or random assignment
- Separate drawer-election step: rejected — unnecessary complexity; host always draws in this scenario

## Decision 2: Word Selection Algorithm

**Decision**: `STARTER_WORDS[room.participants.length % STARTER_WORDS.length]`

**Rationale**: Deterministic and reproducible given room size. With 2 players (host + 1 guest), `2 % 5 = 2`, selecting index 2 ("castle"). The spec requires deterministic selection; this formula produces a consistent result for a given room configuration.

**Alternatives considered**:
- Random selection: rejected — spec requires determinism for reproducibility
- Host-chosen word: rejected — out of scope; no word input UI in this scenario

## Decision 3: Word Visibility Filtering

**Decision**: `toRoomSnapshot()` checks `viewerParticipantId === room.drawerId` and omits `currentWord` (sets to `null`) for non-drawers. A separate `wordLength` field is always included.

**Rationale**: Server-side filtering ensures the word never reaches the guesser's client, satisfying SC-003 (0% leakage including via network inspection). The `wordLength` field enables the underscore placeholder to be rendered without exposing the word.

**Alternatives considered**:
- Client-side hiding: rejected — word would still be transmitted in the response, visible in DevTools
- Sending underscores from server: rejected — `wordLength` is simpler and lets the client control rendering

## Decision 4: Guest Auto-Redirect Mechanism

**Decision**: Extend the existing `setInterval` lobby poll in `LobbyPage.tsx`. Add a `useEffect` that watches `room?.status` and navigates to `/game` when it becomes `"game"`.

**Rationale**: The lobby already polls every 2 seconds via `setInterval`. Adding a status watch on the polling result is the minimum change needed — no new infrastructure required.

**Alternatives considered**:
- Separate poll for game status: rejected — duplicates existing polling logic
- WebSocket push: rejected — constitution principle II forbids WebSockets

## Decision 5: participantId Client Persistence

**Decision**: Store `participantId` in `sessionStorage` under key `"scribble_participantId"` in `setRoomSession()`. Read it back in the `RoomStore` constructor initialisation.

**Rationale**: `sessionStorage` persists across page refreshes within the same tab and is cleared when the tab is closed. This supports the edge case where the drawer refreshes mid-game and needs to see their role and word restored. `localStorage` was rejected because it persists across tabs/sessions, which could cause identity confusion.

**Alternatives considered**:
- In-memory only: rejected — identity lost on refresh, drawer can't recover
- `localStorage`: rejected — persists too long, could conflict across game sessions
- URL params / cookies: rejected — adds complexity without benefit for this scope
