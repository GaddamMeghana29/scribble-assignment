# Data Model: Gameplay Interaction

**Feature**: Scenario 3 — Canvas drawing, guess submission, shared guess history
**Date**: 2026-06-04

## New Entities

### Stroke

Represents a single completed freehand drawing action from pointer-down to pointer-up.

```typescript
interface StrokePoint {
  x: number; // normalized 0.0–1.0 (relative to canvas width)
  y: number; // normalized 0.0–1.0 (relative to canvas height)
}

interface Stroke {
  points: StrokePoint[]; // ordered array; minimum 1 point
}
```

**Constraints**:
- All x and y values must be in the range [0.0, 1.0]
- An empty `points` array is invalid; server rejects strokes with no points
- Stored atomically: the entire stroke is appended in a single operation on pointer-up
- Order is preserved; strokes are rendered in insertion order

---

### GuessEntry

Represents a single guess submitted by a guesser participant.

```typescript
interface GuessEntry {
  participantId: string;   // UUID of the submitting participant
  name: string;            // display name of the submitter (snapshot at submission time)
  text: string;            // trimmed guess text
  isCorrect: boolean;      // true if text (lowercased) === currentWord (lowercased)
  submittedAt: string;     // ISO 8601 timestamp
}
```

**Constraints**:
- `text` is stored trimmed; empty or whitespace-only values are rejected before storage
- `isCorrect` is computed server-side; clients never supply this field
- `submittedAt` is set by the server at the moment of acceptance
- Once stored, a `GuessEntry` is immutable
- Entries are appended in submission order (chronological)

---

## Modified Entities

### Room (extended)

The existing `Room` interface gains two new fields:

```typescript
// Additions to the existing Room interface in backend/src/models/game.ts
strokes: Stroke[];     // initially []; ordered list of all completed strokes
guesses: GuessEntry[]; // initially []; ordered list of all submitted guesses
```

**Initialization**: Both fields are set to `[]` in `createRoom()` and reset to `[]` in `startRoom()`.

**Persistence**: Lives in the existing in-memory `Map<string, Room>`. No external storage.

---

### RoomSnapshot (extended)

The existing `RoomSnapshot` interface gains two matching fields so clients receive full canvas and history state in every poll response:

```typescript
// Additions to RoomSnapshot in backend/src/models/game.ts and frontend/src/services/api.ts
strokes: Stroke[];     // all strokes drawn so far
guesses: GuessEntry[]; // all guesses submitted so far
```

**Filtering**: Unlike `currentWord`, strokes and guesses are sent to all players without filtering.

---

## State Transitions

```
createRoom()  →  Room{ strokes: [], guesses: [] }
startRoom()   →  Room{ strokes: [], guesses: [], status: "game", drawerId: ..., currentWord: ... }
addStroke()   →  Room.strokes.push(stroke)
submitGuess() →  Room.guesses.push(guessEntry)
```

---

## Relationships

- `Room` owns zero-or-more `Stroke[]` — all strokes belong to the current game round
- `Room` owns zero-or-more `GuessEntry[]` — all guesses belong to the current game round
- `GuessEntry.participantId` references a `Participant.id` within the same `Room.participants` array
- A `Participant` may appear in zero or more `GuessEntry` records; however, after a correct guess, the server rejects further guesses from that participant
