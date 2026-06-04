# Data Model: Game End & Results

**Feature**: Scenario 4 — Game end on correct guess, Results screen, host Play Again
**Date**: 2026-06-04

## Entity Changes

### RoomStatus (extended)

**Current** (`backend/src/models/game.ts`):
```typescript
export type RoomStatus = "lobby" | "game";
```

**After this feature**:
```typescript
export type RoomStatus = "lobby" | "game" | "ended";
```

**State transitions**:
```
lobby  --[startRoom()]-->  game
game   --[submitGuess() with correct guess]-->  ended
ended  --[resetRoom()]-->  lobby
```

| State | Meaning |
|-------|---------|
| `"lobby"` | Room waiting for host to start |
| `"game"` | Active round in progress |
| `"ended"` | Round completed; awaiting host's Play Again |

---

### Room (unchanged structure)

No new fields on `Room`. The existing fields serve all Scenario 4 requirements:

| Field | Type | Scenario 4 Role |
|-------|------|-----------------|
| `status` | `RoomStatus` | Now includes `"ended"` |
| `currentWord` | `string \| null` | Retained for Results screen reveal; cleared by `resetRoom()` |
| `guesses` | `GuessEntry[]` | Contains winner (first `isCorrect: true` entry); cleared by `resetRoom()` |
| `strokes` | `Stroke[]` | Cleared by `resetRoom()` |
| `drawerId` | `string \| null` | Cleared (set to `null`) by `resetRoom()` |
| `participants` | `Participant[]` | Preserved across `resetRoom()` — players do not re-join |

---

### RoomSnapshot (modified behavior)

The `RoomSnapshot` interface shape is unchanged. The `toRoomSnapshot()` function changes behavior for the `"ended"` state:

**Current behavior**: `currentWord` is returned only to the drawer; all others receive `null`.

**New behavior**: When `room.status === "ended"`, `currentWord` is returned to ALL players (the game is over and the word can be revealed).

```typescript
// Current
currentWord: isDrawer ? room.currentWord : null,

// After change
currentWord: (isDrawer || room.status === "ended") ? room.currentWord : null,
```

**wordLength behavior**: `wordLength` is derived from `room.currentWord?.length ?? null`. This does not change — it will be non-null whenever `currentWord` is set.

---

### Winner Derivation (no new field)

The winner is not stored as a separate field. It is derived at read time:

```
winner = room.guesses.find(g => g.isCorrect)
```

The `GuessEntry` for the winning guess already contains:
- `name`: the display name of the winner
- `participantId`: the winner's participant ID
- `text`: the correct word (as guessed)
- `isCorrect: true`
- `submittedAt`: the timestamp of the winning guess

---

## Service Function Changes

### submitGuess (modified)

**New behavior**: When `isCorrect === true`, after pushing the `GuessEntry`, set `room.status = "ended"`.

```typescript
// After appending the guess entry:
if (isCorrect) {
  room.status = "ended";
}
room.updatedAt = now();
rooms.set(room.code, room);
return { isCorrect, guess: { ...guess } };
```

**Guard still applies**: The existing `if (room.status !== "game")` guard at the top of `submitGuess()` will reject submissions when the room is already `"ended"` (FR-013). No additional check needed.

---

### resetRoom (new)

```typescript
export function resetRoom(code: string, participantId: string) {
  const room = rooms.get(code);
  if (!room) return { error: "room_not_found" as const };
  const caller = room.participants.find((p) => p.id === participantId);
  if (!caller?.isHost) return { error: "not_host" as const };
  if (room.status !== "ended") return { error: "not_ended" as const };
  room.status = "lobby";
  room.drawerId = null;
  room.currentWord = null;
  room.strokes = [];
  room.guesses = [];
  room.updatedAt = now();
  rooms.set(room.code, room);
  return { room: cloneRoom(room) };
}
```

**Error codes**:

| Error | HTTP | Meaning |
|-------|------|---------|
| `room_not_found` | 404 | No room with given code |
| `not_host` | 403 | Caller is not the host |
| `not_ended` | 400 | Room is not in ended state |

---

## Frontend Type Changes

### RoomSnapshot.status (frontend/src/services/api.ts)

```typescript
// Current
status: "lobby" | "game";

// After
status: "lobby" | "game" | "ended";
```

### New api.resetRoom method

```typescript
resetRoom(code: string, participantId: string): Promise<{ room: RoomSnapshot }>
```
