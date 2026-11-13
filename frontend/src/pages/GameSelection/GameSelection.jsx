import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./GameSelection.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const GAMES_API_URL = `${API_BASE_URL}/api/games`;

const difficulties = [
  {
    id: "EASY",
    label: "Easy",
    icon: <i className="fas fa-seedling" aria-hidden="true"></i>,
    description: "A relaxed warm-up to get you going.",
    questions: 5,
    lives: 5,
    seconds: 60,
    points: 10,
    tone: "easy",
  },
  {
    id: "MEDIUM",
    label: "Medium",
    icon: <i className="fas fa-bolt" aria-hidden="true"></i>,
    description: "A balanced challenge for puzzle fans.",
    questions: 10,
    lives: 3,
    seconds: 45,
    points: 20,
    tone: "medium",
  },
  {
    id: "HARD",
    label: "Hard",
    icon: <i className="fas fa-fire" aria-hidden="true"></i>,
    description: "For sharp minds ready to go bananas.",
    questions: 15,
    lives: 2,
    seconds: 30,
    points: 30,
    tone: "hard",
  },
];

function readStoredUser() {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "{}");
    return user && typeof user === "object" && !Array.isArray(user) ? user : {};
  } catch {
    return {};
  }
}

async function startGame(token, difficulty) {
  const response = await fetch(`${GAMES_API_URL}/start`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ difficulty }),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || result?.success !== true || !result.game) {
    const error = new Error(
      result?.message || "Unable to start the game. Please try again.",
    );
    error.status = response.status;
    throw error;
  }

  return result.game;
}

function GameSelection() {
  const navigate = useNavigate();
  const [selectedDifficulty, setSelectedDifficulty] = useState("EASY");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const storedUser = readStoredUser();
  const username =
    typeof storedUser.username === "string" ? storedUser.username.trim() : "";
  const displayName =
    (typeof storedUser.fullName === "string" && storedUser.fullName.trim()) ||
    username ||
    "Player";
  const selectedGame = difficulties.find(
    (difficulty) => difficulty.id === selectedDifficulty,
  );

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const handleStartGame = async () => {
    const token = window.localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setError("");
    setIsStarting(true);
    try {
      const game = await startGame(token, selectedDifficulty);
      navigate("/gameplay", { state: { game } });
    } catch (requestError) {
      if (requestError.status === 401) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      setError(requestError.message || "Unable to start the game. Please try again.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section className="game-selection" aria-labelledby="game-selection-title">
        <div className="game-selection__intro">
          <p className="game-selection__eyebrow">YOUR NEXT ADVENTURE</p>
          <h1 id="game-selection-title">Choose your challenge</h1>
          <p>
            Pick a difficulty that feels right. Solve banana puzzles, earn points,
            and see how far you can go.
          </p>
        </div>

        <div className="game-selection__cards" role="group" aria-label="Game difficulty">
          {difficulties.map((difficulty) => {
            const isSelected = selectedDifficulty === difficulty.id;
            return (
              <button
                key={difficulty.id}
                type="button"
                className={`game-difficulty-card game-difficulty-card--${difficulty.tone}${isSelected ? " is-selected" : ""}`}
                aria-pressed={isSelected}
                onClick={() => {
                  setSelectedDifficulty(difficulty.id);
                  setError("");
                }}
              >
                <span className="game-difficulty-card__icon" aria-hidden="true">
                  {difficulty.icon}
                </span>
                <span className="game-difficulty-card__heading">
                  <span className="game-difficulty-card__name">{difficulty.label}</span>
                  {isSelected && (
                    <span className="game-difficulty-card__selected">Selected</span>
                  )}
                </span>
                <span className="game-difficulty-card__description">
                  {difficulty.description}
                </span>
                <span className="game-difficulty-card__details">
                  <span><strong>{difficulty.questions}</strong> questions</span>
                  <span><strong>{difficulty.lives}</strong> lives</span>
                  <span><strong>{difficulty.seconds}s</strong> per question</span>
                </span>
                <span className="game-difficulty-card__points">
                  <i className="fas fa-star" aria-hidden="true"></i> {difficulty.points} points per correct answer
                </span>
              </button>
            );
          })}
        </div>

        <div className="game-selection__actions">
          <div className="game-selection__selection-summary" aria-live="polite">
            <span className="game-selection__summary-icon" aria-hidden="true">
              {selectedGame.icon}
            </span>
            <span>
              <strong>{selectedGame.label} challenge</strong>
              <span>{selectedGame.questions} questions · {selectedGame.lives} lives</span>
            </span>
          </div>
          <button
            type="button"
            className="game-selection__start"
            onClick={handleStartGame}
            disabled={isStarting}
          >
            {isStarting ? "Preparing your game…" : "Start game"}
            {!isStarting && <span aria-hidden="true">→</span>}
          </button>
        </div>

        {error && (
          <p className="game-selection__error" role="alert">
            {error}
          </p>
        )}
      </section>
    </DashboardLayout>
  );
}

export default GameSelection;
