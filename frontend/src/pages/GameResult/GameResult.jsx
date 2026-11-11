import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./GameResult.css";

function readStoredUser() {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "{}");
    return user && typeof user === "object" && !Array.isArray(user) ? user : {};
  } catch {
    return {};
  }
}

function formatDifficulty(difficulty) {
  return difficulty
    ? `${difficulty[0]}${difficulty.slice(1).toLowerCase()}`
    : "Puzzle";
}

function GameResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const result = location.state?.result;
  const outcome = location.state?.outcome;
  const user = readStoredUser();
  const username =
    typeof user.username === "string" ? user.username.trim() : "";
  const displayName =
    (typeof user.fullName === "string" && user.fullName.trim()) ||
    username ||
    "Player";
  const hasValidResult =
    result && ["COMPLETED", "FAILED"].includes(result.status);

  useEffect(() => {
    if (!hasValidResult) {
      navigate("/game-selection", { replace: true });
    }
  }, [hasValidResult, navigate]);

  if (!hasValidResult) return null;

  const isComplete = result.status === "COMPLETED";
  const questionsAnswered = Number(result.questionsAnswered) || 0;
  const correctAnswers = Number(result.correctAnswers) || 0;
  const accuracy = questionsAnswered
    ? Math.round((correctAnswers / questionsAnswered) * 100)
    : 0;

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
      <main className="game-result" aria-labelledby="game-result-title">
        <div
          className={`game-result__hero${isComplete ? " game-result__hero--complete" : " game-result__hero--failed"}`}
        >
          <div className="game-result__icon" aria-hidden="true">
            {isComplete ? "🏆" : "🍌"}
          </div>
          <p className="game-result__eyebrow">
            {isComplete ? "CHALLENGE COMPLETE" : "CHALLENGE OVER"}
          </p>
          <h1 id="game-result-title">
            {isComplete ? "Amazing work!" : "Nice try!"}
          </h1>
          <p className="game-result__message">
            {isComplete
              ? "You made it through every question. Keep up the great work!"
              : outcome === "TIME_EXPIRED"
                ? "You ran out of lives, but every puzzle is a chance to improve."
                : "Every puzzle is a chance to learn. Ready to try again?"}
          </p>
          <span className="game-result__difficulty">
            {formatDifficulty(result.difficulty)} challenge
          </span>
        </div>

        <section className="game-result__score-card" aria-label="Game score">
          <span className="game-result__score-icon" aria-hidden="true">⭐</span>
          <div>
            <p>Final score</p>
            <strong>{Number(result.score) || 0}</strong>
          </div>
          <span className="game-result__score-caption">points earned</span>
        </section>

        <section className="game-result__stats" aria-label="Game statistics">
          <article className="game-result__stat">
            <span className="game-result__stat-icon" aria-hidden="true">✅</span>
            <span className="game-result__stat-label">Correct answers</span>
            <strong>{correctAnswers}</strong>
          </article>
          <article className="game-result__stat">
            <span className="game-result__stat-icon" aria-hidden="true">🧩</span>
            <span className="game-result__stat-label">Questions answered</span>
            <strong>
              {questionsAnswered}
              {result.totalQuestions ? ` / ${result.totalQuestions}` : ""}
            </strong>
          </article>
          <article className="game-result__stat">
            <span className="game-result__stat-icon" aria-hidden="true">🎯</span>
            <span className="game-result__stat-label">Answer accuracy</span>
            <strong>{accuracy}%</strong>
          </article>
          <article className="game-result__stat">
            <span className="game-result__stat-icon" aria-hidden="true">❤️</span>
            <span className="game-result__stat-label">Lives remaining</span>
            <strong>{Number(result.lives) || 0}</strong>
          </article>
        </section>

        <div className="game-result__actions">
          <Link
            className="game-result__button game-result__button--primary"
            to="/game-selection"
          >
            Play again <span aria-hidden="true">→</span>
          </Link>
          <Link
            className="game-result__button game-result__button--secondary"
            to="/dashboard"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    </DashboardLayout>
  );
}

export default GameResult;
