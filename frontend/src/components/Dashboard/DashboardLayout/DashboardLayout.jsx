import { useMemo } from "react";
import { Link } from "react-router-dom";
import Navbar from "../Navbar/Navbar";
import { getDashboardBackground } from "../../../utils/settings";
import { useAppSettings } from "../../../context/useAppSettings";
import "./DashboardLayout.css";
import "../DashboardTheme.css";

const CURRENT_YEAR = new Date().getFullYear();


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

function pickDisplayName(user, fallback) {
  if (fallback) return fallback;
  return (
    user.fullName ||
    user.name ||
    user.displayName ||
    user.username ||
    ""
  );
}

function pickUsername(user, fallback) {
  if (fallback) return fallback;
  return user.username || "";
}

function pickAvatar(user) {
  const candidate =
    user.avatar ||
    user.profilePicture ||
    user.photoURL ||
    user.photo ||
    "";
  return typeof candidate === "string" ? candidate : "";
}

function resolveBackground(settings) {
  try {
    const bg = getDashboardBackground?.(settings);
    return typeof bg === "string" && bg ? bg : undefined;
  } catch {
    return undefined;
  }
}




function DashboardLayout({
  children,
  displayName,
  onLogout,
  username,
  footerVariant = "full",
}) {
  const { settings } = useAppSettings();
  const user = useMemo(readStoredUser, []);

  const safeDisplayName = pickDisplayName(user, displayName);
  const safeUsername = pickUsername(user, username);
  const avatar = pickAvatar(user);
  const background = resolveBackground(settings);

  const showFullFooter = footerVariant === "full";

  return (
    <main
      className="dashboard-page"
      data-theme={settings?.theme}
      data-text-size={settings?.textSize}
      data-reduce-motion={settings?.reduceMotion}
      style={
        background
          ? { "--dashboard-page-background": background }
          : undefined
      }
    >
      {}
      <a href="#dashboard-main" className="dashboard-skip-link">
        Skip to main content
      </a>

      <div className="dashboard-shell">
        {}
        <header className="dashboard-header-wrap">
          <Navbar
            displayName={safeDisplayName}
            username={safeUsername}
            avatar={avatar}
            onLogout={onLogout}
          />
        </header>

        {}
        <div
          id="dashboard-main"
          className="dashboard-layout-main"
          tabIndex={-1}
        >
          {children}
        </div>

        {}
        <footer className="dashboard-footer">
          {}
          <div className="dashboard-footer__floating" aria-hidden="true">
            <span className="dashboard-footer__floating-banana dashboard-footer__floating-banana--1">
              🍌
            </span>
            <span className="dashboard-footer__floating-banana dashboard-footer__floating-banana--2">
              🍌
            </span>
            <span className="dashboard-footer__floating-banana dashboard-footer__floating-banana--3">
              🍌
            </span>
            <span className="dashboard-footer__floating-banana dashboard-footer__floating-banana--4">
              🍌
            </span>
          </div>

          <div className="dashboard-footer__main">
            {}
            <div className="dashboard-footer__about">
              <Link
                className="dashboard-footer__brand"
                to="/dashboard"
                aria-label="Banana Quest home"
              >
                <span
                  className="dashboard-footer__logo"
                  aria-hidden="true"
                >
                  <span className="dashboard-footer__logo-banana">
                    🍌
                  </span>
                </span>
                <span>
                  banana<span>quest</span>
                </span>
              </Link>
              <p className="dashboard-footer__tagline-strong">
                Small puzzles. Big brain energy.
              </p>
              <span className="dashboard-footer__tagline">
                Made for curious minds and lifelong learners.
              </span>
            </div>

            {}
            <nav
              className="dashboard-footer__nav"
              aria-label="Explore Banana Quest"
            >
              <strong>Explore</strong>
              <Link to="/game-selection">
                <span
                  className="dashboard-footer__nav-icon"
                  aria-hidden="true"
                >
                  🎮
                </span>
                Play a game
              </Link>
              <Link to="/game-history">
                <span
                  className="dashboard-footer__nav-icon"
                  aria-hidden="true"
                >
                  📜
                </span>
                Game history
              </Link>
              <Link to="/leaderboard">
                <span
                  className="dashboard-footer__nav-icon"
                  aria-hidden="true"
                >
                  🏆
                </span>
                Leaderboard
              </Link>
            </nav>

            {}
            <nav
              className="dashboard-footer__nav"
              aria-label="Account links"
            >
              <strong>Your account</strong>
              <Link to="/profile">
                <span
                  className="dashboard-footer__nav-icon"
                  aria-hidden="true"
                >
                  👤
                </span>
                Profile &amp; privacy
              </Link>
              <Link to="/settings">
                <span
                  className="dashboard-footer__nav-icon"
                  aria-hidden="true"
                >
                  ⚙️
                </span>
                Settings
              </Link>
              <Link to="/change-password">
                <span
                  className="dashboard-footer__nav-icon"
                  aria-hidden="true"
                >
                  🔒
                </span>
                Password &amp; security
              </Link>
            </nav>

            {}
            {showFullFooter && (
              <div className="dashboard-footer__cta">
                <span
                  className="dashboard-footer__cta-banana"
                  aria-hidden="true"
                >
                  🍌
                </span>
                <div
                  className="dashboard-footer__cta-icon"
                  aria-hidden="true"
                >
                  <span className="dashboard-footer__cta-sparkle">
                    ✨
                  </span>
                </div>
                <strong>Ready for another round?</strong>
                <p>Your next high score is one puzzle away.</p>
                <Link
                  to="/game-selection"
                  className="dashboard-footer__cta-link"
                >
                  Start a challenge{" "}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>

          {}
          <div className="dashboard-footer__bottom">
            <span className="dashboard-footer__bottom-brand">
              <span aria-hidden="true">🍌</span>
              © {CURRENT_YEAR} Banana Quest
            </span>
            <span className="dashboard-footer__bottom-status">
              {safeUsername ? (
                <>
                  Signed in as <strong>@{safeUsername}</strong>
                </>
              ) : (
                "Thanks for playing"
              )}
            </span>
            <Link
              to="/settings"
              className="dashboard-footer__bottom-link"
            >
              Privacy &amp; settings
            </Link>
            <span
              className="dashboard-footer__walker"
              aria-hidden="true"
            >
              🍌
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default DashboardLayout;