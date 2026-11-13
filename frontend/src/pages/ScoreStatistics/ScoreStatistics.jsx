import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./ScoreStatistics.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const STATISTICS_API_URL = `${API_BASE_URL}/api/games/scores/statistics`;

function readStoredUser() {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "{}");
    return user && typeof user === "object" && !Array.isArray(user) ? user : {};
  } catch {
    return {};
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
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
      `The server returned an unexpected response (HTTP ${response.status}).`,
    );
  }

  if (
    !response.ok ||
    result?.success !== true ||
    !result.statistics ||
    typeof result.statistics !== "object"
  ) {
    const error = new Error(
      result?.message || "Unable to load your score statistics.",
    );
    error.status = response.status;
    throw error;
  }

  return result.statistics;
}

function ScoreStatistics() {
  const navigate = useNavigate();
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const user = readStoredUser();
  const username = typeof user.username === "string" ? user.username.trim() : "";
  const displayName =
    (typeof user.fullName === "string" && user.fullName.trim()) ||
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
        const result = await fetchScoreStatistics(token);
        if (isCurrent) {
          setStatistics(result);
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
            requestError.message || "Unable to load your score statistics.",
          );
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadStatistics();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const questionsAnswered = Number(statistics?.totalQuestionsAnswered) || 0;
  const correctAnswers = Number(statistics?.totalCorrectAnswers) || 0;
  const incorrectAnswers = Number(statistics?.totalIncorrectAnswers) || 0;
  const accuracy = Number(statistics?.accuracyPercentage) || 0;
  const visibleAccuracy = Math.min(100, Math.max(0, accuracy));
  const correctRate = questionsAnswered
    ? Math.min(100, (correctAnswers / questionsAnswered) * 100)
    : 0;
  const incorrectRate = questionsAnswered
    ? Math.min(100, (incorrectAnswers / questionsAnswered) * 100)
    : 0;

  const metrics = [
    { icon: <i className="fas fa-puzzle-piece" aria-hidden="true"></i>, label: "Questions answered", value: statistics?.totalQuestionsAnswered },
    { icon: <i className="fas fa-check-circle" aria-hidden="true"></i>, label: "Correct answers", value: statistics?.totalCorrectAnswers },
    { icon: <i className="fas fa-arrow-up-right" aria-hidden="true"></i>, label: "Incorrect answers", value: statistics?.totalIncorrectAnswers },
    { icon: <i className="fas fa-star" aria-hidden="true"></i>, label: "Points earned", value: statistics?.totalPointsEarned },
  ];

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
        <header className="score-statistics__hero">
          <div className="score-statistics__hero-copy">
            <p className="score-statistics__eyebrow">EVERY ANSWER COUNTS</p>
            <h1 id="score-statistics-title">Score statistics</h1>
            <p>See how your puzzle-solving skills are adding up.</p>
          </div>
          <span className="score-statistics__hero-icon" aria-hidden="true"><i className="fas fa-bullseye" aria-hidden="true"></i></span>
          <span className="score-statistics__hero-banana" aria-hidden="true">🍌</span>
        </header>

        {error ? (
          <div className="score-statistics__error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setError("");
                setIsLoading(true);
                setRefreshKey((key) => key + 1);
              }}
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <section
              className="score-statistics__metrics"
              aria-label="Answer statistics"
            >
              {metrics.map((metric) => (
                <article className="score-statistics-card" key={metric.label}>
                  <span
                    className="score-statistics-card__icon"
                    aria-hidden="true"
                  >
                    {metric.icon}
                  </span>
                  <div>
                    <span>{metric.label}</span>
                    <strong>
                      {isLoading ? "—" : formatNumber(metric.value)}
                    </strong>
                  </div>
                </article>
              ))}
            </section>

            <div className="score-statistics__details">
              <section
                className="score-statistics__panel score-statistics__accuracy"
                aria-labelledby="score-accuracy-title"
              >
                <div className="score-statistics__panel-heading">
                  <div>
                    <p className="score-statistics__eyebrow">YOUR ACCURACY</p>
                    <h2 id="score-accuracy-title">Answer accuracy</h2>
                  </div>
                  <span className="score-statistics__panel-caption">
                    All-time
                  </span>
                </div>
                {isLoading ? (
                  <div className="score-statistics__loading" role="status">
                    Loading your statistics…
                  </div>
                ) : (
                  <div className="score-statistics__accuracy-content">
                    <div
                      className="score-statistics__gauge"
                      role="progressbar"
                      aria-label="Answer accuracy"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={visibleAccuracy}
                      style={{
                        "--accuracy": `${visibleAccuracy}%`,
                      }}
                    >
                      <div>
                        <strong>{formatNumber(accuracy)}%</strong>
                        <span>accuracy</span>
                      </div>
                    </div>
                    <div className="score-statistics__accuracy-copy">
                      {questionsAnswered > 0 ? (
                        <>
                          <strong>
                            {formatNumber(correctAnswers)} of{" "}
                            {formatNumber(questionsAnswered)} correct
                          </strong>
                          <p>
                            {accuracy >= 80
                              ? "Excellent focus! You’re solving most puzzles correctly."
                              : accuracy >= 50
                                ? "You’re building a solid streak. Keep practicing!"
                                : "Every puzzle is practice. Keep going and watch your accuracy grow."}
                          </p>
                        </>
                      ) : (
                        <>
                          <strong>Ready for your first question?</strong>
                          <p>Your answer accuracy will appear here after you play.</p>
                          <Link to="/game-selection">
                            Start a challenge <span aria-hidden="true">→</span>
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </section>

              <section
                className="score-statistics__panel score-statistics__breakdown"
                aria-labelledby="score-breakdown-title"
              >
                <div className="score-statistics__panel-heading">
                  <div>
                    <p className="score-statistics__eyebrow">ANSWER BREAKDOWN</p>
                    <h2 id="score-breakdown-title">Correct vs. incorrect</h2>
                  </div>
                </div>
                {isLoading ? (
                  <div className="score-statistics__loading" role="status">
                    Loading your statistics…
                  </div>
                ) : questionsAnswered > 0 ? (
                  <>
                    <div
                      className="score-statistics__answer-bar"
                      role="img"
                      aria-label={`${correctAnswers} correct and ${incorrectAnswers} incorrect answers`}
                    >
                      <span
                        className="score-statistics__answer-bar-correct"
                        style={{ width: `${correctRate}%` }}
                      />
                      <span
                        className="score-statistics__answer-bar-incorrect"
                        style={{ width: `${incorrectRate}%` }}
                      />
                    </div>
                    <div className="score-statistics__answer-list">
                      <div className="score-statistics__answer-item">
                        <span className="score-statistics__answer-label">
                          <span className="score-statistics__answer-dot score-statistics__answer-dot--correct" />
                          Correct
                        </span>
                        <strong>{formatNumber(correctAnswers)}</strong>
                        <span>{formatNumber(correctRate)}%</span>
                      </div>
                      <div className="score-statistics__answer-item">
                        <span className="score-statistics__answer-label">
                          <span className="score-statistics__answer-dot score-statistics__answer-dot--incorrect" />
                          Incorrect
                        </span>
                        <strong>{formatNumber(incorrectAnswers)}</strong>
                        <span>{formatNumber(incorrectRate)}%</span>
                      </div>
                    </div>
                    <div className="score-statistics__total">
                      <span>Total questions answered</span>
                      <strong>{formatNumber(questionsAnswered)}</strong>
                    </div>
                  </>
                ) : (
                  <div className="score-statistics__breakdown-empty">
                    <span aria-hidden="true">🍌</span>
                    <p>Your answer breakdown will appear after your first game.</p>
                    <Link to="/game-selection">
                      Find a puzzle <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </section>
            </div>

            <div className="score-statistics__footer">
              <span>Want to see your overall performance?</span>
              <Link to="/score-summary">
                View score summary <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </section>
    </DashboardLayout>
  );
}

export default ScoreStatistics;
