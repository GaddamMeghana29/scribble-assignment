import { Router } from "express";
import {
  addStrokeSchema,
  createRoomSchema,
  HttpError,
  joinRoomSchema,
  roomCodeParamsSchema,
  roomViewerQuerySchema,
  startRoomSchema,
  submitGuessSchema
} from "./schemas.js";
import {
  addStroke,
  createRoom,
  getRoom,
  joinRoom,
  startRoom,
  submitGuess,
  toRoomSnapshot
} from "../services/roomStore.js";
import type { GuessEntry } from "../models/game.js";

export function createRoomsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const { playerName } = createRoomSchema.parse(request.body);
      const result = createRoom(playerName);

      response.status(201).json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/join", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { playerName } = joinRoomSchema.parse(request.body);
      const result = joinRoom(code.toUpperCase(), playerName);

      if (!result) {
        throw new HttpError(404, "Unable to join room");
      }

      if ("error" in result && result.error === "name_taken") {
        throw new HttpError(409, "Name already taken");
      }

      const joined = result as { room: Parameters<typeof toRoomSnapshot>[0]; participantId: string };

      response.json({
        participantId: joined.participantId,
        room: toRoomSnapshot(joined.room, joined.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:code", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = roomViewerQuerySchema.parse(request.query);
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Unable to load room");
      }

      response.json({
        room: toRoomSnapshot(room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/start", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = startRoomSchema.parse(request.body);
      const result = startRoom(code.toUpperCase(), participantId);

      if ("error" in result) {
        if (result.error === "room_not_found") {
          throw new HttpError(404, "Room not found");
        }
        if (result.error === "not_host") {
          throw new HttpError(403, "Only the host can start the game");
        }
        if (result.error === "too_few_players") {
          throw new HttpError(400, "At least 2 players are required to start");
        }
      }

      const { room } = result as { room: Parameters<typeof toRoomSnapshot>[0] };

      response.json({
        room: toRoomSnapshot(room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/strokes", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, stroke } = addStrokeSchema.parse(request.body);
      const result = addStroke(code.toUpperCase(), participantId, stroke);

      if ("error" in result) {
        if (result.error === "room_not_found") throw new HttpError(404, "Room not found");
        if (result.error === "not_in_game") throw new HttpError(400, "Game has not started");
        if (result.error === "not_drawer") throw new HttpError(403, "Only the drawer can add strokes");
      }

      const { room } = result as { room: Parameters<typeof toRoomSnapshot>[0] };
      response.json({ room: toRoomSnapshot(room, participantId) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/guesses", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, text } = submitGuessSchema.parse(request.body);
      const result = submitGuess(code.toUpperCase(), participantId, text);

      if ("error" in result) {
        if (result.error === "room_not_found") throw new HttpError(404, "Room not found");
        if (result.error === "not_in_game") throw new HttpError(400, "Game has not started");
        if (result.error === "empty_guess") throw new HttpError(400, "Guess cannot be empty");
        if (result.error === "drawer_cannot_guess") throw new HttpError(403, "Drawer cannot submit a guess");
        if (result.error === "already_correct") throw new HttpError(403, "Already guessed correctly");
        if (result.error === "participant_not_found") throw new HttpError(404, "Participant not found");
      }

      const { isCorrect, guess } = result as { isCorrect: boolean; guess: GuessEntry };
      response.json({ isCorrect, guess });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
