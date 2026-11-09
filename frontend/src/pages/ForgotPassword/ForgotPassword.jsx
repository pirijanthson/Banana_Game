import { useState } from "react";
import { Link } from "react-router-dom";
import BananaBackground from "../../components/BananaBackground/BananaBackground";
import "./ForgotPassword.css";

const API_BASE_URL = import.meta.env.BACKEND_URL
  ?.replace(/\/+$/, "")
  .replace(/\/api$/i, "");

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError("");
    setMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      if (!API_BASE_URL) {
        throw new Error("The backend URL is not configured. Set BACKEND_URL in the frontend environment.");
      }

      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim() }),
      });

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
        throw new Error(data.message || "Unable to send the reset link. Please try again.");
      }

      setMessage(
        data.message ||
          "If an account exists, a password reset email has been sent."
      );
    } catch (requestError) {
      setError(requestError.message || "Server connection failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <BananaBackground />
      <div className="forgot-card">
        <div className="forgot-icon">🔐</div>

        <h1>Forgot Password?</h1>

        <p className="forgot-subtitle">
          Enter your registered email address.
          We'll send you a password reset link.
        </p>

        {message && (
          <div className="forgot-success" role="status">
            {message}
          </div>
        )}

        {error && (
          <div className="forgot-error-message" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="forgot-input-group">
            <label htmlFor="email">Email Address</label>

            <input
              type="email"
              id="email"
              placeholder="Enter your registered email"
              value={email}
              onChange={handleChange}
              required
            />

          </div>

          <button
            type="submit"
            className="forgot-submit-btn"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <Link to="/login" className="forgot-back-link">
          ← Back to Login
        </Link>
      </div>
    </div>
  );
}

export default ForgotPassword;