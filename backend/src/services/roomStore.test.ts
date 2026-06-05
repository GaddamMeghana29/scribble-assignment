import { describe, expect, it } from "vitest";
import { addStroke, createRoom, getRoom, joinRoom, resetRoom, startRoom, submitGuess, toRoomSnapshot } from "./roomStore.js";
import { createRoomSchema, joinRoomSchema } from "../api/schemas.js";
import { STARTER_WORDS } from "../seed/starterData.js";

describe("roomStore", () => {
  // US1 — Host Creates a Room
  it("createRoom returns a room with a 4-character uppercase alphabetic code", () => {
    const result = createRoom("Alice");

    expect(result.room.code).toMatch(/^[A-Z]{4}$/);
    expect(result.room.participants).toHaveLength(1);
    expect(result.room.participants[0].name).toBe("Alice");
    expect(result.participantId).toBeDefined();
  });

  it("createRoom marks the first participant as host", () => {
    const result = createRoom("Alice");

    expect(result.room.participants[0].isHost).toBe(true);
    expect(result.participantId).toBe(result.room.participants[0].id);
  });

  it("createRoomSchema rejects empty player name", () => {
    expect(() => createRoomSchema.parse({ playerName: "" })).toThrow();
  });

  it("createRoomSchema rejects whitespace-only player name", () => {
    expect(() => createRoomSchema.parse({ playerName: "   " })).toThrow();
  });

  // US2 — Player Joins an Existing Room
  it("joinRoom returns null for an unknown room code", () => {
    const result = joinRoom("ZZZZ", "Bob");

    expect(result).toBeNull();
  });

  it("joinRoom marks joining participant as not host", () => {
    const created = createRoom("Alice");
    const result = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };

    expect(result).not.toBeNull();
    const bob = result.room.participants.find((p) => p.name === "Bob");
    expect(bob?.isHost).toBe(false);
  });

  it("joinRoom rejects a duplicate name (case-insensitive)", () => {
    const created = createRoom("Alice");
    const result = joinRoom(created.room.code, "alice");

    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toBe("name_taken");
  });

  it("joinRoom rejects a duplicate name after trim", () => {
    const created = createRoom("Alice");
    const result = joinRoom(created.room.code, "  Alice  ");

    expect(result).not.toBeNull();
    expect("error" in result!).toBe(true);
    expect((result as { error: string }).error).toBe("name_taken");
  });

  it("joinRoomSchema rejects empty player name", () => {
    expect(() => joinRoomSchema.parse({ playerName: "" })).toThrow();
  });

  it("joinRoomSchema rejects whitespace-only player name", () => {
    expect(() => joinRoomSchema.parse({ playerName: "   " })).toThrow();
  });

  // US4 — Host Starts the Game
  it("startRoom returns not_host when caller is not the host", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    const bobId = joined.room.participants.find((p) => p.name === "Bob")!.id;

    const result = startRoom(created.room.code, bobId);

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("not_host");
  });

  it("startRoom returns too_few_players when fewer than 2 participants", () => {
    const created = createRoom("Alice");

    const result = startRoom(created.room.code, created.participantId);

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("too_few_players");
  });

  it("startRoom succeeds when host calls with 2+ participants", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");

    const result = startRoom(created.room.code, created.participantId);

    expect("error" in result).toBe(false);
    expect("room" in result).toBe(true);
  });

  it("startRoom returns room_not_found for unknown code", () => {
    const result = startRoom("ZZZZ", "some-id");

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("room_not_found");
  });

  // T008 — startRoom mutation tests
  it("startRoom sets room status to 'game'", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");

    const result = startRoom(created.room.code, created.participantId) as { room: ReturnType<typeof createRoom>["room"] };

    expect(result.room.status).toBe("game");
  });

  it("startRoom sets drawerId to the host's participant ID", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");

    const result = startRoom(created.room.code, created.participantId) as { room: ReturnType<typeof createRoom>["room"] };

    expect(result.room.drawerId).toBe(created.participantId);
  });

  it("startRoom selects a word from STARTER_WORDS", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");

    const result = startRoom(created.room.code, created.participantId) as { room: ReturnType<typeof createRoom>["room"] };

    expect(STARTER_WORDS).toContain(result.room.currentWord);
  });

  it("startRoom with 2 players selects index 2 ('castle')", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");

    const result = startRoom(created.room.code, created.participantId) as { room: ReturnType<typeof createRoom>["room"] };

    expect(result.room.currentWord).toBe("castle");
  });

  // T012 — toRoomSnapshot drawerId test
  it("toRoomSnapshot always includes drawerId for the drawer", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    const started = startRoom(created.room.code, created.participantId) as { room: ReturnType<typeof createRoom>["room"] };

    const snapshot = toRoomSnapshot(started.room, created.participantId);

    expect(snapshot.drawerId).toBe(created.participantId);
  });

  // T015 — toRoomSnapshot word filtering tests
  it("toRoomSnapshot returns currentWord for the drawer", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    const started = startRoom(created.room.code, created.participantId) as { room: ReturnType<typeof createRoom>["room"] };

    const snapshot = toRoomSnapshot(started.room, created.participantId);

    expect(snapshot.currentWord).toBe("castle");
  });

  it("toRoomSnapshot returns null currentWord for a guesser", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    const started = startRoom(created.room.code, created.participantId) as { room: ReturnType<typeof createRoom>["room"] };

    const snapshot = toRoomSnapshot(started.room, joined.participantId);

    expect(snapshot.currentWord).toBeNull();
  });

  it("toRoomSnapshot returns correct wordLength for both viewer types", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    const started = startRoom(created.room.code, created.participantId) as { room: ReturnType<typeof createRoom>["room"] };

    const drawerSnapshot = toRoomSnapshot(started.room, created.participantId);
    const guesserSnapshot = toRoomSnapshot(started.room, joined.participantId);

    expect(drawerSnapshot.wordLength).toBe("castle".length);
    expect(guesserSnapshot.wordLength).toBe("castle".length);
  });

  // T017 / T018 — addStroke tests
  it("addStroke appends a stroke to room.strokes", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    startRoom(created.room.code, created.participantId);

    const stroke = { points: [{ x: 0.1, y: 0.2 }, { x: 0.3, y: 0.4 }] };
    const result = addStroke(created.room.code, created.participantId, stroke) as { room: ReturnType<typeof createRoom>["room"] };

    expect("error" in result).toBe(false);
    expect(result.room.strokes).toHaveLength(1);
    expect(result.room.strokes[0].points).toEqual(stroke.points);
  });

  it("addStroke returns error: not_drawer when caller is not the drawer", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const result = addStroke(created.room.code, joined.participantId, { points: [{ x: 0.1, y: 0.1 }] });

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("not_drawer");
  });

  it("addStroke returns error: not_in_game when room status is not 'game'", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");

    const result = addStroke(created.room.code, created.participantId, { points: [{ x: 0.1, y: 0.1 }] });

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("not_in_game");
  });

  it("addStroke returns error: room_not_found for unknown code", () => {
    const result = addStroke("ZZZZ", "some-id", { points: [{ x: 0.1, y: 0.1 }] });

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("room_not_found");
  });

  it("toRoomSnapshot includes strokes array with all committed strokes", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    startRoom(created.room.code, created.participantId);

    const stroke = { points: [{ x: 0.5, y: 0.5 }] };
    addStroke(created.room.code, created.participantId, stroke);
    addStroke(created.room.code, created.participantId, { points: [{ x: 0.1, y: 0.9 }] });

    // fetch fresh room for snapshot
    const result = addStroke(created.room.code, created.participantId, { points: [{ x: 0.2, y: 0.3 }] }) as { room: ReturnType<typeof createRoom>["room"] };
    const snapshot = toRoomSnapshot(result.room, created.participantId);

    expect(snapshot.strokes).toHaveLength(3);
  });

  // T025 / T026 — submitGuess tests
  it("submitGuess returns isCorrect: true for case-insensitive exact match", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const result = submitGuess(created.room.code, joined.participantId, "CASTLE");

    expect("error" in result).toBe(false);
    expect((result as { isCorrect: boolean }).isCorrect).toBe(true);
  });

  it("submitGuess returns isCorrect: false for non-matching guess", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const result = submitGuess(created.room.code, joined.participantId, "apple");

    expect("error" in result).toBe(false);
    expect((result as { isCorrect: boolean }).isCorrect).toBe(false);
  });

  it("submitGuess appends a GuessEntry to room.guesses", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const result = submitGuess(created.room.code, joined.participantId, "apple");

    expect("error" in result).toBe(false);
    expect((result as { guess: { text: string } }).guess.text).toBe("apple");
    expect((result as { guess: { participantId: string } }).guess.participantId).toBe(joined.participantId);
  });

  it("submitGuess returns error: drawer_cannot_guess when caller is the drawer", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    startRoom(created.room.code, created.participantId);

    const result = submitGuess(created.room.code, created.participantId, "castle");

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("drawer_cannot_guess");
  });

  it("submitGuess returns error: not_in_game when room is 'ended' (correct guess ends the game)", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    submitGuess(created.room.code, joined.participantId, "castle");
    // After a correct guess the room is "ended"; any subsequent guess hits not_in_game first
    const result = submitGuess(created.room.code, joined.participantId, "castle");

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("not_in_game");
  });

  it("submitGuess returns error: empty_guess for whitespace-only text", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const result = submitGuess(created.room.code, joined.participantId, "   ");

    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("empty_guess");
  });

  it("toRoomSnapshot includes guesses array with all submitted guesses", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    submitGuess(created.room.code, joined.participantId, "apple");
    const stroke = addStroke(created.room.code, created.participantId, { points: [{ x: 0.1, y: 0.1 }] }) as { room: ReturnType<typeof createRoom>["room"] };
    const snapshot = toRoomSnapshot(stroke.room, joined.participantId);

    expect(snapshot.guesses).toHaveLength(1);
    expect(snapshot.guesses[0].text).toBe("apple");
    expect(snapshot.guesses[0].isCorrect).toBe(false);
  });

  // T005 — submitGuess game-end behavior (Scenario 4)
  it("submitGuess transitions room to 'ended' when guess is correct", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const word = toRoomSnapshot(getRoom(created.room.code)!, created.participantId).currentWord!;
    submitGuess(created.room.code, joined.participantId, word);

    expect(getRoom(created.room.code)!.status).toBe("ended");
  });

  it("submitGuess does NOT transition room to 'ended' when guess is incorrect", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    submitGuess(created.room.code, joined.participantId, "wrongword");

    expect(getRoom(created.room.code)!.status).toBe("game");
  });

  it("submitGuess returns error: not_in_game when room is already in 'ended' state", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    const carol = joinRoom(created.room.code, "Carol") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const word = toRoomSnapshot(getRoom(created.room.code)!, created.participantId).currentWord!;
    submitGuess(created.room.code, joined.participantId, word);

    const result = submitGuess(created.room.code, carol.participantId, word);
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("not_in_game");
  });

  // T006 — toRoomSnapshot word reveal behavior (Scenario 4)
  it("toRoomSnapshot reveals currentWord to non-drawer when status is 'ended'", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const word = toRoomSnapshot(getRoom(created.room.code)!, created.participantId).currentWord!;
    submitGuess(created.room.code, joined.participantId, word);

    const snapshot = toRoomSnapshot(getRoom(created.room.code)!, joined.participantId);
    expect(snapshot.currentWord).toBe(word);
  });

  it("toRoomSnapshot hides currentWord from non-drawer when status is 'game'", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const snapshot = toRoomSnapshot(getRoom(created.room.code)!, joined.participantId);
    expect(snapshot.currentWord).toBeNull();
  });

  // T014 — resetRoom tests (Scenario 4)
  it("resetRoom resets status to 'lobby' and clears strokes, guesses, drawerId, currentWord", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const word = toRoomSnapshot(getRoom(created.room.code)!, created.participantId).currentWord!;
    addStroke(created.room.code, created.participantId, { points: [{ x: 0.1, y: 0.2 }] });
    submitGuess(created.room.code, joined.participantId, word);

    const result = resetRoom(created.room.code, created.participantId);
    expect("error" in result).toBe(false);
    const room = (result as { room: ReturnType<typeof getRoom> })!.room!;
    expect(room.status).toBe("lobby");
    expect(room.drawerId).toBeNull();
    expect(room.currentWord).toBeNull();
    expect(room.strokes).toHaveLength(0);
    expect(room.guesses).toHaveLength(0);
  });

  it("resetRoom preserves existing participants", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const word = toRoomSnapshot(getRoom(created.room.code)!, created.participantId).currentWord!;
    submitGuess(created.room.code, joined.participantId, word);

    const result = resetRoom(created.room.code, created.participantId) as { room: ReturnType<typeof getRoom> };
    expect(result.room!.participants).toHaveLength(2);
    expect(result.room!.participants.some((p) => p.name === "Alice")).toBe(true);
    expect(result.room!.participants.some((p) => p.name === "Bob")).toBe(true);
  });

  it("resetRoom returns error: not_host when caller is not the host", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob") as { room: ReturnType<typeof createRoom>["room"]; participantId: string };
    startRoom(created.room.code, created.participantId);

    const word = toRoomSnapshot(getRoom(created.room.code)!, created.participantId).currentWord!;
    submitGuess(created.room.code, joined.participantId, word);

    const result = resetRoom(created.room.code, joined.participantId);
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("not_host");
  });

  it("resetRoom returns error: not_ended when room status is not 'ended'", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    startRoom(created.room.code, created.participantId);

    const result = resetRoom(created.room.code, created.participantId);
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("not_ended");
  });

  it("resetRoom returns error: room_not_found for unknown code", () => {
    const result = resetRoom("ZZZZ", "some-id");
    expect("error" in result).toBe(true);
    expect((result as { error: string }).error).toBe("room_not_found");
  });
});
