export type ParticipantRole = "drawer" | "guesser";

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

export interface RoomSnapshot {
  code: string;
  status: "lobby" | "game" | "ended";
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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ message: "Request failed" }))) as {
      message?: string;
    };

    throw new Error(errorBody.message ?? "Request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  createRoom(playerName: string) {
    return request<RoomSessionResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  joinRoom(code: string, playerName: string) {
    return request<RoomSessionResponse>(`/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  fetchRoom(code: string, participantId?: string) {
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}${query}`);
  },
  startRoom(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/start`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  addStroke(code: string, participantId: string, stroke: Stroke) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/strokes`, {
      method: "POST",
      body: JSON.stringify({ participantId, stroke })
    });
  },
  submitGuess(code: string, participantId: string, text: string) {
    return request<{ isCorrect: boolean; guess: GuessEntry }>(
      `/rooms/${encodeURIComponent(code)}/guesses`,
      { method: "POST", body: JSON.stringify({ participantId, text }) }
    );
  },
  resetRoom(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/reset`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  }
};
