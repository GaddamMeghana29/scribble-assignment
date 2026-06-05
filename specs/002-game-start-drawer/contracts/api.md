# API Contracts: Game Start & Drawer Flow

**Base URL**: `http://localhost:3001`
**Date**: 2026-06-04

This scenario adds one new endpoint behaviour and modifies the response shape of all existing room endpoints.

---

## Modified: GET /rooms/:code

**Purpose**: Fetch current room state. Used by lobby polling and Game screen on-mount fetch.

**New query parameter**: `participantId` (string, optional) — used to filter `currentWord` in the snapshot.

**Request**:
```
GET /rooms/ABCD?participantId=<uuid>
```

**Response** `200 OK`:
```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby" | "game",
    "participants": [
      { "id": "<uuid>", "name": "Alice", "isHost": true, "joinedAt": "<iso>" },
      { "id": "<uuid>", "name": "Bob",   "isHost": false, "joinedAt": "<iso>" }
    ],
    "drawerId": "<uuid>" | null,
    "currentWord": "<word>" | null,
    "wordLength": 6 | null,
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

**`currentWord` filtering rules**:
- If `participantId` matches `drawerId` → `currentWord` is the actual word (e.g., `"castle"`)
- Otherwise → `currentWord: null`
- `wordLength` is always the character count of the word (or `null` if game not started)

**Error responses**:
- `404` — room not found

---

## New: POST /rooms/:code/start

**Purpose**: Host starts the game. Transitions room to `"game"` status, assigns drawer, selects word.

**Request**:
```
POST /rooms/ABCD/start
Content-Type: application/json

{ "participantId": "<host-uuid>" }
```

**Response** `200 OK` — room snapshot as the host/drawer (word visible):
```json
{
  "room": {
    "code": "ABCD",
    "status": "game",
    "participants": [...],
    "drawerId": "<host-uuid>",
    "currentWord": "castle",
    "wordLength": 6,
    "availableWords": [...],
    "roles": [...]
  }
}
```

**Error responses**:
- `404` — room not found (`room_not_found`)
- `403` — caller is not the host (`not_host`)
- `400` — fewer than 2 participants (`too_few_players`)

---

## Unchanged: POST /rooms (createRoom)

Response shape extended: now includes `drawerId: null`, `currentWord: null`, `wordLength: null`, `status: "lobby"` in the snapshot.

## Unchanged: POST /rooms/:code/join

Response shape extended: same new nullable fields in snapshot.

---

## Frontend Type Contract

`frontend/src/services/api.ts` — `RoomSnapshot` interface must match:

```typescript
export interface RoomSnapshot {
  code: string;
  status: "lobby" | "game";
  participants: Participant[];
  drawerId: string | null;
  currentWord: string | null;
  wordLength: number | null;
  availableWords: string[];
  roles: ParticipantRole[];
}
```
