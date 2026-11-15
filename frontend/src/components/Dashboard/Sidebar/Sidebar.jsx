import { Link } from "react-router-dom";
import "./Sidebar.css";

const QUICK_LINKS = [
  { to: "/leaderboard", icon: "🏅", label: "Leaderboard" },
  { to: "/profile", icon: "👤", label: "Your profile" },
  { to: "/settings", icon: "⚙️", label: "Settings" },
];

function Sidebar() {
  return (
    <aside
      className="dashboard-side-column"
      aria-label="More ways to play"
    >
      {}
      <section className="dashboard-promo">
        {}
        <div className="dashboard-promo__floaters" aria-hidden="true">
          <span className="dashboard-promo__floater dashboard-promo__floater--1">
            🍌
          </span>
          <span className="dashboard-promo__floater dashboard-promo__floater--2">
            🍌
          </span>
          <span className="dashboard-promo__floater dashboard-promo__floater--3">
            🍌
          </span>
        </div>

        <span
          className="dashboard-promo__icon"
          aria-hidden="true"
        >
          <span className="dashboard-promo__icon-sparkle">🌟</span>
        </span>

        <p className="dashboard-eyebrow">A LITTLE CHALLENGE</p>

        <h2>Every puzzle is a chance to shine.</h2>

        <p>
          Choose your difficulty and see how many bananas you
          can earn.
        </p>

        <Link
          to="/game-selection"
          className="dashboard-promo__cta"
        >
          Pick your challenge{" "}
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      {}
      <section className="dashboard-panel dashboard-quick-links">
        <p className="dashboard-eyebrow">YOUR SPACE</p>
        <h2>Quick links</h2>

        <nav
          className="dashboard-quick-links__list"
          aria-label="Quick links"
        >
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="dashboard-quick-links__link"
            >
              <span
                className="dashboard-quick-links__icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>
              <span className="dashboard-quick-links__label">
                {item.label}
              </span>
              <span
                className="dashboard-quick-links__arrow"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          ))}
        </nav>
      </section>
    </aside>
  );
}

export default Sidebar;