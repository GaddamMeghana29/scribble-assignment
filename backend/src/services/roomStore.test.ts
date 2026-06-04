import { describe, expect, it } from "vitest";
import { createRoom, joinRoom, startRoom, toRoomSnapshot } from "./roomStore.js";
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
});
