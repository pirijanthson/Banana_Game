import { useState } from "react";
import { Link } from "react-router-dom";
import BananaBackground from "../../components/BananaBackground/BananaBackground";
import "./Register.css";

const API_BASE_URL = (
  import.meta.env.BACKEND_URL
)
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

async function createAccount(formData) {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
    throw new Error("The server returned an invalid registration response.");
  }

  if (!response.ok || result.success !== true) {
    throw new Error(result.message || "Unable to create your account. Please try again.");
  }

  return result;
}

function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.fullName.trim() || !formData.username.trim()) {
      setError("Enter your full name and username.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createAccount({
        ...formData,
        fullName: formData.fullName.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
      });
      setSuccess(result.message || "Your account has been created. You can now log in.");
    } catch (requestError) {
      setError(requestError.message || "Unable to create your account. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      <BananaBackground />

      <div className="register-card">
        <h1>Create Account 🍌</h1>
        <p className="register-subtitle">Join Banana Quest and start playing!</p>

        {success ? (
          <div className="register-success" role="status">
            <p>{success}</p>
            <Link to="/login">Continue to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="register-form">
            <div className="register-input-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                autoComplete="name"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                autoComplete="username"
                minLength={3}
                placeholder="Choose a username (at least 3 characters)"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-input-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="register-input-group">
              <label htmlFor="password">Password</label>
              <div className="register-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Create a password (at least 8 characters)"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div className="register-input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="register-password-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="register-password-toggle"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  aria-label={
                    showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                  }
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <p className="register-feedback register-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="register-submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Register"}
            </button>
          </form>
        )}

        <p className="register-login-link">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
