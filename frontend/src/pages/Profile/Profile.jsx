import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./Profile.css";

const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const PROFILE_API_URL = `${API_BASE_URL}/api/auth/profile`;
const UPDATE_PROFILE_API_URL = `${API_BASE_URL}/api/users/profile`;

function readStoredUser() {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "{}");
    return user && typeof user === "object" && !Array.isArray(user) ? user : {};
  } catch {
    return {};
  }
}

async function readResponse(response) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}).`,
    );
  }

  if (!result || typeof result !== "object") {
    throw new Error("The server returned an invalid profile response.");
  }

  if (!response.ok || result.success !== true) {
    const error = new Error(result.message || "Unable to load your profile.");
    error.status = response.status;
    throw error;
  }

  return result;
}

function getDisplayName(user) {
  return (
    (typeof user.fullName === "string" && user.fullName.trim()) ||
    (typeof user.username === "string" && user.username.trim()) ||
    "Player"
  );
}

function getInitials(name) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "BQ"
  );
}

function formatJoinDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(readStoredUser);
  const [formData, setFormData] = useState(() => {
    const storedUser = readStoredUser();
    return {
      fullName: storedUser.fullName || "",
      username: storedUser.username || "",
    };
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const displayName = getDisplayName(profile);
  const username =
    typeof profile.username === "string" ? profile.username.trim() : "";

  useEffect(() => {
    let isCurrent = true;
    const token = window.localStorage.getItem("token");

    if (!token) {
      navigate("/login", { replace: true });
      return () => {
        isCurrent = false;
      };
    }

    const loadProfile = async () => {
      try {
        const response = await fetch(PROFILE_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await readResponse(response);
        if (!result.user || typeof result.user !== "object" || Array.isArray(result.user)) {
          throw new Error("The server returned an invalid profile response.");
        }

        if (isCurrent) {
          setProfile(result.user);
          setFormData({
            fullName: result.user.fullName || "",
            username: result.user.username || "",
          });
          window.localStorage.setItem("user", JSON.stringify(result.user));
          setError("");
        }
      } catch (requestError) {
        if (requestError.status === 401) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }

        if (isCurrent) {
          setError(requestError.message || "Unable to load your profile.");
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
    setNotice("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const fullName = formData.fullName.trim();
    const editedUsername = formData.username.trim();
    if (!fullName || editedUsername.length < 3) {
      setError("Enter your full name and a username with at least 3 characters.");
      return;
    }

    const token = window.localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(UPDATE_PROFILE_API_URL, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fullName, username: editedUsername }),
      });
      const result = await readResponse(response);
      const updatedProfile = { ...profile, ...result.user };

      setProfile(updatedProfile);
      setFormData({
        fullName: updatedProfile.fullName || "",
        username: updatedProfile.username || "",
      });
      window.localStorage.setItem("user", JSON.stringify(updatedProfile));
      setNotice(result.message || "Profile updated successfully.");
    } catch (requestError) {
      if (requestError.status === 401) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      setError(requestError.message || "Unable to update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section className="profile-page" aria-labelledby="profile-title">
        <header className="profile-page__hero">
          <div>
            <p className="profile-page__eyebrow">YOUR BANANA QUEST</p>
            <h1 id="profile-title">Your profile</h1>
            <p>Manage your account details and see how you’re doing.</p>
          </div>
          <span className="profile-page__hero-icon" aria-hidden="true">👤</span>
          <span className="profile-page__hero-banana" aria-hidden="true">🍌</span>
        </header>

        {error && (
          <div className="profile-page__message profile-page__message--error" role="alert">
            <span>{error}</span>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                setRefreshKey((key) => key + 1);
              }}
            >
              Try again
            </button>
          </div>
        )}

        {notice && (
          <div className="profile-page__message profile-page__message--success" role="status">
            {notice}
          </div>
        )}

        <div className="profile-page__content">
          <section className="profile-page__identity" aria-label="Account overview">
            <div className="profile-page__avatar" aria-hidden="true">
              {getInitials(displayName)}
            </div>
            <h2>{displayName}</h2>
            <p>{username ? `@${username}` : "Banana Quest player"}</p>
            <div className="profile-page__stats">
              <div>
                <strong>{Number(profile.points) || 0}</strong>
                <span>Total points</span>
              </div>
              <div>
                <strong>{Number(profile.currentStreak) || 0}</strong>
                <span>Current streak</span>
              </div>
            </div>
            <p className="profile-page__joined">
              Playing since {formatJoinDate(profile.createdAt)}
            </p>
          </section>

          <section className="profile-page__details" aria-labelledby="profile-details-title">
            <div className="profile-page__section-heading">
              <div>
                <p className="profile-page__eyebrow">ACCOUNT DETAILS</p>
                <h2 id="profile-details-title">Personal information</h2>
              </div>
              <span aria-hidden="true">✏️</span>
            </div>

            {isLoading ? (
              <div className="profile-page__loading" role="status">
                Loading your profile…
              </div>
            ) : (
              <form className="profile-page__form" onSubmit={handleSubmit}>
                <label htmlFor="profile-full-name">
                  Full name
                  <input
                    id="profile-full-name"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label htmlFor="profile-username">
                  Username
                  <input
                    id="profile-username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    minLength={3}
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </label>
                <label htmlFor="profile-email">
                  Email address
                  <input
                    id="profile-email"
                    name="email"
                    type="email"
                    value={profile.email || ""}
                    readOnly
                  />
                  <span className="profile-page__field-hint">
                    Email address can’t be changed here.
                  </span>
                </label>
                <button type="submit" disabled={isSaving}>
                  {isSaving ? "Saving changes…" : "Save changes"}
                </button>
              </form>
            )}
          </section>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default Profile;
