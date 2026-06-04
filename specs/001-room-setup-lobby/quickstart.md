# Quickstart: Room Setup & Lobby

How to verify Scenario 1 end-to-end with two browser tabs.

## Prerequisites

```bash
# Terminal 1 — backend
cd backend && npm install && npm run dev
# Confirm: http://localhost:3001/health → { "ok": true }

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
# Confirm: http://localhost:5173 loads the Start screen
```

## Happy path (two-tab test)

**Tab A — Host flow**

1. Open `http://localhost:5173`
2. Click **Create Room**
3. Enter name `Alice` → click **Create and Continue**
4. Lobby loads. Note the 4-letter room code (e.g., `WXYZ`).
5. Confirm Alice appears in the participant list with a host badge.
6. Confirm Start Game button is **disabled** with a "need more players" message.

**Tab B — Join flow**

1. Open `http://localhost:5173` in a new tab
2. Click **Join Room**
3. Enter name `Bob` and the room code from Tab A → click **Join Lobby**
4. Lobby loads. Confirm Bob sees Alice and Bob in the participant list.
5. Confirm Bob sees "Waiting for host to start the game…" (no Start Game button).

**Back to Tab A**

6. Within ~2 seconds Bob appears in Tab A's participant list (automatic polling).
7. Confirm Start Game button is now **enabled**.
8. Click **Start Game** → navigates to Game screen (Scenario 2 takes over from here).

## Edge case checks

| Scenario | Steps | Expected |
|----------|-------|----------|
| Empty name on create | Submit Create Room with blank name | Error: "Player name is required" |
| Empty name on join | Submit Join Room with blank name | Error: "Player name is required" |
| Bad room code | Enter code `ZZZZ` (non-existent) | Error: "Unable to join room" |
| Duplicate name | Join with name `Alice` in Alice's room | Error: "Name already taken" |
| Only 1 player | View Lobby as host with 1 participant | Start Game button disabled |

## Validation checklist

- [ ] Room code is exactly 4 uppercase letters (A–Z only)
- [ ] Alice has host badge; Bob does not
- [ ] Tab A participant list updates within 2 s after Bob joins (no manual refresh)
- [ ] Start Game button appears only in Tab A (host tab)
- [ ] All error cases produce a visible, descriptive message
