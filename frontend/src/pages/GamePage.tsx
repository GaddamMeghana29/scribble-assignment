import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    roomStore.fetchRoom().catch(() => {});
  }, [roomStore]);

  if (!room) {
    return null;
  }

  const drawer = room.participants.find((p) => p.id === room.drawerId) ?? null;
  const isDrawer = participantId != null && participantId === room.drawerId;

  const wordDisplay = isDrawer && room.currentWord
    ? room.currentWord
    : room.wordLength != null
    ? Array.from({ length: room.wordLength }, () => "_").join(" ")
    : null;

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">Guess the Word!</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Card title="Players">
            <ul className="player-list">
              {room.participants.map((participant) => (
                <li key={participant.id}>
                  <span>{participant.name}</span>
                  {participant.id === room.drawerId && (
                    <span className="player-list__meta">drawing</span>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </aside>

        <div className="game-page__main">
          <Card title="Canvas">
            <div
              className="canvas-placeholder"
              style={{ minHeight: "500px", backgroundColor: "#ffffff", border: "1px solid #e5e7eb" }}
            >
              {drawer ? `${drawer.name} is drawing…` : "Waiting for drawer…"}
            </div>
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Drawer">
            {drawer ? (
              <dl className="detail-list">
                <div>
                  <dt>Drawing now</dt>
                  <dd>{drawer.name}</dd>
                </div>
                {isDrawer && (
                  <div>
                    <dt>Your role</dt>
                    <dd>Drawer</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p>No drawer assigned yet.</p>
            )}
          </Card>

          <Card title="Secret Word">
            {wordDisplay != null ? (
              <p className="word-display" style={{ fontSize: "1.25rem", letterSpacing: "0.15em", fontWeight: 600 }}>
                {wordDisplay}
              </p>
            ) : (
              <p>Waiting for game to start…</p>
            )}
          </Card>
        </aside>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
