import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./ChangePassword.css";




const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const CHANGE_PASSWORD_API_URL = `${API_BASE_URL}/api/users/change-password`;

const PASSWORD_VISIBLE_TIMEOUT = 8000;



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
      `The server returned an unexpected response (HTTP ${response.status}).`
    );
    error.status = response.status;
    throw error;
  }

  if (
    !result ||
    typeof result !== "object" ||
    !response.ok ||
    result.success !== true
  ) {
    const error = new Error(
      result?.message ||
        "Unable to change your password. Please try again."
    );
    error.status = response.status;
    throw error;
  }

  return result;
}




function getPasswordStrength(password) {
  if (!password) {
    return { score: 0, label: "", color: "", checks: {} };
  }

  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    long: password.length >= 12,
  };

  let score = 0;
  if (checks.length) score++;
  if (checks.upper && checks.lower) score++;
  if (checks.number) score++;
  if (checks.special) score++;
  if (checks.long) score++;

  const capped = Math.min(score, 5);

  const meta = [
    { label: "Too weak", color: "#dc2626" },
    { label: "Weak", color: "#f97316" },
    { label: "Fair", color: "#eab308" },
    { label: "Good", color: "#84cc16" },
    { label: "Strong", color: "#16a34a" },
    { label: "Very strong", color: "#15803d" },
  ][capped];

  return {
    score: capped,
    label: meta.label,
    color: meta.color,
    checks,
  };
}




function ChangePassword() {
  const navigate = useNavigate();

  const user = useMemo(readStoredUser, []);
  const displayName = getDisplayName(user);
  const username =
    typeof user.username === "string"
      ? user.username.trim()
      : "";

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [showPasswordHints, setShowPasswordHints] = useState(false);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentRef = useRef(null);
  const newRef = useRef(null);
  const confirmRef = useRef(null);

  const currentHideTimer = useRef(null);
  const newHideTimer = useRef(null);
  const confirmHideTimer = useRef(null);

  
  useEffect(() => {
    if (!window.localStorage.getItem("token")) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  
  useEffect(() => {
    currentRef.current?.focus();
  }, []);

  
  useEffect(() => {
    if (showCurrent) {
      currentHideTimer.current = window.setTimeout(
        () => setShowCurrent(false),
        PASSWORD_VISIBLE_TIMEOUT
      );
    }
    return () => {
      if (currentHideTimer.current) {
        window.clearTimeout(currentHideTimer.current);
      }
    };
  }, [showCurrent]);

  useEffect(() => {
    if (showNew) {
      newHideTimer.current = window.setTimeout(
        () => setShowNew(false),
        PASSWORD_VISIBLE_TIMEOUT
      );
    }
    return () => {
      if (newHideTimer.current) {
        window.clearTimeout(newHideTimer.current);
      }
    };
  }, [showNew]);

  useEffect(() => {
    if (showConfirm) {
      confirmHideTimer.current = window.setTimeout(
        () => setShowConfirm(false),
        PASSWORD_VISIBLE_TIMEOUT
      );
    }
    return () => {
      if (confirmHideTimer.current) {
        window.clearTimeout(confirmHideTimer.current);
      }
    };
  }, [showConfirm]);

  
  const handleLogout = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [navigate]);

  
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const errors = {};

    if (!formData.currentPassword) {
      errors.currentPassword = "Enter your current password.";
    }

    if (!formData.newPassword) {
      errors.newPassword = "Enter a new password.";
    } else if (formData.newPassword.length < 8) {
      errors.newPassword =
        "Your new password must contain at least 8 characters.";
    } else if (formData.currentPassword === formData.newPassword) {
      errors.newPassword =
        "Your new password must be different from your current password.";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Confirm your new password.";
    } else if (
      formData.newPassword !== formData.confirmPassword
    ) {
      errors.confirmPassword =
        "Your new password and confirmation do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors)[0];
      setError(errors[firstKey]);
      setShakeKey((k) => k + 1);
      if (firstKey === "currentPassword")
        currentRef.current?.focus();
      else if (firstKey === "newPassword")
        newRef.current?.focus();
      else confirmRef.current?.focus();
      return;
    }

    const token = window.localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setError("");
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await changePassword(token, formData);
      window.localStorage.removeItem("token");
      window.localStorage.removeItem("user");
      navigate("/login", {
        replace: true,
        state: {
          notice:
            result.message ||
            "Password changed. Please sign in again.",
        },
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

      if (requestError.message === "Current password is incorrect.") {
        setFieldErrors({
          currentPassword: "Current password is incorrect.",
        });
        setError(requestError.message);
        setShakeKey((k) => k + 1);
        currentRef.current?.focus();
      } else {
        setError(
          requestError.message ||
            "Unable to change your password."
        );
        setShakeKey((k) => k + 1);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  
  const strength = useMemo(
    () => getPasswordStrength(formData.newPassword),
    [formData.newPassword]
  );

  const passwordsMatch =
    formData.confirmPassword.length > 0 &&
    formData.newPassword === formData.confirmPassword;

  const passwordsDiffer =
    formData.confirmPassword.length > 0 &&
    formData.newPassword !== formData.confirmPassword;

  



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
        {}
        <header className="change-password__hero">
          <div>
            <p className="change-password__eyebrow">
              KEEP YOUR ACCOUNT SECURE
            </p>
            <h1 id="change-password-title">
              Change password
            </h1>
            <p>
              Choose a new password to keep your Banana Quest
              account safe.
            </p>
          </div>
          <span
            className="change-password__hero-icon"
            aria-hidden="true"
          >
            <i className="fas fa-lock" aria-hidden="true"></i>
          </span>
          <span
            className="change-password__hero-banana"
            aria-hidden="true"
          >
            🍌
          </span>
        </header>

        {}
        <section
          className={`change-password__panel${
            shakeKey ? " change-password--shake" : ""
          }`}
          key={shakeKey}
          aria-labelledby="password-form-title"
        >
          <div className="change-password__heading">
            <div>
              <p className="change-password__eyebrow">
                ACCOUNT SECURITY
              </p>
              <h2 id="password-form-title">
                Update your password
              </h2>
            </div>
            <span
              className="change-password__heading-icon"
              aria-hidden="true"
            >
              <i
                className="fas fa-shield-alt"
                aria-hidden="true"
              ></i>
            </span>
          </div>

          <p className="change-password__hint">
            <i
              className="fas fa-info-circle"
              aria-hidden="true"
            ></i>{" "}
            After changing your password, you&apos;ll be signed
            out and asked to log in again.
          </p>

          {error && (
            <div
              className="change-password__error"
              role="alert"
            >
              <span
                className="change-password__error-icon"
                aria-hidden="true"
              >
                ⚠️
              </span>
              <span>{error}</span>
            </div>
          )}

          <form
            className="change-password__form"
            onSubmit={handleSubmit}
            noValidate
          >
            {}
            <div className="change-password__field">
              <label htmlFor="current-password">
                Current password
              </label>
              <div className="change-password__input-wrapper">
                <input
                  ref={currentRef}
                  id="current-password"
                  name="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(
                    fieldErrors.currentPassword
                  )}
                  aria-describedby={
                    fieldErrors.currentPassword
                      ? "current-password-error"
                      : undefined
                  }
                />
                <button
                  type="button"
                  className="change-password__toggle"
                  onClick={() => setShowCurrent((v) => !v)}
                  aria-label={
                    showCurrent
                      ? "Hide current password"
                      : "Show current password"
                  }
                  aria-pressed={showCurrent}
                >
                  <i
                    className={`fas fa-eye${
                      showCurrent ? "-slash" : ""
                    }`}
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
              {fieldErrors.currentPassword && (
                <p
                  id="current-password-error"
                  className="change-password__field-error"
                  role="alert"
                >
                  {fieldErrors.currentPassword}
                </p>
              )}
            </div>

            {}
            <div className="change-password__field">
              <label htmlFor="new-password">
                New password
              </label>
              <div className="change-password__input-wrapper">
                <input
                  ref={newRef}
                  id="new-password"
                  name="newPassword"
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={formData.newPassword}
                  onChange={handleChange}
                  onFocus={() => setShowPasswordHints(true)}
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(
                    fieldErrors.newPassword
                  )}
                  aria-describedby={[
                    fieldErrors.newPassword
                      ? "new-password-error"
                      : null,
                    "password-strength",
                    "password-requirements",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
                <button
                  type="button"
                  className="change-password__toggle"
                  onClick={() => setShowNew((v) => !v)}
                  aria-label={
                    showNew
                      ? "Hide new password"
                      : "Show new password"
                  }
                  aria-pressed={showNew}
                >
                  <i
                    className={`fas fa-eye${
                      showNew ? "-slash" : ""
                    }`}
                    aria-hidden="true"
                  ></i>
                </button>
              </div>

              {}
              {(showPasswordHints ||
                formData.newPassword.length > 0) && (
                <div
                  className="change-password__strength"
                  id="password-strength"
                  aria-live="polite"
                >
                  <div className="change-password__strength-bar">
                    <span
                      style={{
                        width: `${
                          (strength.score / 5) * 100
                        }%`,
                        background: strength.color,
                      }}
                    />
                  </div>
                  {formData.newPassword.length > 0 && (
                    <span
                      className="change-password__strength-label"
                      style={{ color: strength.color }}
                    >
                      {strength.label}
                    </span>
                  )}
                </div>
              )}

              {}
              {(showPasswordHints ||
                formData.newPassword.length > 0) && (
                <ul
                  className="change-password__requirements"
                  id="password-requirements"
                >
                  <li
                    className={
                      strength.checks?.length
                        ? "is-met"
                        : ""
                    }
                  >
                    <i
                      className={`fas fa-${
                        strength.checks?.length
                          ? "check-circle"
                          : "circle"
                      }`}
                      aria-hidden="true"
                    ></i>{" "}
                    At least 8 characters
                  </li>
                  <li
                    className={
                      strength.checks?.upper &&
                      strength.checks?.lower
                        ? "is-met"
                        : ""
                    }
                  >
                    <i
                      className={`fas fa-${
                        strength.checks?.upper &&
                        strength.checks?.lower
                          ? "check-circle"
                          : "circle"
                      }`}
                      aria-hidden="true"
                    ></i>{" "}
                    Upper & lowercase letters
                  </li>
                  <li
                    className={
                      strength.checks?.number ? "is-met" : ""
                    }
                  >
                    <i
                      className={`fas fa-${
                        strength.checks?.number
                          ? "check-circle"
                          : "circle"
                      }`}
                      aria-hidden="true"
                    ></i>{" "}
                    At least one number
                  </li>
                  <li
                    className={
                      strength.checks?.special ? "is-met" : ""
                    }
                  >
                    <i
                      className={`fas fa-${
                        strength.checks?.special
                          ? "check-circle"
                          : "circle"
                      }`}
                      aria-hidden="true"
                    ></i>{" "}
                    One special character (!@#$…)
                  </li>
                </ul>
              )}

              {fieldErrors.newPassword && (
                <p
                  id="new-password-error"
                  className="change-password__field-error"
                  role="alert"
                >
                  {fieldErrors.newPassword}
                </p>
              )}
            </div>

            
            <div className="change-password__field">
              <label htmlFor="confirm-password">
                Confirm new password
                {passwordsMatch && (
                  <span
                    className="change-password__field-hint change-password__field-hint--ok"
                    aria-hidden="true"
                  >
                    <i
                      className="fas fa-check-circle"
                      aria-hidden="true"
                    ></i>{" "}
                    Matches
                  </span>
                )}
                {passwordsDiffer && (
                  <span
                    className="change-password__field-hint change-password__field-hint--bad"
                    aria-hidden="true"
                  >
                    <i
                      className="fas fa-times-circle"
                      aria-hidden="true"
                    ></i>{" "}
                    Doesn&apos;t match
                  </span>
                )}
              </label>
              <div className="change-password__input-wrapper">
                <input
                  ref={confirmRef}
                  id="confirm-password"
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  aria-invalid={Boolean(
                    fieldErrors.confirmPassword
                  )}
                  aria-describedby={
                    fieldErrors.confirmPassword
                      ? "confirm-password-error"
                      : undefined
                  }
                />
                <button
                  type="button"
                  className="change-password__toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={
                    showConfirm
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  aria-pressed={showConfirm}
                >
                  <i
                    className={`fas fa-eye${
                      showConfirm ? "-slash" : ""
                    }`}
                    aria-hidden="true"
                  ></i>
                </button>
              </div>
              {fieldErrors.confirmPassword && (
                <p
                  id="confirm-password-error"
                  className="change-password__field-error"
                  role="alert"
                >
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </div>

            {}
            <div className="change-password__actions">
              <button
                type="submit"
                className="change-password__submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting && (
                  <span
                    className="change-password__spinner"
                    aria-hidden="true"
                  ></span>
                )}
                <span>
                  {isSubmitting
                    ? "Updating password…"
                    : "Update password"}
                </span>
              </button>
              <Link
                to="/profile"
                className="change-password__cancel"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>
      </section>
    </DashboardLayout>
  );
}

export default ChangePassword;