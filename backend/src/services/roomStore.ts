import { randomUUID } from "node:crypto";
import type { GuessEntry, Participant, Room, RoomSnapshot, Stroke } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

const rooms = new Map<string, Room>();

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function createParticipant(name: string, isHost: boolean): Participant {
  return {
    id: randomUUID(),
    name,
    isHost,
    joinedAt: now()
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function createRoom(playerName: string) {
  const participant = createParticipant(playerName.trim(), true);
  const room: Room = {
    code: generateUniqueCode(),
    status: "lobby",
    participants: [participant],
    drawerId: null,
    currentWord: null,
    strokes: [],
    guesses: [],
    createdAt: now(),
    updatedAt: now()
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  const trimmedName = playerName.trim();
  const nameTaken = room.participants.some(
    (p) => p.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  if (nameTaken) {
    return { error: "name_taken" as const };
  }

  const participant = createParticipant(trimmedName, false);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code);
  return room ? cloneRoom(room) : null;
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function startRoom(code: string, participantId: string) {
  const room = rooms.get(code);

  if (!room) {
    return { error: "room_not_found" as const };
  }

  const caller = room.participants.find((p) => p.id === participantId);

  if (!caller?.isHost) {
    return { error: "not_host" as const };
  }

  if (room.participants.length < 2) {
    return { error: "too_few_players" as const };
  }

  room.status = "game";
  room.drawerId = caller.id;
  room.currentWord = STARTER_WORDS[room.participants.length % STARTER_WORDS.length];
  room.strokes = [];
  room.guesses = [];
  room.updatedAt = now();
  rooms.set(room.code, room);

  return { room: cloneRoom(room) };
}

export function addStroke(code: string, participantId: string, stroke: Stroke) {
  const room = rooms.get(code);
  if (!room) return { error: "room_not_found" as const };
  if (room.status !== "game") return { error: "not_in_game" as const };
  if (room.drawerId !== participantId) return { error: "not_drawer" as const };
  room.strokes.push({ points: [...stroke.points] });
  room.updatedAt = now();
  rooms.set(room.code, room);
  return { room: cloneRoom(room) };
}

export function submitGuess(code: string, participantId: string, text: string) {
  const room = rooms.get(code);
  if (!room) return { error: "room_not_found" as const };
  if (room.status !== "game") return { error: "not_in_game" as const };
  const trimmed = text.trim();
  if (!trimmed) return { error: "empty_guess" as const };
  if (room.drawerId === participantId) return { error: "drawer_cannot_guess" as const };
  const caller = room.participants.find((p) => p.id === participantId);
  if (!caller) return { error: "participant_not_found" as const };
  const alreadyCorrect = room.guesses.some(
    (g) => g.participantId === participantId && g.isCorrect
  );
  if (alreadyCorrect) return { error: "already_correct" as const };
  const isCorrect =
    trimmed.toLowerCase() === (room.currentWord ?? "").trim().toLowerCase();
  const guess: GuessEntry = {
    participantId,
    name: caller.name,
    text: trimmed,
    isCorrect,
    submittedAt: now()
  };
  room.guesses.push(guess);
  room.updatedAt = now();
  rooms.set(room.code, room);
  return { isCorrect, guess: { ...guess } };
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  const isDrawer = viewerParticipantId != null && viewerParticipantId === room.drawerId;

  return {
    code: room.code,
    status: room.status,
    participants: room.participants.map((participant) => ({ ...participant })),
    drawerId: room.drawerId,
    currentWord: isDrawer ? room.currentWord : null,
    wordLength: room.currentWord?.length ?? null,
    strokes: room.strokes.map((s) => ({ points: [...s.points] })),
    guesses: room.guesses.map((g) => ({ ...g })),
    availableWords: listWords(),
    roles: [...STARTER_ROLES]
  };
}
