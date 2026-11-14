import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./Leaderboard.css";




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

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat().format(num);
}

function getInitials(username) {
  return (
    username
      ?.trim()
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "BQ"
  );
}

function getRankTier(rank, total) {
  if (!rank || !total) return null;
  const percent = (rank / total) * 100;
  if (rank === 1) return { label: "Champion", tone: "gold" };
  if (rank <= 3) return { label: "Top 3", tone: "gold" };
  if (percent <= 10) return { label: "Top 10%", tone: "silver" };
  if (percent <= 25) return { label: "Top 25%", tone: "bronze" };
  if (percent <= 50) return { label: "Top 50%", tone: "blue" };
  return { label: "Rising", tone: "green" };
}

async function fetchEndpoint(token, path) {
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

  if (!response.ok || result?.success !== true) {
    const error = new Error(
      result?.message || "Unable to load the leaderboard."
    );
    error.status = response.status;
    throw error;
  }

  return result;
}

async function fetchLeaderboard(token) {
  const [topPlayersResult, myRankResult] = await Promise.all([
    fetchEndpoint(token, "leaderboard"),
    fetchEndpoint(token, "rank"),
  ]);

  if (
    !Array.isArray(topPlayersResult.leaderboard) ||
    !Object.prototype.hasOwnProperty.call(myRankResult, "leaderboard") ||
    (myRankResult.leaderboard !== null &&
      typeof myRankResult.leaderboard !== "object")
  ) {
    throw new Error(
      "The server returned an unexpected leaderboard response."
    );
  }

  return {
    players: topPlayersResult.leaderboard,
    myRank: myRankResult.leaderboard,
  };
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

function AnimatedPoints({ value, duration = 1000 }) {
  const display = useAnimatedNumber(Number(value) || 0, duration);
  return formatNumber(display);
}




function Podium({ players, currentUsername }) {
  if (!players || players.length < 3) return null;

  
  const podiumOrder = [players[1], players[0], players[2]];
  const positions = ["second", "first", "third"];
  const medals = ["🥈", "🥇", "🥉"];

  return (
    <div className="leaderboard__podium" aria-label="Top 3 players">
      {podiumOrder.map((player, idx) => {
        const position = positions[idx];
        const medal = medals[idx];
        const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3;
        const playerName =
          typeof player?.username === "string" &&
          player.username.trim()
            ? player.username.trim()
            : "Player";
        const isYou =
          currentUsername &&
          playerName.toLowerCase() === currentUsername;

        return (
          <div
            key={player?.userId || playerName}
            className={`leaderboard__podium-slot leaderboard__podium-slot--${position}${
              isYou ? " is-you" : ""
            }`}
            style={{
              animationDelay: `${idx * 100 + 100}ms`,
            }}
          >
            <div className="leaderboard__podium-medal" aria-hidden="true">
              {medal}
            </div>
            <div className="leaderboard__podium-avatar">
              <span>{getInitials(playerName)}</span>
              {isYou && (
                <span className="leaderboard__podium-you-badge">
                  You
                </span>
              )}
            </div>
            <strong className="leaderboard__podium-name">
              {playerName}
            </strong>
            <span className="leaderboard__podium-points">
              <AnimatedPoints value={player?.totalPoints} />{" "}
              <small>pts</small>
            </span>
            <div
              className="leaderboard__podium-pillar"
              aria-hidden="true"
            >
              <span className="leaderboard__podium-rank">
                #{rank}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}




function Leaderboard() {
  const navigate = useNavigate();

  const [players, setPlayers] = useState([]);
  const [myRank, setMyRank] = useState(null);
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
  const normalizedUsername = username.toLowerCase();

  



  useEffect(() => {
    let isCurrent = true;
    const token = window.localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return () => {
        isCurrent = false;
      };
    }

    const loadLeaderboard = async () => {
      try {
        const result = await fetchLeaderboard(token);
        if (isCurrent) {
          setPlayers(result.players);
          setMyRank(result.myRank);
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
              "Unable to load the leaderboard."
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadLeaderboard();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  



  const totalPlayers = players.length;

  const rankTier = useMemo(
    () => getRankTier(myRank?.rank, totalPlayers),
    [myRank?.rank, totalPlayers]
  );

  
  const pointsToNextRank = useMemo(() => {
    if (!myRank || !myRank.rank || myRank.rank <= 1) return null;
    const myPoints = Number(myRank.totalPoints) || 0;
    
    const aboveIndex = players.findIndex(
      (p) => Number(p.rank) === myRank.rank - 1
    );
    if (aboveIndex === -1) return null;
    const abovePoints =
      Number(players[aboveIndex]?.totalPoints) || 0;
    const gap = abovePoints - myPoints;
    return gap > 0 ? gap : null;
  }, [myRank, players]);

  const animatedMyPoints = useAnimatedNumber(
    Number(myRank?.totalPoints) || 0
  );
  const animatedMyBest = useAnimatedNumber(
    Number(myRank?.highestScore) || 0
  );
  const animatedMyGames = useAnimatedNumber(
    Number(myRank?.totalGames) || 0
  );

  



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
        className="leaderboard"
        aria-labelledby="leaderboard-title"
      >
        {}
        <header className="leaderboard__hero">
          <div
            className="leaderboard__hero-floaters"
            aria-hidden="true"
          >
            <span className="leaderboard__hero-floater leaderboard__hero-floater--1">
              🍌
            </span>
            <span className="leaderboard__hero-floater leaderboard__hero-floater--2">
              🍌
            </span>
          </div>

          <div className="leaderboard__hero-copy">
            <p className="leaderboard__eyebrow">
              A LITTLE FRIENDLY COMPETITION
            </p>
            <h1 id="leaderboard-title">Leaderboard</h1>
            <p>
              See who&apos;s making the biggest moves in Banana
              Quest.
            </p>
          </div>

          <span
            className="leaderboard__hero-trophy"
            aria-hidden="true"
          >
            <i
              className="fas fa-trophy"
              aria-hidden="true"
            ></i>
          </span>
          <span
            className="leaderboard__hero-banana"
            aria-hidden="true"
          >
            🍌
          </span>
        </header>

        {}
        {error ? (
          <div className="leaderboard__error" role="alert">
            <span
              className="leaderboard__error-icon"
              aria-hidden="true"
            >
              ⚠️
            </span>
            <span className="leaderboard__error-text">
              {error}
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="leaderboard__retry"
            >
              <i
                className="fas fa-rotate-right"
                aria-hidden="true"
              ></i>{" "}
              Try again
            </button>
          </div>
        ) : (
          <div className="leaderboard__content">
            {}
            <section
              className="leaderboard__panel"
              aria-labelledby="top-players-title"
            >
              <div className="leaderboard__panel-heading">
                <div>
                  <p className="leaderboard__eyebrow">
                    THE HIGH-SCORE CLUB
                  </p>
                  <h2 id="top-players-title">
                    All players{" "}
                    {!isLoading && totalPlayers > 0 && (
                      <span className="leaderboard__panel-count">
                        {totalPlayers}
                      </span>
                    )}
                  </h2>
                </div>
                <span className="leaderboard__panel-note">
                  Ranked by total points
                </span>
              </div>

              {isLoading ? (
                <>
                  {}
                  <div
                    className="leaderboard__podium-skeleton"
                    aria-busy="true"
                  >
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="leaderboard__podium-skeleton-slot"
                        style={{
                          animationDelay: `${i * 100}ms`,
                        }}
                      />
                    ))}
                  </div>
                  {}
                  <div
                    className="leaderboard__skeleton"
                    aria-busy="true"
                  >
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="leaderboard__skeleton-row"
                        style={{
                          animationDelay: `${i * 80}ms`,
                        }}
                      >
                        <span className="leaderboard__skeleton-rank" />
                        <span className="leaderboard__skeleton-avatar" />
                        <div className="leaderboard__skeleton-content">
                          <span className="leaderboard__skeleton-line" />
                          <span className="leaderboard__skeleton-line leaderboard__skeleton-line--short" />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : players.length > 0 ? (
                <>
                  {}
                  <Podium
                    players={players}
                    currentUsername={normalizedUsername}
                  />

                  {}
                  <ol
                    className="leaderboard__list"
                    aria-label="Player rankings"
                  >
                    {players.map((player, index) => {
                      const playerName =
                        typeof player.username === "string" &&
                        player.username.trim()
                          ? player.username.trim()
                          : "Player";
                      const isCurrentPlayer =
                        normalizedUsername &&
                        playerName.toLowerCase() ===
                          normalizedUsername;
                      const rank =
                        Number(player.rank) || index + 1;

                      return (
                        <li
                          className={`leaderboard-row${
                            isCurrentPlayer
                              ? " leaderboard-row--you"
                              : ""
                          }${
                            rank <= 3
                              ? ` leaderboard-row--top-${rank}`
                              : ""
                          }`}
                          key={player.userId || playerName}
                          style={{
                            animationDelay: `${index * 40}ms`,
                          }}
                        >
                          <span className="leaderboard-row__rank">
                            {rank === 1 ? (
                              "🥇"
                            ) : rank === 2 ? (
                              "🥈"
                            ) : rank === 3 ? (
                              "🥉"
                            ) : (
                              <span className="leaderboard-row__rank-num">
                                #{rank}
                              </span>
                            )}
                          </span>
                          <span
                            className={`leaderboard-row__avatar${
                              rank === 1
                                ? " leaderboard-row__avatar--gold"
                                : ""
                            }`}
                            aria-hidden="true"
                          >
                            {getInitials(playerName)}
                          </span>
                          <span className="leaderboard-row__player">
                            <strong>{playerName}</strong>
                            {isCurrentPlayer && (
                              <span className="leaderboard-row__you-badge">
                                <i
                                  className="fas fa-crown"
                                  aria-hidden="true"
                                ></i>{" "}
                                You
                              </span>
                            )}
                          </span>
                          <span className="leaderboard-row__games">
                            {formatNumber(player.totalGames)}{" "}
                            {Number(player.totalGames) === 1
                              ? "game"
                              : "games"}
                          </span>
                          <span className="leaderboard-row__best">
                            <span>Best</span>
                            <strong>
                              {formatNumber(player.highestScore)}
                            </strong>
                          </span>
                          <strong className="leaderboard-row__points">
                            <AnimatedPoints
                              value={player.totalPoints}
                              duration={900}
                            />
                            <span>pts</span>
                          </strong>
                        </li>
                      );
                    })}
                  </ol>
                </>
              ) : (
                <div className="leaderboard__empty">
                  <span aria-hidden="true">
                    <i
                      className="fas fa-flag-checkered"
                      aria-hidden="true"
                    ></i>
                  </span>
                  <h3>
                    The leaderboard is waiting for its first
                    champion
                  </h3>
                  <p>
                    Complete a game to see the top players and
                    claim your spot.
                  </p>
                  <Link to="/game-selection">
                    Play a game{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </section>

            {}
            <aside
              className="leaderboard__rank-card"
              aria-label="Your leaderboard rank"
            >
              <span
                className="leaderboard__rank-icon"
                aria-hidden="true"
              >
                {myRank ? (
                  <i
                    className="fas fa-medal"
                    aria-hidden="true"
                  ></i>
                ) : (
                  <i
                    className="fas fa-seedling"
                    aria-hidden="true"
                  ></i>
                )}
              </span>
              <p className="leaderboard__eyebrow">
                YOUR STANDING
              </p>

              {isLoading ? (
                <div
                  className="leaderboard__rank-skeleton"
                  aria-busy="true"
                >
                  <span className="leaderboard__rank-skeleton-line" />
                  <span className="leaderboard__rank-skeleton-line is-short" />
                  <span className="leaderboard__rank-skeleton-line is-medium" />
                </div>
              ) : myRank ? (
                <>
                  {}
                  {rankTier && (
                    <span
                      className={`leaderboard__rank-tier leaderboard__rank-tier--${rankTier.tone}`}
                    >
                      {rankTier.tone === "gold" && "🏆 "}
                      {rankTier.tone === "silver" && "🥈 "}
                      {rankTier.tone === "bronze" && "🥉 "}
                      {rankTier.tone === "blue" && "💙 "}
                      {rankTier.tone === "green" && "🌱 "}
                      {rankTier.label}
                    </span>
                  )}

                  <strong className="leaderboard__rank-number">
                    #{formatNumber(myRank.rank)}
                  </strong>
                  <span className="leaderboard__rank-caption">
                    of {formatNumber(totalPlayers)} player
                    {totalPlayers === 1 ? "" : "s"}
                  </span>

                  {}
                  {pointsToNextRank && (
                    <div className="leaderboard__rank-next">
                      <span aria-hidden="true">🎯</span>{" "}
                      <strong>
                        {formatNumber(pointsToNextRank)}
                      </strong>{" "}
                      pts to next rank
                    </div>
                  )}

                  <div className="leaderboard__rank-divider" />

                  <div className="leaderboard__rank-detail">
                    <span>Total points</span>
                    <strong>
                      {formatNumber(animatedMyPoints)}
                    </strong>
                  </div>
                  <div className="leaderboard__rank-detail">
                    <span>Personal best</span>
                    <strong>
                      {formatNumber(animatedMyBest)}
                    </strong>
                  </div>
                  <div className="leaderboard__rank-detail">
                    <span>Completed games</span>
                    <strong>
                      {formatNumber(animatedMyGames)}
                    </strong>
                  </div>

                  <Link to="/game-selection">
                    Climb the ranks{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                </>
              ) : (
                <>
                  <strong className="leaderboard__unranked-title">
                    Your journey starts here
                  </strong>
                  <p>
                    Complete your first game to earn a place on
                    the leaderboard.
                  </p>
                  <Link to="/game-selection">
                    Start a challenge{" "}
                    <span aria-hidden="true">→</span>
                  </Link>
                </>
              )}
            </aside>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default Leaderboard;