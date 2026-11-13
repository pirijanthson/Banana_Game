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
        <Navbar displayName={displayName} avatar={avatar} onLogout={onLogout} />
        <div className="dashboard-layout-main">{children}</div>
        <footer className="dashboard-footer">
          <div className="dashboard-footer__main">
            <Link className="dashboard-footer__brand" to="/dashboard">
              <span aria-hidden="true">🍌</span>
              <span>banana<span>quest</span></span>
            </Link>
            <p>Made for curious minds</p>
            <nav className="dashboard-footer__nav" aria-label="Footer navigation">
              <Link to="/game-selection">Play</Link>
              <Link to="/game-history">Game history</Link>
              <Link to="/leaderboard">Leaderboard</Link>
              <Link to="/profile">Profile</Link>
              <Link to="/settings">Settings</Link>
            </nav>
          </div>
          <div className="dashboard-footer__bottom">
            <span>© {CURRENT_YEAR} Banana Quest</span>
            <span>
              {username ? `Playing as @${username}` : "Thanks for playing"}
              <span aria-hidden="true"> 🍌</span>
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default DashboardLayout;
