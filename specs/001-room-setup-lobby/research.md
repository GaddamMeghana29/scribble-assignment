# Research: Room Setup & Lobby

**Branch**: `scribble-app` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

## Findings

### Decision: Room code format
- **Decision**: 4 uppercase alphabetic characters (A–Z, excluding none for simplicity)
- **Rationale**: Spec clarification chose 4–6 uppercase alphabetic. The existing generator already produces 4-char codes; keeping 4 chars gives 26^4 = 456,976 unique codes — sufficient for in-memory sessions. Pure alphabetic avoids digit-letter confusion (0/O, 1/I).
- **Change required**: `generateCode()` in `backend/src/services/roomStore.ts` uses `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (32-char alphabet including digits). Update to `ABCDEFGHIJKLMNOPQRSTUVWXYZ` (26 letters only).
- **Alternatives considered**: Alphanumeric (current, rejected — includes digits per spec decision), timestamp-based (rejected — too long to share verbally).

### Decision: Host tracking
- **Decision**: Add `isHost: boolean` to the `Participant` interface. The creator is marked `isHost: true`; all joiners are `isHost: false`.
- **Rationale**: Simplest model; co-locates host flag with participant identity. No separate `hostId` field needed on `Room`. The frontend can determine "am I the host?" by looking up `participantId` in `room.participants`.
- **Change required**: `backend/src/models/game.ts` — add `isHost: boolean` to `Participant`. `backend/src/services/roomStore.ts` — pass `isHost: true` when creating first participant; `isHost: false` on join. Frontend `api.ts` — add `isHost: boolean` to `Participant` type.
- **Alternatives considered**: `hostId` on `Room` (rejected — requires separate lookup and introduces partial duplication).

### Decision: Name validation
- **Decision**: Validate at the **backend** in Zod schemas (`.transform(s => s.trim()).min(1)`). Frontend shows the error message returned by the API. Client-side trim before submit is acceptable as UX improvement but not required.
- **Rationale**: Spec requires server-side rejection of empty/whitespace names (FR-006). Centralising validation in Zod schemas keeps the backend authoritative and simplifies frontend logic.
- **Change required**: `backend/src/api/schemas.ts` — both `createRoomSchema` and `joinRoomSchema` change `playerName` from optional string to required trimmed non-empty string.
- **Alternatives considered**: Client-only validation (rejected — bypassed by direct API calls), both sides (deferred — frontend validation as UX enhancement is fine but not required for this spec).

### Decision: Duplicate name enforcement
- **Decision**: Case-insensitive comparison after trimming. If the trimmed lowercase name already exists in `room.participants`, `joinRoom()` returns a distinct error value and the handler throws `HttpError(409, "Name already taken")`.
- **Rationale**: Spec FR-014, clarification Q2. Case-insensitive prevents "Alice" and "alice" coexisting in the same room.
- **Change required**: `backend/src/services/roomStore.ts` — add duplicate check in `joinRoom()`.

### Decision: Lobby polling
- **Decision**: `useEffect` with `setInterval` (2 000 ms) in `LobbyPage`. Calls `roomStore.fetchRoom()`. Interval cleared on unmount. Errors during polling are silently swallowed (user stays on Lobby, next tick retries).
- **Rationale**: Aligns with constitution Principle II (HTTP polling only). The existing `fetchRoom()` method on `RoomStore` is already a clean wrapper around `GET /rooms/:code` — no new service layer needed.
- **Change required**: `frontend/src/pages/LobbyPage.tsx` — remove manual refresh button; add `setInterval` in `useEffect`.

### Decision: Start Game gate
- **Decision**: For Scenario 1, the frontend conditionally renders Start Game button (host only, enabled when `room.participants.length >= 2`). On click, the button calls `POST /rooms/:code/start` which validates host + player count and returns the room. The frontend then navigates to `/game`. Game state setup (drawer, word) is deferred to Scenario 2.
- **Rationale**: Keeps the host gate backend-validated so it can't be bypassed client-side. The start endpoint is intentionally minimal — Scenario 2 will add game-state transitions.
- **New endpoint required**: `POST /rooms/:code/start` — body `{ participantId }`, validates caller is host and `participants.length >= 2`, returns `{ room: RoomSnapshot }`.

### Decision: API URL bug fix
- **Decision**: Change `"http://localhost:3001/bug"` to `"http://localhost:3001"` in `frontend/src/services/api.ts:22`.
- **Rationale**: Existing known bug (discovery.md Issue #1). All API calls fail in a fresh checkout without this fix.
