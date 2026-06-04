import { describe, expect, it } from "vitest";
import { createRoom, joinRoom, startRoom } from "./roomStore.js";
import { createRoomSchema, joinRoomSchema } from "../api/schemas.js";

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
});
