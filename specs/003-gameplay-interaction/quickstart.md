# Quickstart: Gameplay Interaction — Two-Tab Acceptance Test

**Feature**: Scenario 3 — Canvas drawing, guess submission, shared guess history
**Date**: 2026-06-04
**Prerequisite**: Scenario 2 (Game Start & Drawer Flow) working end-to-end.

## Setup

1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open **Tab A** (host/drawer) and **Tab B** (guesser) at `http://localhost:5173`

---

## Scenario: Full Gameplay Loop

### Step 1 — Create & Join

- Tab A: Create a room as **Alice**
- Tab B: Join the same room code as **Bob**
- Tab A: Click **Start Game**
- Both tabs should navigate to `/game`

---

### Step 2 — Canvas Drawing (User Story 1)

**Draw in Tab A (Alice = drawer)**:

- Move pointer over the canvas area and draw several strokes (press, drag, release)
- Each stroke should appear immediately on Alice's canvas
- Within ~2 seconds, **Tab B (Bob)** should show the same strokes without refreshing
- Confirm Bob's canvas is read-only — Bob cannot draw anything

**Acceptance checklist**:
- [ ] Strokes appear immediately on drawer's canvas (Tab A)
- [ ] Strokes appear on guesser's canvas within ~2 seconds (Tab B)
- [ ] Guesser canvas has no drawing controls / cannot draw (Tab B)
- [ ] Multiple strokes accumulate in correct order across both tabs

---

### Step 3 — Page Refresh Restoration

- Refresh **Tab B**
- Within ~2 seconds (one polling cycle), all strokes drawn so far should reappear on Bob's canvas
- Check DevTools → Network: Bob's GET `/rooms/:code?participantId=...` response includes `strokes` array

**Acceptance checklist**:
- [ ] Canvas state fully restored after page refresh within one polling cycle
- [ ] `strokes` array present in GET room response (Tab B Network tab)

---

### Step 4 — Guess Submission (User Story 2)

**In Tab B (Bob = guesser)**:

- Type an **incorrect** word in the guess input and submit
- Confirm: no "Correct!" indicator; input remains active

- Type the **secret word** exactly (check Tab A's word display to find it) and submit
- Confirm: "Correct!" indicator appears **immediately** (before the next polling cycle)
- Confirm: guess input becomes **disabled** — Bob cannot submit another guess

**In Tab A (Alice = drawer)**:

- Confirm: Alice has **no guess input field** visible

**Acceptance checklist**:
- [ ] Incorrect guess shows no "Correct!" indicator; input stays active (Tab B)
- [ ] Correct guess shows "Correct!" immediately in the same request response (Tab B)
- [ ] Guess input is disabled after a correct guess (Tab B)
- [ ] No guess input visible for the drawer (Tab A)

---

### Step 5 — Shared Guess History (User Story 3)

- After Steps 4 above, wait ~2 seconds
- Both Tab A and Tab B should show a guess history list
- History should include:
  - Bob's incorrect guess (with name, text, and incorrect indicator)
  - Bob's correct guess (with name, text, and correct indicator, visually distinguished)

*Optional*: Open a third tab (**Tab C**) as **Carol**, join the game, and confirm Carol also sees the full guess history within ~2 seconds.

**Acceptance checklist**:
- [ ] All guesses appear in chronological order (oldest first) for all players
- [ ] Correct guesses are visually distinguished from incorrect ones
- [ ] Drawer (Tab A) can see who guessed correctly
- [ ] History updates within ~2 seconds of a new submission

---

### Step 6 — Edge Cases

**Empty guess**:
- Tab B: Submit the guess input empty or with only spaces → should not submit (button disabled or server rejects)

**Two simultaneous correct guesses** (three-tab test):
- Open Tab C as Carol, submit the correct word at approximately the same time as Bob
- Both Bob and Carol should receive "Correct!" and have inputs disabled
- Both entries should appear in the guess history

---

## Network Verification (DevTools)

| Request | Expected |
|---------|----------|
| `POST /rooms/:code/strokes` | 200 with updated `room.strokes` |
| `POST /rooms/:code/guesses` | 200 with `{ isCorrect: bool, guess: {...} }` |
| `GET /rooms/:code?participantId=...` | 200 with `strokes[]` and `guesses[]` |
| `GET /rooms/:code?participantId=<guesser>` | `currentWord: null` in response (no word leakage) |

---

## Definition of Done

All checkboxes above are checked. The feature is complete when:
1. Drawing syncs across tabs within ~2 seconds
2. Guesses receive immediate correct/incorrect feedback
3. Guess history is visible and live for all players
4. Page refresh restores full canvas and history state
5. Drawer has no guess input; guessers cannot draw
