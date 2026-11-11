import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./Gameplay.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const GAMES_API_URL = `${API_BASE_URL}/api/games`;

function readStoredUser() {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "{}");
    return user && typeof user === "object" && !Array.isArray(user) ? user : {};
  } catch {
    return {};
  }
}

function formatDifficulty(difficulty) {
  return difficulty
    ? `${difficulty[0]}${difficulty.slice(1).toLowerCase()}`
    : "Puzzle";
}

async function submitGameAnswer(token, answer) {
  const response = await fetch(`${GAMES_API_URL}/answer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(answer === undefined ? {} : { answer }),
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
      result?.message || "Unable to submit your answer. Please try again.",
    );
    error.status = response.status;
    throw error;
  }

  return result;
}

function Gameplay() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialGame = location.state?.game;
  const [game, setGame] = useState(initialGame || null);
  const [answer, setAnswer] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(
    initialGame?.questionTimeLimitSeconds || 0,
  );
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const submissionLock = useRef(false);
  const timeoutSubmitted = useRef(false);
  const submitRef = useRef(null);

  const user = readStoredUser();
  const username =
    typeof user.username === "string" ? user.username.trim() : "";
  const displayName =
    (typeof user.fullName === "string" && user.fullName.trim()) ||
    username ||
    "Player";

  useEffect(() => {
    if (!initialGame) {
      navigate("/game-selection", { replace: true });
    }
  }, [initialGame, navigate]);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const submitAnswer = useCallback(async (submittedAnswer) => {
    if (!game || submissionLock.current) {
      return;
    }

    const token = window.localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    submissionLock.current = true;
    setIsSubmitting(true);
    setError("");

    try {
      const result = await submitGameAnswer(token, submittedAnswer);
      setFeedback(result.result || "");
      setAnswer("");
      setImageFailed(false);

      if (result.game.status === "ACTIVE" && result.game.question) {
        setGame(result.game);
        setRemainingSeconds(result.game.questionTimeLimitSeconds);
      } else {
        navigate("/game-result", {
          replace: true,
          state: {
            result: { ...game, ...result.game },
            outcome: result.result,
          },
        });
      }
    } catch (requestError) {
      if (requestError.status === 401) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      if (requestError.status === 404) {
        setError("This game session is no longer active. Start a new challenge.");
        return;
      }

      setError(
        requestError.message || "Unable to submit your answer. Please try again.",
      );
    } finally {
      submissionLock.current = false;
      setIsSubmitting(false);
    }
  }, [game, navigate]);

  useEffect(() => {
    submitRef.current = submitAnswer;
  }, [submitAnswer]);

  useEffect(() => {
    timeoutSubmitted.current = false;
  }, [game?.questionStartedAt]);

  useEffect(() => {
    if (!game?.questionStartedAt || !game.questionTimeLimitSeconds) {
      return undefined;
    }

    const updateTimer = () => {
      const startedAt = new Date(game.questionStartedAt).getTime();
      const timeLimit = game.questionTimeLimitSeconds * 1000;
      const nextSeconds = Math.max(
        0,
        Math.ceil((startedAt + timeLimit - Date.now()) / 1000),
      );
      setRemainingSeconds((current) =>
        current === nextSeconds ? current : nextSeconds,
      );
    };

    updateTimer();
    const timerId = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timerId);
  }, [game?.questionStartedAt, game?.questionTimeLimitSeconds]);

  useEffect(() => {
    if (
      remainingSeconds === 0 &&
      !timeoutSubmitted.current &&
      !submissionLock.current
    ) {
      timeoutSubmitted.current = true;
      submitRef.current?.(undefined);
    }
  }, [remainingSeconds]);

  if (!initialGame) {
    return null;
  }

  const progress = game?.totalQuestions
    ? Math.min((game.questionsAnswered / game.totalQuestions) * 100, 100)
    : 0;
  const isLowTime = remainingSeconds <= 10;

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section className="gameplay" aria-labelledby="gameplay-title">
          <div className="gameplay__topline">
            <Link className="gameplay__back" to="/game-selection">
              <span aria-hidden="true">←</span> Leave game
            </Link>
            <span className="gameplay__difficulty">
              {formatDifficulty(game?.difficulty)} challenge
            </span>
          </div>

          <div className="gameplay__heading">
            <div>
              <p className="gameplay__eyebrow">QUESTION {Math.min((game?.questionsAnswered || 0) + 1, game?.totalQuestions || 1)} OF {game?.totalQuestions || 1}</p>
              <h1 id="gameplay-title">Solve the banana puzzle</h1>
            </div>
            <div
              className={`gameplay__timer${isLowTime ? " gameplay__timer--urgent" : ""}`}
              role="timer"
              aria-label={`${remainingSeconds} seconds remaining`}
              aria-live="off"
            >
              <span aria-hidden="true">⏱</span>
              <strong>{remainingSeconds}</strong>
              <span>sec</span>
            </div>
          </div>

          <div
            className="gameplay__progress"
            role="progressbar"
            aria-label="Game progress"
            aria-valuemin={0}
            aria-valuemax={game?.totalQuestions || 1}
            aria-valuenow={game?.questionsAnswered || 0}
          >
            <span style={{ width: `${progress}%` }} />
          </div>

          <div className="gameplay__details">
            <span>⭐ <strong>{Number(game?.score) || 0}</strong> points</span>
            <span aria-label={`${game?.lives || 0} lives remaining`}>
              {"❤️".repeat(Math.max(0, Number(game?.lives) || 0))}
              <strong>{game?.lives || 0} lives</strong>
            </span>
          </div>

          <div className="gameplay__puzzle">
            {game?.question && !imageFailed ? (
              <img
                className="gameplay__question-image"
                src={game.question}
                alt="Banana puzzle"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="gameplay__image-fallback" role="status">
                <span aria-hidden="true">🧩</span>
                <strong>We couldn&apos;t load this puzzle.</strong>
                <span>Please submit an answer to continue to the next one.</span>
              </div>
            )}
          </div>

          {feedback && (
            <p
              className={`gameplay__feedback gameplay__feedback--${feedback.toLowerCase()}`}
              role="status"
            >
              {feedback === "CORRECT"
                ? "Correct! Here comes your next puzzle."
                : feedback === "TIME_EXPIRED"
                  ? "Time's up. Your next puzzle is ready."
                  : "Not quite. Keep going with the next puzzle!"}
            </p>
          )}

          {error && (
            <p className="gameplay__error" role="alert">
              {error}
              {remainingSeconds === 0 && (
                <button
                  type="button"
                  onClick={() => submitAnswer(undefined)}
                  disabled={isSubmitting}
                >
                  Retry
                </button>
              )}
            </p>
          )}

          <form
            className="gameplay__answer-form"
            onSubmit={(event) => {
              event.preventDefault();
              submitAnswer(remainingSeconds === 0 ? undefined : answer);
            }}
          >
            <label htmlFor="gameplay-answer">Your answer</label>
            <div className="gameplay__answer-controls">
              <input
                id="gameplay-answer"
                type="text"
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Type your answer here"
                autoComplete="off"
                disabled={isSubmitting || remainingSeconds === 0}
                required={remainingSeconds > 0}
              />
              <button
                className="gameplay-button gameplay-button--primary"
                type="submit"
                disabled={isSubmitting || (remainingSeconds > 0 && !answer.trim())}
              >
                {isSubmitting
                  ? "Checking…"
                  : remainingSeconds === 0
                    ? "Time's up"
                    : "Submit answer"}
                {!isSubmitting && remainingSeconds > 0 && (
                  <span aria-hidden="true">→</span>
                )}
              </button>
            </div>
            <p className="gameplay__hint">
              You have {game?.lives || 0} {game?.lives === 1 ? "life" : "lives"} left.
              A correct answer earns points!
            </p>
          </form>
      </section>
    </DashboardLayout>
  );
}

export default Gameplay;
