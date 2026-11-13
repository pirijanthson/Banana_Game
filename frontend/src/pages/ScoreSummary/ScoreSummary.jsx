import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./ScoreSummary.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const SUMMARY_API_URL = `${API_BASE_URL}/api/games/scores/summary`;
const HISTORY_API_URL = `${API_BASE_URL}/api/games/history`;

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

async function fetchScoreSummary(token) {
  const response = await fetch(SUMMARY_API_URL, {
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

  if (!response.ok || result?.success !== true || !result.scores) {
    const error = new Error(
      result?.message || "Unable to load your score summary.",
    );
    error.status = response.status;
    throw error;
  }

  return result.scores;
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
      `The server returned an unexpected response (HTTP ${response.status}).`,
    );
  }

  if (!response.ok || result?.success !== true || !Array.isArray(result.games)) {
    const error = new Error(
      result?.message || "Unable to load your recent games.",
    );
    error.status = response.status;
    throw error;
  }

  return result.games;
}

function formatDate(value) {
  if (!value) {
    return "Date unavailable";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function ScoreSummary() {
  const navigate = useNavigate();
  const [scores, setScores] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
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

    const loadSummary = async () => {
      try {
        const [summary, history] = await Promise.all([
          fetchScoreSummary(token),
          fetchGameHistory(token),
        ]);
        if (isCurrent) {
          setScores(summary);
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
          setError(requestError.message || "Unable to load your score summary.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadSummary();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const totalGames = Number(scores?.totalGames) || 0;
  const completedGames = Number(scores?.completedGames) || 0;
  const failedGames = Number(scores?.failedGames) || 0;
  const activeGames = Math.max(0, totalGames - completedGames - failedGames);
  const completionRate = totalGames
    ? Math.round((completedGames / totalGames) * 100)
    : 0;
  const outcomeSegments = [
    { key: "completed", label: "Completed", count: completedGames },
    { key: "failed", label: "Game over", count: failedGames },
    { key: "active", label: "In progress", count: activeGames },
  ];
  const recentGames = gameHistory.slice(0, 4);
  const bestGame = gameHistory.reduce(
    (best, game) =>
      best === null || Number(game.score) > Number(best.score) ? game : best,
    null,
  );

  const metrics = [
    { icon: <i className="fas fa-star" aria-hidden="true"></i>, label: "Total points", value: scores?.totalPoints },
    { icon: <i className="fas fa-chart-bar" aria-hidden="true"></i>, label: "Average score", value: scores?.averageScore },
    { icon: <i className="fas fa-trophy" aria-hidden="true"></i>, label: "Personal best", value: scores?.highestScore },
    { icon: <i className="fas fa-gamepad" aria-hidden="true"></i>, label: "Games played", value: scores?.totalGames },
  ];

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section className="score-summary" aria-labelledby="score-summary-title">
<header className="score-summary__hero">
          <div className="score-summary__hero-copy">
            <p className="score-summary__eyebrow">YOUR PROGRESS, IN POINTS</p>
            <h1 id="score-summary-title">Score summary</h1>
            <p>A little progress adds up. Here's how your puzzle journey is going.</p>
          </div>
          <span className="score-summary__hero-icon" aria-hidden="true"><i className="fas fa-sparkles" aria-hidden="true"></i></span>
          <span className="score-summary__hero-banana" aria-hidden="true">🍌</span>
        </header>

        {error ? (
          <div className="score-summary__error" role="alert">
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
            <section className="score-summary__metrics" aria-label="Score metrics">
              {metrics.map((metric) => (
                <article className="score-summary-card" key={metric.label}>
                  <span className="score-summary-card__icon" aria-hidden="true">
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

            <div className="score-summary__details">
              <section className="score-summary__panel" aria-labelledby="score-outcomes-title">
                <div className="score-summary__panel-heading">
                  <div>
                    <p className="score-summary__eyebrow">THE BIG PICTURE</p>
                    <h2 id="score-outcomes-title">Challenge outcomes</h2>
                  </div>
                  <span className="score-summary__panel-total">
                    {isLoading ? "—" : formatNumber(totalGames)} total
                  </span>
                </div>

                {isLoading ? (
                  <div className="score-summary__loading" role="status">
                    Loading your score summary…
                  </div>
                ) : totalGames > 0 ? (
                  <>
                    <div
                      className="score-summary__bar"
                      role="img"
                      aria-label={`${completedGames} completed, ${failedGames} game over, ${activeGames} in progress`}
                    >
                      {outcomeSegments.map((segment) => (
                        <span
                          key={segment.key}
                          className={`score-summary__bar-segment score-summary__bar-segment--${segment.key}`}
                          style={{
                            width: `${(segment.count / totalGames) * 100}%`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="score-summary__legend">
                      {outcomeSegments.map((segment) => (
                        <div className="score-summary__legend-item" key={segment.key}>
                          <span
                            className={`score-summary__legend-dot score-summary__legend-dot--${segment.key}`}
                            aria-hidden="true"
                          />
                          <span>{segment.label}</span>
                          <strong>{formatNumber(segment.count)}</strong>
                        </div>
                      ))}
                    </div>
                    <div className="score-summary__completion">
                      <div>
                        <strong>{completionRate}%</strong>
                        <span>challenge completion rate</span>
                      </div>
                      <div
                        className="score-summary__completion-track"
                        role="progressbar"
                        aria-label="Challenge completion rate"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={completionRate}
                      >
                        <span style={{ width: `${completionRate}%` }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="score-summary__empty">
                    <span aria-hidden="true">🧩</span>
                    <strong>Your first score is waiting</strong>
                    <p>Finish a challenge and your score breakdown will show up here.</p>
                    <Link to="/game-selection">Play your first game <span aria-hidden="true">→</span></Link>
                  </div>
                )}
              </section>

              <aside className="score-summary__highlight">
                <span className="score-summary__highlight-icon" aria-hidden="true">🌟</span>
                <p className="score-summary__eyebrow">YOUR TOP SCORE</p>
                <strong className="score-summary__highlight-score">
                  {isLoading ? "—" : formatNumber(scores?.highestScore)}
                </strong>
                <span className="score-summary__highlight-caption">points in a single game</span>
                <div className="score-summary__highlight-divider" />
                <p>
                  {totalGames > 0
                    ? "Keep playing to set a new personal best."
                    : "Start playing to set your personal best."}
                </p>
                <Link to="/game-selection">
                  Take a new challenge <span aria-hidden="true">→</span>
                </Link>
              </aside>
            </div>

            <section className="score-summary__recent" aria-labelledby="score-recent-title">
              <div className="score-summary__panel-heading">
                <div>
                  <p className="score-summary__eyebrow">LATEST ACTIVITY</p>
                  <h2 id="score-recent-title">Recent games</h2>
                </div>
                <Link to="/game-history">View all <span aria-hidden="true">→</span></Link>
              </div>
              {isLoading ? (
                <div className="score-summary__recent-loading" role="status">
                  Loading recent games…
                </div>
              ) : recentGames.length > 0 ? (
                <div className="score-summary__recent-list">
                  {recentGames.map((game) => (
                    <article key={game._id || game.id}>
                      <span className="score-summary__recent-icon" aria-hidden="true">
                        {String(game.status).toUpperCase() === "COMPLETED" ? "🏅" : "🧩"}
                      </span>
                      <div>
                        <strong>{game.difficulty || "Puzzle"} challenge</strong>
                        <span>{formatDate(game.endedAt || game.createdAt || game.startedAt)}</span>
                      </div>
                      <span className={`score-summary__recent-status score-summary__recent-status--${String(game.status || "active").toLowerCase()}`}>
                        {String(game.status || "active").toLowerCase()}
                      </span>
                      <strong className="score-summary__recent-score">
                        {formatNumber(game.score)} <small>pts</small>
                      </strong>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="score-summary__recent-empty">
                  Your recent scores will appear here after you play your first game.
                </div>
              )}
              {bestGame && (
                <p className="score-summary__best-detail">
                  Your personal best of {formatNumber(bestGame.score)} points came from a{" "}
                  {String(bestGame.difficulty || "puzzle").toLowerCase()} challenge on{" "}
                  {formatDate(bestGame.endedAt || bestGame.createdAt || bestGame.startedAt)}.
                </p>
              )}
            </section>

            <div className="score-summary__footer-link">
              <span>Want to see each game?</span>
              <Link to="/game-history">Browse your game history <span aria-hidden="true">→</span></Link>
            </div>
          </>
        )}
      </section>
    </DashboardLayout>
  );
}

export default ScoreSummary;
