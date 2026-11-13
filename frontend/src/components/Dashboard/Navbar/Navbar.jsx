import { NavLink, Link } from "react-router-dom";
import "./Navbar.css";

const navigationItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Game history", to: "/game-history" },
  { label: "Score summary", to: "/score-summary" },
  { label: "Score statistics", to: "/score-statistics" },
  { label: "Leaderboard", to: "/leaderboard" },
];

function getInitials(name) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "BQ"
  );
}

function Navbar({ displayName, avatar, onLogout }) {
  return (
    <header className="dashboard-header">
      <Link className="dashboard-brand" to="/dashboard" aria-label="Banana Quest home">
        <span className="dashboard-brand__icon" aria-hidden="true">🍌</span>
        <span>banana<span>quest</span></span>
      </Link>

      <nav className="dashboard-nav" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => (isActive ? "is-active" : "")}
            aria-label={item.label}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="dashboard-account">
        <Link className="dashboard-avatar" to="/profile" aria-label="Your profile">
          {avatar ? (
            <img
              className="dashboard-avatar__image"
              src={avatar}
              alt=""
              aria-hidden="true"
            />
          ) : (
            getInitials(displayName)
          )}
        </Link>
        <button
          type="button"
          className="dashboard-logout"
          onClick={onLogout}
        >
          Log out
        </button>
      </div>
    </header>
  );
}

export default Navbar;
