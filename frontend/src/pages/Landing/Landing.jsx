import { Link } from "react-router-dom";
import "./Landing.css";

const features = [
  {
    icon: "🍌",
    title: "Banana puzzle challenges",
    text: "Solve quick, engaging questions with a playful arcade rhythm that keeps each round exciting.",
  },
  {
    icon: "🏆",
    title: "Climb the leaderboard",
    text: "Track your scores, compare with friends, and chase a stronger streak every day.",
  },
  {
    icon: "📈",
    title: "Progress that sticks",
    text: "Review your performance, study your stats, and keep improving with every challenge.",
  },
];

const steps = [
  {
    number: "01",
    title: "Pick a challenge",
    text: "Choose your difficulty and jump into a game mode that fits your energy.",
  },
  {
    number: "02",
    title: "Solve and score",
    text: "Answer quickly, build momentum, and collect points with each correct move.",
  },
  {
    number: "03",
    title: "Track your growth",
    text: "Keep tabs on your streak, stats, and leaderboard position as you improve.",
  },
];

function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header__brand">
          <span className="landing-header__logo" aria-hidden="true">🍌</span>
          <span>Banana Quest</span>
        </div>

        <nav className="landing-header__nav" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#leaderboard">Leaderboard</a>
        </nav>

        <div className="landing-header__actions">
          <Link to="/login" className="landing-header__link">
            Log in
          </Link>
          <Link to="/register" className="landing-header__button">
            Sign up
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero__copy">
            <span className="landing-tag">Fast. Fun. Addictive.</span>
            <h1>Turn every banana challenge into your next big win.</h1>
            <p>
              Banana Quest blends quick puzzle gameplay, streak tracking, and leaderboard energy
              into one vibrant experience built to keep you playing.
            </p>

            <div className="landing-hero__actions">
              <Link to="/register" className="landing-primary-button">
                Start playing
              </Link>
              <Link to="/login" className="landing-secondary-button">
                Already a player?
              </Link>
            </div>

            <div className="landing-hero__stats" aria-label="Game stats overview">
              <div>
                <strong>12k+</strong>
                <span>Players</span>
              </div>
              <div>
                <strong>4.9/5</strong>
                <span>Average vibe</span>
              </div>
              <div>
                <strong>7-day</strong>
                <span>Streaks</span>
              </div>
            </div>
          </div>

          <div className="landing-hero__visual" aria-label="Banana Quest summary card">
            <div className="landing-card landing-card--highlight">
              <div className="landing-card__topline">
                <span className="landing-card__badge">Live challenge</span>
                <span className="landing-card__score">+320 pts</span>
              </div>

              <h2>Daily banana rush</h2>

              <div className="landing-card__meter">
                <span></span>
              </div>

              <div className="landing-card__meta">
                <div>
                  <strong>12</strong>
                  <span>Correct</span>
                </div>
                <div>
                  <strong>8s</strong>
                  <span>Fastest</span>
                </div>
              </div>
            </div>

            <div className="landing-mini-card landing-mini-card--top">
              <span>🔥</span>
              <div>
                <strong>7-day streak</strong>
                <small>Keep your momentum alive</small>
              </div>
            </div>

            <div className="landing-mini-card landing-mini-card--bottom">
              <span>🏆</span>
              <div>
                <strong>#42 rank</strong>
                <small>Top 10% globally</small>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="landing-section">
          <div className="landing-section__heading">
            <span className="landing-tag">Why players love it</span>
            <h2>Built for quick wins and long-term progress.</h2>
          </div>

          <div className="landing-features">
            {features.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <span className="landing-feature-card__icon" aria-hidden="true">
                  {feature.icon}
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-section--muted">
          <div className="landing-section__heading">
            <span className="landing-tag">How it works</span>
            <h2>Three simple steps to start your streak.</h2>
          </div>

          <div className="landing-steps">
            {steps.map((step) => (
              <article key={step.number} className="landing-step-card">
                <span className="landing-step-card__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="leaderboard" className="landing-cta">
          <div>
            <span className="landing-tag">Ready to play?</span>
            <h2>Jump in and start chasing your best score today.</h2>
          </div>

          <div className="landing-cta__actions">
            <Link to="/register" className="landing-primary-button">
              Create account
            </Link>
            <Link to="/login" className="landing-secondary-button">
              I have an account
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Landing;
