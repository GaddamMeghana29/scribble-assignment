# Data Model: Room Setup & Lobby

**Branch**: `scribble-app` | **Date**: 2026-06-04

## Entities

### Participant *(modified)*

Represents a player in a room.

| Field       | Type      | Constraints                                      |
|-------------|-----------|--------------------------------------------------|
| `id`        | `string`  | UUID, generated at creation, immutable           |
| `name`      | `string`  | Trimmed, non-empty, unique within room (case-insensitive) |
| `isHost`    | `boolean` | `true` for room creator; `false` for all joiners |
| `joinedAt`  | `string`  | ISO 8601 timestamp, set at creation              |

**Validation rules**:
- Name MUST be non-empty after trimming whitespace.
- Name MUST be unique within the room (case-insensitive comparison after trim).
- `isHost` is set by the server; clients cannot supply it.

**Change from starter**: Added `isHost: boolean` field.

---

### Room *(unchanged shape, code format updated)*

Represents an active game session.

| Field          | Type            | Constraints                                      |
|----------------|-----------------|--------------------------------------------------|
| `code`         | `string`        | 4 uppercase alphabetic characters (A–Z); unique  |
| `status`       | `"lobby"`       | Only `"lobby"` for Scenario 1                    |
| `participants` | `Participant[]` | Ordered by join time; first entry is always host |
| `createdAt`    | `string`        | ISO 8601 timestamp                               |
| `updatedAt`    | `string`        | ISO 8601 timestamp; updated on every mutation    |

**Validation rules**:
- Code is generated server-side using 4 random uppercase letters (A–Z).
- Code must be unique across all active rooms (retry on collision).
- Minimum 2 participants required before host can start the game.

**Change from starter**: Room code alphabet updated from alphanumeric to alphabetic-only. No schema field changes.

---

### RoomSnapshot *(response shape, modified)*

The view of a room returned to clients via the API. Contains a flattened participant list with host flag visible.

| Field              | Type            | Notes                                              |
|--------------------|-----------------|----------------------------------------------------|
| `code`             | `string`        | Room code                                          |
| `status`           | `"lobby"`       | Current room status                                |
| `participants`     | `Participant[]` | Includes `isHost` field on each entry              |
| `availableWords`   | `string[]`      | Starter word list (unchanged)                      |
| `roles`            | `string[]`      | Starter roles list (unchanged)                     |

**Change from starter**: `participants` array now includes `isHost` on each entry.

---

## State Transitions (Scenario 1 scope)

```
[not exists]
     │
     │  POST /rooms  (valid name)
     ▼
  [lobby]  ◄──── POST /rooms/:code/join  (valid name, unique, room exists)
     │
     │  POST /rooms/:code/start  (caller is host, 2+ participants)
     ▼
  [starting]  →  (Scenario 2 takes over)
```

**Within `[lobby]`:**
- Participants list grows as players join.
- `GET /rooms/:code` can be called at any time to refresh state.
- Only the host may trigger the start transition.

---

## Key Invariants

1. Exactly one participant in a room has `isHost: true` at all times.
2. A room's host is always the participant who created the room.
3. No two participants in the same room share a name (case-insensitive after trim).
4. All state is in-memory; room destruction on backend restart is expected behaviour.
