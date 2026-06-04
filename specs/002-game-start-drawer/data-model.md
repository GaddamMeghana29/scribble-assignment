# Data Model: Game Start & Drawer Flow

**Feature**: Game Start & Drawer Flow
**Date**: 2026-06-04

## Entities

### RoomStatus (type union)

Extended from `"lobby"` to support `"game"`.

```
RoomStatus = "lobby" | "game"
```

| Value | Meaning |
|-------|---------|
| `"lobby"` | Room is waiting for players; game has not started |
| `"game"` | Host clicked Start Game; game is active |

**Transition**: `"lobby"` → `"game"` via `startRoom()`. No reverse transition in this scenario.

---

### Room (backend entity — extended)

Stored in the in-memory `Map<string, Room>`. Two new fields added.

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `code` | `string` | No | 4-character uppercase room code (existing) |
| `status` | `RoomStatus` | No | `"lobby"` or `"game"` (extended) |
| `participants` | `Participant[]` | No | All joined players (existing) |
| `drawerId` | `string \| null` | Yes | Participant ID of the current drawer; `null` until game starts (new) |
| `currentWord` | `string \| null` | Yes | The secret word for this round; `null` until game starts (new) |
| `createdAt` | `string` | No | ISO timestamp (existing) |
| `updatedAt` | `string` | No | ISO timestamp, updated on any mutation (existing) |

**Initialisation**: `drawerId: null`, `currentWord: null` set by `createRoom()`.

**Mutation**: `startRoom()` sets `status: "game"`, `drawerId: <host participant ID>`, `currentWord: STARTER_WORDS[participants.length % STARTER_WORDS.length]`.

---

### Participant (unchanged)

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | UUID, uniquely identifies the participant |
| `name` | `string` | Display name (trimmed, non-empty) |
| `isHost` | `boolean` | `true` for the room creator only |
| `joinedAt` | `string` | ISO timestamp |

**Drawer derivation**: The drawer is the participant where `participant.id === room.drawerId`. No new field on Participant is needed.

---

### RoomSnapshot (API response shape — extended)

Returned by all room endpoints. Three new fields added. `currentWord` is filtered server-side.

| Field | Type | Drawer | Guesser | Description |
|-------|------|--------|---------|-------------|
| `code` | `string` | ✅ | ✅ | Room code |
| `status` | `"lobby" \| "game"` | ✅ | ✅ | Current room state (extended) |
| `participants` | `Participant[]` | ✅ | ✅ | All players |
| `drawerId` | `string \| null` | ✅ | ✅ | Always included; `null` before game starts |
| `currentWord` | `string \| null` | ✅ actual word | ✅ always `null` | Filtered server-side in `toRoomSnapshot()` |
| `wordLength` | `number \| null` | ✅ | ✅ | Character count of secret word; `null` before game starts |
| `availableWords` | `string[]` | ✅ | ✅ | Full starter word list (existing) |
| `roles` | `ParticipantRole[]` | ✅ | ✅ | Available roles (existing) |

**Filtering logic** in `toRoomSnapshot(room, viewerParticipantId)`:
```
isDrawer = viewerParticipantId != null && viewerParticipantId === room.drawerId
currentWord → isDrawer ? room.currentWord : null
wordLength  → room.currentWord?.length ?? null  (same for all viewers)
```

---

## State Transitions

```
createRoom()
  └─ Room { status: "lobby", drawerId: null, currentWord: null }
          │
          │ startRoom(code, hostParticipantId)
          │   validates: caller.isHost && participants.length >= 2
          ▼
     Room { status: "game", drawerId: hostId, currentWord: "castle" }
```

## Starter Words

Defined in `backend/src/seed/starterData.ts` as `STARTER_WORDS`:

| Index | Word | Letters |
|-------|------|---------|
| 0 | rocket | 6 |
| 1 | pizza | 5 |
| 2 | castle | 6 |
| 3 | guitar | 6 |
| 4 | sunflower | 9 |

With 2 players (1 host + 1 guest): `2 % 5 = 2` → `"castle"` (6 letters → `_ _ _ _ _ _`)
