# API Contracts: Game End & Results

**Feature**: Scenario 4 — Game end on correct guess, Results screen, host Play Again
**Date**: 2026-06-04

## New Endpoint

### POST /rooms/:code/reset

Reset a room from `"ended"` back to `"lobby"`. Host-only.

**Request**

```
POST /rooms/:code/reset
Content-Type: application/json

{
  "participantId": "<string>"   // Must be the host's participant ID
}
```

**Success Response** — `200 OK`

```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [...],
    "drawerId": null,
    "currentWord": null,
    "wordLength": null,
    "strokes": [],
    "guesses": [],
    "availableWords": [...],
    "roles": [...]
  }
}
```

**Error Responses**

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Room is not in `"ended"` state | `{ "message": "Room is not ended" }` |
| 403 | Caller is not the host | `{ "message": "Only the host can reset the room" }` |
| 404 | Room code not found | `{ "message": "Room not found" }` |

---

## Modified Endpoints

### POST /rooms/:code/guesses (modified behavior)

Existing endpoint — behavior change: when the submitted guess is correct, the server atomically transitions the room to `"ended"` state before returning.

**Request** (unchanged)

```
POST /rooms/:code/guesses
Content-Type: application/json

{
  "participantId": "<string>",
  "text": "<string>"
}
```

**Success Response** — `200 OK` (unchanged shape)

```json
{
  "isCorrect": true,
  "guess": {
    "participantId": "<string>",
    "name": "<string>",
    "text": "<string>",
    "isCorrect": true,
    "submittedAt": "<ISO-8601>"
  }
}
```

**New rejection case**: When `room.status === "ended"`, the existing `not_in_game` guard fires and returns `400 Bad Request` (error `"not_in_game"`). No new error code is introduced.

**New rejection case error** (existing guard, now also covers "ended"):

| Status | Condition | Body |
|--------|-----------|------|
| 400 | Room status is `"ended"` (or `"lobby"`) | `{ "message": "Game has not started" }` |

All other error cases are unchanged.

---

### GET /rooms/:code (modified snapshot behavior)

Existing endpoint — behavior change: `currentWord` is now returned to ALL players (not just the drawer) when `room.status === "ended"`.

**Request** (unchanged)

```
GET /rooms/:code?participantId=<string>
```

**Success Response** — `200 OK`

When `status === "ended"`, `currentWord` contains the full revealed word for all players:

```json
{
  "room": {
    "code": "ABCD",
    "status": "ended",
    "participants": [...],
    "drawerId": "<string>",
    "currentWord": "elephant",
    "wordLength": 8,
    "strokes": [...],
    "guesses": [...],
    "availableWords": [...],
    "roles": [...]
  }
}
```

When `status === "game"`, `currentWord` behavior is unchanged (only visible to drawer).

---

## Unchanged Endpoints

| Endpoint | Notes |
|----------|-------|
| `POST /rooms` | Unchanged |
| `POST /rooms/:code/join` | Unchanged |
| `POST /rooms/:code/start` | Unchanged — `startRoom()` called fresh after `resetRoom()` for a new game |
| `POST /rooms/:code/strokes` | Unchanged — `not_in_game` guard already rejects strokes when `status !== "game"`, including `"ended"` |
