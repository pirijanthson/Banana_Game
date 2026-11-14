import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AuthSidePanel from "../../components/AuthSidePanel/AuthSidePanel";
import "./ForgotPassword.css";
import "../AuthPages.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

function validateEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Please enter a valid email address.";
  }
  return "";
}

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [shakeError, setShakeError] = useState(false);

  const emailRef = useRef(null);
  const shakeTimer = useRef(null);

  
  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  
  useEffect(
    () => () => {
      if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    },
    [],
  );

  const triggerShake = () => {
    setShakeError(true);
    if (shakeTimer.current) window.clearTimeout(shakeTimer.current);
    shakeTimer.current = window.setTimeout(
      () => setShakeError(false),
      500,
    );
  };

  const showError = (msg) => {
    setError(msg);
    triggerShake();
  };

  const handleChange = (event) => {
    setEmail(event.target.value);
    setError("");
    setFieldError("");
    setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const trimmed = email.trim();
    const validationError = validateEmail(trimmed);

    if (validationError) {
      setFieldError(validationError);
      showError(validationError);
      emailRef.current?.focus();
      return;
    }

    setError("");
    setFieldError("");
    setMessage("");

    if (!API_BASE_URL) {
      showError(
        "The backend URL is not configured. Set BACKEND_URL in the frontend environment.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: trimmed }),
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
        throw new Error(
          "The server returned an invalid password reset response.",
        );
      }

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message ||
            "Unable to send the reset link. Please try again.",
        );
      }

      setMessage(
        data.message ||
          "If an account exists, a password reset email has been sent.",
      );
    } catch (requestError) {
      showError(requestError.message || "Server connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="auth-layout">
        <AuthSidePanel variant="recovery" />

        <div
          className={`forgot-card${
            shakeError ? " forgot-card--shake" : ""
          }`}
          aria-busy={loading}
        >
          <div className="forgot-icon" aria-hidden="true">
            <i className="fas fa-lock"></i>
          </div>

          <h1>Forgot Password?</h1>

          <p className="forgot-subtitle">
            Enter your registered email address. We&apos;ll send you a
            password reset link.
          </p>

          {}
          {message ? (
            <div className="forgot-success" role="status">
              <div
                className="forgot-success__icon"
                aria-hidden="true"
              >
                📬
              </div>
              <p>{message}</p>
              <p className="forgot-success__hint">
                Didn&apos;t receive it? Check your spam folder, or{" "}
                <button
                  type="button"
                  className="forgot-inline-link"
                  onClick={() => {
                    setMessage("");
                    setError("");
                    setFieldError("");
                    window.setTimeout(
                      () => emailRef.current?.focus(),
                      0,
                    );
                  }}
                >
                  try another email
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="forgot-error-message"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="forgot-input-group">
                  <label htmlFor="email">Email Address</label>

                  <input
                    ref={emailRef}
                    type="email"
                    id="email"
                    name="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                    aria-invalid={Boolean(fieldError)}
                    aria-describedby={
                      fieldError ? "email-error" : undefined
                    }
                  />

                  {fieldError && (
                    <p
                      id="email-error"
                      className="forgot-field-error"
                      role="alert"
                    >
                      {fieldError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="forgot-submit-btn"
                  disabled={loading}
                >
                  {loading && (
                    <span
                      className="forgot-spinner"
                      aria-hidden="true"
                    ></span>
                  )}
                  <span>
                    {loading ? "Sending..." : "Send Reset Link"}
                  </span>
                </button>
              </form>
            </>
          )}

          <Link to="/login" className="forgot-back-link">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;