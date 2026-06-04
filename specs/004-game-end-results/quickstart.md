# Quickstart: Game End & Results — Acceptance Test Guide

**Feature**: Scenario 4 — Game end on correct guess, Results screen, host Play Again
**Date**: 2026-06-04
**Prerequisite**: Scenario 3 (Gameplay Interaction) fully working

## Setup

1. Start the backend: `cd backend && npm run dev`
2. Start the frontend: `cd frontend && npm run dev`
3. Open **Tab A** and **Tab B** in the same browser

---

## Test Flow 1: Game Ends on Correct Guess (US1 — P1)

**Validates**: FR-001, FR-002, FR-003, FR-004, SC-001, SC-002

### Steps

1. **Tab A** — navigate to `/`, create a room as **Alice** (host + drawer)
2. **Tab B** — navigate to `/join-room`, join as **Bob** (guesser) using the same room code
3. **Tab A** — click **Start Game**; confirm Tab A shows the Game screen with a word visible (Alice is drawer)
4. **Tab B** — confirm Tab B shows the Game screen with underscores and a guess input

**Submit an incorrect guess:**
5. **Tab B** — type any wrong word and click **Submit**; confirm input stays enabled, no navigation occurs

**Submit the correct guess:**
6. **Tab A** — note the secret word shown to Alice (e.g., "elephant")
7. **Tab B** — type the exact secret word and click **Submit**

**Verify game end:**
8. Within ~2 seconds, **Tab B** navigates to `/results` automatically
9. Within ~2 seconds, **Tab A** navigates to `/results` automatically (via polling)
10. Confirm **neither tab** remains on the Game screen

**Verify Results screen content:**
11. **Both tabs** — confirm the full secret word is revealed (e.g., "elephant"), not underscores
12. **Both tabs** — confirm Bob's name is shown as the winner
13. **Both tabs** — confirm the guess history shows all guesses in order (incorrect ones first, then the correct one labeled "correct")

**Verify page refresh:**
14. **Tab A** — refresh the page; confirm within ~2 s it returns to `/results` with the same info
15. **Tab B** — refresh the page; confirm within ~2 s it returns to `/results` with the same info

---

## Test Flow 2: Results Screen Content (US2 — P2)

**Validates**: FR-004, FR-005, FR-006, FR-007, SC-002, SC-003, SC-005

### Steps

1. Start a game (same as Flow 1 steps 1–4)
2. **Tab B** — submit 2–3 incorrect guesses (e.g., "dog", "cat")
3. **Tab B** — submit the correct word
4. Both tabs navigate to `/results`
5. Confirm:
   - Secret word displayed in full (correct spelling)
   - Winner shown as "Bob" (first to guess correctly)
   - Guess history shows all entries in chronological order (dog, cat, then the correct word)
   - Incorrect guesses and correct guess are visually distinguished

---

## Test Flow 3: Host Restarts the Game (US3 — P3)

**Validates**: FR-008, FR-009, FR-010, FR-011, FR-012, SC-004

### Steps

1. Complete Flow 1 or 2 so both tabs are on `/results`

**Verify host-only button:**
2. **Tab A (Alice, host)** — confirm a **"Play Again"** button is visible
3. **Tab B (Bob, non-host)** — confirm there is NO "Play Again" button; a message like "Waiting for the host to start a new game" is shown

**Trigger Play Again:**
4. **Tab A** — click **"Play Again"**

**Verify redirect:**
5. Within ~2 seconds, **Tab A** navigates to `/lobby`
6. Within ~2 seconds, **Tab B** navigates to `/lobby`

**Verify clean lobby state:**
7. **Both tabs** — confirm the lobby shows no word, no drawer, no guesses
8. **Both tabs** — confirm Alice and Bob are still listed as participants (they did NOT need to re-join)

**Verify new game can start:**
9. **Tab A** — click **Start Game** again
10. Confirm a new game starts with a fresh canvas and empty guess history

---

## Test Flow 4: Race Condition — Simultaneous Correct Guesses

**Validates**: FR-001 (atomicity), SC-006 (zero post-end acceptances)

### Steps (requires three tabs)

1. Open **Tab C** — join as **Carol** (second guesser)
2. Start the game with Alice (host/drawer), Bob (guesser), Carol (guesser)
3. **Tab B and Tab C** — simultaneously submit the correct word

**Expected**:
- Only the first received guess is recorded as the winning guess
- The second submission receives a 400 response (game is already ended)
- Results screen shows exactly one winner (whoever submitted first)
- No duplicate correct guesses appear in the history

---

## Test Flow 5: Guess Submission Rejected After Game Ends

**Validates**: FR-013, SC-006

### Steps

1. Complete a game (correct guess submitted, room in `"ended"` state)
2. Using `curl` or DevTools, manually submit another guess to `POST /rooms/:code/guesses`:
   ```bash
   curl -s -X POST http://localhost:3001/rooms/XXXX/guesses \
     -H 'Content-Type: application/json' \
     -d '{"participantId":"...","text":"anything"}' | jq
   ```
3. Confirm the response is `400 Bad Request` with message `"Game has not started"`
4. Confirm the room remains in `"ended"` state (no state corruption)

---

## Acceptance Checklist

After completing all test flows, verify:

- [ ] Both tabs auto-navigate to `/results` within ~2 s of correct guess
- [ ] Secret word fully revealed on Results screen for all players
- [ ] Winner name correctly shown (first correct guesser)
- [ ] All guesses shown in order with correct/incorrect distinction
- [ ] Page refresh on `/results` restores all info within ~2 s
- [ ] "Play Again" button visible only on host's tab
- [ ] Non-host tab shows "waiting for host" message (no Play Again button)
- [ ] Both tabs auto-navigate to `/lobby` within ~2 s of host clicking Play Again
- [ ] Lobby state is clean (no word, no drawer, participants preserved)
- [ ] New game can be started from the lobby after Play Again
- [ ] Guess submission after game end returns 400

---

## Failure Indicators

| Symptom | Likely Cause |
|---------|-------------|
| Tab A (drawer) stays on Game screen after Bob guesses correctly | `GamePage.tsx` polling not checking for `"ended"` status |
| Results screen shows underscores instead of the word | `toRoomSnapshot()` not revealing `currentWord` when `status === "ended"` |
| No winner shown | `guesses.find(g => g.isCorrect)` returning undefined |
| "Play Again" button visible to non-host | `isHost` check missing in `ResultsPage.tsx` |
| After Play Again, tabs stay on Results screen | `resetRoom()` not setting `status = "lobby"` OR `ResultsPage` not redirecting on `"lobby"` |
| After Play Again, old guesses/strokes visible in new game | `resetRoom()` not clearing arrays |
