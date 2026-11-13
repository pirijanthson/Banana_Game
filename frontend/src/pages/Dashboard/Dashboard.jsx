import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import Sidebar from "../../components/Dashboard/Sidebar/Sidebar";
import StatCard from "../../components/Dashboard/StatCard/StatCard";
import "./Dashboard.css";

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

async function fetchDashboardData(token) {
  const endpoints = [
    ["summary", "scores/summary"],
    ["statistics", "scores/statistics"],
    ["history", "history"],
  ];

  const responses = await Promise.all(
    endpoints.map(async ([key, path]) => {
      const response = await fetch(`${GAMES_API_URL}/${path}`, {
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

      if (!response.ok || result.success !== true) {
        const error = new Error(
          result.message || `Unable to load ${key.replace("-", " ")}.`,
        );
        error.status = response.status;
        throw error;
      }

      return [key, result];
    }),
  );

  return Object.fromEntries(responses);
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

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function Dashboard() {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const user = readStoredUser();
  const displayName =
    (typeof user.fullName === "string" && user.fullName.trim()) ||
    (typeof user.username === "string" && user.username.trim()) ||
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

    const loadDashboard = async () => {
      try {
        const data = await fetchDashboardData(token);
        if (isCurrent) {
          setDashboardData(data);
        }
      } catch (requestError) {
        if (requestError.status === 401) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }
        if (isCurrent) {
          setError(requestError.message || "Unable to load your dashboard.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const scores = dashboardData?.summary?.scores;
  const statistics = dashboardData?.statistics?.statistics;
  const games = dashboardData?.history?.games || [];
  const activeGames = games.filter(
    (game) => String(game.status).toUpperCase() === "ACTIVE",
  );
  const otherRecentGames = games
    .filter((game) => String(game.status).toUpperCase() !== "ACTIVE")
    .slice(0, Math.max(0, 5 - activeGames.length));
  const recentGames = [...activeGames, ...otherRecentGames];

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={typeof user.username === "string" ? user.username.trim() : ""}
    >
        <section className="dashboard-welcome">
          <div className="dashboard-welcome__copy">
            <p className="dashboard-eyebrow">YOUR BANANA QUEST</p>
            <h1>Welcome back, {displayName.split(" ")[0]}!</h1>
            <p className="dashboard-welcome__text">
              Ready to put your puzzle skills to the test?
            </p>
            <Link className="dashboard-play-button" to="/game-selection">
              <span aria-hidden="true">▶</span> Play a game
            </Link>
          </div>
          <div className="dashboard-welcome__art" aria-hidden="true">
            <span className="dashboard-sparkle dashboard-sparkle--one"><i className="fas fa-star" aria-hidden="true"></i></span>
            <span className="dashboard-sparkle dashboard-sparkle--two"><i className="fas fa-star" aria-hidden="true"></i></span>
            <span className="dashboard-banana">🍌</span>
            <span className="dashboard-welcome__orbit" />
          </div>
          <span className="dashboard-welcome__decoration" aria-hidden="true">🍌</span>
        </section>

        <section className="dashboard-stats" aria-label="Your game statistics">
          <StatCard
            variant="points"
            icon={<i className="fas fa-star" aria-hidden="true"></i>}
            label="Total points"
            value={isLoading || error ? "—" : formatNumber(scores?.totalPoints)}
          />
          <StatCard
            variant="games"
            icon={<i className="fas fa-gamepad" aria-hidden="true"></i>}
            label="Games played"
            value={isLoading || error ? "—" : formatNumber(scores?.totalGames)}
          />
          <StatCard
            variant="accuracy"
            icon={<i className="fas fa-bullseye" aria-hidden="true"></i>}
            label="Answer accuracy"
            value={isLoading || error ? "—" : `${formatNumber(statistics?.accuracyPercentage)}%`}
          />
          <StatCard
            variant="best"
            icon={<i className="fas fa-trophy" aria-hidden="true"></i>}
            label="Personal best"
            value={isLoading || error ? "—" : formatNumber(scores?.highestScore)}
          />
        </section>

        {error && (
          <div className="dashboard-error" role="alert">
            <p>{error}</p>
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
        )}

        <div className="dashboard-content">
          <section className="dashboard-panel dashboard-activity">
            <div className="dashboard-panel__heading">
              <div>
                <p className="dashboard-eyebrow">KEEP IT UP</p>
                <h2>Recent games</h2>
              </div>
              <Link to="/game-history" className="dashboard-panel__link">
                View history <span aria-hidden="true">→</span>
              </Link>
            </div>

            {isLoading ? (
              <div className="dashboard-empty-state" role="status">
                Loading your games…
              </div>
            ) : error ? (
              <div className="dashboard-empty-state">
                Your recent games are unavailable right now.
              </div>
            ) : recentGames.length > 0 ? (
              <div className="dashboard-game-list">
                {recentGames.map((game) => (
                  <article
                    className={`dashboard-game-row${String(game.status).toUpperCase() === "ACTIVE" ? " dashboard-game-row--active" : ""}`}
                    key={game._id || game.id}
                  >
                    <span className="dashboard-game-icon" aria-hidden="true"><i className="fas fa-seedling" aria-hidden="true"></i></span>
                    <div className="dashboard-game-info">
                      <strong>{game.difficulty || "Puzzle"} challenge</strong>
                      <span>{formatDate(game.endedAt || game.createdAt || game.startedAt)}</span>
                      {String(game.status).toUpperCase() === "ACTIVE" && (
                        <Link
                          className="dashboard-game-resume"
                          to="/gameplay"
                          state={{ gameId: String(game._id) }}
                        >
                          Resume game <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </div>
                    <span
                      className={`dashboard-game-status dashboard-game-status--${(game.status || "active").toLowerCase()}`}
                    >
                      {(game.status || "In progress").toLowerCase()}
                    </span>
                    <strong className="dashboard-game-score">
                      {formatNumber(game.score)} <span>pts</span>
                    </strong>
                  </article>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <span aria-hidden="true"><i className="fas fa-puzzle-piece" aria-hidden="true"></i></span>
                <strong>Your first puzzle is waiting!</strong>
                <p>Play a game and your recent activity will show up here.</p>
                <Link to="/game-selection">Find a game <span aria-hidden="true">→</span></Link>
              </div>
            )}
          </section>

          <Sidebar />
        </div>
    </DashboardLayout>
  );
}

export default Dashboard;
