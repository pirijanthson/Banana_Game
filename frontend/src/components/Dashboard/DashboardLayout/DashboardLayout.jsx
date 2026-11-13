import { Link } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import { getDashboardBackground } from "../../../utils/settings";
import { useAppSettings } from "../../../context/useAppSettings";
import "./DashboardLayout.css";
import "../DashboardTheme.css";

const CURRENT_YEAR = new Date().getFullYear();

function readStoredUser() {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "{}");
    return user && typeof user === "object" && !Array.isArray(user) ? user : {};
  } catch {
    return {};
  }
}

function DashboardLayout({ children, displayName, onLogout, username }) {
  const { settings } = useAppSettings();
  const user = readStoredUser();
  const avatar = user.avatar || user.profilePicture;
  return (
    <main
      className="dashboard-page"
      data-theme={settings.theme}
      data-text-size={settings.textSize}
      data-reduce-motion={settings.reduceMotion}
      style={{ "--dashboard-page-background": getDashboardBackground(settings) }}
    >
      <div className="dashboard-shell">
        <Navbar
          displayName={displayName}
          username={username}
          avatar={avatar}
          onLogout={onLogout}
        />
        <div className="dashboard-layout-main">{children}</div>
        <footer className="dashboard-footer">
          <div className="dashboard-footer__main">
            <div className="dashboard-footer__about">
              <Link className="dashboard-footer__brand" to="/dashboard">
                <span className="dashboard-footer__logo" aria-hidden="true">🍌</span>
                <span>banana<span>quest</span></span>
              </Link>
              <p>Small puzzles. Big brain energy.</p>
              <span className="dashboard-footer__tagline">
                Made for curious minds and lifelong learners.
              </span>
            </div>

            <nav className="dashboard-footer__nav" aria-label="Explore Banana Quest">
              <strong>Explore</strong>
              <Link to="/game-selection">Play a game</Link>
              <Link to="/game-history">Game history</Link>
              <Link to="/leaderboard">Leaderboard</Link>
            </nav>

            <nav className="dashboard-footer__nav" aria-label="Account links">
              <strong>Your account</strong>
              <Link to="/profile">Profile &amp; privacy</Link>
              <Link to="/settings">Settings</Link>
              <Link to="/change-password">Password &amp; security</Link>
            </nav>

            <div className="dashboard-footer__cta">
              <span aria-hidden="true">✨</span>
              <strong>Ready for another round?</strong>
              <p>Your next high score is one puzzle away.</p>
              <Link to="/game-selection">
                Start a challenge <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
          <div className="dashboard-footer__bottom">
            <span>© {CURRENT_YEAR} Banana Quest</span>
            <span>{username ? `Signed in as @${username}` : "Thanks for playing"} <span aria-hidden="true">🍌</span></span>
            <Link to="/settings">Privacy &amp; settings</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default DashboardLayout;
