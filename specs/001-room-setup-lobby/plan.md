# Implementation Plan: Room Setup & Lobby

**Branch**: `scribble-app` | **Date**: 2026-06-04 | **Spec**: [spec.md](./spec.md)

## Summary

Implement host tracking, name validation, duplicate-name rejection, automatic lobby polling, and a host-only Start Game gate on top of the existing room create/join/fetch scaffold. Fix the `VITE_API_URL` bug that breaks all API calls in a fresh checkout. See [research.md](./research.md) for all decisions and rationale.

## Technical Context

**Language/Version**: TypeScript 5.6.3 (backend: Node.js 24 + tsx); TypeScript 5.6.3 (frontend: React 18 + Vite 5)

**Primary Dependencies**: Express 4.21, Zod 3.23 (backend); React 18, React Router 6, Vite 5 (frontend)

**Storage**: In-memory `Map<string, Room>` in `backend/src/services/roomStore.ts`

**Testing**: Vitest 3.1.3 (both sides)

**Target Platform**: Browser (two tabs, localhost)

**Project Type**: Web application (frontend + backend)

**Performance Goals**: Lobby participant list refreshes within 2 s of a player joining

**Constraints**: No WebSockets; no databases; no new libraries beyond starter dependencies

**Scale/Scope**: Single machine, in-memory, small number of concurrent rooms for lab validation

## Constitution Check

*GATE: Must pass before implementation. Re-check after each task.*

| Principle | Status | Notes |
|---|---|---|
| I. Brownfield-First | ✅ | All changes extend existing files; no rewrites |
| II. HTTP Polling Only | ✅ | `setInterval` + `GET /rooms/:code`; no WebSockets |
| III. In-Memory State Only | ✅ | All state stays in the existing `rooms` Map |
| IV. Acceptance-Driven | ✅ | Two-browser-tab test defined in quickstart.md |
| V. Minimal Dependencies | ✅ | No new packages; Zod and React already installed |

## Project Structure

### Documentation (this feature)

```text
specs/001-room-setup-lobby/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 research findings
├── data-model.md        # Entity definitions and state transitions
├── quickstart.md        # Manual verification guide
├── contracts/
│   └── api.md           # REST endpoint contracts
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts              # Add isHost to Participant
│   ├── api/
│   │   ├── rooms.ts             # Add POST /:code/start route; map name_taken error
│   │   └── schemas.ts           # Tighten playerName validation; add startRoomSchema
│   └── services/
│       ├── roomStore.ts         # Update generateCode(); host flag; duplicate check; startRoom()
│       └── roomStore.test.ts    # Add/update unit tests

frontend/
├── src/
│   ├── services/
│   │   ├── api.ts               # Fix URL bug; add isHost to Participant; add startRoom()
│   │   └── api.test.ts          # Add/update tests
│   └── pages/
│       ├── CreateRoomPage.tsx   # Client-side trim + empty-name error; loading state
│       ├── JoinRoomPage.tsx     # Client-side trim + empty-name/code error; loading state
│       └── LobbyPage.tsx        # Polling; host badge; conditional Start Game
```

## Implementation Sequence

### Group A — Backend foundation

**A1** — `backend/src/models/game.ts`: Add `isHost: boolean` to `Participant` interface.

**A2** — `backend/src/api/schemas.ts`: Change `playerName` in `createRoomSchema` and `joinRoomSchema` from `z.string().optional()` to `z.string().trim().min(1, "Player name is required")`; add `startRoomSchema` with required `participantId`.

**A3** — `backend/src/services/roomStore.ts`:
- Update `generateCode()` alphabet to `ABCDEFGHIJKLMNOPQRSTUVWXYZ` (remove digits).
- Set `isHost: true` on the first participant created in `createRoom()`; `isHost: false` in `createParticipant()` default.
- In `joinRoom()`: before adding, check if any existing participant's `name.trim().toLowerCase()` matches the new name — if so return `{ error: "name_taken" }` sentinel.
- Add `startRoom(code, participantId)`: look up room, validate caller is host (`isHost: true`), validate `participants.length >= 2`, return room or `{ error: string }`.

**A4** — `backend/src/api/rooms.ts`:
- In `POST /:code/join` handler: map `name_taken` sentinel to `HttpError(409, "Name already taken")`.
- Add `POST /:code/start` handler using `startRoom()`, mapping error sentinels to `HttpError(403)` and `HttpError(400)`.

**A5** — `backend/src/services/roomStore.test.ts`: Test host flag on create; `isHost: false` on join; empty name rejected by Zod; duplicate name rejected; `startRoom` with non-host; `startRoom` with < 2 players; `startRoom` happy path.

### Group B — Frontend foundation

**B1** — `frontend/src/services/api.ts`:
- Fix `VITE_API_URL` default from `"http://localhost:3001/bug"` to `"http://localhost:3001"`.
- Add `isHost: boolean` to `Participant` type.
- Add `startRoom(code: string, participantId: string)` method calling `POST /rooms/:code/start`.

**B2** — `frontend/src/pages/CreateRoomPage.tsx`: Trim `playerName` before submit; show inline error if trimmed value is empty; disable the submit button while a request is in-flight.

**B3** — `frontend/src/pages/JoinRoomPage.tsx`: Trim `playerName` and `roomCode` before submit; show inline error if trimmed name or code is empty; disable submit while in-flight.

### Group C — Lobby behaviour

**C1** — `frontend/src/pages/LobbyPage.tsx` — polling: Remove manual Refresh button. Add `useEffect` with `setInterval(() => { roomStore.fetchRoom().catch(() => {}); }, 2000)` and cleanup `clearInterval` on unmount.

**C2** — `frontend/src/pages/LobbyPage.tsx` — host badge: Derive `isHost` by finding the participant whose `id === participantId` and reading their `isHost` flag. Render `"(Host)"` label next to the host's name in the participant list.

**C3** — `frontend/src/pages/LobbyPage.tsx` — Start Game gate:
- If `isHost`:
  - Show Start Game button.
  - Disabled + message "Need at least 2 players" when `room.participants.length < 2`.
  - Enabled when `room.participants.length >= 2`.
  - On click: call `api.startRoom(room.code, participantId)`; on success navigate to `/game`.
- If not host: hide Start Game button; show "Waiting for host to start the game…" paragraph.

## Testing Strategy

- **Unit tests**: `backend/src/services/roomStore.test.ts` covers all business logic changes. `frontend/src/services/api.test.ts` covers new `startRoom` call.
- **Manual verification**: Follow `quickstart.md` with two browser tabs; verify all edge cases in the validation checklist.
- **Build validation**: `cd backend && npm run build` and `cd frontend && npm run build` must pass before marking done.

## Risks

| Risk | Mitigation |
|------|-----------|
| Polling fires after component unmounts | Clear `setInterval` in `useEffect` cleanup return |
| `isHost` not forwarded in `toRoomSnapshot` | Ensure participant spread in `toRoomSnapshot()` includes `isHost` |
| Race condition on duplicate name join | Node.js is single-threaded; `Map` mutations are synchronous — no race possible |
