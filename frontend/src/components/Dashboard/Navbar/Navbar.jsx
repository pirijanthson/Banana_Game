import { useEffect, useRef, useState } from "react";
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

function Navbar({ displayName, username, avatar, onLogout }) {
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const logoutDialogRef = useRef(null);

  useEffect(() => {
    const dialog = logoutDialogRef.current;
    if (!dialog) {
      return;
    }

    if (isLogoutDialogOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isLogoutDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [isLogoutDialogOpen]);

  return (
    <>
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
          <Link
            className="dashboard-profile-link"
            to="/profile"
            aria-label={`Profile${displayName ? ` for ${displayName}` : ""}`}
          >
            <span className="dashboard-avatar">
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
            </span>
            <span className="dashboard-profile-link__details">
              {username && <strong>@{username}</strong>}
            </span>
          </Link>
          <button
            type="button"
            className="dashboard-logout"
            onClick={() => setIsLogoutDialogOpen(true)}
          >
            Log out
          </button>
        </div>
      </header>

      <dialog
        ref={logoutDialogRef}
        className="logout-dialog"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        onClose={() => setIsLogoutDialogOpen(false)}
      >
        <div className="logout-dialog__icon" aria-hidden="true">
          <i className="fas fa-right-from-bracket" aria-hidden="true"></i>
        </div>
        <p className="logout-dialog__eyebrow">TAKE A BREAK?</p>
        <h2 id="logout-dialog-title">Log out of Banana Quest?</h2>
        <p id="logout-dialog-description">
          You’ll need to sign in again to continue your quest. Your progress is saved to your account.
        </p>
        <div className="logout-dialog__actions">
          <button
            type="button"
            className="logout-dialog__cancel"
            onClick={() => setIsLogoutDialogOpen(false)}
            autoFocus
          >
            Stay logged in
          </button>
          <button
            type="button"
            className="logout-dialog__confirm"
            onClick={onLogout}
          >
            Log out
          </button>
        </div>
      </dialog>
    </>
  );
}

export default Navbar;
