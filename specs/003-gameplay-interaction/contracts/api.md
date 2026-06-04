# API Contracts: Gameplay Interaction

**Feature**: Scenario 3 — Canvas drawing, guess submission, shared guess history
**Date**: 2026-06-04

## Existing Endpoints (modified)

### GET /rooms/:code

**Change**: Response body now includes `strokes` and `guesses` fields in the `RoomSnapshot`.

**Response** (200 OK):
```json
{
  "room": {
    "code": "ABCD",
    "status": "game",
    "participants": [...],
    "drawerId": "uuid",
    "currentWord": "castle",
    "wordLength": 6,
    "strokes": [
      { "points": [{ "x": 0.1, "y": 0.2 }, { "x": 0.3, "y": 0.4 }] }
    ],
    "guesses": [
      {
        "participantId": "uuid",
        "name": "Bob",
        "text": "apple",
        "isCorrect": false,
        "submittedAt": "2026-06-04T10:00:00.000Z"
      }
    ],
    "availableWords": [...],
    "roles": [...]
  }
}
```

*Note*: `currentWord` is filtered per viewer — only the drawer receives it. All players receive full `strokes` and `guesses` arrays. Polling this endpoint at ~2 s provides the shared canvas and guess history sync.

---

## New Endpoints

### POST /rooms/:code/strokes

Add a completed stroke. Only the drawer may call this endpoint.

**Request body**:
```json
{
  "participantId": "uuid-of-drawer",
  "stroke": {
    "points": [
      { "x": 0.10, "y": 0.20 },
      { "x": 0.15, "y": 0.25 },
      { "x": 0.20, "y": 0.30 }
    ]
  }
}
```

**Constraints**:
- `participantId` must match `room.drawerId`
- `stroke.points` must be a non-empty array
- All `x` and `y` values must be numbers in `[0.0, 1.0]`
- `room.status` must be `"game"`

**Response** (200 OK):
```json
{
  "room": { /* full RoomSnapshot as above, with the new stroke appended */ }
}
```

**Error responses**:
| Status | Condition |
|--------|-----------|
| 400    | Room not in `"game"` state, or empty `points` array |
| 403    | `participantId` is not the drawer |
| 404    | Room not found |

---

### POST /rooms/:code/guesses

Submit a text guess. Only a non-drawer participant who has not yet guessed correctly may call this endpoint.

**Request body**:
```json
{
  "participantId": "uuid-of-guesser",
  "text": "castle"
}
```

**Constraints**:
- `participantId` must NOT match `room.drawerId`
- `participantId` must not already have an entry in `room.guesses` with `isCorrect: true`
- `text` after trimming must be non-empty
- `room.status` must be `"game"`

**Response** (200 OK):
```json
{
  "isCorrect": true,
  "guess": {
    "participantId": "uuid-of-guesser",
    "name": "Bob",
    "text": "castle",
    "isCorrect": true,
    "submittedAt": "2026-06-04T10:00:01.000Z"
  }
}
```

*Note*: `isCorrect` is returned immediately so the client can provide feedback without waiting for the next polling cycle. The secret word (`currentWord`) is never included in this response.

**Error responses**:
| Status | Condition |
|--------|-----------|
| 400    | Room not in `"game"` state, or empty/whitespace `text` |
| 403    | `participantId` is the drawer, or has already guessed correctly |
| 404    | Room or participant not found |

---

## Schema Additions (backend/src/api/schemas.ts)

```typescript
export const addStrokeSchema = z.object({
  participantId: z.string(),
  stroke: z.object({
    points: z.array(
      z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
    ).min(1)
  })
});

export const submitGuessSchema = z.object({
  participantId: z.string(),
  text: z.string()
});
```
