import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BananaBackground from "../../components/BananaBackground/BananaBackground";
import "./Login.css";
import "../AuthPages.css";

const API_BASE_URL = (
  import.meta.env.BACKEND_URL
).replace(/\/+$/, "").replace(/\/api$/i, "");
const AUTH_API_URL = `${API_BASE_URL}/api/auth`;
const GOOGLE_SCRIPT_URL = import.meta.env.GOOGLE_SCRIPT_URL;
let googleScriptPromise;

function loadGoogleIdentity() {
  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => {
        googleScriptPromise = null;
        reject(new Error("Google sign-in could not be loaded. Please try again."));
      };
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

async function postAuth(path, data) {
  const response = await fetch(`${AUTH_API_URL}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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

function Login() {
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    login: "",
    password: "",
    otp: "",
  });
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setResendCooldown((seconds) => seconds - 1),
      1000,
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
    setError("");
  };

  const finishLogin = (result) => {
    if (!result.token) {
      throw new Error("The server did not return a login token.");
    }

    window.localStorage.setItem("token", result.token);
    if (result.user) {
      window.localStorage.setItem("user", JSON.stringify(result.user));
    }
    navigate("/dashboard", { replace: true });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      if (challenge) {
        const result = await postAuth("verify-otp", {
          challengeId: challenge.challengeId,
          otp: formData.otp.trim(),
        });
        finishLogin(result);
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
        setNotice(result.message || "Enter the verification code sent to your email.");
        return;
      }

      finishLogin(result);
    } catch (requestError) {
      setError(requestError.message || "Unable to log in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (!challenge || resendCooldown > 0 || isSubmitting) {
      return;
    }

    setError("");
    setNotice("");
    setIsSubmitting(true);

    try {
      const result = await postAuth("resend-otp", {
        challengeId: challenge.challengeId,
      });
      setResendCooldown(60);
      setFormData((current) => ({ ...current, otp: "" }));
      setNotice(result.message || "A new verification code has been sent.");
    } catch (requestError) {
      setError(requestError.message || "Unable to resend the code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    const clientId = import.meta.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google sign-in is not configured. Please use email and password.");
      return;
    }

    setError("");
    setNotice("");
    setIsGoogleLoading(true);

    try {
      const google = await loadGoogleIdentity();
      google.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          setIsSubmitting(true);
          try {
            const result = await postAuth("google-login", {
              idToken: credential,
            });
            finishLogin(result);
          } catch (requestError) {
            setError(requestError.message || "Google sign-in failed. Please try again.");
          } finally {
            setIsSubmitting(false);
          }
        },
      });
      google.accounts.id.prompt();
    } catch (requestError) {
      setError(requestError.message || "Google sign-in failed. Please try again.");
    } finally {
      setIsGoogleLoading(false);
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
    setNotice("");
  };

  return (
    <div className="login-container">
      <BananaBackground />
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🍌</div>
          <h1>Banana Quest</h1>
          <p className="login-subtitle">
            {challenge
              ? "Verify your login to continue."
              : "Welcome back! Ready to play?"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {challenge ? (
            <>
              <p className="login-otp-hint">
                Enter the 6-digit code sent to{" "}
                <strong>{challenge.email || "your email address"}</strong>.
              </p>
              <div className="login-input-group">
                <label htmlFor="otp">Verification code</label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Enter your 6-digit code"
                  value={formData.otp}
                  onChange={handleChange}
                  required
                />
              </div>
              <button
                type="button"
                className="login-text-button"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0 || isSubmitting}
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
                  type="text"
                  id="login"
                  name="login"
                  autoComplete="username"
                  placeholder="Enter your email or username"
                  value={formData.login}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="login-input-group">
                <label htmlFor="password">Password</label>
                <div className="login-password-wrapper">
                  <input
                    type={isPasswordVisible ? "text" : "password"}
                    id="password"
                    name="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <button
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setIsPasswordVisible((visible) => !visible)}
                    aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    aria-pressed={isPasswordVisible}
                  >
                    {isPasswordVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div className="login-forgot">
                <Link to="/forgot-password">Forgot Password?</Link>
              </div>
            </>
          )}

          {error && (
            <p className="login-feedback login-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="login-feedback login-notice" role="status">
              {notice}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Please wait..."
              : challenge
                ? "Verify and Login"
                : "Login to Play"}
          </button>
        </form>

        {!challenge && (
          <>
            <div className="login-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="google-login-button"
              onClick={handleGoogleLogin}
              disabled={isGoogleLoading || isSubmitting}
            >
              <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>{isGoogleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>
          </>
        )}

        <p className="login-register">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
