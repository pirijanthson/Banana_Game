import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import { useAppSettings } from "../../context/useAppSettings";
import {
  playGameSound,
  startBackgroundMusic,
  stopBackgroundMusic,
  setMusicVolume,
} from "../../utils/gameSounds";
import "./Gameplay.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const GAMES_API_URL = `${API_BASE_URL}/api/games`;



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

function formatDifficulty(difficulty) {
  return difficulty
    ? `${difficulty[0]}${difficulty.slice(1).toLowerCase()}`
    : "Puzzle";
}

async function submitGameAnswer(token, answer, gameId) {
  const response = await fetch(`${GAMES_API_URL}/answer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...(answer === undefined ? {} : { answer }),
      gameId,
    }),
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
        "Unable to submit your answer. Please try again."
    );
    error.status = response.status;
    throw error;
  }

  return result;
}

async function fetchActiveGame(token, gameId) {
  const activeGamePath = gameId
    ? `active/${encodeURIComponent(gameId)}`
    : "active";
  const response = await fetch(
    `${GAMES_API_URL}/${activeGamePath}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let result;
  try {
    result = await response.json();
  } catch {
    const error = new Error(
      `The server returned an unexpected response (HTTP ${response.status}).`
    );
    error.status = response.status;
    throw error;
  }

  if (!response.ok || result?.success !== true) {
    const error = new Error(
      result?.message || "Unable to resume your game."
    );
    error.status = response.status;
    throw error;
  }

  return result.game;
}




function Gameplay() {
  const navigate = useNavigate();
  const location = useLocation();

  const initialGame = location.state?.game;
  const initialGameId = location.state?.gameId;

  const [game, setGame] = useState(initialGame || null);
  const [isLoadingGame, setIsLoadingGame] = useState(!initialGame);
  const [answer, setAnswer] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(
    initialGame?.questionTimeLimitSeconds || 0
  );
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [shakeKey, setShakeKey] = useState(0);
  const [scoreBump, setScoreBump] = useState(false);
  const [prevScore, setPrevScore] = useState(
    Number(initialGame?.score) || 0
  );
  const [showTimeUp, setShowTimeUp] = useState(false);

  const submissionLock = useRef(false);
  const timeoutSubmitted = useRef(false);
  const timerWarningPlayedFor = useRef(null);
  const submitRef = useRef(null);
  const inputRef = useRef(null);

  const user = readStoredUser();
  const { settings } = useAppSettings();

  const {
    showAnswerFeedback,
    soundEffects,
    soundVolume,
    timerWarnings,
    timerWarningSeconds,
    showProgress,
    musicEnabled,
    musicVolume,
  } = settings || {};

  const username =
    typeof user.username === "string"
      ? user.username.trim()
      : "";

  const displayName =
    (typeof user.fullName === "string" &&
      user.fullName.trim()) ||
    username ||
    "Player";

  



  useEffect(() => {
    if (initialGame) return undefined;

    let isCurrent = true;
    const token = window.localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return () => {
        isCurrent = false;
      };
    }

    const loadActiveGame = async () => {
      try {
        const activeGame = await fetchActiveGame(
          token,
          initialGameId
        );
        if (isCurrent) {
          if (activeGame) {
            setGame(activeGame);
            setError("");
          } else {
            navigate("/game-selection", { replace: true });
          }
        }
      } catch (requestError) {
        if (requestError.status === 401) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }
        if (isCurrent) {
          setError(
            requestError.message ||
              "Unable to resume your game."
          );
        }
      } finally {
        if (isCurrent) setIsLoadingGame(false);
      }
    };

    loadActiveGame();
    return () => {
      isCurrent = false;
    };
  }, [initialGame, initialGameId, navigate]);

  



  useEffect(() => {
    if (!game || isLoadingGame) return undefined;
    if (!musicEnabled) return undefined;

    
    const startTimer = window.setTimeout(() => {
      startBackgroundMusic();
    }, 400);

    return () => {
      window.clearTimeout(startTimer);
      stopBackgroundMusic();
    };
  }, [game?.id, isLoadingGame, musicEnabled]);

  
  useEffect(() => {
    if (musicEnabled && Number.isFinite(Number(musicVolume))) {
      setMusicVolume(Number(musicVolume));
    }
  }, [musicVolume, musicEnabled]);

  
  useEffect(() => {
    const handleUnload = () => stopBackgroundMusic();
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  



  useEffect(() => {
    if (
      game?.questionStartedAt &&
      !isSubmitting &&
      remainingSeconds > 0
    ) {
      window.setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [game?.questionStartedAt, isSubmitting, remainingSeconds]);

  



  useEffect(() => {
    const current = Number(game?.score) || 0;
    if (current > prevScore) {
      setScoreBump(true);
      const timer = window.setTimeout(
        () => setScoreBump(false),
        600
      );
      return () => window.clearTimeout(timer);
    }
    if (current !== prevScore) setPrevScore(current);
    return undefined;
  }, [game?.score, prevScore]);

  



  const handleLogout = () => {
    stopBackgroundMusic();
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  



  const submitAnswer = useCallback(
    async (submittedAnswer) => {
      if (!game || submissionLock.current) return;

      const token = window.localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return;
      }

      submissionLock.current = true;
      setIsSubmitting(true);
      setError("");

      try {
        const result = await submitGameAnswer(
          token,
          submittedAnswer,
          game.id
        );

        setFeedback(result.result || "");

        
        if (result.result === "INCORRECT") {
          setShakeKey((k) => k + 1);
        }

        setAnswer("");
        setImageFailed(false);
        setImageLoading(true);

        if (
          result.game.status === "ACTIVE" &&
          result.game.question
        ) {
          if (
            soundEffects &&
            submittedAnswer !== undefined &&
            result.result
          ) {
            playGameSound(result.result, soundVolume);
          }
          setGame(result.game);
          setRemainingSeconds(
            result.game.questionTimeLimitSeconds
          );
        } else {
          
          stopBackgroundMusic();
          if (soundEffects) {
            playGameSound(
              result.game.status === "COMPLETED"
                ? "VICTORY"
                : "GAME_OVER",
              soundVolume
            );
          }
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
          setError(
            "This game session is no longer active. Start a new challenge."
          );
          return;
        }

        setError(
          requestError.message ||
            "Unable to submit your answer. Please try again."
        );
      } finally {
        submissionLock.current = false;
        setIsSubmitting(false);
      }
    },
    [game, navigate, soundEffects, soundVolume]
  );

  useEffect(() => {
    submitRef.current = submitAnswer;
  }, [submitAnswer]);

  



  useEffect(() => {
    timeoutSubmitted.current = false;
    timerWarningPlayedFor.current = null;
    setShowTimeUp(false);
  }, [game?.questionStartedAt]);

  



  useEffect(() => {
    if (
      !game?.questionStartedAt ||
      !game.questionTimeLimitSeconds
    ) {
      return undefined;
    }

    const updateTimer = () => {
      const startedAt = new Date(
        game.questionStartedAt
      ).getTime();
      const timeLimit = game.questionTimeLimitSeconds * 1000;
      const nextSeconds = Math.max(
        0,
        Math.ceil((startedAt + timeLimit - Date.now()) / 1000)
      );
      setRemainingSeconds((current) =>
        current === nextSeconds ? current : nextSeconds
      );
    };

    updateTimer();
    const timerId = window.setInterval(updateTimer, 250);
    return () => window.clearInterval(timerId);
  }, [game?.questionStartedAt, game?.questionTimeLimitSeconds]);

  



  useEffect(() => {
    if (
      timerWarnings &&
      soundEffects &&
      remainingSeconds === timerWarningSeconds &&
      timerWarningPlayedFor.current !== game?.questionStartedAt
    ) {
      timerWarningPlayedFor.current =
        game?.questionStartedAt;
      playGameSound("TIME_WARNING", soundVolume);
    }
  }, [
    game?.questionStartedAt,
    remainingSeconds,
    soundEffects,
    soundVolume,
    timerWarnings,
    timerWarningSeconds,
  ]);

  



  useEffect(() => {
    if (
      remainingSeconds === 0 &&
      !timeoutSubmitted.current &&
      !submissionLock.current
    ) {
      timeoutSubmitted.current = true;
      setShowTimeUp(true);
      if (soundEffects) {
        playGameSound("TIME_UP", soundVolume);
      }

      
      const timer = window.setTimeout(() => {
        setShowTimeUp(false);
        submitRef.current?.(undefined);
      }, 1800);

      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [remainingSeconds, soundEffects, soundVolume]);

  



  const progress = game?.totalQuestions
    ? Math.min(
        (game.questionsAnswered / game.totalQuestions) * 100,
        100
      )
    : 0;

  const isLowTime =
    timerWarnings && remainingSeconds <= timerWarningSeconds;

  const timeLimit = game?.questionTimeLimitSeconds || 60;
  const timerPercent = Math.min(
    100,
    (remainingSeconds / timeLimit) * 100
  );

  const currentQuestionNum = Math.min(
    (game?.questionsAnswered || 0) + 1,
    game?.totalQuestions || 1
  );

  



  if (isLoadingGame || !game) {
    return (
      <DashboardLayout
        displayName={displayName}
        onLogout={handleLogout}
        username={username}
      >
        <section className="gameplay" aria-live="polite">
          {isLoadingGame ? (
            <div className="gameplay__loading">
              <span className="gameplay__loading-spinner">
                <i
                  className="fas fa-circle-notch fa-spin"
                  aria-hidden="true"
                ></i>
              </span>
              <p>Loading your saved game…</p>
            </div>
          ) : (
            <>
              <p className="gameplay__error" role="alert">
                {error || "Your saved game could not be loaded."}
              </p>
              <Link
                className="gameplay__back"
                to="/dashboard"
              >
                Return to dashboard
              </Link>
            </>
          )}
        </section>
      </DashboardLayout>
    );
  }

  



  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section
        className={`gameplay${
          shakeKey ? " gameplay--shake" : ""
        }`}
        key={shakeKey}
        aria-labelledby="gameplay-title"
      >
        {}
        <div className="gameplay__topline">
          <Link
            className="gameplay__back"
            to="/game-selection"
          >
            <span aria-hidden="true">←</span> Leave game
          </Link>
          <span className="gameplay__difficulty">
            <i
              className="fas fa-signal"
              aria-hidden="true"
            ></i>{" "}
            {formatDifficulty(game?.difficulty)} challenge
          </span>
        </div>

        {}
        <div className="gameplay__heading">
          <div>
            {showProgress && (
              <p className="gameplay__eyebrow">
                QUESTION {currentQuestionNum} OF{" "}
                {game?.totalQuestions || 1}
              </p>
            )}
            <h1 id="gameplay-title">
              Solve the banana puzzle
            </h1>
          </div>

          {}
          <div
            className={`gameplay__timer${
              isLowTime ? " gameplay__timer--urgent" : ""
            }`}
            role="timer"
            aria-label={`${remainingSeconds} seconds remaining`}
            aria-live="off"
          >
            <svg
              className="gameplay__timer-ring"
              viewBox="0 0 44 44"
              aria-hidden="true"
            >
              <circle
                className="gameplay__timer-ring-bg"
                cx="22"
                cy="22"
                r="20"
              />
              <circle
                className="gameplay__timer-ring-fg"
                cx="22"
                cy="22"
                r="20"
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={
                  2 * Math.PI * 20 * (1 - timerPercent / 100)
                }
              />
            </svg>
            <div className="gameplay__timer-content">
              <i
                className="fas fa-clock"
                aria-hidden="true"
              ></i>
              <strong>{remainingSeconds}</strong>
            </div>
          </div>
        </div>

        {}
        {showProgress && (
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
        )}

        {}
        <div className="gameplay__details">
          <span
            className={`gameplay__score${
              scoreBump ? " gameplay__score--bump" : ""
            }`}
          >
            <i
              className="fas fa-star"
              aria-hidden="true"
            ></i>{" "}
            <strong>{Number(game?.score) || 0}</strong>{" "}
            points
          </span>

          <span
            className="gameplay__lives"
            aria-label={`${game?.lives || 0} lives remaining`}
          >
            {[...Array(Math.max(0, Number(game?.lives) || 0))].map(
              (_, i) => (
                <i
                  key={i}
                  className="fas fa-heart gameplay__heart"
                  aria-hidden="true"
                  style={{
                    animationDelay: `${i * 120}ms`,
                  }}
                ></i>
              )
            )}
            <strong>{game?.lives || 0}</strong>{" "}
            {game?.lives === 1 ? "life" : "lives"}
          </span>
        </div>

        {}
        <div className="gameplay__puzzle">
          {imageLoading && !imageFailed && (
            <div
              className="gameplay__puzzle-skeleton"
              aria-hidden="true"
            ></div>
          )}

          {game?.question && !imageFailed ? (
            <img
              className={`gameplay__question-image${
                imageLoading ? " is-loading" : ""
              }`}
              src={game.question}
              alt="Banana puzzle"
              onError={() => {
                setImageFailed(true);
                setImageLoading(false);
              }}
              onLoad={() => setImageLoading(false)}
            />
          ) : (
            !imageLoading && (
              <div
                className="gameplay__image-fallback"
                role="status"
              >
                <span aria-hidden="true">
                  <i
                    className="fas fa-puzzle-piece"
                    aria-hidden="true"
                  ></i>
                </span>
                <strong>
                  We couldn&apos;t load this puzzle.
                </strong>
                <span>
                  Please submit an answer to continue to the
                  next one.
                </span>
              </div>
            )
          )}
        </div>

        {}
        {showAnswerFeedback && feedback && (
          <p
            className={`gameplay__feedback gameplay__feedback--${feedback.toLowerCase()}`}
            role="status"
          >
            {feedback === "CORRECT"
              ? "✅ Correct! Here comes your next puzzle."
              : feedback === "TIME_EXPIRED"
                ? "⏰ Time's up. Your next puzzle is ready."
                : "❌ Not quite. Keep going with the next puzzle!"}
          </p>
        )}

        {}
        {error && (
          <div
            className="gameplay__error"
            role="alert"
          >
            <span
              className="gameplay__error-icon"
              aria-hidden="true"
            >
              ⚠️
            </span>
            <span>{error}</span>
            {remainingSeconds === 0 && (
              <button
                type="button"
                onClick={() => submitAnswer(undefined)}
                disabled={isSubmitting}
                className="gameplay__error-retry"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {}
        <form
          className="gameplay__answer-form"
          onSubmit={(event) => {
            event.preventDefault();
            submitAnswer(
              remainingSeconds === 0 ? undefined : answer
            );
          }}
        >
          <label htmlFor="gameplay-answer">
            Your answer
          </label>
          <div className="gameplay__answer-controls">
            <input
              ref={inputRef}
              id="gameplay-answer"
              type="text"
              value={answer}
              onChange={(event) =>
                setAnswer(event.target.value)
              }
              placeholder="Type your answer here"
              autoComplete="off"
              disabled={
                isSubmitting || remainingSeconds === 0
              }
              required={remainingSeconds > 0}
              aria-invalid={remainingSeconds === 0}
            />
            <button
              className="gameplay-button gameplay-button--primary"
              type="submit"
              disabled={
                isSubmitting ||
                (remainingSeconds > 0 && !answer.trim())
              }
              aria-busy={isSubmitting}
            >
              {isSubmitting && (
                <span
                  className="gameplay-button__spinner"
                  aria-hidden="true"
                ></span>
              )}
              <span>
                {isSubmitting
                  ? "Checking…"
                  : remainingSeconds === 0
                    ? "Time's up"
                    : "Submit answer"}
              </span>
              {!isSubmitting && remainingSeconds > 0 && (
                <span aria-hidden="true">→</span>
              )}
            </button>
          </div>
          <p className="gameplay__hint">
            You have {game?.lives || 0}{" "}
            {game?.lives === 1 ? "life" : "lives"} left. A
            correct answer earns points!
          </p>
        </form>

        {

}
        {showTimeUp && (
          <div
            className="gameplay__timeout-overlay"
            role="alertdialog"
            aria-labelledby="timeout-title"
            aria-describedby="timeout-desc"
            aria-live="assertive"
          >
            <div className="gameplay__timeout-card">
              <div
                className="gameplay__timeout-icon"
                aria-hidden="true"
              >
                ⏰
              </div>
              <strong id="timeout-title">Time&apos;s up!</strong>
              <p id="timeout-desc">
                Loading your next puzzle…
              </p>
              <div
                className="gameplay__timeout-progress"
                aria-hidden="true"
              >
                <span></span>
              </div>
            </div>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default Gameplay;