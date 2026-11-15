import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

function formatDifficulty(value) {
  if (typeof value !== "string" || !value) return "Puzzle";
  return `${value[0]}${value.slice(1).toLowerCase()}`;
}

function getRank(totalPoints) {
  const pts = Number(totalPoints) || 0;
  if (pts >= 5000) return { label: "Legend", emoji: "👑", color: "gold" };
  if (pts >= 2000) return { label: "Master", emoji: "🏆", color: "orange" };
  if (pts >= 1000) return { label: "Expert", emoji: "⭐", color: "blue" };
  if (pts >= 500) return { label: "Rising Star", emoji: "🌱", color: "green" };
  if (pts >= 100) return { label: "Apprentice", emoji: "🎓", color: "purple" };
  return { label: "Novice", emoji: "🍌", color: "yellow" };
}

function getNextMilestone(totalPoints) {
  const pts = Number(totalPoints) || 0;
  const milestones = [100, 500, 1000, 2000, 5000, 10000, 25000];
  const next = milestones.find((m) => m > pts);
  if (!next) return null;
  return {
    current: pts,
    next,
    remaining: next - pts,
    percent: Math.min(100, (pts / next) * 100),
  };
}

function getMotivationalTip(stats) {
  if (!stats.totalGames) {
    return {
      emoji: "🌱",
      text: "Start your first game and begin earning points!",
    };
  }
  if (stats.completionRate >= 80) {
    return {
      emoji: "🔥",
      text: "You're on fire! Keep that completion rate high.",
    };
  }
  if (stats.avgAccuracy >= 80) {
    return {
      emoji: "🎯",
      text: "Your accuracy is sharp — try a harder difficulty!",
    };
  }
  if (stats.failedGames > stats.completedGames) {
    return {
      emoji: "💪",
      text: "Every game is practice. Try Easy mode to build momentum.",
    };
  }
  return {
    emoji: "⭐",
    text: "Every puzzle makes you stronger. Keep going!",
  };
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
      `The server returned an unexpected response (HTTP ${response.status}).`
    );
  }

  if (!response.ok || result?.success !== true || !result.scores) {
    const error = new Error(
      result?.message || "Unable to load your score summary."
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
      `The server returned an unexpected response (HTTP ${response.status}).`
    );
  }

  if (
    !response.ok ||
    result?.success !== true ||
    !Array.isArray(result.games)
  ) {
    const error = new Error(
      result?.message || "Unable to load your recent games."
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




function AnimatedBar({ percent = 0, className = "", delay = 0 }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setWidth(Math.min(100, Math.max(0, percent)));
    }, 120 + delay);
    return () => window.clearTimeout(timer);
  }, [percent, delay]);

  return <span className={className} style={{ width: `${width}%` }} />;
}



function ScoreSummary() {
  const navigate = useNavigate();

  const [scores, setScores] = useState(null);
  const [gameHistory, setGameHistory] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const user = useMemo(readStoredUser, []);
  const username =
    typeof user.username === "string" ? user.username.trim() : "";
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
          setError(
            requestError.message || "Unable to load your score summary."
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadSummary();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  



  const totalGames = Number(scores?.totalGames) || 0;
  const completedGames = Number(scores?.completedGames) || 0;
  const failedGames = Number(scores?.failedGames) || 0;
  const activeGames = Math.max(0, totalGames - completedGames - failedGames);
  const completionRate = totalGames
    ? Math.round((completedGames / totalGames) * 100)
    : 0;

  const outcomeSegments = useMemo(
    () => [
      { key: "completed", label: "Completed", count: completedGames },
      { key: "failed", label: "Game over", count: failedGames },
      { key: "active", label: "In progress", count: activeGames },
    ],
    [completedGames, failedGames, activeGames]
  );

  const recentGames = useMemo(() => gameHistory.slice(0, 4), [gameHistory]);

  const bestGame = useMemo(
    () =>
      gameHistory.reduce(
        (best, game) =>
          best === null || Number(game.score) > Number(best.score)
            ? game
            : best,
        null
      ),
    [gameHistory]
  );

  
  const bestStreak = useMemo(() => {
    let current = 0;
    let best = 0;
    [...gameHistory]
      .sort(
        (a, b) =>
          new Date(a.endedAt || a.createdAt || a.startedAt).getTime() -
          new Date(b.endedAt || b.createdAt || b.startedAt).getTime()
      )
      .forEach((game) => {
        if (String(game.status).toUpperCase() === "COMPLETED") {
          current += 1;
          best = Math.max(best, current);
        } else {
          current = 0;
        }
      });
    return best;
  }, [gameHistory]);

  
  const recentAverage = useMemo(() => {
    const recent = gameHistory.slice(0, 3);
    if (!recent.length) return 0;
    return Math.round(
      recent.reduce((sum, g) => sum + (Number(g.score) || 0), 0) /
        recent.length
    );
  }, [gameHistory]);

  
  const onARoll = useMemo(() => {
    const recent = gameHistory.slice(0, 3);
    return (
      recent.length >= 2 &&
      recent.every((g) => String(g.status).toUpperCase() === "COMPLETED")
    );
  }, [gameHistory]);

  const rank = useMemo(
    () => getRank(scores?.totalPoints),
    [scores?.totalPoints]
  );

  const milestone = useMemo(
    () => getNextMilestone(scores?.totalPoints),
    [scores?.totalPoints]
  );

  const tip = useMemo(
    () =>
      getMotivationalTip({
        totalGames,
        completedGames,
        failedGames,
        completionRate,
        avgAccuracy: Number(scores?.averageScore) || 0,
      }),
    [totalGames, completedGames, failedGames, completionRate, scores]
  );

  
  const metrics = useMemo(
    () => [
      {
        key: "points",
        icon: "⭐",
        label: "Total points",
        value: scores?.totalPoints,
        variant: "gold",
        hint: "across all games",
      },
      {
        key: "average",
        icon: "📊",
        label: "Average score",
        value: scores?.averageScore,
        variant: "blue",
        hint: "per game",
      },
      {
        key: "best",
        icon: "🏆",
        label: "Personal best",
        value: scores?.highestScore,
        variant: "green",
        hint: "single game",
      },
      {
        key: "games",
        icon: "🎮",
        label: "Games played",
        value: scores?.totalGames,
        variant: "purple",
        hint: "total sessions",
      },
    ],
    [scores]
  );

  
  const animatedPoints = useAnimatedNumber(
    isLoading ? 0 : Number(scores?.totalPoints) || 0
  );
  const animatedAverage = useAnimatedNumber(
    isLoading ? 0 : Number(scores?.averageScore) || 0
  );
  const animatedBest = useAnimatedNumber(
    isLoading ? 0 : Number(scores?.highestScore) || 0
  );
  const animatedGames = useAnimatedNumber(isLoading ? 0 : totalGames);
  const animatedCompletionRate = useAnimatedNumber(
    isLoading ? 0 : completionRate
  );
  const animatedMilestone = useAnimatedNumber(
    isLoading ? 0 : milestone?.percent || 0
  );

  const getAnimatedValue = (key) => {
    if (key === "points") return formatNumber(animatedPoints);
    if (key === "average") return formatNumber(animatedAverage);
    if (key === "best") return formatNumber(animatedBest);
    if (key === "games") return formatNumber(animatedGames);
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
        className="score-summary"
        aria-labelledby="score-summary-title"
      >
        {}
        <header className="score-summary__hero">
          {}
          <div className="score-summary__hero-floaters" aria-hidden="true">
            <span className="score-summary__hero-floater score-summary__hero-floater--1">
              🍌
            </span>
            <span className="score-summary__hero-floater score-summary__hero-floater--2">
              🍌
            </span>
          </div>

          <div className="score-summary__hero-copy">
            <p className="score-summary__eyebrow">
              YOUR PROGRESS, IN POINTS
            </p>
            <h1 id="score-summary-title">Score summary</h1>
            <p>
              A little progress adds up. Here&apos;s how your puzzle journey
              is going.
            </p>

            {}
            {!isLoading && !error && (
              <div className={`score-summary__rank score-summary__rank--${rank.color}`}>
                <span className="score-summary__rank-emoji" aria-hidden="true">
                  {rank.emoji}
                </span>
                <span className="score-summary__rank-text">
                  <small>Your rank</small>
                  <strong>{rank.label}</strong>
                </span>
              </div>
            )}
          </div>

          {}
          <span className="score-summary__hero-icon" aria-hidden="true">
            <span className="score-summary__hero-icon-sparkle">✨</span>
          </span>

          {}
          <span className="score-summary__hero-banana" aria-hidden="true">
            🍌
          </span>
        </header>

        {}
        {error ? (
          <div className="score-summary__error" role="alert">
            <span className="score-summary__error-icon" aria-hidden="true">
              ⚠️
            </span>
            <span className="score-summary__error-text">{error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="score-summary__retry"
            >
              <i className="fas fa-rotate-right" aria-hidden="true"></i> Try
              again
            </button>
          </div>
        ) : (
          <>
            {}
            <section
              className="score-summary__metrics"
              aria-label="Score metrics"
              aria-busy={isLoading}
            >
              {metrics.map((metric, index) => (
                <article
                  key={metric.key}
                  className={`score-summary-card score-summary-card--${metric.variant}`}
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <span className="score-summary-card__icon" aria-hidden="true">
                    {metric.icon}
                  </span>
                  <div>
                    <span>{metric.label}</span>
                    <strong>
                      {isLoading ? "—" : getAnimatedValue(metric.key)}
                    </strong>
                    <small className="score-summary-card__hint">
                      {metric.hint}
                    </small>
                  </div>
                </article>
              ))}
            </section>

            {}
            {onARoll && !isLoading && (
              <div className="score-summary__on-roll" role="status">
                <span className="score-summary__on-roll-icon" aria-hidden="true">
                  🔥
                </span>
                <div className="score-summary__on-roll-text">
                  <strong>You&apos;re on a roll!</strong>
                  <span>3 games completed in a row. Keep the streak alive!</span>
                </div>
              </div>
            )}

            {}
            {milestone && !isLoading && (
              <section
                className="score-summary__milestone"
                aria-label="Next milestone"
              >
                <span className="score-summary__milestone-icon" aria-hidden="true">
                  🎯
                </span>
                <div className="score-summary__milestone-content">
                  <p className="score-summary__eyebrow">NEXT MILESTONE</p>
                  <strong>{formatNumber(milestone.next)} points</strong>
                  <span>
                    {formatNumber(milestone.remaining)} points to go
                  </span>
                </div>
                <div className="score-summary__milestone-track">
                  <AnimatedBar
                    percent={milestone.percent}
                    delay={500}
                  />
                </div>
                <span className="score-summary__milestone-percent">
                  {animatedMilestone}%
                </span>
              </section>
            )}

            {}
            {!isLoading && (
              <div className="score-summary__tip">
                <span className="score-summary__tip-emoji" aria-hidden="true">
                  {tip.emoji}
                </span>
                <p>{tip.text}</p>
              </div>
            )}

            {}
            <div className="score-summary__details">
              {}
              <section
                className="score-summary__panel"
                aria-labelledby="score-outcomes-title"
              >
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
                  <div className="score-summary__skeleton" aria-busy="true">
                    <div className="score-summary__skeleton-bar" />
                    <div className="score-summary__skeleton-legend">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="score-summary__skeleton-track" />
                  </div>
                ) : totalGames > 0 ? (
                  <>
                    <div
                      className="score-summary__bar"
                      role="img"
                      aria-label={`${completedGames} completed, ${failedGames} game over, ${activeGames} in progress`}
                    >
                      {outcomeSegments.map((segment, i) => (
                        <span
                          key={segment.key}
                          className={`score-summary__bar-segment score-summary__bar-segment--${segment.key}`}
                          style={{
                            width: `${(segment.count / totalGames) * 100}%`,
                            animationDelay: `${i * 120}ms`,
                          }}
                        />
                      ))}
                    </div>

                    <div className="score-summary__legend">
                      {outcomeSegments.map((segment) => (
                        <div
                          className="score-summary__legend-item"
                          key={segment.key}
                        >
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
                        <strong>{animatedCompletionRate}%</strong>
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
                        <AnimatedBar percent={completionRate} delay={300} />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="score-summary__empty">
                    <span aria-hidden="true">🧩</span>
                    <strong>Your first score is waiting</strong>
                    <p>
                      Finish a challenge and your score breakdown will show up
                      here.
                    </p>
                    <Link to="/game-selection">
                      Play your first game <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                )}
              </section>

              {}
              <aside
                className="score-summary__highlight"
                aria-labelledby="score-highlight-title"
              >
                <span
                  className="score-summary__highlight-icon"
                  aria-hidden="true"
                >
                  🌟
                </span>
                <p className="score-summary__eyebrow">YOUR TOP SCORE</p>
                <strong
                  className="score-summary__highlight-score"
                  id="score-highlight-title"
                >
                  {isLoading ? "—" : formatNumber(animatedBest)}
                </strong>
                <span className="score-summary__highlight-caption">
                  points in a single game
                </span>
                <div
                  className="score-summary__highlight-divider"
                  aria-hidden="true"
                />
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

            {}
            {!isLoading && totalGames > 0 && (
              <section
                className="score-summary__extra-stats"
                aria-label="Additional stats"
              >
                <div className="score-summary__extra-stat">
                  <span
                    className="score-summary__extra-stat-icon score-summary__extra-stat-icon--fire"
                    aria-hidden="true"
                  >
                    🔥
                  </span>
                  <div>
                    <small>Best streak</small>
                    <strong>{bestStreak}</strong>
                    <span>
                      {bestStreak === 1 ? "game in a row" : "games in a row"}
                    </span>
                  </div>
                </div>

                <div className="score-summary__extra-stat">
                  <span
                    className="score-summary__extra-stat-icon score-summary__extra-stat-icon--chart"
                    aria-hidden="true"
                  >
                    📈
                  </span>
                  <div>
                    <small>Recent average</small>
                    <strong>{formatNumber(recentAverage)}</strong>
                    <span>last 3 games</span>
                  </div>
                </div>

                <div className="score-summary__extra-stat">
                  <span
                    className="score-summary__extra-stat-icon score-summary__extra-stat-icon--target"
                    aria-hidden="true"
                  >
                    🎯
                  </span>
                  <div>
                    <small>Completion</small>
                    <strong>{completionRate}%</strong>
                    <span>of all games</span>
                  </div>
                </div>
              </section>
            )}

            {}
            <section
              className="score-summary__recent"
              aria-labelledby="score-recent-title"
            >
              <div className="score-summary__panel-heading">
                <div>
                  <p className="score-summary__eyebrow">LATEST ACTIVITY</p>
                  <h2 id="score-recent-title">Recent games</h2>
                </div>
                <Link to="/game-history">
                  View all <span aria-hidden="true">→</span>
                </Link>
              </div>

              {isLoading ? (
                <div className="score-summary__recent-skeleton" aria-busy="true">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="score-summary__recent-skeleton-row"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <span className="score-summary__recent-skeleton-icon" />
                      <div className="score-summary__recent-skeleton-content">
                        <span className="score-summary__recent-skeleton-line" />
                        <span className="score-summary__recent-skeleton-line score-summary__recent-skeleton-line--short" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentGames.length > 0 ? (
                <div
                  className="score-summary__recent-list"
                  aria-live="polite"
                >
                  {recentGames.map((game, index) => {
                    const status = String(
                      game.status || "active"
                    ).toLowerCase();
                    const isCompleted = status === "completed";
                    const isBest =
                      bestGame &&
                      (game._id || game.id) ===
                        (bestGame._id || bestGame.id);

                    return (
                      <article
                        key={game._id || game.id}
                        className={`score-summary__recent-item${
                          isBest ? " score-summary__recent-item--best" : ""
                        }`}
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        <span
                          className="score-summary__recent-icon"
                          aria-hidden="true"
                        >
                          {isCompleted ? "🏅" : "🧩"}
                        </span>
                        <div>
                          <strong>
                            {formatDifficulty(game.difficulty)} challenge
                            {isBest && (
                              <span className="score-summary__recent-best-badge">
                                {" "}
                                <i
                                  className="fas fa-crown"
                                  aria-hidden="true"
                                ></i>{" "}
                                Best
                              </span>
                            )}
                          </strong>
                          <span>
                            {formatDate(
                              game.endedAt ||
                                game.createdAt ||
                                game.startedAt
                            )}
                          </span>
                        </div>
                        <span
                          className={`score-summary__recent-status score-summary__recent-status--${status}`}
                        >
                          {status}
                        </span>
                        <strong className="score-summary__recent-score">
                          {formatNumber(game.score)} <small>pts</small>
                        </strong>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="score-summary__recent-empty">
                  <span aria-hidden="true">🎮</span>
                  <p>
                    Your recent scores will appear here after you play your
                    first game.
                  </p>
                  <Link to="/game-selection">
                    Play now <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}

              {bestGame && (
                <p className="score-summary__best-detail">
                  <span aria-hidden="true">🏆</span> Your personal best of{" "}
                  <strong>{formatNumber(bestGame.score)} points</strong> came
                  from a{" "}
                  {String(bestGame.difficulty || "puzzle").toLowerCase()}{" "}
                  challenge on{" "}
                  {formatDate(
                    bestGame.endedAt ||
                      bestGame.createdAt ||
                      bestGame.startedAt
                  )}
                  .
                </p>
              )}
            </section>

            {}
            <div className="score-summary__footer-link">
              <span>Want to see each game?</span>
              <Link to="/game-history">
                Browse your game history <span aria-hidden="true">→</span>
              </Link>
            </div>
          </>
        )}
      </section>
    </DashboardLayout>
  );
}

export default ScoreSummary;