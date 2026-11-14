import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
          `The server returned an unexpected response (HTTP ${response.status}).`
        );
      }

      if (!response.ok || result.success !== true) {
        const error = new Error(
          result.message ||
            `Unable to load ${key.replace("-", " ")}.`
        );
        error.status = response.status;
        throw error;
      }

      return [key, result];
    })
  );

  return Object.fromEntries(responses);
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat().format(num);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(fullName) {
  if (!fullName || typeof fullName !== "string") return "Player";
  return fullName.trim().split(/\s+/)[0] || "Player";
}

function formatRelativeTime(date) {
  if (!date) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}




function useAnimatedNumber(target, duration = 900) {
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




function AnimatedMeter({ value = 0, max = 100 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWidth(Math.min(100, Math.max(0, (value / max) * 100)));
    }, 120);
    return () => window.clearTimeout(timer);
  }, [value, max]);

  return <span style={{ width: `${width}%` }} />;
}




function Dashboard() {
  const navigate = useNavigate();

  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, setTick] = useState(0);

  const user = useMemo(readStoredUser, []);

  const displayName =
    (typeof user.fullName === "string" && user.fullName.trim()) ||
    (typeof user.username === "string" && user.username.trim()) ||
    "Player";
  const firstName = getFirstName(displayName);
  const greeting = getGreeting();

  
  useEffect(() => {
    if (!lastUpdated) return undefined;
    const timer = window.setInterval(
      () => setTick((t) => t + 1),
      10000
    );
    return () => window.clearInterval(timer);
  }, [lastUpdated]);

  
  const handleLogout = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [navigate]);

  
  const handleRefresh = useCallback(() => {
    setError("");
    setIsLoading(true);
    setRefreshKey((key) => key + 1);
  }, []);

  
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
          setLastUpdated(new Date());
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
            requestError.message || "Unable to load your dashboard."
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  
  const scores = dashboardData?.summary?.scores;
  const statistics = dashboardData?.statistics?.statistics;

  const accuracy = useMemo(
    () =>
      Math.min(
        100,
        Math.max(0, Number(statistics?.accuracyPercentage) || 0)
      ),
    [statistics?.accuracyPercentage]
  );

  const totalAnswers = Number(statistics?.totalQuestionsAnswered) || 0;
  const correctAnswers = Number(statistics?.totalCorrectAnswers) || 0;
  const currentStreak = Number(user.currentStreak) || 0;

  const recentGames = useMemo(() => {
    const games = dashboardData?.history?.games || [];
    const activeGames = games.filter(
      (game) => String(game.status).toUpperCase() === "ACTIVE"
    );
    const otherRecentGames = games
      .filter((game) => String(game.status).toUpperCase() !== "ACTIVE")
      .slice(0, Math.max(0, 5 - activeGames.length));
    return [...activeGames, ...otherRecentGames];
  }, [dashboardData?.history?.games]);

  const showPlaceholder = isLoading || Boolean(error);

  
  const animatedPoints = useAnimatedNumber(
    showPlaceholder ? 0 : scores?.totalPoints || 0
  );
  const animatedGames = useAnimatedNumber(
    showPlaceholder ? 0 : scores?.totalGames || 0
  );
  const animatedAccuracy = useAnimatedNumber(
    showPlaceholder ? 0 : accuracy
  );
  const animatedBest = useAnimatedNumber(
    showPlaceholder ? 0 : scores?.highestScore || 0
  );
  const animatedCompleted = useAnimatedNumber(
    showPlaceholder ? 0 : scores?.completedGames || 0
  );
  const animatedAverage = useAnimatedNumber(
    showPlaceholder ? 0 : scores?.averageScore || 0
  );
  const animatedStreak = useAnimatedNumber(currentStreak);

  



  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={
        typeof user.username === "string"
          ? user.username.trim()
          : ""
      }
    >
      
      <section className="dashboard-welcome dashboard-animate-in">
        {}
        <div
          className="dashboard-welcome__floaters"
          aria-hidden="true"
        >
          <span className="dashboard-welcome__floater dashboard-welcome__floater--1">
            🍌
          </span>
          <span className="dashboard-welcome__floater dashboard-welcome__floater--2">
            🍌
          </span>
          <span className="dashboard-welcome__floater dashboard-welcome__floater--3">
            🍌
          </span>
        </div>

        <div className="dashboard-welcome__copy">
          <p className="dashboard-eyebrow">YOUR BANANA QUEST</p>
          <h1>
            {greeting}, {firstName}!
          </h1>
          <p className="dashboard-welcome__text">
            Ready to put your puzzle skills to the test?
          </p>
          <Link
            className="dashboard-play-button"
            to="/game-selection"
          >
            <span aria-hidden="true">▶</span> Play a game
          </Link>
        </div>

        <div
          className="dashboard-welcome__art"
          aria-hidden="true"
        >
          <span className="dashboard-sparkle dashboard-sparkle--one">
            <i className="fas fa-star" aria-hidden="true"></i>
          </span>
          <span className="dashboard-sparkle dashboard-sparkle--two">
            <i className="fas fa-star" aria-hidden="true"></i>
          </span>
          <span className="dashboard-banana">🍌</span>
          <span className="dashboard-welcome__orbit" />
        </div>

        <span
          className="dashboard-welcome__decoration"
          aria-hidden="true"
        >
          🍌
        </span>
      </section>

      {}
      <section
        className="dashboard-stats dashboard-animate-in dashboard-animate-in--delay-1"
        aria-label="Your game statistics"
        aria-busy={isLoading}
      >
        <StatCard
          variant="points"
          icon={
            <i className="fas fa-star" aria-hidden="true"></i>
          }
          label="Total points"
          value={
            showPlaceholder
              ? "—"
              : formatNumber(animatedPoints)
          }
          loading={isLoading}
        />

        <StatCard
          variant="games"
          icon={
            <i className="fas fa-gamepad" aria-hidden="true"></i>
          }
          label="Games played"
          value={
            showPlaceholder
              ? "—"
              : formatNumber(animatedGames)
          }
          loading={isLoading}
        />

        <StatCard
          variant="accuracy"
          icon={
            <i className="fas fa-bullseye" aria-hidden="true"></i>
          }
          label="Answer accuracy"
          value={
            showPlaceholder
              ? "—"
              : `${formatNumber(animatedAccuracy)}%`
          }
          loading={isLoading}
        />

        <StatCard
          variant="best"
          icon={
            <i className="fas fa-trophy" aria-hidden="true"></i>
          }
          label="Personal best"
          value={
            showPlaceholder
              ? "—"
              : formatNumber(animatedBest)
          }
          loading={isLoading}
        />
      </section>

      {}
      <section
        className="dashboard-insights dashboard-animate-in dashboard-animate-in--delay-2"
        aria-labelledby="dashboard-insights-title"
      >
        <div className="dashboard-insights__heading">
          <div>
            <p className="dashboard-eyebrow">
              YOUR QUEST AT A GLANCE
            </p>
            <h2 id="dashboard-insights-title">
              Progress snapshot
            </h2>
          </div>
          <Link to="/score-statistics">
            Explore statistics <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="dashboard-insights__grid">
          <article className="dashboard-insights__accuracy">
            <div className="dashboard-insights__metric-heading">
              <span
                className="dashboard-insights__icon"
                aria-hidden="true"
              >
                🎯
              </span>
              <span>Answer accuracy</span>
            </div>
            <strong>
              {showPlaceholder
                ? "—"
                : `${formatNumber(animatedAccuracy)}%`}
            </strong>
            <div
              className="dashboard-insights__meter"
              role="progressbar"
              aria-label="Answer accuracy"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={showPlaceholder ? 0 : accuracy}
            >
              <AnimatedMeter
                value={showPlaceholder ? 0 : accuracy}
                max={100}
              />
            </div>
            <small>
              {showPlaceholder
                ? "Answer totals unavailable"
                : `${formatNumber(
                    correctAnswers
                  )} correct out of ${formatNumber(
                    totalAnswers
                  )} answers`}
            </small>
          </article>

          <article>
            <div className="dashboard-insights__metric-heading">
              <span
                className="dashboard-insights__icon"
                aria-hidden="true"
              >
                ✅
              </span>
              <span>Completed games</span>
            </div>
            <strong>
              {showPlaceholder
                ? "—"
                : formatNumber(animatedCompleted)}
            </strong>
            <small>
              {showPlaceholder
                ? "Completion totals unavailable"
                : `${formatNumber(
                    scores?.failedGames
                  )} games ended early`}
            </small>
          </article>

          <article>
            <div className="dashboard-insights__metric-heading">
              <span
                className="dashboard-insights__icon"
                aria-hidden="true"
              >
                ⚡
              </span>
              <span>Average score</span>
            </div>
            <strong>
              {showPlaceholder
                ? "—"
                : formatNumber(animatedAverage)}
            </strong>
            <small>points earned per game</small>
          </article>

          <article>
            <div className="dashboard-insights__metric-heading">
              <span
                className="dashboard-insights__icon"
                aria-hidden="true"
              >
                🔥
              </span>
              <span>Current streak</span>
            </div>
            <strong>{formatNumber(animatedStreak)}</strong>
            <small>
              {currentStreak === 1
                ? "completed game in a row"
                : "completed games in a row"}
            </small>
          </article>
        </div>
      </section>

      {}
      {error && (
        <div
          className="dashboard-error dashboard-animate-in"
          role="alert"
        >
          <div
            className="dashboard-error__icon"
            aria-hidden="true"
          >
            ⚠️
          </div>
          <div className="dashboard-error__content">
            <p>{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="dashboard-error__button"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {}
      <div className="dashboard-content dashboard-animate-in dashboard-animate-in--delay-3">
        <section className="dashboard-panel dashboard-activity">
          <div className="dashboard-panel__heading">
            <div>
              <p className="dashboard-eyebrow">KEEP IT UP</p>
              <h2>Recent games</h2>
            </div>
            <div className="dashboard-panel__actions">
              <button
                type="button"
                className="dashboard-panel__refresh"
                onClick={handleRefresh}
                disabled={isLoading}
                aria-label="Refresh recent games"
                title="Refresh"
              >
                <i
                  className={`fas fa-rotate-right${
                    isLoading ? " fa-spin" : ""
                  }`}
                  aria-hidden="true"
                ></i>
              </button>
              <Link
                to="/game-history"
                className="dashboard-panel__link"
              >
                View history <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {isLoading ? (
            <div
              className="dashboard-empty-state"
              role="status"
              aria-live="polite"
            >
              <span className="dashboard-empty-state__spinner">
                <i
                  className="fas fa-circle-notch fa-spin"
                  aria-hidden="true"
                ></i>
              </span>
              Loading your games…
            </div>
          ) : error ? (
            <div className="dashboard-empty-state">
              Your recent games are unavailable right now.
            </div>
          ) : recentGames.length > 0 ? (
            <div className="dashboard-game-list">
              {recentGames.map((game, index) => {
                const status = String(
                  game.status || "active"
                ).toLowerCase();
                const isActive =
                  String(game.status).toUpperCase() === "ACTIVE";
                return (
                  <article
                    className={`dashboard-game-row${
                      isActive
                        ? " dashboard-game-row--active"
                        : ""
                    }`}
                    key={game._id || game.id}
                    style={{
                      animationDelay: `${index * 60}ms`,
                    }}
                  >
                    <span
                      className="dashboard-game-icon"
                      aria-hidden="true"
                    >
                      <i
                        className="fas fa-seedling"
                        aria-hidden="true"
                      ></i>
                    </span>
                    <div className="dashboard-game-info">
                      <strong>
                        {game.difficulty || "Puzzle"} challenge
                      </strong>
                      <span>
                        {formatDate(
                          game.endedAt ||
                            game.createdAt ||
                            game.startedAt
                        )}
                      </span>
                      {isActive && (
                        <Link
                          className="dashboard-game-resume"
                          to="/gameplay"
                          state={{ gameId: String(game._id) }}
                        >
                          Resume game{" "}
                          <span aria-hidden="true">→</span>
                        </Link>
                      )}
                    </div>
                    <span
                      className={`dashboard-game-status dashboard-game-status--${status}`}
                    >
                      {status}
                    </span>
                    <strong className="dashboard-game-score">
                      {formatNumber(game.score)}{" "}
                      <span>pts</span>
                    </strong>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <span aria-hidden="true">
                <i
                  className="fas fa-puzzle-piece"
                  aria-hidden="true"
                ></i>
              </span>
              <strong>Your first puzzle is waiting!</strong>
              <p>
                Play a game and your recent activity will show
                up here.
              </p>
              <Link to="/game-selection">
                Find a game <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </section>

        <Sidebar />
      </div>
    </DashboardLayout>
  );
}

export default Dashboard;