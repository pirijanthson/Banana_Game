import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import BananaBackground from "../../components/BananaBackground/BananaBackground";
import "./ResetPassword.css";

const API_BASE_URL = import.meta.env.BACKEND_URL
  ?.replace(/\/+$/, "")
  .replace(/\/api$/i, "");

function ResetPassword() {
  const { token: routeToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = routeToken || searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("This reset link is invalid. Request a new password reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!API_BASE_URL) {
      setError("The backend URL is not configured. Set BACKEND_URL in the frontend environment.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/reset-password/${encodeURIComponent(token)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password, confirmPassword }),
        },
      );

      const responseBody = await response.text();
      let data;
      try {
        data = JSON.parse(responseBody);
      } catch {
        throw new Error(
          `The server returned an unexpected response (HTTP ${response.status}). Check that the backend URL is correct and the backend is running.`,
        );
      }

      if (!data || typeof data !== "object") {
        throw new Error("The server returned an invalid password reset response.");
      }

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Unable to reset your password. Please try again.");
      }

      setMessage(data.message || "Password reset successfully. Please log in.");
      setPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError.message || "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-container">
      <BananaBackground />

      <div className="reset-card">
        <div className="reset-icon" aria-hidden="true">🔐</div>
        <h1>Reset Password</h1>
        <p className="reset-subtitle">
          Choose a new password with at least 8 characters.
        </p>

        {message && (
          <div className="reset-success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="reset-error-message" role="alert">
            {error}
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="reset-input-group">
              <label htmlFor="password">New Password</label>
              <div className="reset-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  required
                />
                <button
                  type="button"
                  className="reset-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="reset-input-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="reset-password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setError("");
                  }}
                  required
                />
                <button
                  type="button"
                  className="reset-password-toggle"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="reset-submit-btn"
              disabled={loading || !token}
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <Link to="/login" className="reset-back-link">
          Back to Login
        </Link>
        {!token && (
          <p>
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
