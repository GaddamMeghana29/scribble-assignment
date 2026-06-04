import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function LobbyPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    if (!room) return;
    const id = setInterval(() => {
      roomStore.fetchRoom().catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [room?.code, roomStore]);

  useEffect(() => {
    if (room?.status === "game") {
      navigate("/game", { replace: true });
    }
  }, [navigate, room?.status]);

  if (!room) {
    return null;
  }

  const currentParticipant = room.participants.find((p) => p.id === participantId);
  const isHost = currentParticipant?.isHost ?? false;
  const canStart = room.participants.length >= 2;

  async function handleStartGame() {
    if (!room || !participantId) return;
    try {
      await api.startRoom(room.code, participantId);
      navigate("/game");
    } catch (err) {
      console.error("Failed to start game", err);
    }
  }

  return (
    <section className="panel placeholder-page">
      <div className="lobby-header">
        <PageHeader
          kicker="Waiting for players"
          title="Lobby"
          description="Share the room code with friends so they can join your game."
        />
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="summary-grid">
        <Card title="Participants">
          {room.participants.length === 0 ? (
            <p>No participants are connected to this room yet.</p>
          ) : (
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.name}{participant.isHost ? " (Host)" : ""}</span>
                  <span className="player-list__meta">joined</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Status">
          {isHost ? (
            <>
              {!canStart && (
                <p style={{ marginBottom: "8px" }}>Need at least 2 players to start.</p>
              )}
              <button
                className="button button--primary"
                disabled={!canStart}
                onClick={handleStartGame}
              >
                Start Game
              </button>
            </>
          ) : (
            <p>Waiting for host to start the game…</p>
          )}
        </Card>
      </div>
    </section>
  );
}
