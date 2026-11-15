import "./AuthSidePanel.css";
const PANEL_CONTENT = {
  login: {
    eyebrow: "WELCOME BACK",
    title: "Your next clever moment is waiting.",
    description:
      "Jump back into Banana Quest and keep your puzzle progress moving.",
    features: [
      "Pick up with a challenge that fits your pace.",
      "Keep your scores and streak together.",
      "Celebrate every answer, one puzzle at a time.",
    ],
    quote: "Small puzzles. Big momentum.",
    emoji: "🎯",
    accent: "sunrise",
  },
  register: {
    eyebrow: "START YOUR QUEST",
    title: "Make every puzzle a little win.",
    description:
      "Create your player profile and build a collection of bright moments.",
    features: [
      "Save your progress to your account.",
      "Explore challenges at your own pace.",
      "Watch your points and streak grow.",
    ],
    quote: "Start small. Grow bright.",
    emoji: "✨",
    accent: "launch",
  },
  recovery: {
    eyebrow: "ACCOUNT SUPPORT",
    title: "Let’s get you back to the fun.",
    description:
      "Request a password reset and return to your puzzles when you’re ready.",
    features: [
      "Use the email address linked to your account.",
      "Follow the private reset link we send you.",
      "Your saved scores will be there when you return.",
    ],
    quote: "Every return is a fresh start.",
    emoji: "🔑",
    accent: "return",
  },
};


const DECOR = {
  sunrise: ["🌅", "🍌", "⭐"],
  launch: ["🚀", "🍌", "✨"],
  return: ["🔑", "🍌", "💫"],
};

function AuthSidePanel({ variant = "login" }) {
  const content = PANEL_CONTENT[variant] || PANEL_CONTENT.login;
  const decor = DECOR[content.accent] || DECOR.sunrise;

  return (
    <aside
      className={`auth-story auth-story--${variant}`}
      aria-label={`About Banana Quest — ${variant} panel`}
    >
      {}
      <div className="auth-story__decor" aria-hidden="true">
        <span className="auth-story__decor-orb auth-story__decor-orb--1"></span>
        <span className="auth-story__decor-orb auth-story__decor-orb--2"></span>
        <span className="auth-story__decor-grid"></span>
      </div>

      {}
      <div className="auth-story__floaters" aria-hidden="true">
        {decor.map((symbol, i) => (
          <span
            key={`${symbol}-${i}`}
            className={`auth-story__floater auth-story__floater--${i + 1}`}
          >
            {symbol}
          </span>
        ))}
      </div>

      {}
      <div className="auth-story__brand">
        <span className="auth-story__brand-icon" aria-hidden="true">
          🍌
        </span>
        <span>
          <strong>Banana Quest</strong>
          <small>A LITTLE BRAIN BREAK</small>
        </span>
      </div>

      {}
      <div className="auth-story__copy">
        <p className="auth-story__eyebrow">
          <span className="auth-story__eyebrow-dot" aria-hidden="true"></span>
          {content.eyebrow}
        </p>

        <h2>{content.title}</h2>

        <p className="auth-story__description">{content.description}</p>
      </div>

      {}
      <div className="auth-story__quest" role="note">
        <span className="auth-story__quest-icon" aria-hidden="true">
          🧩
        </span>
        <span>
          <small>YOUR NEXT QUEST</small>
          <strong>Think it through. Enjoy the win.</strong>
        </span>
        <span className="auth-story__quest-arrow" aria-hidden="true">
          ↗
        </span>
      </div>

      {}
      <ul className="auth-story__features">
        {content.features.map((feature, index) => (
          <li key={feature}>
            <span aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {}
      <blockquote className="auth-story__quote">
        <span className="auth-story__quote-mark" aria-hidden="true">
          “
        </span>
        <p>{content.quote}</p>
        <cite>
          <span aria-hidden="true">{content.emoji}</span>
          Banana Quest
        </cite>
      </blockquote>

      {}
      <div className="auth-story__banana-stage" aria-hidden="true">
        <span className="auth-story__banana-halo"></span>
        <span className="auth-story__banana">🍌</span>
        <span className="auth-story__banana-shadow"></span>
      </div>

      {}
      <div className="auth-story__footer">
        <span className="auth-story__footer-line" aria-hidden="true"></span>
        A brighter way to take a brain break
      </div>
    </aside>
  );
}

export default AuthSidePanel;