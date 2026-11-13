import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./GameHistory.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const HISTORY_API_URL = `${API_BASE_URL}/api/games/history`;
const PAGE_SIZE = 8;

function readStoredUser() {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "{}");
    return user && typeof user === "object" && !Array.isArray(user) ? user : {};
  } catch {
    return {};
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
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
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDifficulty(value) {
  if (typeof value !== "string" || !value) {
    return "Puzzle";
  }

  return `${value[0]}${value.slice(1).toLowerCase()}`;
}

function formatStatus(value) {
  if (value === "COMPLETED") return "Completed";
  if (value === "FAILED") return "Game over";
  return "In progress";
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
      result?.message || "Unable to load your game history.",
    );
    error.status = response.status;
    throw error;
  }

  return result.games;
}

function GameHistory() {
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [difficultyFilter, setDifficultyFilter] = useState("ALL");
  const [page, setPage] = useState(1);
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

    const loadHistory = async () => {
      try {
        const history = await fetchGameHistory(token);
        if (isCurrent) {
          setGames(history);
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
          setError(requestError.message || "Unable to load your game history.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  const filteredGames = useMemo(
    () =>
      games.filter(
        (game) =>
          (statusFilter === "ALL" || game.status === statusFilter) &&
          (difficultyFilter === "ALL" || game.difficulty === difficultyFilter),
      ),
    [difficultyFilter, games, statusFilter],
  );
  const pageCount = Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE));
  const visibleGames = filteredGames.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const totalPoints = games.reduce(
    (total, game) => total + (Number(game.score) || 0),
    0,
  );
  const highestScore = games.reduce(
    (highest, game) => Math.max(highest, Number(game.score) || 0),
    0,
  );

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const handleFilterChange = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section className="game-history" aria-labelledby="game-history-title">
        <header className="game-history__hero">
          <div>
            <p className="game-history__eyebrow">YOUR PUZZLE JOURNEY</p>
            <h1 id="game-history-title">Game history</h1>
            <p>Every challenge, every score, all in one place.</p>
          </div>
          <Link className="game-history__play" to="/game-selection">
            <span aria-hidden="true">▶</span> Play a game
          </Link>
          <span className="game-history__hero-banana" aria-hidden="true">🍌</span>
        </header>

        <section className="game-history__stats" aria-label="Game history summary">
          <article className="game-history-stat">
            <span className="game-history-stat__icon" aria-hidden="true"><i className="fas fa-gamepad" aria-hidden="true"></i></span>
            <div>
              <span>Games played</span>
              <strong>{isLoading || error ? "—" : formatNumber(games.length)}</strong>
            </div>
          </article>
          <article className="game-history-stat">
            <span className="game-history-stat__icon game-history-stat__icon--points" aria-hidden="true"><i className="fas fa-star" aria-hidden="true"></i></span>
            <div>
              <span>Total points</span>
              <strong>{isLoading || error ? "—" : formatNumber(totalPoints)}</strong>
            </div>
          </article>
          <article className="game-history-stat">
            <span className="game-history-stat__icon game-history-stat__icon--best" aria-hidden="true"><i className="fas fa-trophy" aria-hidden="true"></i></span>
            <div>
              <span>Personal best</span>
              <strong>{isLoading || error ? "—" : formatNumber(highestScore)}</strong>
            </div>
          </article>
        </section>

        <section className="game-history__panel" aria-label="Your games">
          <div className="game-history__panel-heading">
            <div>
              <p className="game-history__eyebrow">LOOKING BACK</p>
              <h2>All games</h2>
            </div>
            {!isLoading && !error && (
              <span className="game-history__count">
                {formatNumber(filteredGames.length)}{" "}
                {filteredGames.length === 1 ? "game" : "games"}
              </span>
            )}
          </div>

          <div className="game-history__filters">
            <label>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={handleFilterChange(setStatusFilter)}
                aria-label="Filter by game status"
              >
                <option value="ALL">All statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Game over</option>
                <option value="ACTIVE">In progress</option>
              </select>
            </label>
            <label>
              <span>Difficulty</span>
              <select
                value={difficultyFilter}
                onChange={handleFilterChange(setDifficultyFilter)}
                aria-label="Filter by difficulty"
              >
                <option value="ALL">All difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </label>
          </div>

          {isLoading ? (
            <div className="game-history__message" role="status">
              <span className="game-history__loader" aria-hidden="true" />
              Loading your games…
            </div>
          ) : error ? (
            <div className="game-history__message game-history__message--error" role="alert">
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
          ) : games.length === 0 ? (
            <div className="game-history__empty">
              <span aria-hidden="true"><i className="fas fa-puzzle-piece" aria-hidden="true"></i></span>
              <h3>Your story starts with a puzzle</h3>
              <p>Play your first game and your results will appear here.</p>
              <Link to="/game-selection">Choose a challenge <span aria-hidden="true">→</span></Link>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="game-history__empty game-history__empty--compact">
              <span aria-hidden="true"><i className="fas fa-search" aria-hidden="true"></i></span>
              <h3>No games match these filters</h3>
              <p>Try a different status or difficulty.</p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("ALL");
                  setDifficultyFilter("ALL");
                  setPage(1);
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="game-history__list">
                {visibleGames.map((game) => (
                  <article className="game-history-row" key={game._id}>
                    <span className="game-history-row__icon" aria-hidden="true">🍌</span>
                    <div className="game-history-row__main">
                      <strong>{formatDifficulty(game.difficulty)} challenge</strong>
                      <span>
                        {formatDate(game.endedAt || game.startedAt || game.createdAt)}
                      </span>
                    </div>
                    <div className="game-history-row__progress">
                      <strong>
                        {formatNumber(game.correctAnswers)}{" "}
                        <span>/{formatNumber(game.totalQuestions)} correct</span>
                      </strong>
                      <span>
                        {formatNumber(game.questionsAnswered)} questions answered
                      </span>
                    </div>
                    <span
                      className={`game-history-row__status game-history-row__status--${(game.status || "ACTIVE").toLowerCase()}`}
                    >
                      {formatStatus(game.status)}
                    </span>
                    <strong className="game-history-row__score">
                      {formatNumber(game.score)}
                      <span>pts</span>
                    </strong>
                  </article>
                ))}
              </div>

              {pageCount > 1 && (
                <nav className="game-history__pagination" aria-label="Game history pages">
                  <span>
                    Showing {(page - 1) * PAGE_SIZE + 1}–
                    {Math.min(page * PAGE_SIZE, filteredGames.length)} of{" "}
                    {filteredGames.length}
                  </span>
                  <div>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page === 1}
                      aria-label="Previous page"
                    >
                      ←
                    </button>
                    <span>Page {page} of {pageCount}</span>
                    <button
                      type="button"
                      onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                      disabled={page === pageCount}
                      aria-label="Next page"
                    >
                      →
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </section>
      </section>
    </DashboardLayout>
  );
}

export default GameHistory;
