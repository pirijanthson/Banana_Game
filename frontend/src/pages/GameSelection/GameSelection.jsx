import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import { playGameSound } from "../../utils/gameSounds";
import "./GameSelection.css";




const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const GAMES_API_URL = `${API_BASE_URL}/api/games`;

const DIFFICULTIES = [
  {
    id: "EASY",
    label: "Easy",
    icon: <i className="fas fa-seedling" aria-hidden="true"></i>,
    description: "A relaxed warm-up to get you going.",
    questions: 10,
    lives: 5,
    seconds: 60,
    points: 10,
    tone: "easy",
    tagline: "Warm up",
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
    tagline: "Most popular",
  },
  {
    id: "HARD",
    label: "Hard",
    icon: <i className="fas fa-fire" aria-hidden="true"></i>,
    description: "For sharp minds ready to go bananas.",
    questions: 10,
    lives: 2,
    seconds: 30,
    points: 30,
    tone: "hard",
    tagline: "For pros",
  },
];




function readStoredUser() {
  try {
    const raw = window.localStorage.getItem("user");
    if (!raw) return {};
    const user = JSON.parse(raw);
    return user && typeof user === "object" && !Array.isArray(user)
      ? user
      : {};
  } catch {
    return {};
  }
}

function readSoundVolume() {
  try {
    const settings = JSON.parse(
      window.localStorage.getItem("settings") || "{}"
    );
    const v = Number(settings.soundVolume);
    return Number.isFinite(v) ? v : 80;
  } catch {
    return 80;
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
      `The server returned an unexpected response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || result?.success !== true || !result.game) {
    const error = new Error(
      result?.message ||
        "Unable to start the game. Please try again."
    );
    error.status = response.status;
    throw error;
  }

  return result.game;
}




function GameSelection() {
  const navigate = useNavigate();

  const [selectedDifficulty, setSelectedDifficulty] =
    useState("EASY");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");

  const cardRefs = useRef([]);
  const hoveredRef = useRef(null);

  const user = useMemo(readStoredUser, []);
  const soundVolume = useMemo(readSoundVolume, []);

  const username =
    typeof user.username === "string"
      ? user.username.trim()
      : "";

  const displayName =
    (typeof user.fullName === "string" &&
      user.fullName.trim()) ||
    username ||
    "Player";

  const selectedGame = useMemo(
    () =>
      DIFFICULTIES.find((d) => d.id === selectedDifficulty) ||
      DIFFICULTIES[0],
    [selectedDifficulty]
  );

  

  const playSelectSound = useCallback(() => {
    playGameSound("CLICK", soundVolume);
  }, [soundVolume]);

  const playHoverSound = useCallback(() => {
    
    playGameSound("CLICK", Math.min(soundVolume * 0.4, 40));
  }, [soundVolume]);

  const playStartSound = useCallback(() => {
    playGameSound("VICTORY", soundVolume);
  }, [soundVolume]);

  const playErrorSound = useCallback(() => {
    playGameSound("INCORRECT", soundVolume);
  }, [soundVolume]);

  
  const handleLogout = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [navigate]);

  
  const handleSelect = useCallback(
    (id) => {
      if (id === selectedDifficulty) return;
      playSelectSound();
      setSelectedDifficulty(id);
      setError("");
    },
    [selectedDifficulty, playSelectSound]
  );

  
  const handleHover = useCallback(
    (id) => {
      if (id === hoveredRef.current) return;
      hoveredRef.current = id;
      if (id !== selectedDifficulty) playHoverSound();
    },
    [selectedDifficulty, playHoverSound]
  );

  
  const handleCardKeyDown = useCallback(
    (event, index) => {
      if (
        event.key !== "ArrowRight" &&
        event.key !== "ArrowLeft"
      )
        return;

      event.preventDefault();
      const dir = event.key === "ArrowRight" ? 1 : -1;
      const next =
        (index + dir + DIFFICULTIES.length) %
        DIFFICULTIES.length;

      cardRefs.current[next]?.focus();
      playSelectSound();
      setSelectedDifficulty(DIFFICULTIES[next].id);
      setError("");
    },
    [playSelectSound]
  );

  
  const handleStartGame = useCallback(async () => {
    const token = window.localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (isStarting) return;

    playStartSound();
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
      playErrorSound();
      setError(
        requestError.message ||
          "Unable to start the game. Please try again."
      );
    } finally {
      setIsStarting(false);
    }
  }, [
    selectedDifficulty,
    isStarting,
    navigate,
    playStartSound,
    playErrorSound,
  ]);

  



  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section
        className="game-selection"
        aria-labelledby="game-selection-title"
      >
        {}
        <div
          className="game-selection__floaters"
          aria-hidden="true"
        >
          <span className="game-selection__floater game-selection__floater--1">
            🍌
          </span>
          <span className="game-selection__floater game-selection__floater--2">
            🍌
          </span>
          <span className="game-selection__floater game-selection__floater--3">
            🍌
          </span>
        </div>

        {}
        <div className="game-selection__intro">
          <p className="game-selection__eyebrow">
            YOUR NEXT ADVENTURE
          </p>
          <h1 id="game-selection-title">
            Choose your challenge
          </h1>
          <p>
            Pick a difficulty that feels right. Solve banana
            puzzles, earn points, and see how far you can go.
          </p>
        </div>

        {}
        <div
          className="game-selection__cards"
          role="radiogroup"
          aria-label="Game difficulty"
        >
          {DIFFICULTIES.map((difficulty, index) => {
            const isSelected =
              selectedDifficulty === difficulty.id;

            return (
              <button
                key={difficulty.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                type="button"
                className={`game-difficulty-card game-difficulty-card--${difficulty.tone}${
                  isSelected ? " is-selected" : ""
                }`}
                role="radio"
                aria-checked={isSelected}
                aria-pressed={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => handleSelect(difficulty.id)}
                onMouseEnter={() =>
                  handleHover(difficulty.id)
                }
                onFocus={() => handleHover(difficulty.id)}
                onKeyDown={(event) =>
                  handleCardKeyDown(event, index)
                }
                style={{
                  animationDelay: `${index * 80}ms`,
                }}
              >
                {difficulty.tagline && (
                  <span className="game-difficulty-card__tagline">
                    {difficulty.tagline}
                  </span>
                )}

                <span
                  className="game-difficulty-card__icon"
                  aria-hidden="true"
                >
                  {difficulty.icon}
                </span>

                <span className="game-difficulty-card__heading">
                  <span className="game-difficulty-card__name">
                    {difficulty.label}
                  </span>
                  {isSelected && (
                    <span
                      className="game-difficulty-card__selected"
                      aria-hidden="true"
                    >
                      ✓ Selected
                    </span>
                  )}
                </span>

                <span className="game-difficulty-card__description">
                  {difficulty.description}
                </span>

                <span className="game-difficulty-card__details">
                  <span>
                    <strong>{difficulty.questions}</strong>{" "}
                    questions
                  </span>
                  <span>
                    <strong>{difficulty.lives}</strong> lives
                  </span>
                  <span>
                    <strong>{difficulty.seconds}s</strong> per
                    question
                  </span>
                </span>

                <span className="game-difficulty-card__points">
                  <i
                    className="fas fa-star"
                    aria-hidden="true"
                  ></i>{" "}
                  {difficulty.points} points per correct answer
                </span>
              </button>
            );
          })}
        </div>

        {}
        <div className="game-selection__actions">
          <div
            className="game-selection__selection-summary"
            aria-live="polite"
          >
            <span
              className="game-selection__summary-icon"
              aria-hidden="true"
            >
              {selectedGame.icon}
            </span>
            <span>
              <strong>
                {selectedGame.label} challenge
              </strong>
              <span>
                {selectedGame.questions} questions ·{" "}
                {selectedGame.lives} lives ·{" "}
                {selectedGame.points} pts
              </span>
            </span>
          </div>

          <button
            type="button"
            className="game-selection__start"
            onClick={handleStartGame}
            onMouseEnter={playHoverSound}
            disabled={isStarting}
            aria-busy={isStarting}
          >
            {isStarting && (
              <span
                className="game-selection__spinner"
                aria-hidden="true"
              ></span>
            )}
            <span>
              {isStarting
                ? "Preparing your game…"
                : "Start game"}
            </span>
            {!isStarting && (
              <span aria-hidden="true">→</span>
            )}
          </button>
        </div>

        {}
        {error && (
          <div
            className="game-selection__error"
            role="alert"
          >
            <span
              className="game-selection__error-icon"
              aria-hidden="true"
            >
              ⚠️
            </span>
            <span>{error}</span>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default GameSelection;