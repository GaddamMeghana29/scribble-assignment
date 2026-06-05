# Discovery: Scribble Assignment

## Overview

Scribble is a multiplayer browser-based drawing-and-guessing game, structured as a brownfield enhancement lab. The repository ships a runnable but intentionally incomplete scaffold. The work involves writing AI-governance artifacts (constitution, specification, plan, tasks) and then implementing four gameplay scenarios incrementally.

**Explicit constraints (from AGENTS.md):**
- No WebSockets — all real-time sync is HTTP polling
- No databases — all state is in-memory only
- No authentication
- No new state-management libraries

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Backend runtime | Node.js + TypeScript (tsx) | TS 5.6.3, tsx 4.19.2 |
| Backend framework | Express | 4.21.1 |
| Frontend | React + React Router | 18.3.1 / 6.30.1 |
| Frontend build | Vite | 5.4.10 |
| Validation | Zod | 3.23.8 |
| Testing | Vitest | 3.1.3 (both sides) |
| Node version | 24.13.0 (`.nvmrc`) | |
| Module system | ES Modules (`"type": "module"`) | |

---

## Directory Layout

```
scribble-assignment/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml               # build + test on push / PR to main
│   │   ├── pr-lint.yml          # PR template verification
│   │   └── artifacts.yml
│   ├── scripts/
│   │   ├── pre-evaluation-check.mjs
│   │   └── verify-pr-description.mjs
│   └── pull_request_template.md
├── backend/
│   ├── src/
│   │   ├── server.ts            # entry point
│   │   ├── app.ts               # Express setup + CORS + error handler
│   │   ├── api/
│   │   │   ├── router.ts        # route registration
│   │   │   ├── rooms.ts         # request handlers
│   │   │   ├── schemas.ts       # Zod schemas + HttpError
│   │   │   └── schemas.test.ts
│   │   ├── services/
│   │   │   ├── roomStore.ts     # in-memory Map, all business logic
│   │   │   └── roomStore.test.ts
│   │   ├── models/
│   │   │   └── game.ts          # Room, Participant, RoomSnapshot interfaces
│   │   └── seed/
│   │       └── starterData.ts   # STARTER_WORDS, STARTER_ROLES
│   ├── package.json
│   └── tsconfig.json            # ES2022, strict
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── routes/index.tsx     # BrowserRouter + 5 routes
│   │   ├── pages/
│   │   │   ├── StartPage.tsx
│   │   │   ├── CreateRoomPage.tsx
│   │   │   ├── JoinRoomPage.tsx
│   │   │   ├── LobbyPage.tsx
│   │   │   └── GamePage.tsx     # placeholder only
│   │   ├── components/
│   │   │   ├── AppShell.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── GuessForm.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── ResultPanel.tsx
│   │   │   ├── RoomCodeBadge.tsx
│   │   │   └── Scoreboard.tsx
│   │   ├── services/
│   │   │   ├── api.ts           # all HTTP requests
│   │   │   └── api.test.ts
│   │   ├── state/
│   │   │   └── roomStore.ts     # custom store via useSyncExternalStore
│   │   └── styles/app.css
│   ├── package.json
│   └── vite.config.ts
├── README.md                    # full lab guide + evaluation rubric
├── CLAUDE.md                    # placeholder (minimal)
├── AGENTS.md                    # copilot constraints
└── .nvmrc
```

---

## Running the Project

```bash
# Backend — port 3001
cd backend && npm install && npm run dev

# Frontend — port 5173
cd frontend && npm install && npm run dev

# Tests
cd backend && npm test
cd frontend && npm test
```

---

## API Surface (Currently Implemented)

Base URL: `http://localhost:3001`

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/rooms` | Create room → returns `{ participantId, room: RoomSnapshot }` |
| POST | `/rooms/:code/join` | Join room → returns `{ participantId, room: RoomSnapshot }` |
| GET | `/rooms/:code` | Fetch current room snapshot |

---

## Data Model

### Backend (`backend/src/models/game.ts`)

```typescript
interface Participant {
  id: string;        // UUID
  name: string;
  joinedAt: string;  // ISO timestamp
}

interface Room {
  code: string;               // 4-char alphanumeric
  status: "lobby";            // only status currently defined
  participants: Participant[];
  createdAt: string;
  updatedAt: string;
}

interface RoomSnapshot extends Room {
  availableWords: string[];   // from STARTER_WORDS seed
  roles: ParticipantRole[];   // from STARTER_ROLES seed
}
```

Seed data (`backend/src/seed/starterData.ts`):
- Words: `rocket`, `pizza`, `castle`, `guitar`, `sunflower`
- Roles: `drawer`, `guesser`

### Frontend (`frontend/src/state/roomStore.ts`)

Custom store using React's `useSyncExternalStore` (no Zustand / Redux):

```typescript
interface RoomState {
  room: RoomSnapshot | null;
  participantId: string | null;
  error: string | null;
  isLoading: boolean;
}
```

---

## Architecture Notes

**Backend request flow:** router → handler (`rooms.ts`) → service (`roomStore.ts`) → in-memory `Map<string, Room>`

**Frontend state flow:**
1. User submits create/join form
2. `roomStore.createRoom()` / `roomStore.joinRoom()` calls API
3. Store sets `{ room, participantId }` via `setRoomSession()`
4. Pages subscribe via `useRoomState()` hook
5. Lobby has a manual refresh button; no automatic polling yet

---

## Known Issues & Gaps

| # | Issue | Location |
|---|---|---|
| 1 | `VITE_API_URL` default is `"http://localhost:3001/bug"` — the trailing `/bug` is an intentional or accidental bug | `frontend/src/services/api.ts:22` |
| 2 | No host tracking — room creation does not record which participant is the host | `backend/src/services/roomStore.ts` |
| 3 | No automatic lobby polling — `LobbyPage` has only a manual refresh button | `frontend/src/pages/LobbyPage.tsx` |
| 4 | `GamePage` is a non-functional placeholder | `frontend/src/pages/GamePage.tsx` |
| 5 | No game state on `Room` model — missing `status: "game" \| "result"`, drawer, secret word, guesses, scores | `backend/src/models/game.ts` |

---

## What Is Not Yet Implemented (Scenarios 1–4)

**Scenario 1 — Lobby**
- Host tracking and host-only "Start Game" gate
- Minimum 2-player enforcement
- Automatic polling (~2 s cadence)

**Scenario 2 — Game Start & Drawer Flow**
- Player name validation (trim, reject blank)
- Drawer assignment
- Deterministic secret word selection
- Drawer-only word visibility

**Scenario 3 — Gameplay**
- HTML5 canvas drawing with clear action
- Guess submission (trim, case-insensitive comparison)
- Synced guess history via polling
- Scoring (100 correct / 0 incorrect)

**Scenario 4 — Result & Restart**
- Result state showing correct word, final scores, guess history
- Host-initiated restart back to lobby (players preserved, round state cleared)

---

## CI/CD

GitHub Actions on push/PR to `main`:
- **Backend job**: install → build → test
- **Frontend job**: install → build → test
- npm cache keyed on `package-lock.json`
- Node version sourced from `.nvmrc` (24.13.0)
- PR lint workflow validates PR template fields (email, role checkbox)

---

## Submission Requirements

- Feature branch off `main`, PR raised against `main`
- Spec Kit artifacts committed: constitution, specification, plan, tasks
- Granular commits traceable to spec
- PR description: email, role, reflection
- Both `backend` and `frontend` must build cleanly
