# Reflection — Scribble Assignment

## Overview

This assignment involved building a complete multiplayer drawing-and-guessing game on top of a provided TypeScript/Express + React starter. All four gameplay scenarios were implemented using the Spec Kit workflow: `/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`.

## What Was Built

- **Scenario 1 — Room Setup & Lobby**: Players can create rooms and join by code. The lobby shows connected participants and gates the Start Game button to the host with a minimum 2-player check.
- **Scenario 2 — Game Start & Drawer Flow**: The host starts the game; the host is assigned as drawer and sees the secret word while guessers see blank underscores. The Lobby screen polls and auto-redirects to the Game screen.
- **Scenario 3 — Gameplay Interaction**: The drawer uses an HTML5 Canvas to draw freehand strokes (normalized coordinates, one POST per stroke on pointer-up). Guessers submit text guesses and receive immediate correct/incorrect feedback from the same response. All players see a live chronological guess history updated by polling.
- **Scenario 4 — Game End & Results**: A correct guess atomically transitions the room to `"ended"` state. All players are auto-redirected to a new Results screen (revealed secret word, winner name, complete guess history) via the ~2-second polling mechanism. The host can click "Play Again" to reset the room to lobby state, again detected by polling.

## Key Technical Decisions

**HTTP polling only.** The constitution explicitly prohibited WebSockets. Every real-time feature — lobby countdown, stroke sync, guess history, game-end detection, Play Again redirect — is driven by ~2-second `setInterval` polling in each page component. This constraint forced careful design: each state transition had to be detectable from a single `GET /rooms/:code` snapshot.

**Atomic game-end in `submitGuess`.** Rather than a separate endpoint or two-step transition, setting `room.status = "ended"` inside the same `submitGuess` call that records the correct guess ensures no race window where a second guess could slip through. The existing `status !== "game"` guard then naturally rejects all subsequent guesses.

**Word reveal via snapshot filtering.** The `toRoomSnapshot()` function already filtered `currentWord` (shown only to the drawer). Adding `|| room.status === "ended"` to that single condition was the minimal correct change to reveal the word on the Results screen — no new endpoint needed.

**Single in-memory store.** All state lives in a `Map<string, Room>`. This made each service function straightforward to reason about and test, and kept the reset (`resetRoom`) simple: clear fields, set status back to `"lobby"`, participants preserved.

## Challenges

The most notable issue was an existing unit test ("submitGuess returns error: already_correct when caller already guessed correctly") that assumed the room would remain in `"game"` state after a correct guess. With Scenario 4's change, a correct guess now ends the game immediately, so a second attempt by the same player hits the `not_in_game` guard before `already_correct`. The test description and assertion were updated to reflect the correct post-Scenario-4 behavior.

Canvas coordinate normalization also required care: pointer events use CSS pixel coordinates relative to the element, so dividing by the canvas's `width`/`height` attributes (not the layout size) was essential for accurate stroke rendering across different screen sizes.

## What I Would Do Differently

With more time, I would add a timer and multi-round scoring to make the game more competitive. I would also explore making the canvas rendering use `requestAnimationFrame` instead of re-rendering on every polling tick for smoother performance. The current approach of redrawing all strokes from scratch on every render cycle is correct but not optimal for large stroke counts.

## Workflow Reflection

The Spec Kit structure (specify → clarify → plan → tasks → implement) kept each scenario well-scoped. Writing the spec and clarifying ambiguities before touching code helped avoid backtracking — particularly for Scenario 4, where the spec explicitly called out the atomic game-end requirement and the word-reveal behavior change in `toRoomSnapshot`, both of which would have been easy to miss without a structured design phase.
