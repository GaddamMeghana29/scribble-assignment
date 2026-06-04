export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "game";

export interface StrokePoint {
  x: number;
  y: number;
}

export interface Stroke {
  points: StrokePoint[];
}

export interface GuessEntry {
  participantId: string;
  name: string;
  text: string;
  isCorrect: boolean;
  submittedAt: string;
}

export interface Participant {
  id: string;
  name: string;
  isHost: boolean;
  joinedAt: string;
}

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  drawerId: string | null;
  currentWord: string | null;
  strokes: Stroke[];
  guesses: GuessEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  drawerId: string | null;
  currentWord: string | null;
  wordLength: number | null;
  strokes: Stroke[];
  guesses: GuessEntry[];
  availableWords: string[];
  roles: ParticipantRole[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
