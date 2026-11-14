import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import { playGameSound } from "../../utils/gameSounds";
import "./GameResult.css";




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

function formatDifficulty(difficulty) {
  return difficulty
    ? `${difficulty[0]}${difficulty.slice(1).toLowerCase()}`
    : "Puzzle";
}

function readSoundVolume() {
  try {
    const s = JSON.parse(
      window.localStorage.getItem("settings") || "{}"
    );
    const v = Number(s.soundVolume);
    return Number.isFinite(v) && v > 0 ? v : 80;
  } catch {
    return 80;
  }
}

function readSoundEnabled() {
  try {
    const s = JSON.parse(
      window.localStorage.getItem("settings") || "{}"
    );
    return s.soundEnabled !== false && s.soundEffects !== false;
  } catch {
    return true;
  }
}




function useAnimatedNumber(target, duration = 1200) {
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




function useParticleCanvas(isActive, type = "confetti") {
  const canvasRef = useRef(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isActive || firedRef.current) return undefined;
    firedRef.current = true;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;

    const COLORS = [
      "#ffd93d",
      "#f4b400",
      "#e8a91a",
      "#ff8c42",
      "#84cc16",
      "#4ade80",
      "#f472b6",
    ];

    const particles = [];

    if (type === "confetti") {
      for (let i = 0; i < 120; i++) {
        const fromLeft = i % 2 === 0;
        particles.push({
          x: fromLeft ? W * 0.15 : W * 0.85,
          y: H * 0.35,
          vx: (fromLeft ? 1 : -1) * (Math.random() * 8 + 2),
          vy: -(Math.random() * 12 + 4),
          gravity: 0.35,
          friction: 0.995,
          size: Math.random() * 8 + 4,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.4,
          color:
            COLORS[Math.floor(Math.random() * COLORS.length)],
          opacity: 1,
          shape: Math.random() > 0.5 ? "rect" : "circle",
        });
      }
    } else if (type === "stars") {
      for (let i = 0; i < 40; i++) {
        particles.push({
          x: Math.random() * W,
          y: -20 - Math.random() * H * 0.5,
          vy: Math.random() * 2 + 1.5,
          vx: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 16 + 10,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.08,
          opacity: 0.4 + Math.random() * 0.5,
          emoji: "⭐",
        });
      }
    } else if (type === "bananas") {
      for (let i = 0; i < 15; i++) {
        particles.push({
          x: Math.random() * W,
          y: -30 - Math.random() * H * 0.5,
          vy: Math.random() * 1.2 + 0.8,
          vx: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 20 + 16,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.05,
          opacity: 0.3 + Math.random() * 0.3,
          emoji: "🍌",
        });
      }
    } else if (type === "particles") {
      for (let i = 0; i < 30; i++) {
        particles.push({
          x: Math.random() * W,
          y: H + Math.random() * H * 0.3,
          vy: -(Math.random() * 1.5 + 0.5),
          vx: (Math.random() - 0.5) * 0.4,
          size: Math.random() * 3 + 1,
          rotation: 0,
          rotationSpeed: 0,
          color:
            COLORS[Math.floor(Math.random() * COLORS.length)],
          opacity: 0.3 + Math.random() * 0.4,
        });
      }
    }

    let animationFrame;
    const startTime = performance.now();
    const DURATION = type === "confetti" ? 3200 : 6000;

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = elapsed / DURATION;

      ctx.clearRect(0, 0, W, H);

      let aliveCount = 0;

      particles.forEach((p) => {
        if (type === "confetti") {
          p.vy += p.gravity;
          p.vx *= p.friction;
          p.vy *= p.friction;
          p.x += p.vx;
          p.y += p.vy;
          p.rotation += p.rotationSpeed;

          if (progress > 0.6) {
            p.opacity = Math.max(
              0,
              1 - (progress - 0.6) / 0.4
            );
          }

          if (p.y < H + 40 && p.opacity > 0) {
            aliveCount++;
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.fillStyle = p.color;

            if (p.shape === "rect") {
              ctx.fillRect(
                -p.size / 2,
                -p.size / 2,
                p.size,
                p.size * 0.6
              );
            } else {
              ctx.beginPath();
              ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
              ctx.fill();
            }

            ctx.restore();
          }
        } else if (
          type === "stars" ||
          type === "bananas"
        ) {
          p.y += p.vy;
          p.x += p.vx;
          p.rotation += p.rotationSpeed;

          if (progress > 0.7) {
            p.opacity = Math.max(
              0,
              p.opacity - 0.01
            );
          }

          if (p.y < H + 40 && p.opacity > 0) {
            aliveCount++;
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);
            ctx.font = `${p.size}px serif`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(p.emoji, 0, 0);
            ctx.restore();
          }
        } else if (type === "particles") {
          p.y += p.vy;
          p.x += p.vx;

          if (progress > 0.7) {
            p.opacity = Math.max(
              0,
              p.opacity - 0.008
            );
          }

          if (p.y > -20 && p.opacity > 0) {
            aliveCount++;
            ctx.save();
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      });

      if (progress < 1 && aliveCount > 0) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        ctx.clearRect(0, 0, W, H);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      ctx.clearRect(0, 0, W, H);
    };
  }, [isActive, type]);

  return canvasRef;
}




function GameResult() {
  const location = useLocation();
  const navigate = useNavigate();

  const result = location.state?.result;
  const outcome = location.state?.outcome;

  const user = useMemo(readStoredUser, []);
  const soundVolume = useMemo(readSoundVolume, []);
  const soundEnabled = useMemo(readSoundEnabled, []);

  const username =
    typeof user.username === "string"
      ? user.username.trim()
      : "";

  const displayName =
    (typeof user.fullName === "string" &&
      user.fullName.trim()) ||
    username ||
    "Player";

  const hasValidResult =
    result &&
    ["COMPLETED", "FAILED"].includes(result.status);

  const isComplete = result?.status === "COMPLETED";

  const questionsAnswered =
    Number(result?.questionsAnswered) || 0;
  const correctAnswers =
    Number(result?.correctAnswers ?? result?.correct ?? 0) || 0;
  const accuracy = questionsAnswered
    ? Math.round((correctAnswers / questionsAnswered) * 100)
    : 0;
  const finalScore = Number(result?.score) || 0;

  
  const confettiRef = useParticleCanvas(
    isComplete && hasValidResult,
    "confetti"
  );
  const starsRef = useParticleCanvas(
    hasValidResult,
    "stars"
  );
  const bananasRef = useParticleCanvas(
    isComplete && hasValidResult,
    "bananas"
  );
  const particlesRef = useParticleCanvas(
    hasValidResult,
    "particles"
  );

  
  const animatedScore = useAnimatedNumber(finalScore, 1400);
  const animatedCorrect = useAnimatedNumber(
    correctAnswers,
    1000
  );
  const animatedQuestions = useAnimatedNumber(
    questionsAnswered,
    1000
  );
  const animatedAccuracy = useAnimatedNumber(accuracy, 1400);
  const animatedLives = useAnimatedNumber(
    Number(result?.lives) || 0,
    800
  );

  
  useEffect(() => {
    if (!hasValidResult || !soundEnabled) return;
    const timer = window.setTimeout(() => {
      playGameSound(
        isComplete ? "VICTORY" : "GAME_OVER",
        soundVolume
      );
    }, 300);
    return () => window.clearTimeout(timer);
  }, [hasValidResult, isComplete, soundEnabled, soundVolume]);

  
  useEffect(() => {
    if (!hasValidResult) {
      navigate("/game-selection", { replace: true });
    }
  }, [hasValidResult, navigate]);

  if (!hasValidResult) return null;

  
  const performance = (() => {
    if (!isComplete) return "failed";
    if (accuracy >= 90) return "perfect";
    if (accuracy >= 70) return "great";
    if (accuracy >= 50) return "good";
    return "ok";
  })();

  const meta = {
    perfect: {
      icon: "🏆",
      eyebrow: "PERFECT RUN",
      title: "Outstanding!",
      message:
        "Flawless execution. You're a banana puzzle master! 🍌",
    },
    great: {
      icon: "🎉",
      eyebrow: "CHALLENGE COMPLETE",
      title: "Amazing work!",
      message:
        "You made it through every question with style.",
    },
    good: {
      icon: "⭐",
      eyebrow: "CHALLENGE COMPLETE",
      title: "Well done!",
      message:
        "Solid run! A little more practice and you'll ace it.",
    },
    ok: {
      icon: "🍌",
      eyebrow: "CHALLENGE COMPLETE",
      title: "You did it!",
      message:
        "Every puzzle is a step forward. Nice work!",
    },
    failed: {
      icon: "🍌",
      eyebrow: "CHALLENGE OVER",
      title: "Nice try!",
      message:
        outcome === "TIME_EXPIRED"
          ? "You ran out of lives, but every puzzle is a chance to improve."
          : "Every puzzle is a chance to learn. Ready to try again?",
    },
  }[performance];

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
      <main
        className={`game-result game-result--${performance}`}
        aria-labelledby="game-result-title"
      >
        {}
        <canvas
          ref={particlesRef}
          className="game-result__particles"
          aria-hidden="true"
        />

        {}
        {isComplete && (
          <canvas
            ref={confettiRef}
            className="game-result__confetti"
            aria-hidden="true"
          />
        )}

        {}
        <canvas
          ref={starsRef}
          className="game-result__stars"
          aria-hidden="true"
        />

        {}
        {isComplete && (
          <canvas
            ref={bananasRef}
            className="game-result__bananas"
            aria-hidden="true"
          />
        )}

        {}
        <div
          className={`game-result__hero game-result__hero--${performance}`}
        >
          <div
            className="game-result__icon"
            aria-hidden="true"
          >
            <span className="game-result__icon-emoji">
              {meta.icon}
            </span>
            <span className="game-result__icon-shimmer" />
          </div>

          <p className="game-result__eyebrow">
            {meta.eyebrow}
          </p>
          <h1 id="game-result-title">{meta.title}</h1>
          <p className="game-result__message">{meta.message}</p>
          <span className="game-result__difficulty">
            {formatDifficulty(result.difficulty)} challenge
          </span>
        </div>

        {}
        <section
          className="game-result__score-card"
          aria-label="Game score"
          aria-live="polite"
        >
          <span
            className="game-result__score-icon"
            aria-hidden="true"
          >
            <i
              className="fas fa-star"
              aria-hidden="true"
            ></i>
          </span>
          <div className="game-result__score-content">
            <p>Final score</p>
            <strong className="game-result__score-value">
              {animatedScore}
            </strong>
          </div>
          <span className="game-result__score-caption">
            points earned
          </span>
        </section>

        {}
        <section
          className="game-result__stats"
          aria-label="Game statistics"
        >
          <article
            className="game-result__stat"
            style={{ animationDelay: "0ms" }}
          >
            <span
              className="game-result__stat-icon game-result__stat-icon--green"
              aria-hidden="true"
            >
              <i
                className="fas fa-check-circle"
                aria-hidden="true"
              ></i>
            </span>
            <span className="game-result__stat-label">
              Correct answers
            </span>
            <strong>{animatedCorrect}</strong>
          </article>

          <article
            className="game-result__stat"
            style={{ animationDelay: "80ms" }}
          >
            <span
              className="game-result__stat-icon game-result__stat-icon--blue"
              aria-hidden="true"
            >
              <i
                className="fas fa-puzzle-piece"
                aria-hidden="true"
              ></i>
            </span>
            <span className="game-result__stat-label">
              Questions answered
            </span>
            <strong>
              {animatedQuestions}
              {result.totalQuestions
                ? ` / ${result.totalQuestions}`
                : ""}
            </strong>
          </article>

          <article
            className="game-result__stat game-result__stat--ring"
            style={{ animationDelay: "160ms" }}
          >
            <div className="game-result__stat-ring-wrap">
              <svg
                className="game-result__stat-ring"
                viewBox="0 0 44 44"
                aria-hidden="true"
              >
                <circle
                  className="game-result__stat-ring-bg"
                  cx="22"
                  cy="22"
                  r="18"
                />
                <circle
                  className="game-result__stat-ring-fg"
                  cx="22"
                  cy="22"
                  r="18"
                  strokeDasharray={2 * Math.PI * 18}
                  strokeDashoffset={
                    2 * Math.PI * 18 * (1 - accuracy / 100)
                  }
                />
              </svg>
              <span className="game-result__stat-ring-icon">
                <i
                  className="fas fa-bullseye"
                  aria-hidden="true"
                ></i>
              </span>
            </div>
            <span className="game-result__stat-label">
              Answer accuracy
            </span>
            <strong>{animatedAccuracy}%</strong>
          </article>

          <article
            className="game-result__stat"
            style={{ animationDelay: "240ms" }}
          >
            <span
              className="game-result__stat-icon game-result__stat-icon--red"
              aria-hidden="true"
            >
              <i
                className="fas fa-heart"
                aria-hidden="true"
              ></i>
            </span>
            <span className="game-result__stat-label">
              Lives remaining
            </span>
            <strong>{animatedLives}</strong>
          </article>
        </section>

        {}
        <div className="game-result__actions">
          <Link
            className="game-result__button game-result__button--primary"
            to="/game-selection"
          >
            <span className="game-result__button-shine" />
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