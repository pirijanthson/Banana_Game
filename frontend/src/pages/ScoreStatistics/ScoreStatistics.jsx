import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./ScoreStatistics.css";




const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const STATISTICS_API_URL = `${API_BASE_URL}/api/games/scores/statistics`;
const HISTORY_API_URL = `${API_BASE_URL}/api/games/history`;

const DIFFICULTY_CONFIG = [
  {
    key: "EASY",
    label: "Easy",
    icon: "🌱",
    tone: "easy",
  },
  {
    key: "MEDIUM",
    label: "Medium",
    icon: "⚡",
    tone: "medium",
  },
  {
    key: "HARD",
    label: "Hard",
    icon: "🔥",
    tone: "hard",
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

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(num);
}

async function fetchScoreStatistics(token) {
  const response = await fetch(STATISTICS_API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}).`
    );
  }

  if (
    !response.ok ||
    result?.success !== true ||
    !result.statistics ||
    typeof result.statistics !== "object"
  ) {
    const error = new Error(
      result?.message || "Unable to load your score statistics."
    );
    error.status = response.status;
    throw error;
  }

  return result.statistics;
}

async function fetchGameHistory(token) {
  const response = await fetch(HISTORY_API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}).`
    );
  }

  if (
    !response.ok ||
    result?.success !== true ||
    !Array.isArray(result.games)
  ) {
    const error = new Error(
      result?.message ||
        "Unable to load games for your difficulty breakdown."
    );
    error.status = response.status;
    throw error;
  }

  return result.games;
}




function useAnimatedNumber(target, duration = 1000) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const end = Number(target);
    if (!Number.isFinite(end)) {
      setDisplay(target);
      return undefined;
    }
    const start = prevRef.current;
    const diff = end - start;
    if (diff === 0) {
      setDisplay(end);
      return undefined;
    }

    const startTime = performance.now();
    let frame;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return display;
}




function AnimatedBar({ percent = 0, delay = 0, className = "" }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWidth(Math.min(100, Math.max(0, percent)));
    }, 120 + delay);
    return () => window.clearTimeout(timer);
  }, [percent, delay]);

  return (
    <span
      className={className}
      style={{ width: `${width}%` }}
    />
  );
}



function ScoreStatistics() {
  const navigate = useNavigate();

  const [statistics, setStatistics] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const user = useMemo(readStoredUser, []);
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
    let isCurrent = true;
    const token = window.localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return () => {
        isCurrent = false;
      };
    }

    const loadStatistics = async () => {
      try {
        const [result, history] = await Promise.all([
          fetchScoreStatistics(token),
          fetchGameHistory(token),
        ]);
        if (isCurrent) {
          setStatistics(result);
          setGameHistory(history);
          setError("");
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
              "Unable to load your score statistics."
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadStatistics();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  



  const questionsAnswered =
    Number(statistics?.totalQuestionsAnswered) || 0;
  const correctAnswers =
    Number(statistics?.totalCorrectAnswers) || 0;
  const incorrectAnswers =
    Number(statistics?.totalIncorrectAnswers) || 0;
  const accuracy = Number(statistics?.accuracyPercentage) || 0;
  const visibleAccuracy = Math.min(100, Math.max(0, accuracy));
  const correctRate = questionsAnswered
    ? Math.min(100, (correctAnswers / questionsAnswered) * 100)
    : 0;
  const incorrectRate = questionsAnswered
    ? Math.min(100, (incorrectAnswers / questionsAnswered) * 100)
    : 0;

  
  const accuracyMessage = useMemo(() => {
    if (!questionsAnswered) return "";
    if (accuracy >= 90) {
      return "Outstanding! You're a banana puzzle master. 🏆";
    }
    if (accuracy >= 75) {
      return "Excellent focus! You're solving most puzzles correctly.";
    }
    if (accuracy >= 50) {
      return "You're building a solid streak. Keep practicing!";
    }
    if (accuracy >= 25) {
      return "Every puzzle is practice. Watch your accuracy grow!";
    }
    return "Keep going — the more you play, the sharper you'll get.";
  }, [accuracy, questionsAnswered]);

  const metrics = useMemo(
    () => [
      {
        key: "questions",
        icon: "🧩",
        label: "Questions answered",
        value: statistics?.totalQuestionsAnswered,
        variant: "blue",
      },
      {
        key: "correct",
        icon: "✅",
        label: "Correct answers",
        value: statistics?.totalCorrectAnswers,
        variant: "green",
      },
      {
        key: "incorrect",
        icon: "❌",
        label: "Incorrect answers",
        value: statistics?.totalIncorrectAnswers,
        variant: "red",
      },
      {
        key: "points",
        icon: "⭐",
        label: "Points earned",
        value: statistics?.totalPointsEarned,
        variant: "gold",
      },
    ],
    [statistics]
  );

  const difficultyBreakdown = useMemo(
    () =>
      DIFFICULTY_CONFIG.map((config) => {
        const games = gameHistory.filter(
          (game) =>
            String(game.difficulty).toUpperCase() === config.key
        );
        const answered = games.reduce(
          (total, game) =>
            total + (Number(game.questionsAnswered) || 0),
          0
        );
        const correct = games.reduce(
          (total, game) =>
            total + (Number(game.correctAnswers) || 0),
          0
        );
        const points = games.reduce(
          (total, game) => total + (Number(game.score) || 0),
          0
        );

        return {
          ...config,
          games: games.length,
          completed: games.filter(
            (game) =>
              String(game.status).toUpperCase() === "COMPLETED"
          ).length,
          answered,
          accuracy: answered ? (correct / answered) * 100 : 0,
          averageScore: games.length ? points / games.length : 0,
        };
      }),
    [gameHistory]
  );

  
  const animatedQuestions = useAnimatedNumber(
    isLoading ? 0 : questionsAnswered
  );
  const animatedCorrect = useAnimatedNumber(
    isLoading ? 0 : correctAnswers
  );
  const animatedIncorrect = useAnimatedNumber(
    isLoading ? 0 : incorrectAnswers
  );
  const animatedPoints = useAnimatedNumber(
    isLoading ? 0 : Number(statistics?.totalPointsEarned) || 0
  );
  const animatedAccuracy = useAnimatedNumber(
    isLoading ? 0 : visibleAccuracy
  );
  const animatedCorrectRate = useAnimatedNumber(
    isLoading ? 0 : correctRate
  );
  const animatedIncorrectRate = useAnimatedNumber(
    isLoading ? 0 : incorrectRate
  );

  const getAnimatedValue = (key) => {
    if (key === "questions") return formatNumber(animatedQuestions);
    if (key === "correct") return formatNumber(animatedCorrect);
    if (key === "incorrect") return formatNumber(animatedIncorrect);
    if (key === "points") return formatNumber(animatedPoints);
    return "0";
  };

  



  const handleLogout = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setError("");
    setIsLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section
        className="score-statistics"
        aria-labelledby="score-statistics-title"
      >
        {}
        <header className="score-statistics__hero">
          <div className="score-statistics__hero-floaters" aria-hidden="true">
            <span className="score-statistics__hero-floater score-statistics__hero-floater--1">
              🍌
            </span>
            <span className="score-statistics__hero-floater score-statistics__hero-floater--2">
              🍌
            </span>
          </div>

          <div className="score-statistics__hero-copy">
            <p className="score-statistics__eyebrow">
              EVERY ANSWER COUNTS
            </p>
            <h1 id="score-statistics-title">Score statistics</h1>
            <p>See how your puzzle-solving skills are adding up.</p>
          </div>

          <span
            className="score-statistics__hero-icon"
            aria-hidden="true"
          >
            <span className="score-statistics__hero-icon-bullseye">
              🎯
            </span>
          </span>

          <span
            className="score-statistics__hero-banana"
            aria-hidden="true"
          >
            🍌
          </span>
        </header>

        {}
        {error ? (
          <div className="score-statistics__error" role="alert">
            <span
              className="score-statistics__error-icon"
              aria-hidden="true"
            >
              ⚠️
            </span>
            <span className="score-statistics__error-text">
              {error}
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="score-statistics__retry"
            >
              <i
                className="fas fa-rotate-right"
                aria-hidden="true"
              ></i>{" "}
              Try again
            </button>
          </div>
        ) : (
          <>
            {}
            <section
              className="score-statistics__metrics"
              aria-label="Answer statistics"
              aria-busy={isLoading}
            >
              {metrics.map((metric, index) => (
                <article
                  key={metric.key}
                  className={`score-statistics-card score-statistics-card--${metric.variant}`}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span
                    className="score-statistics-card__icon"
                    aria-hidden="true"
                  >
                    {metric.icon}
                  </span>
                  <div>
                    <span>{metric.label}</span>
                    <strong>
                      {isLoading
                        ? "—"
                        : getAnimatedValue(metric.key)}
                    </strong>
                  </div>
                </article>
              ))}
            </section>

            {}
            <div className="score-statistics__details">
              {}
              <section
                className="score-statistics__panel score-statistics__accuracy"
                aria-labelledby="score-accuracy-title"
              >
                <div className="score-statistics__panel-heading">
                  <div>
                    <p className="score-statistics__eyebrow">
                      YOUR ACCURACY
                    </p>
                    <h2 id="score-accuracy-title">
                      Answer accuracy
                    </h2>
                  </div>
                  <span className="score-statistics__panel-caption">
                    All-time
                  </span>
                </div>

                {isLoading ? (
                  <div
                    className="score-statistics__skeleton"
                    aria-busy="true"
                  >
                    <div className="score-statistics__skeleton-circle" />
                    <div className="score-statistics__skeleton-text">
                      <span />
                      <span className="is-short" />
                    </div>
                  </div>
                ) : (
                  <div className="score-statistics__accuracy-content">
                    {}
                    <div
                      className="score-statistics__gauge"
                      role="progressbar"
                      aria-label="Answer accuracy"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={visibleAccuracy}
                    >
                      <svg
                        className="score-statistics__gauge-svg"
                        viewBox="0 0 120 120"
                        aria-hidden="true"
                      >
                        <circle
                          className="score-statistics__gauge-track"
                          cx="60"
                          cy="60"
                          r="52"
                        />
                        <circle
                          className="score-statistics__gauge-fill"
                          cx="60"
                          cy="60"
                          r="52"
                          strokeDasharray={2 * Math.PI * 52}
                          strokeDashoffset={
                            2 *
                            Math.PI *
                            52 *
                            (1 - animatedAccuracy / 100)
                          }
                        />
                      </svg>
                      <div className="score-statistics__gauge-content">
                        <strong>
                          {formatNumber(animatedAccuracy)}%
                        </strong>
                        <span>accuracy</span>
                      </div>
                    </div>

                    <div className="score-statistics__accuracy-copy">
                      {questionsAnswered > 0 ? (
                        <>
                          <strong>
                            {formatNumber(animatedCorrect)} of{" "}
                            {formatNumber(animatedQuestions)}{" "}
                            correct
                          </strong>
                          <p>{accuracyMessage}</p>
                        </>
                      ) : (
                        <>
                          <strong>
                            Ready for your first question?
                          </strong>
                          <p>
                            Your answer accuracy will appear
                            here after you play.
                          </p>
                          <Link to="/game-selection">
                            Start a challenge{" "}
                            <span aria-hidden="true">→</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>

              {}
              <section
                className="score-statistics__panel score-statistics__breakdown"
                aria-labelledby="score-breakdown-title"
              >
                <div className="score-statistics__panel-heading">
                  <div>
                    <p className="score-statistics__eyebrow">
                      ANSWER BREAKDOWN
                    </p>
                    <h2 id="score-breakdown-title">
                      Correct vs. incorrect
                    </h2>
                  </div>
                </div>

                {isLoading ? (
                  <div
                    className="score-statistics__skeleton"
                    aria-busy="true"
                  >
                    <div className="score-statistics__skeleton-bar" />
                    <div className="score-statistics__skeleton-row" />
                    <div className="score-statistics__skeleton-row" />
                  </div>
                ) : questionsAnswered > 0 ? (
                  <>
                    <div
                      className="score-statistics__answer-bar"
                      role="img"
                      aria-label={`${correctAnswers} correct and ${incorrectAnswers} incorrect answers`}
                    >
                      <AnimatedBar
                        percent={correctRate}
                        delay={100}
                        className="score-statistics__answer-bar-correct"
                      />
                      <AnimatedBar
                        percent={incorrectRate}
                        delay={200}
                        className="score-statistics__answer-bar-incorrect"
                      />
                    </div>

                    <div className="score-statistics__answer-list">
                      <div className="score-statistics__answer-item">
                        <span className="score-statistics__answer-label">
                          <span className="score-statistics__answer-dot score-statistics__answer-dot--correct" />
                          Correct
                        </span>
                        <strong>
                          {formatNumber(animatedCorrect)}
                        </strong>
                        <span>
                          {formatNumber(animatedCorrectRate)}%
                        </span>
                      </div>
                      <div className="score-statistics__answer-item">
                        <span className="score-statistics__answer-label">
                          <span className="score-statistics__answer-dot score-statistics__answer-dot--incorrect" />
                          Incorrect
                        </span>
                        <strong>
                          {formatNumber(animatedIncorrect)}
                        </strong>
                        <span>
                          {formatNumber(animatedIncorrectRate)}%
                        </span>
                      </div>
                    </div>

                    <div className="score-statistics__total">
                      <span>Total questions answered</span>
                      <strong>
                        {formatNumber(animatedQuestions)}
                      </strong>
                    </div>
                  </>
                ) : (
                  <div className="score-statistics__breakdown-empty">
                    <span aria-hidden="true">🍌</span>
                    <p>
                      Your answer breakdown will appear after
                      your first game.
                    </p>
                    <Link to="/game-selection">
                      Find a puzzle{" "}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </section>
            </div>

            {}
            <section
              className="score-statistics__difficulty-panel"
              aria-labelledby="score-difficulty-title"
            >
              <div className="score-statistics__panel-heading">
                <div>
                  <p className="score-statistics__eyebrow">
                    FIND YOUR RHYTHM
                  </p>
                  <h2 id="score-difficulty-title">
                    Performance by difficulty
                  </h2>
                </div>
                <span className="score-statistics__panel-caption">
                  All games
                </span>
              </div>

              {isLoading ? (
                <div
                  className="score-statistics__difficulty-skeleton"
                  aria-busy="true"
                >
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="score-statistics__difficulty-skeleton-card"
                      style={{
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>
              ) : gameHistory.length > 0 ? (
                <div className="score-statistics__difficulty-grid">
                  {difficultyBreakdown.map((item, index) => (
                    <article
                      key={item.key}
                      className={`score-statistics__difficulty-card score-statistics__difficulty-card--${item.tone}`}
                      style={{
                        animationDelay: `${index * 80}ms`,
                      }}
                    >
                      <div className="score-statistics__difficulty-heading">
                        <span
                          className="score-statistics__difficulty-icon"
                          aria-hidden="true"
                        >
                          {item.icon}
                        </span>
                        <strong>{item.label}</strong>
                        <span>
                          {formatNumber(item.games)}{" "}
                          {item.games === 1 ? "game" : "games"}
                        </span>
                      </div>

                      <div className="score-statistics__difficulty-accuracy">
                        <span>Answer accuracy</span>
                        <strong>
                          {formatNumber(item.accuracy)}%
                        </strong>
                      </div>

                      <div
                        className="score-statistics__difficulty-track"
                        role="progressbar"
                        aria-label={`${item.label.toLowerCase()} answer accuracy`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(
                          100,
                          item.accuracy
                        )}
                      >
                        <AnimatedBar
                          percent={Math.min(
                            100,
                            item.accuracy
                          )}
                          delay={index * 100 + 200}
                        />
                      </div>

                      <div className="score-statistics__difficulty-meta">
                        <span>
                          Avg. score{" "}
                          <strong>
                            {formatNumber(item.averageScore)}
                          </strong>
                        </span>
                        <span>
                          Completed{" "}
                          <strong>
                            {formatNumber(item.completed)}
                          </strong>
                        </span>
                        <span>
                          Answered{" "}
                          <strong>
                            {formatNumber(item.answered)}
                          </strong>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="score-statistics__difficulty-empty">
                  <span aria-hidden="true">🎮</span>
                  <p>
                    Play a puzzle to see how you perform at
                    each difficulty.
                  </p>
                  <Link to="/game-selection">
                    Choose a challenge{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </section>

            {}
            <div className="score-statistics__footer">
              <span>Want to see your overall performance?</span>
              <Link to="/score-summary">
                View score summary{" "}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </section>
    </DashboardLayout>
  );
}

export default ScoreStatistics;