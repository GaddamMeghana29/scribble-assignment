# Research: Gameplay Interaction

**Feature**: Scenario 3 — Canvas drawing, guess submission, shared guess history
**Date**: 2026-06-04

## Decision Log

### 1. Canvas Drawing API

**Decision**: Use native HTML5 Canvas API (`<canvas>`, `CanvasRenderingContext2D`) for all drawing.

**Rationale**: The spec Assumptions section explicitly prohibits new third-party drawing libraries ("No new third-party drawing libraries are introduced; canvas drawing uses native browser APIs"). Native Canvas is sufficient for polyline rendering and pointer event capture.

**Alternatives considered**: Fabric.js, Konva, rough.js — all rejected per constitution Principle V (Minimal Dependencies) and spec assumption.

---

### 2. Coordinate Normalization

**Decision**: Stroke points are stored as `{x, y}` values in the range 0.0–1.0, computed as `pointerX / canvasWidth` and `pointerY / canvasHeight` at capture time.

**Rationale**: The spec Key Entities section mandates normalized coordinates so strokes render correctly regardless of screen size differences between players. Denormalization happens at render time by multiplying by the canvas element's current pixel dimensions.

**Alternatives considered**: Pixel-absolute coordinates — rejected because canvas sizes differ across player viewports.

---

### 3. Stroke Transmission Protocol

**Decision**: On `pointerup`, POST the completed stroke to `POST /rooms/:code/strokes` with `{ participantId, stroke: { points } }`. One HTTP request per stroke.

**Rationale**: FR-002 mandates "one request per stroke" transmitted immediately on pointer-up. In-progress strokes are rendered locally only and not sent until complete.

**Alternatives considered**: Streaming each pointer-move event — rejected (too many requests, violates "one request per stroke" spec constraint).

---

### 4. Polling Upgrade for Game Screen

**Decision**: Replace the one-time `fetchRoom()` on mount (Scenario 2) with a `setInterval`-based poll at ~2000 ms inside a `useEffect` in `GamePage.tsx`. Cleanup on unmount via `clearInterval`.

**Rationale**: FR-016 requires the Game screen to poll at ~2-second intervals. Lobby polling already uses the same `setInterval` pattern in `LobbyPage.tsx`.

**Alternatives considered**: WebSockets, SSE — rejected per constitution Principle II.

---

### 5. Immediate Guess Feedback

**Decision**: `POST /rooms/:code/guesses` returns `{ isCorrect: boolean; guess: GuessEntry }` in the same response. The frontend disables the input and shows "Correct!" immediately on `isCorrect: true`, without waiting for the next polling cycle.

**Rationale**: FR-007 mandates the guess submission response returns `isCorrect` immediately so the guesser receives feedback without waiting for the next polling cycle.

**Alternatives considered**: Polling for correctness — rejected per FR-007.

---

### 6. Server-Side Guess Validation

**Decision**: The server computes `isCorrect` as `guess.trim().toLowerCase() === room.currentWord!.trim().toLowerCase()`. It rejects: (a) empty/whitespace guesses (400), (b) guesses from the drawer (403), (c) guesses from a participant who already has `isCorrect: true` in `room.guesses` (409).

**Rationale**: FR-006 (case-insensitive), FR-013 (reject drawer + already-correct), FR-014 (reject empty), SC-003 (100% accuracy).

---

### 7. Stroke Authorization

**Decision**: The server checks `participantId === room.drawerId` before accepting a stroke. Non-drawers receive a 403.

**Rationale**: FR-004 mandates guessers cannot draw. Enforcing server-side prevents any client bypass.

---

### 8. State Initialization and Reset

**Decision**: `createRoom()` initializes `strokes: []` and `guesses: []` on the Room object. `startRoom()` resets both arrays to `[]` when the game begins, so a fresh game always starts with an empty canvas and empty guess history.

**Rationale**: FR-015 requires the room snapshot to include all strokes and guesses for page-refresh restoration. Resetting on game start ensures no stale data from a hypothetical prior game in the same room.

---

### 9. No Secret Word Leakage via Guess Endpoints

**Decision**: `POST /rooms/:code/guesses` response includes `{ isCorrect, guess }` where `guess` contains the text submitted, the submitter name, and `isCorrect` — but never the `currentWord`. `GET /rooms/:code` continues to filter `currentWord` via the existing `toRoomSnapshot()` logic.

**Rationale**: SC-006 mandates 0% word leakage through guess endpoints.
