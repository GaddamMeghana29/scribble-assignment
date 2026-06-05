import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Card } from "../components/Card";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function ResultsPage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    } else if (room.status === "lobby") {
      navigate("/lobby", { replace: true });
    } else if (room.status === "game") {
      navigate("/game", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    roomStore.fetchRoom().catch(() => {});
    const id = setInterval(() => {
      roomStore.fetchRoom().catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [roomStore]);

  const handlePlayAgain = useCallback(async () => {
    if (!participantId || !room?.code) return;
    try {
      await api.resetRoom(room.code, participantId);
    } catch {
      // polling will detect the lobby status change
    }
  }, [participantId, room?.code]);

  if (!room || room.status !== "ended") {
    return null;
  }

  const isHost =
    participantId != null &&
    room.participants.find((p) => p.id === participantId)?.isHost === true;

  const winner = room.guesses.find((g) => g.isCorrect) ?? null;

  return (
    <section className="panel results-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Game Over</span>
          <h1 className="game-page__title">Results</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Card title="Players">
            <ul className="player-list">
              {room.participants.map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  {winner && p.id === winner.participantId && (
                    <span className="player-list__meta">winner</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <div className="game-page__main">
          <Card title="Secret Word">
            <p
              className="word-display"
              style={{ fontSize: "1.5rem", letterSpacing: "0.15em", fontWeight: 700 }}
            >
              {room.currentWord ?? "—"}
            </p>
          </Card>

          <Card title="Winner">
            {winner ? (
              <p style={{ fontSize: "1.25rem", fontWeight: 600, color: "#16a34a" }}>
                {winner.name}
              </p>
            ) : (
              <p>No winner recorded</p>
            )}
          </Card>

          <Card title="Guess History">
            {room.guesses.length === 0 ? (
              <p>No guesses were submitted.</p>
            ) : (
              <ol className="player-list">
                {room.guesses.map((g, i) => (
                  <li
                    key={i}
                    style={{
                      color: g.isCorrect ? "#16a34a" : undefined,
                      fontWeight: g.isCorrect ? 600 : undefined
                    }}
                  >
                    <span>
                      <strong>{g.name}</strong>: {g.text}
                    </span>
                    {g.isCorrect && <span className="player-list__meta">✓ correct</span>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Next Game">
            {isHost ? (
              <button className="button button--primary" onClick={handlePlayAgain}>
                Play Again
              </button>
            ) : (
              <p>Waiting for the host to start a new game…</p>
            )}
          </Card>
        </aside>
      </div>
    </section>
  );
}
