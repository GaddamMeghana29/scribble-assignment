# API Contracts: Room Setup & Lobby

**Base URL**: `http://localhost:3001`
**Content-Type**: `application/json` for all requests and responses.

---

## POST /rooms

Create a new room. The submitting player becomes the host.

### Request

```json
{
  "playerName": "Alice"
}
```

| Field        | Type     | Required | Constraints                              |
|--------------|----------|----------|------------------------------------------|
| `playerName` | `string` | Yes      | Non-empty after trimming whitespace       |

### Response — 201 Created

```json
{
  "participantId": "550e8400-e29b-41d4-a716-446655440000",
  "room": {
    "code": "WXYZ",
    "status": "lobby",
    "participants": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Alice",
        "isHost": true,
        "joinedAt": "2026-06-04T10:00:00.000Z"
      }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### Response — 400 Bad Request

```json
{ "message": "Player name is required" }
```

Returned when `playerName` is missing, empty, or whitespace-only.

---

## POST /rooms/:code/join

Join an existing room.

### Path Parameters

| Parameter | Type     | Constraints                                           |
|-----------|----------|-------------------------------------------------------|
| `code`    | `string` | Matched case-insensitively; normalised to uppercase   |

### Request

```json
{
  "playerName": "Bob"
}
```

| Field        | Type     | Required | Constraints                              |
|--------------|----------|----------|------------------------------------------|
| `playerName` | `string` | Yes      | Non-empty after trimming; unique in room  |

### Response — 200 OK

```json
{
  "participantId": "660e8400-e29b-41d4-a716-446655440001",
  "room": {
    "code": "WXYZ",
    "status": "lobby",
    "participants": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "Alice",
        "isHost": true,
        "joinedAt": "2026-06-04T10:00:00.000Z"
      },
      {
        "id": "660e8400-e29b-41d4-a716-446655440001",
        "name": "Bob",
        "isHost": false,
        "joinedAt": "2026-06-04T10:00:05.000Z"
      }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"]
  }
}
```

### Response — 400 Bad Request

```json
{ "message": "Player name is required" }
```

Returned when `playerName` is missing, empty, or whitespace-only.

### Response — 404 Not Found

```json
{ "message": "Unable to join room" }
```

Returned when no room exists with the given code.

### Response — 409 Conflict

```json
{ "message": "Name already taken" }
```

Returned when the trimmed, lowercased name matches an existing participant's name in the room.

---

## GET /rooms/:code

Fetch the current state of a room. Called by polling clients every ~2 seconds.

### Path Parameters

| Parameter | Type     | Constraints                                           |
|-----------|----------|-------------------------------------------------------|
| `code`    | `string` | Matched case-insensitively; normalised to uppercase   |

### Query Parameters

| Parameter       | Type     | Required | Notes                                         |
|-----------------|----------|----------|-----------------------------------------------|
| `participantId` | `string` | No       | Unused in Scenario 1; reserved for Scenario 2 |

### Response — 200 OK

```json
{
  "room": {
    "code": "WXYZ",
    "status": "lobby",
    "participants": [ ... ],
    "availableWords": [ ... ],
    "roles": [ ... ]
  }
}
```

### Response — 404 Not Found

```json
{ "message": "Unable to load room" }
```

---

## POST /rooms/:code/start

Start the game. Only the host may call this, and only when at least 2 participants are present. Game-state setup (drawer assignment, word selection) is handled in Scenario 2; this endpoint validates preconditions and marks the room as ready to start.

### Path Parameters

| Parameter | Type     | Constraints                                         |
|-----------|----------|-----------------------------------------------------|
| `code`    | `string` | Matched case-insensitively; normalised to uppercase |

### Request

```json
{
  "participantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

| Field           | Type     | Required | Constraints                           |
|-----------------|----------|----------|---------------------------------------|
| `participantId` | `string` | Yes      | Must match a participant with `isHost: true` |

### Response — 200 OK

```json
{
  "room": {
    "code": "WXYZ",
    "status": "lobby",
    "participants": [ ... ],
    "availableWords": [ ... ],
    "roles": [ ... ]
  }
}
```

### Response — 400 Bad Request

```json
{ "message": "At least 2 players are required to start" }
```

Returned when fewer than 2 participants are in the room.

### Response — 403 Forbidden

```json
{ "message": "Only the host can start the game" }
```

Returned when `participantId` does not match the host.

### Response — 404 Not Found

```json
{ "message": "Room not found" }
```
