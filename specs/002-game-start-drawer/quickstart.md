# Quickstart & Validation Guide: Game Start & Drawer Flow

**Feature**: Game Start & Drawer Flow
**Date**: 2026-06-04

## Prerequisites

- Backend running: `cd backend && npm run dev` (port 3001)
- Frontend running: `cd frontend && npm run dev` (port 5173)
- Two browser tabs open to `http://localhost:5173`

---

## Scenario 1 — US1: Game Starts for All Players

**Setup**: Tab A = host, Tab B = guest.

1. Tab A: Enter name "Alice", click **Create Room**. Note the room code.
2. Tab B: Enter name "Bob", enter the room code, click **Join Room**.
3. Both tabs confirm 2 players in the Lobby: "Alice (Host)" and "Bob".
4. Tab A: Click **Start Game**.

**Expected (Tab A)**: Navigates immediately to the Game screen (`/game`). No page refresh.

**Expected (Tab B)**: Within ~2 seconds (one poll cycle), automatically navigates to the Game screen. No manual action needed.

**Fail conditions**:
- Tab B stays on Lobby after 4 seconds → lobby redirect not working
- Tab A stays on Lobby → `startRoom()` returning an error or navigation not triggered

---

## Scenario 2 — US2: Drawer Is Assigned

Continuing from Scenario 1 (both tabs on Game screen).

**Expected (Tab A — Alice, the drawer)**:
- Drawer section shows Alice's name as "Drawing now"
- A "Your role: Drawer" label is visible

**Expected (Tab B — Bob, the guesser)**:
- Drawer section shows "Alice" as drawing
- No "Drawer" role label for Bob

**Fail conditions**:
- Drawer section shows "No drawer assigned yet" → `drawerId` not set or not returned in snapshot
- Both tabs show "Your role: Drawer" → `isDrawer` logic incorrect

---

## Scenario 3 — US3: Secret Word Visible Only to Drawer

Continuing from Scenario 2.

**Expected (Tab A — Alice, the drawer)**:
- Secret Word card shows the actual word (e.g., **castle**) in large text

**Expected (Tab B — Bob, the guesser)**:
- Secret Word card shows `_ _ _ _ _ _` (6 underscores for "castle")
- The actual word "castle" must NOT appear anywhere on the page

**Network verification (Tab B)**:
1. Open DevTools → Network tab
2. Find the GET `/rooms/XXXX?participantId=...` request
3. Inspect the response JSON
4. Confirm `"currentWord": null` in the response body

**Fail conditions**:
- Tab B shows the actual word → server-side filtering broken
- DevTools shows `"currentWord": "castle"` for Bob → `toRoomSnapshot()` not filtering correctly
- Underscores count doesn't match word length → `wordLength` not set correctly

---

## Scenario 4 — Page Refresh Recovery

1. Tab A (Alice, drawer): Refresh the page.
2. Tab A should land on the Game screen, show "castle", and identify Alice as drawer.

**Expected**: Role and word visible immediately after refresh.

**Fail conditions**:
- Tab A redirects to Start screen → `participantId` not persisted in sessionStorage
- Tab A shows guesser view → `participantId` not passed to `fetchRoom()`

---

## Acceptance Checklist

- [ ] Tab B auto-navigates to Game screen within ~2 s of host clicking Start Game
- [ ] Alice sees "castle" on her screen
- [ ] Bob sees `_ _ _ _ _ _` on his screen
- [ ] Bob's network response shows `"currentWord": null`
- [ ] Refreshing Alice's tab restores her role and word
- [ ] Backend tests pass: `cd backend && npm test`
- [ ] Both builds clean: `cd backend && npm run build` and `cd frontend && npm run build`
