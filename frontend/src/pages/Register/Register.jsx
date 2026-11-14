import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthSidePanel from "../../components/AuthSidePanel/AuthSidePanel";
import "./Register.css";
import "../AuthPages.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const PASSWORD_VISIBLE_TIMEOUT = 8000;

async function createAccount(formData) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}). Check that the backend URL is correct and the backend is running.`,
    );
  }

  if (!result || typeof result !== "object") {
    throw new Error(
      "The server returned an invalid registration response.",
    );
  }

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.message ||
        "Unable to create your account. Please try again.",
    );
  }

  return result;
}



function getPasswordStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const capped = Math.min(score, 4);

  const meta = [
    { label: "Too weak", color: "#dc2626" },
    { label: "Weak", color: "#f97316" },
    { label: "Fair", color: "#eab308" },
    { label: "Good", color: "#84cc16" },
    { label: "Strong", color: "#16a34a" },
  ][capped];

  return { score: capped, label: meta.label, color: meta.color };
}



function validateRegisterForm(formData, agreed) {
  const errors = {};

  const fullName = formData.fullName.trim();
  if (!fullName) {
    errors.fullName = "Enter your full name.";
  } else if (fullName.length < 2) {
    errors.fullName = "Name must be at least 2 characters.";
  } else if (fullName.length > 80) {
    errors.fullName = "Name must be 80 characters or less.";
  }

  const username = formData.username.trim();
  if (!username) {
    errors.username = "Choose a username.";
  } else if (username.length < 3) {
    errors.username = "Username must be at least 3 characters.";
  } else if (username.length > 20) {
    errors.username = "Username must be 20 characters or less.";
  } else if (!/^[a-zA-Z0-9_.-]+$/.test(username)) {
    errors.username =
      "Use only letters, numbers, dots, dashes, or underscores.";
  }

  const email = formData.email.trim();
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = "That email doesn't look right.";
  }

  if (!formData.password) {
    errors.password = "Create a password.";
  } else if (formData.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = "Confirm your password.";
  } else if (formData.password !== formData.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (!agreed) {
    errors.terms = "Please accept the terms to continue.";
  }

  return errors;
}



function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [agreed, setAgreed] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeError, setShakeError] = useState(false);
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  const fullNameRef = useRef(null);
  const usernameRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);
  const termsRef = useRef(null);

  const passwordHideTimer = useRef(null);
  const confirmHideTimer = useRef(null);
  const shakeTimer = useRef(null);

  
  useEffect(() => {
    fullNameRef.current?.focus();
  }, []);

  
  useEffect(() => {
    if (showPassword) {
      passwordHideTimer.current = window.setTimeout(
        () => setShowPassword(false),
        PASSWORD_VISIBLE_TIMEOUT,
      );
    }
    return () => {
      if (passwordHideTimer.current) {
        window.clearTimeout(passwordHideTimer.current);
      }
    };
  }, [showPassword]);

  useEffect(() => {
    if (showConfirmPassword) {
      confirmHideTimer.current = window.setTimeout(
        () => setShowConfirmPassword(false),
        PASSWORD_VISIBLE_TIMEOUT,
      );
    }
    return () => {
      if (confirmHideTimer.current) {
        window.clearTimeout(confirmHideTimer.current);
      }
    };
  }, [showConfirmPassword]);

  
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

  const showError = (message) => {
    setError(message);
    triggerShake();
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (type === "checkbox") {
      setAgreed(checked);
      setFieldErrors((current) => {
        if (!current.terms) return current;
        const next = { ...current };
        delete next.terms;
        return next;
      });
      setError("");
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const focusFirstError = (errors) => {
    const order = [
      ["fullName", fullNameRef],
      ["username", usernameRef],
      ["email", emailRef],
      ["password", passwordRef],
      ["confirmPassword", confirmRef],
      ["terms", termsRef],
    ];
    for (const [key, ref] of order) {
      if (errors[key]) {
        ref.current?.focus();
        break;
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const errors = validateRegisterForm(formData, agreed);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstMessage =
        errors[Object.keys(errors)[0]] ||
        "Please fix the highlighted fields.";
      showError(firstMessage);
      focusFirstError(errors);
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      const result = await createAccount({
        ...formData,
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
      });
      setSuccess(
        result.message ||
          "Your account has been created. You can now log in.",
      );
    } catch (requestError) {
      showError(
        requestError.message ||
          "Unable to create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const strength = useMemo(
    () => getPasswordStrength(formData.password),
    [formData.password],
  );

  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.password === formData.confirmPassword;

  const passwordsDiffer =
    formData.confirmPassword.length > 0 &&
    formData.password !== formData.confirmPassword;

  const fullNameLen = formData.fullName.trim().length;
  const usernameLen = formData.username.trim().length;

  return (
    <div className="register-container">
      <div className="auth-layout">
        <AuthSidePanel variant="register" />

        <div
          className={`register-card${
            shakeError ? " register-card--shake" : ""
          }`}
          aria-busy={isSubmitting}
        >
          <h1>Create Account 🍌</h1>
          <p className="register-subtitle">
            Join Banana Quest and start playing!
          </p>

          {success ? (
            <div className="register-success" role="status">
              <div
                className="register-success__icon"
                aria-hidden="true"
              >
                🎉
              </div>
              <p>{success}</p>
              <div className="register-success__actions">
                <button
                  type="button"
                  className="register-submit-btn"
                  onClick={() => navigate("/login")}
                >
                  Continue to login
                </button>
                <Link
                  to="/login"
                  className="register-success__secondary"
                >
                  or go back manually
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="register-form"
              noValidate
              aria-label="Create account"
            >
              {}
              <div className="register-input-group">
                <label htmlFor="fullName">
                  Full Name
                  {fullNameLen > 0 && fullNameLen > 60 && (
                    <span className="register-field-hint">
                      {fullNameLen}/80
                    </span>
                  )}
                </label>
                <input
                  ref={fullNameRef}
                  type="text"
                  id="fullName"
                  name="fullName"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  maxLength={80}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={
                    fieldErrors.fullName ? "fullName-error" : undefined
                  }
                />
                {fieldErrors.fullName && (
                  <p
                    id="fullName-error"
                    className="register-field-error"
                    role="alert"
                  >
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>

              {}
              <div className="register-input-group">
                <label htmlFor="username">
                  Username
                  {usernameLen > 0 && (
                    <span className="register-field-hint">
                      {usernameLen}/20
                    </span>
                  )}
                </label>
                <input
                  ref={usernameRef}
                  type="text"
                  id="username"
                  name="username"
                  autoComplete="username"
                  placeholder="Choose a username (3–20 characters)"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  minLength={3}
                  maxLength={20}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={
                    fieldErrors.username ? "username-error" : undefined
                  }
                />
                {fieldErrors.username && (
                  <p
                    id="username-error"
                    className="register-field-error"
                    role="alert"
                  >
                    {fieldErrors.username}
                  </p>
                )}
              </div>

              {}
              <div className="register-input-group">
                <label htmlFor="email">Email Address</label>
                <input
                  ref={emailRef}
                  type="email"
                  id="email"
                  name="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={
                    fieldErrors.email ? "email-error" : undefined
                  }
                />
                {fieldErrors.email && (
                  <p
                    id="email-error"
                    className="register-field-error"
                    role="alert"
                  >
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {}
              <div className="register-input-group">
                <label htmlFor="password">Password</label>
                <div className="register-password-wrapper">
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Create a password (at least 8 characters)"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setShowPasswordHints(true)}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={[
                      fieldErrors.password ? "password-error" : null,
                      "password-strength",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  />
                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>

                {(showPasswordHints || formData.password.length > 0) && (
                  <div
                    className="register-password-strength"
                    id="password-strength"
                    aria-live="polite"
                  >
                    <div
                      className="register-password-strength__bar"
                      aria-hidden="true"
                    >
                      <span
                        style={{
                          width: `${(strength.score / 4) * 100}%`,
                          background: strength.color,
                        }}
                      />
                    </div>
                    {formData.password.length > 0 && (
                      <span
                        className="register-password-strength__label"
                        style={{ color: strength.color }}
                      >
                        {strength.label}
                      </span>
                    )}
                  </div>
                )}

                {fieldErrors.password && (
                  <p
                    id="password-error"
                    className="register-field-error"
                    role="alert"
                  >
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              {}
              <div className="register-input-group">
                <label htmlFor="confirmPassword">
                  Confirm Password
                  {passwordsMatch && (
                    <span
                      className="register-field-hint register-field-hint--ok"
                      aria-hidden="true"
                    >
                      ✓ matches
                    </span>
                  )}
                  {passwordsDiffer && (
                    <span
                      className="register-field-hint register-field-hint--bad"
                      aria-hidden="true"
                    >
                      ✕ doesn&apos;t match
                    </span>
                  )}
                </label>
                <div className="register-password-wrapper">
                  <input
                    ref={confirmRef}
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    autoComplete="new-password"
                    minLength={8}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.confirmPassword)}
                    aria-describedby={
                      fieldErrors.confirmPassword
                        ? "confirmPassword-error"
                        : undefined
                    }
                  />
                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
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
                {fieldErrors.confirmPassword && (
                  <p
                    id="confirmPassword-error"
                    className="register-field-error"
                    role="alert"
                  >
                    {fieldErrors.confirmPassword}
                  </p>
                )}
              </div>

              {}
              <div className="register-terms">
                <label className="register-checkbox">
                  <input
                    ref={termsRef}
                    type="checkbox"
                    checked={agreed}
                    onChange={handleChange}
                    name="terms"
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.terms)}
                  />
                  <span>
                    I agree to the{" "}
                    <a
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Terms
                    </a>{" "}
                    and{" "}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </a>
                    .
                  </span>
                </label>
                {fieldErrors.terms && (
                  <p
                    className="register-field-error"
                    role="alert"
                  >
                    {fieldErrors.terms}
                  </p>
                )}
              </div>

              {}
              <div aria-live="polite" aria-atomic="true">
                {error && (
                  <p
                    className="register-feedback register-error"
                    role="alert"
                  >
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="register-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <span
                    className="register-spinner"
                    aria-hidden="true"
                  ></span>
                )}
                <span>
                  {isSubmitting ? "Creating account..." : "Register"}
                </span>
              </button>
            </form>
          )}

          <p className="register-login-link">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;