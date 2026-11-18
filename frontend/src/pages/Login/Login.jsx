import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthSidePanel from "../../components/AuthSidePanel/AuthSidePanel";
import "./Login.css";
import "../AuthPages.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const AUTH_API_URL = `${API_BASE_URL}/api/auth`;
const GOOGLE_CLIENT_ID = import.meta.env.GOOGLE_CLIENT_ID?.trim();
const configuredGoogleScriptUrl = import.meta.env.GOOGLE_SCRIPT_URL?.trim();
const GOOGLE_SCRIPT_URL =
  configuredGoogleScriptUrl === "https://accounts.google.com/gsi/client"
    ? configuredGoogleScriptUrl
    : "https://accounts.google.com/gsi/client";
const REMEMBER_KEY = "bq_remembered_login";
const PASSWORD_VISIBLE_TIMEOUT = 8000;

let googleScriptPromise;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) return Promise.resolve(window.google);
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google?.accounts?.id) {
          resolve(window.google);
          return;
        }
        googleScriptPromise = null;
        reject(new Error("Google sign-in could not be initialized."));
      };
      script.onerror = () => {
        googleScriptPromise = null;
        reject(
          new Error(
            "Google sign-in could not be loaded. Please try again.",
          ),
        );
      };
      document.head.appendChild(script);
    });
  }
  return googleScriptPromise;
}

async function postAuth(path, data) {
  const response = await fetch(`${AUTH_API_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const responseBody = await response.text();
  let result;
  try {
    result = JSON.parse(responseBody);
  } catch {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}). Check that the backend URL is correct and the backend is running.`,
    );
  }

  if (!response.ok || result.success === false) {
    throw new Error(result.message || "Unable to log in. Please try again.");
  }

  return result;
}

function maskEmail(email) {
  if (!email || typeof email !== "string") return "your email address";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"•".repeat(Math.max(1, name.length - 2))}@${domain}`;
}



function validateLoginForm({ login, password }) {
  const errors = {};

  if (!login.trim()) {
    errors.login = "Enter your email or username.";
  } else if (
    login.includes("@") &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.trim())
  ) {
    errors.login = "That email doesn't look right.";
  }

  if (!password) {
    errors.password = "Enter your password.";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }

  return errors;
}

function validateOtp(otp) {
  if (!otp) return "Enter the 6-digit verification code.";
  if (!/^\d{6}$/.test(otp)) return "The code must be exactly 6 digits.";
  return "";
}



function Login() {
  const location = useLocation();
  const navigate = useNavigate();

  const rememberedLogin = useMemo(
    () => window.localStorage.getItem(REMEMBER_KEY) || "",
    [],
  );

  const [formData, setFormData] = useState({
    login: rememberedLogin,
    password: "",
    otp: "",
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(
    Boolean(GOOGLE_CLIENT_ID),
  );
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [rememberMe, setRememberMe] = useState(Boolean(rememberedLogin));
  const [shakeError, setShakeError] = useState(false);

  const otpInputRef = useRef(null);
  const loginInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const googleButtonRef = useRef(null);
  const googleCredentialHandlerRef = useRef(null);
  const otpAutoSubmitted = useRef(false);
  const passwordHideTimer = useRef(null);
  const shakeTimer = useRef(null);

  
  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = window.setTimeout(
      () => setResendCooldown((s) => s - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  
  useEffect(() => {
    if (challenge && otpInputRef.current) otpInputRef.current.focus();
    if (!challenge) otpAutoSubmitted.current = false;
  }, [challenge]);

  
  useEffect(() => {
    if (isPasswordVisible) {
      passwordHideTimer.current = window.setTimeout(
        () => setIsPasswordVisible(false),
        PASSWORD_VISIBLE_TIMEOUT,
      );
    }
    return () => {
      if (passwordHideTimer.current) {
        window.clearTimeout(passwordHideTimer.current);
      }
    };
  }, [isPasswordVisible]);

  
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

  const finishLogin = (result) => {
    if (!result.token) {
      throw new Error("The server did not return a login token.");
    }
    window.localStorage.setItem("token", result.token);
    if (result.user) {
      window.localStorage.setItem("user", JSON.stringify(result.user));
    }
    if (rememberMe && formData.login.trim()) {
      window.localStorage.setItem(
        REMEMBER_KEY,
        formData.login.trim(),
      );
    } else {
      window.localStorage.removeItem(REMEMBER_KEY);
    }
    navigate("/dashboard", { replace: true });
  };

  useEffect(() => {
    googleCredentialHandlerRef.current = async (response) => {
      if (isSubmitting) return;
      if (!response?.credential) {
        showError("Google did not return a sign-in credential. Please try again.");
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await postAuth("google-login", {
          idToken: response.credential,
        });
        finishLogin(result);
      } catch (requestError) {
        showError(
          requestError.message || "Google sign-in failed. Please try again.",
        );
      } finally {
        setIsSubmitting(false);
      }
    };
  });

  useEffect(() => {
    const googleButton = googleButtonRef.current;
    if (!GOOGLE_CLIENT_ID || !googleButton) return undefined;

    let isActive = true;
    loadGoogleIdentity()
      .then((google) => {
        if (!isActive) return;
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            void googleCredentialHandlerRef.current?.(response);
          },
        });
        google.accounts.id.renderButton(googleButton, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.min(
            400,
            Math.floor(googleButton.getBoundingClientRect().width) || 320,
          ),
        });
        setIsGoogleLoading(false);
      })
      .catch((requestError) => {
        if (!isActive) return;
        setIsGoogleLoading(false);
        setError(
          requestError.message || "Google sign-in could not be initialized.",
        );
      });

    return () => {
      isActive = false;
      googleButton.replaceChildren();
    };
  }, []);

  const submitOtp = async (otpValue) => {
    const result = await postAuth("verify-otp", {
      challengeId: challenge.challengeId,
      otp: otpValue.trim(),
    });
    finishLogin(result);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    
    if (challenge) {
      const otpError = validateOtp(formData.otp);
      if (otpError) {
        setFieldErrors({ otp: otpError });
        showError(otpError);
        otpInputRef.current?.focus();
        return;
      }
    } else {
      const errs = validateLoginForm(formData);
      if (Object.keys(errs).length > 0) {
        setFieldErrors(errs);
        const firstKey = Object.keys(errs)[0];
        showError(errs[firstKey]);
        if (firstKey === "login") loginInputRef.current?.focus();
        else if (firstKey === "password")
          passwordInputRef.current?.focus();
        return;
      }
    }

    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      if (challenge) {
        await submitOtp(formData.otp);
        return;
      }

      const result = await postAuth("login", {
        login: formData.login.trim(),
        password: formData.password,
      });

      if (result.requiresOtp && result.challengeId) {
        setChallenge({
          challengeId: result.challengeId,
          email: result.email,
        });
        setFormData((current) => ({ ...current, otp: "" }));
        setResendCooldown(60);
        setNotice(
          result.message ||
            "Enter the verification code sent to your email.",
        );
        return;
      }

      finishLogin(result);
    } catch (requestError) {
      showError(
        requestError.message || "Unable to log in. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (event) => {
    const value = event.target.value.replace(/\D/g, "").slice(0, 6);
    setFormData((current) => ({ ...current, otp: value }));
    setError("");
    setFieldErrors((current) => {
      if (!current.otp) return current;
      const next = { ...current };
      delete next.otp;
      return next;
    });

    if (
      value.length === 6 &&
      !otpAutoSubmitted.current &&
      !isSubmitting &&
      challenge
    ) {
      otpAutoSubmitted.current = true;
      setIsSubmitting(true);
      submitOtp(value)
        .catch((requestError) => {
          showError(
            requestError.message ||
              "Unable to verify the code. Please try again.",
          );
          otpAutoSubmitted.current = false;
        })
        .finally(() => setIsSubmitting(false));
    }
  };

  const handleResendOTP = async () => {
    if (!challenge || resendCooldown > 0 || isSubmitting) return;
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const result = await postAuth("resend-otp", {
        challengeId: challenge.challengeId,
      });
      setResendCooldown(60);
      setFormData((current) => ({ ...current, otp: "" }));
      setNotice(
        result.message || "A new verification code has been sent.",
      );
      otpInputRef.current?.focus();
    } catch (requestError) {
      showError(
        requestError.message ||
          "Unable to resend the code. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const restartLogin = () => {
    setChallenge(null);
    setFormData((current) => ({
      ...current,
      password: "",
      otp: "",
    }));
    setResendCooldown(0);
    setError("");
    setFieldErrors({});
    setNotice("");
    otpAutoSubmitted.current = false;
    
    window.setTimeout(() => loginInputRef.current?.focus(), 0);
  };

  const maskedEmail = useMemo(
    () => maskEmail(challenge?.email),
    [challenge?.email],
  );

  const submitLabel = isSubmitting
    ? challenge
      ? "Verifying..."
      : "Signing in..."
    : challenge
      ? "Verify and Login"
      : "Login to Play";

  return (
    <div className="login-container">
      <div className="auth-layout">
        <AuthSidePanel variant="login" />

        <div
          className={`login-card${shakeError ? " login-card--shake" : ""}`}
          aria-busy={isSubmitting || isGoogleLoading}
        >
          <div className="login-header">
            <div className="login-logo" aria-hidden="true">
              🍌
            </div>
            <h1>Banana Quest</h1>
            <p className="login-subtitle">
              {challenge
                ? "Verify your login to continue."
                : "Welcome back! Ready to play?"}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="login-form"
            noValidate
            aria-label={challenge ? "Verify login" : "Log in"}
          >
            {challenge ? (
              <>
                <p className="login-otp-hint">
                  Enter the 6-digit code sent to{" "}
                  <strong>{maskedEmail}</strong>.
                </p>

                <div className="login-input-group">
                  <label htmlFor="otp">Verification code</label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    id="otp"
                    name="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="Enter your 6-digit code"
                    value={formData.otp}
                    onChange={handleOtpChange}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.otp)}
                    aria-describedby={
                      fieldErrors.otp ? "otp-error" : undefined
                    }
                  />
                  {fieldErrors.otp && (
                    <p
                      id="otp-error"
                      className="login-field-error"
                      role="alert"
                    >
                      {fieldErrors.otp}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  className="login-text-button"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0 || isSubmitting}
                  aria-label={
                    resendCooldown > 0
                      ? `Resend available in ${resendCooldown} seconds`
                      : "Resend verification code"
                  }
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend verification code"}
                </button>

                <button
                  type="button"
                  className="login-text-button"
                  onClick={restartLogin}
                  disabled={isSubmitting}
                >
                  Use a different account
                </button>
              </>
            ) : (
              <>
                <div className="login-input-group">
                  <label htmlFor="login">Email or Username</label>
                  <input
                    ref={loginInputRef}
                    type="text"
                    id="login"
                    name="login"
                    autoComplete="username"
                    placeholder="Enter your email or username"
                    value={formData.login}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.login)}
                    aria-describedby={
                      fieldErrors.login ? "login-error" : undefined
                    }
                  />
                  {fieldErrors.login && (
                    <p
                      id="login-error"
                      className="login-field-error"
                      role="alert"
                    >
                      {fieldErrors.login}
                    </p>
                  )}
                </div>

                <div className="login-input-group">
                  <label htmlFor="password">Password</label>
                  <div className="login-password-wrapper">
                    <input
                      ref={passwordInputRef}
                      type={isPasswordVisible ? "text" : "password"}
                      id="password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      disabled={isSubmitting}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={
                        fieldErrors.password ? "password-error" : undefined
                      }
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() =>
                        setIsPasswordVisible((v) => !v)
                      }
                      aria-label={
                        isPasswordVisible
                          ? "Hide password"
                          : "Show password"
                      }
                      aria-pressed={isPasswordVisible}
                    >
                      {isPasswordVisible ? "Hide" : "Show"}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p
                      id="password-error"
                      className="login-field-error"
                      role="alert"
                    >
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                <div className="login-row login-row--split">
                  <label className="login-checkbox">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isSubmitting}
                    />
                    <span>Remember me</span>
                  </label>
                  <Link
                    to="/forgot-password"
                    className="login-forgot-link"
                  >
                    Forgot Password?
                  </Link>
                </div>
              </>
            )}

            <div aria-live="polite" aria-atomic="true">
              {error && (
                <p className="login-feedback login-error" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p
                  className="login-feedback login-notice"
                  role="status"
                >
                  {notice}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="login-button"
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <span
                  className="login-spinner"
                  aria-hidden="true"
                ></span>
              )}
              <span>{submitLabel}</span>
            </button>
          </form>

          {!challenge && (
            <>
              <div className="login-divider" aria-hidden="true">
                <span>OR</span>
              </div>

              {GOOGLE_CLIENT_ID ? (
                <div
                  className="google-login-host"
                  aria-label="Continue with Google"
                  aria-busy={isGoogleLoading}
                >
                  {isGoogleLoading && (
                    <span>Connecting to Google...</span>
                  )}
                  <div ref={googleButtonRef} />
                </div>
              ) : (
                <p className="login-feedback login-error" role="alert">
                  Google sign-in is not configured.
                </p>
              )}
            </>
          )}

          <div className="login-footer-actions">
            <Link to="/" className="login-landing-link">
              ← Back to Landing
            </Link>

            <p className="login-register">
              Don&apos;t have an account?{" "}
              <Link to="/register">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;