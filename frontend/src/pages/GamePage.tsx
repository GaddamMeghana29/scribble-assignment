import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Stroke } from "../services/api";
import { Card } from "../components/Card";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentStrokeRef = useRef<{ x: number; y: number }[]>([]);
  const isDrawingRef = useRef(false);
  const [redrawTick, setRedrawTick] = useState(0);

  const [guessText, setGuessText] = useState("");
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);
  const [guessError, setGuessError] = useState<string | null>(null);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    } else if (room.status === "ended") {
      navigate("/results", { replace: true });
    }
  }, [navigate, room]);

  // T013: ~2s polling interval (replaces one-time fetch from Scenario 2)
  useEffect(() => {
    roomStore.fetchRoom().catch(() => {});
    const id = setInterval(() => {
      roomStore.fetchRoom().catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [roomStore]);

  // T015: redraw canvas on every render (strokes or current stroke may have changed)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const allStrokes: { x: number; y: number }[][] = [
      ...room.strokes.map((s: Stroke) => s.points),
      ...(currentStrokeRef.current.length > 0 ? [currentStrokeRef.current] : [])
    ];

    for (const pts of allStrokes) {
      if (pts.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * canvas.width, pts[0].y * canvas.height);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x * canvas.width, pts[i].y * canvas.height);
      }
      ctx.stroke();
    }
  });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      isDrawingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      const pt = {
        x: e.nativeEvent.offsetX / canvas.width,
        y: e.nativeEvent.offsetY / canvas.height
      };
      currentStrokeRef.current = [pt];
      setRedrawTick((n) => n + 1);
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const pt = {
        x: e.nativeEvent.offsetX / canvas.width,
        y: e.nativeEvent.offsetY / canvas.height
      };
      currentStrokeRef.current = [...currentStrokeRef.current, pt];
      setRedrawTick((n) => n + 1);
    },
    []
  );

  // T016: send completed stroke to server on pointer-up
  const handlePointerUp = useCallback(
    (_e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      const pts = currentStrokeRef.current;
      currentStrokeRef.current = [];
      if (pts.length > 0 && participantId && room?.code) {
        api.addStroke(room.code, participantId, { points: pts }).catch(() => {});
      }
      setRedrawTick((n) => n + 1);
    },
    [participantId, room?.code]
  );

  // T023: submit guess
  const handleGuessSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!participantId || !room?.code || !guessText.trim()) return;
      setGuessError(null);
      try {
        const result = await api.submitGuess(room.code, participantId, guessText.trim());
        if (result.isCorrect) {
          setHasGuessedCorrectly(true);
        }
        setGuessText("");
      } catch {
        setGuessError("Could not submit guess. Try again.");
      }
    },
    [participantId, room?.code, guessText]
  );

  if (!room) {
    return null;
  }

  const drawer = room.participants.find((p) => p.id === room.drawerId) ?? null;
  const isDrawer = participantId != null && participantId === room.drawerId;

  const wordDisplay =
    isDrawer && room.currentWord
      ? room.currentWord
      : room.wordLength != null
      ? Array.from({ length: room.wordLength }, () => "_").join(" ")
      : null;

  // T024: restore hasGuessedCorrectly from snapshot for page-refresh support
  const effectivelyCorrect =
    hasGuessedCorrectly ||
    (participantId != null &&
      room.guesses.some((g) => g.participantId === participantId && g.isCorrect));

  // suppress unused warning
  void redrawTick;

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
          {/* T014: canvas element with drawer pointer events */}
          <Card title="Canvas">
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                backgroundColor: "#ffffff",
                border: "1px solid #e5e7eb",
                cursor: isDrawer ? "crosshair" : "default",
                touchAction: "none"
              }}
              onPointerDown={isDrawer ? handlePointerDown : undefined}
              onPointerMove={isDrawer ? handlePointerMove : undefined}
              onPointerUp={isDrawer ? handlePointerUp : undefined}
            />
          </Card>

          {/* T023/T024: guess input — guessers only */}
          {!isDrawer && (
            <Card title="Your Guess">
              {effectivelyCorrect ? (
                <p style={{ color: "#16a34a", fontWeight: 600 }}>Correct! Well done!</p>
              ) : (
                <form
                  onSubmit={handleGuessSubmit}
                  style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
                >
                  <input
                    type="text"
                    className="input"
                    value={guessText}
                    onChange={(e) => setGuessText(e.target.value)}
                    placeholder="Type your guess…"
                    disabled={effectivelyCorrect}
                    autoComplete="off"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="button button--primary"
                    disabled={effectivelyCorrect || !guessText.trim()}
                  >
                    Submit
                  </button>
                </form>
              )}
              {guessError && (
                <p style={{ color: "#dc2626", marginTop: "0.5rem", fontSize: "0.875rem" }}>
                  {guessError}
                </p>
              )}
            </Card>
          )}

          {/* T027: guess history — all players */}
          {room.guesses.length > 0 && (
            <Card title="Guesses">
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
            </Card>
          )}
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
              <p
                className="word-display"
                style={{ fontSize: "1.25rem", letterSpacing: "0.15em", fontWeight: 600 }}
              >
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
