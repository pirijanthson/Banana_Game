import { useEffect, useRef, useState } from "react";
import { NavLink, Link, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);

  const logoutDialogRef = useRef(null);
  const logoutButtonRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const mobileToggleRef = useRef(null);

  
  useEffect(() => {
    const dialog = logoutDialogRef.current;
    if (!dialog) return;

    if (isLogoutDialogOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isLogoutDialogOpen && dialog.open) {
      dialog.close();
    }
  }, [isLogoutDialogOpen]);

  
  useEffect(() => {
    if (!isLogoutDialogOpen) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isLogoutDialogOpen]);

  
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const handleKey = (event) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isMobileMenuOpen]);

  
  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;
    const handleClick = (event) => {
      const menu = mobileMenuRef.current;
      const toggle = mobileToggleRef.current;
      if (
        menu &&
        !menu.contains(event.target) &&
        toggle &&
        !toggle.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () =>
      document.removeEventListener("mousedown", handleClick);
  }, [isMobileMenuOpen]);

  
  useEffect(() => {
    if (!isLogoutDialogOpen && logoutButtonRef.current) {
      if (document.activeElement === document.body) {
        logoutButtonRef.current.focus();
      }
    }
  }, [isLogoutDialogOpen]);

  
  useEffect(() => {
    setAvatarFailed(false);
  }, [avatar]);

  const closeLogoutDialog = () => setIsLogoutDialogOpen(false);

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await onLogout?.();
      setIsLogoutDialogOpen(false);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleAvatarError = () => setAvatarFailed(true);

  const showAvatarImage = avatar && !avatarFailed;

  return (
    <>
      <header className="dashboard-header">
        {}
        <Link
          className="dashboard-brand"
          to="/dashboard"
          aria-label="Banana Quest home"
        >
          <span className="dashboard-brand__icon" aria-hidden="true">
            🍌
          </span>
          <span>
            banana<span>quest</span>
          </span>
        </Link>

        {}
        <nav className="dashboard-nav" aria-label="Main navigation">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? "is-active" : ""
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {}
        <div className="dashboard-account">
          {}
          <Link
            className="dashboard-profile-link"
            to="/profile"
            aria-label={`Profile${
              displayName ? ` for ${displayName}` : ""
            }`}
          >
            <span className="dashboard-avatar">
              {showAvatarImage ? (
                <img
                  className="dashboard-avatar__image"
                  src={avatar}
                  alt=""
                  aria-hidden="true"
                  onError={handleAvatarError}
                />
              ) : (
                getInitials(displayName || username)
              )}
            </span>
            <span className="dashboard-profile-link__details">
              {displayName && <strong>{displayName}</strong>}
            </span>
          </Link>

          {}
            <button
              ref={logoutButtonRef}
              type="button"
              className="dashboard-logout dashboard-logout--icon"
              onClick={() => setIsLogoutDialogOpen(true)}
              disabled={isLoggingOut}
              aria-label="Log out of Banana Quest"
            >
            <i
              className="fas fa-right-from-bracket"
              aria-hidden="true"
            ></i>
          </button>

          {}
          <button
            ref={mobileToggleRef}
            type="button"
            className={`dashboard-menu-toggle${
              isMobileMenuOpen ? " is-open" : ""
            }`}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={
              isMobileMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            <span aria-hidden="true" />
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </button>
        </div>

        {}
        {isMobileMenuOpen && (
          <nav
            ref={mobileMenuRef}
            id="mobile-nav-menu"
            className="dashboard-mobile-nav"
            aria-label="Mobile navigation"
          >
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  isActive
                    ? "dashboard-mobile-nav__link is-active"
                    : "dashboard-mobile-nav__link"
                }
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {}
      <dialog
        ref={logoutDialogRef}
        className="logout-dialog"
        aria-labelledby="logout-dialog-title"
        aria-describedby="logout-dialog-description"
        onClose={() => setIsLogoutDialogOpen(false)}
      >
        <div className="logout-dialog__icon" aria-hidden="true">
          <i
            className="fas fa-right-from-bracket"
            aria-hidden="true"
          ></i>
        </div>
        <p className="logout-dialog__eyebrow">TAKE A BREAK?</p>
        <h2 id="logout-dialog-title">Log out of Banana Quest?</h2>
        <p id="logout-dialog-description">
          You&apos;ll need to sign in again to continue your quest.
          Your progress is saved to your account.
        </p>
        <div className="logout-dialog__actions">
          <button
            type="button"
            className="logout-dialog__cancel"
            onClick={closeLogoutDialog}
            disabled={isLoggingOut}
            autoFocus
          >
            Stay logged in
          </button>
          <button
            type="button"
            className="logout-dialog__confirm"
            onClick={handleConfirmLogout}
            disabled={isLoggingOut}
            aria-busy={isLoggingOut}
          >
            {isLoggingOut && (
              <span
                className="logout-dialog__spinner"
                aria-hidden="true"
              />
            )}
            <span>
              {isLoggingOut ? "Logging out..." : "Log out"}
            </span>
          </button>
        </div>
      </dialog>
    </>
  );
}

export default Navbar;