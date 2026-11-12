import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./ChangePassword.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const CHANGE_PASSWORD_API_URL = `${API_BASE_URL}/api/users/change-password`;

function readStoredUser() {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "{}");
    return user && typeof user === "object" && !Array.isArray(user) ? user : {};
  } catch {
    return {};
  }
}

function getDisplayName(user) {
  return (
    (typeof user.fullName === "string" && user.fullName.trim()) ||
    (typeof user.username === "string" && user.username.trim()) ||
    "Player"
  );
}

async function changePassword(token, passwords) {
  const response = await fetch(CHANGE_PASSWORD_API_URL, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(passwords),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    const error = new Error(
      `The server returned an unexpected response (HTTP ${response.status}).`,
    );
    error.status = response.status;
    throw error;
  }

  if (!result || typeof result !== "object" || !response.ok || result.success !== true) {
    const error = new Error(
      result?.message || "Unable to change your password. Please try again.",
    );
    error.status = response.status;
    throw error;
  }

  return result;
}

function ChangePassword() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!window.localStorage.getItem("token")) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const user = readStoredUser();
  const displayName = getDisplayName(user);
  const username = typeof user.username === "string" ? user.username.trim() : "";
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (formData.newPassword.length < 8) {
      setError("Your new password must contain at least 8 characters.");
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("Your new password and confirmation do not match.");
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError("Your new password must be different from your current password.");
      return;
    }

    const token = window.localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await changePassword(token, formData);
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("user");
      navigate("/login", {
        replace: true,
        state: { notice: result.message || "Password changed. Please sign in again." },
      });
    } catch (requestError) {
      if (
        requestError.status === 401 &&
        requestError.message !== "Current password is incorrect."
      ) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      setError(requestError.message || "Unable to change your password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section
        className="change-password"
        aria-labelledby="change-password-title"
      >
        <header className="change-password__hero">
          <div>
            <p className="change-password__eyebrow">KEEP YOUR ACCOUNT SECURE</p>
            <h1 id="change-password-title">Change password</h1>
            <p>Choose a new password to keep your Banana Quest account safe.</p>
          </div>
          <span className="change-password__hero-icon" aria-hidden="true">🔐</span>
          <span className="change-password__hero-banana" aria-hidden="true">🍌</span>
        </header>

        <section className="change-password__panel" aria-labelledby="password-form-title">
          <div className="change-password__heading">
            <div>
              <p className="change-password__eyebrow">ACCOUNT SECURITY</p>
              <h2 id="password-form-title">Update your password</h2>
            </div>
            <span aria-hidden="true">🛡️</span>
          </div>

          <p className="change-password__hint">
            After changing your password, you’ll be signed out and asked to log in again.
          </p>

          {error && (
            <p className="change-password__error" role="alert">
              {error}
            </p>
          )}

          <form className="change-password__form" onSubmit={handleSubmit}>
            <label htmlFor="current-password">
              Current password
              <input
                id="current-password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={formData.currentPassword}
                onChange={handleChange}
                required
              />
            </label>
            <label htmlFor="new-password">
              New password
              <input
                id="new-password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={formData.newPassword}
                onChange={handleChange}
                required
              />
              <span className="change-password__field-hint">
                Use at least 8 characters.
              </span>
            </label>
            <label htmlFor="confirm-password">
              Confirm new password
              <input
                id="confirm-password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </label>
            <div className="change-password__actions">
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating password…" : "Update password"}
              </button>
              <Link to="/profile">Cancel</Link>
            </div>
          </form>
        </section>
      </section>
    </DashboardLayout>
  );
}

export default ChangePassword;
