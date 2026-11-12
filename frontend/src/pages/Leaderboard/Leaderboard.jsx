import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./Leaderboard.css";

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

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
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

async function fetchEndpoint(token, path) {
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

  if (!response.ok || result?.success !== true) {
    const error = new Error(
      result?.message || "Unable to load the leaderboard.",
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
    throw new Error("The server returned an unexpected leaderboard response.");
  }

  return {
    players: topPlayersResult.leaderboard,
    myRank: myRankResult.leaderboard,
  };
}

function Leaderboard() {
  const navigate = useNavigate();
  const [players, setPlayers] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const user = readStoredUser();
  const username = typeof user.username === "string" ? user.username.trim() : "";
  const displayName =
    (typeof user.fullName === "string" && user.fullName.trim()) ||
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
          setError(requestError.message || "Unable to load the leaderboard.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadLeaderboard();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section className="leaderboard" aria-labelledby="leaderboard-title">
        <header className="leaderboard__hero">
          <div className="leaderboard__hero-copy">
            <p className="leaderboard__eyebrow">A LITTLE FRIENDLY COMPETITION</p>
            <h1 id="leaderboard-title">Leaderboard</h1>
            <p>See who’s making the biggest moves in Banana Quest.</p>
          </div>
          <span className="leaderboard__hero-trophy" aria-hidden="true">🏆</span>
          <span className="leaderboard__hero-banana" aria-hidden="true">🍌</span>
        </header>

        {error ? (
          <div className="leaderboard__error" role="alert">
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
          <div className="leaderboard__content">
            <section className="leaderboard__panel" aria-labelledby="top-players-title">
              <div className="leaderboard__panel-heading">
                <div>
                  <p className="leaderboard__eyebrow">THE HIGH-SCORE CLUB</p>
                  <h2 id="top-players-title">All players</h2>
                </div>
                <span className="leaderboard__panel-note">Ranked by total points</span>
              </div>

              {isLoading ? (
                <div className="leaderboard__message" role="status">
                  <span className="leaderboard__loader" aria-hidden="true" />
                  Loading the leaderboard…
                </div>
              ) : players.length > 0 ? (
                <ol className="leaderboard__list" aria-label="Player rankings">
                  {players.map((player, index) => {
                    const playerName =
                      typeof player.username === "string" && player.username.trim()
                        ? player.username.trim()
                        : "Player";
                    const isCurrentPlayer =
                      normalizedUsername &&
                      playerName.toLowerCase() === normalizedUsername;
                    const rank = Number(player.rank) || index + 1;

                    return (
                      <li
                        className={`leaderboard-row${isCurrentPlayer ? " leaderboard-row--you" : ""}${rank <= 3 ? ` leaderboard-row--top-${rank}` : ""}`}
                        key={player.userId || playerName}
                      >
                        <span className="leaderboard-row__rank">
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                        </span>
                        <span className={`leaderboard-row__avatar${rank === 1 ? " leaderboard-row__avatar--gold" : ""}`} aria-hidden="true">
                          {getInitials(playerName)}
                        </span>
                        <span className="leaderboard-row__player">
                          <strong>{playerName}</strong>
                          {isCurrentPlayer && <span>You</span>}
                        </span>
                        <span className="leaderboard-row__games">
                          {formatNumber(player.totalGames)}{" "}
                          {Number(player.totalGames) === 1 ? "game" : "games"}
                        </span>
                        <span className="leaderboard-row__best">
                          <span>Best</span>
                          <strong>{formatNumber(player.highestScore)}</strong>
                        </span>
                        <strong className="leaderboard-row__points">
                          {formatNumber(player.totalPoints)}
                          <span>pts</span>
                        </strong>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="leaderboard__empty">
                  <span aria-hidden="true">🏁</span>
                  <h3>The leaderboard is waiting for its first champion</h3>
                  <p>Complete a game to see the top players and claim your spot.</p>
                  <Link to="/game-selection">
                    Play a game <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </section>

            <aside className="leaderboard__rank-card" aria-label="Your leaderboard rank">
              <span className="leaderboard__rank-icon" aria-hidden="true">
                {myRank ? "🎖️" : "🌱"}
              </span>
              <p className="leaderboard__eyebrow">YOUR STANDING</p>
              {isLoading ? (
                <div className="leaderboard__rank-loading" role="status">
                  Checking your rank…
                </div>
              ) : myRank ? (
                <>
                  <strong className="leaderboard__rank-number">#{formatNumber(myRank.rank)}</strong>
                  <span className="leaderboard__rank-caption">on the leaderboard</span>
                  <div className="leaderboard__rank-divider" />
                  <div className="leaderboard__rank-detail">
                    <span>Total points</span>
                    <strong>{formatNumber(myRank.totalPoints)}</strong>
                  </div>
                  <div className="leaderboard__rank-detail">
                    <span>Personal best</span>
                    <strong>{formatNumber(myRank.highestScore)}</strong>
                  </div>
                  <div className="leaderboard__rank-detail">
                    <span>Completed games</span>
                    <strong>{formatNumber(myRank.totalGames)}</strong>
                  </div>
                  <Link to="/game-selection">
                    Climb the ranks <span aria-hidden="true">→</span>
                  </Link>
                </>
              ) : (
                <>
                  <strong className="leaderboard__unranked-title">
                    Your journey starts here
                  </strong>
                  <p>
                    Complete your first game to earn a place on the leaderboard.
                  </p>
                  <Link to="/game-selection">
                    Start a challenge <span aria-hidden="true">→</span>
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
