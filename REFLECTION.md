# Reflection — Scribble Assignment

## What did the starter app already have?

The starter provided a working TypeScript/Express backend and a React + Vite frontend with basic routing already wired up. It included an in-memory room store that could create rooms and let players join by a 4-letter code. Players were assigned a `participantId` on join, and basic participant data (name, host flag, join timestamp) was stored per room. There was also a seed word list and role list, and a `toRoomSnapshot()` function that shaped the room data for the frontend.

What it did not have was any gameplay: no game state, no canvas, no guessing, no word assignment, no role differentiation between drawer and guesser, and no way to actually start or end a game.

## What did I add?

I implemented all four gameplay scenarios on top of the starter:

**Scenario 1 — Room Setup & Lobby**: Added a host-only "Start Game" button with a minimum 2-player guard, lobby polling so joined players see each other update in real time, and the redirect from lobby to game screen once the host starts.

**Scenario 2 — Game Start & Drawer Flow**: Wired up `startRoom()` to assign the host as drawer and pick a secret word. The game screen shows the full word to the drawer and blank underscores (matching the word length) to guessers.

**Scenario 3 — Gameplay Interaction**: Added the canvas drawing experience — the drawer draws freehand strokes using pointer events, each completed stroke is sent to the server on pointer-up, and guessers see strokes appear within ~2 seconds via polling. Guessers can submit text guesses and get immediate correct/incorrect feedback in the same HTTP response. All players see a live chronological guess history.

**Scenario 4 — Game End & Results**: When a correct guess is submitted, the room transitions to `"ended"` state in the same operation. All players are automatically redirected to a Results screen — which shows the revealed secret word, the winner's name, and the full guess history — via the existing polling mechanism. The host gets a "Play Again" button that resets the room back to lobby so the group can play again without rejoining.

## What was the workflow?

Each scenario followed the Spec Kit workflow: writing a feature spec first, clarifying ambiguities, producing a technical plan and task breakdown, then implementing task by task. This kept each scenario well-scoped and made it easy to verify one piece at a time before moving to the next.

## What would I do differently?

I would test the full game flow in the browser after each scenario rather than leaving it to the end. Some issues — like the guess input not appearing in certain tab setups — are easier to catch early. I would also write the reflection as I go rather than at the end, since the reasoning behind decisions is fresher mid-implementation.
