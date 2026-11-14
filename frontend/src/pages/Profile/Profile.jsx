import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import "./Profile.css";




const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const PROFILE_API_URL = `${API_BASE_URL}/api/users/profile`;
const UPDATE_PROFILE_API_URL = `${API_BASE_URL}/api/users/profile`;
const UPLOAD_AVATAR_API_URL = `${API_BASE_URL}/api/users/avatar`;
const COOKIE_CONSENT_API_URL = `${API_BASE_URL}/api/users/cookie-consent`;
const GAMES_API_URL = `${API_BASE_URL}/api/games`;



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

function normalizeUserProfile(user = {}) {
  const profilePicture =
    typeof user.profilePicture === "string" &&
    user.profilePicture.trim()
      ? user.profilePicture.trim()
      : typeof user.avatar === "string" &&
          user.avatar.trim()
        ? user.avatar.trim()
        : "";

  const totalPoints =
    Number(user.totalPoints ?? user.points ?? 0) || 0;
  const currentStreak =
    Number(user.currentStreak ?? user.streak ?? 0) || 0;

  return {
    id: user.id || user._id || null,
    fullName:
      typeof user.fullName === "string"
        ? user.fullName.trim()
        : "",
    username:
      typeof user.username === "string"
        ? user.username.trim()
        : "",
    email: typeof user.email === "string" ? user.email : "",
    role: user.role || "user",
    points: totalPoints,
    totalPoints,
    currentStreak,
    streak: currentStreak,
    profilePicture,
    avatar: profilePicture,
    authProvider: user.authProvider || "local",
    createdAt: user.createdAt || null,
    updatedAt: user.updatedAt || null,
  };
}

async function readResponse(response) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw Object.assign(
      new Error(
        `The server returned an unexpected response (HTTP ${response.status}).`
      ),
      { status: response.status }
    );
  }

  if (!result || typeof result !== "object") {
    throw Object.assign(
      new Error("The server returned an invalid profile response."),
      { status: response.status }
    );
  }

  if (!response.ok || result.success !== true) {
    const error = new Error(
      result.message || "Unable to load your profile."
    );
    error.status = response.status;
    throw error;
  }

  return result;
}

async function fetchGameOverview(token) {
  const [summaryResponse, statisticsResponse] = await Promise.all([
    fetch(`${GAMES_API_URL}/scores/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${GAMES_API_URL}/scores/statistics`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);
  const [summary, statistics] = await Promise.all([
    readResponse(summaryResponse),
    readResponse(statisticsResponse),
  ]);

  if (!summary.scores || !statistics.statistics) {
    throw new Error(
      "The server returned incomplete game statistics."
    );
  }

  return {
    scores: summary.scores,
    statistics: statistics.statistics,
  };
}

function getDisplayName(user) {
  return (
    (typeof user.fullName === "string" &&
      user.fullName.trim()) ||
    (typeof user.username === "string" &&
      user.username.trim()) ||
    "Player"
  );
}

function getInitials(name) {
  const safeName = typeof name === "string" ? name.trim() : "";
  if (!safeName) return "BQ";

  return (
    safeName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "BQ"
  );
}

function formatJoinDate(value) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return new Intl.NumberFormat().format(num);
}




function useAnimatedNumber(target, duration = 1000) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const end = Number(target);
    if (!Number.isFinite(end)) {
      setDisplay(target);
      return undefined;
    }
    const start = prevRef.current;
    const diff = end - start;
    if (diff === 0) {
      setDisplay(end);
      return undefined;
    }
    const startTime = performance.now();
    let frame;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return display;
}




function Profile() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(() =>
    normalizeUserProfile(readStoredUser())
  );
  const [formData, setFormData] = useState(() => {
    const storedUser = normalizeUserProfile(readStoredUser());
    return {
      fullName: storedUser.fullName || "",
      username: storedUser.username || "",
    };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGameOverview, setIsLoadingGameOverview] =
    useState(true);
  const [gameOverview, setGameOverview] = useState(null);
  const [gameOverviewError, setGameOverviewError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] =
    useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState(
    normalizeUserProfile(readStoredUser()).profilePicture
  );
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUrlPreview, setAvatarUrlPreview] = useState(null);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [cookieConsent, setCookieConsentState] = useState({
    essential: true,
    analytics: false,
    preferences: false,
  });

  const fileInputRef = useRef(null);
  const noticeTimer = useRef(null);

  const displayName = getDisplayName(profile);
  const username =
    typeof profile.username === "string"
      ? profile.username.trim()
      : "";
  const totalPoints =
    gameOverview?.scores?.totalPoints ??
    profile.totalPoints ??
    profile.points ??
    0;
  const currentStreak =
    profile.currentStreak ?? profile.streak ?? 0;

  
  const animatedPoints = useAnimatedNumber(
    isLoadingGameOverview ? 0 : Number(totalPoints) || 0
  );
  const animatedStreak = useAnimatedNumber(
    Number(currentStreak) || 0
  );

  
  useEffect(() => {
    if (!notice) return undefined;
    if (noticeTimer.current) {
      window.clearTimeout(noticeTimer.current);
    }
    noticeTimer.current = window.setTimeout(
      () => setNotice(""),
      4000
    );
    return () => {
      if (noticeTimer.current) {
        window.clearTimeout(noticeTimer.current);
      }
    };
  }, [notice]);

  

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

        if (
          !result.user ||
          typeof result.user !== "object" ||
          Array.isArray(result.user)
        ) {
          throw new Error(
            "The server returned an invalid profile response."
          );
        }

        if (!isCurrent) return;

        const nextProfile = normalizeUserProfile(result.user);
        setProfile(nextProfile);
        setFormData({
          fullName: nextProfile.fullName || "",
          username: nextProfile.username || "",
        });
        setAvatarPreview(nextProfile.profilePicture || "");
        window.localStorage.setItem(
          "user",
          JSON.stringify(nextProfile)
        );
        setError("");
      } catch (requestError) {
        if (requestError.status === 401) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }
        if (isCurrent) {
          setError(
            requestError.message || "Unable to load your profile."
          );
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    const loadCookieConsent = async () => {
      try {
        const response = await fetch(COOKIE_CONSENT_API_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await readResponse(response);
        if (result.cookieConsent && isCurrent) {
          setCookieConsentState({
            essential: true,
            analytics: Boolean(result.cookieConsent.analytics),
            preferences: Boolean(
              result.cookieConsent.preferences
            ),
          });
        }
      } catch (requestError) {
        if (requestError.status === 401) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("user");
          navigate("/login", { replace: true });
        }
      }
    };

    const loadGameOverview = async () => {
      setIsLoadingGameOverview(true);
      try {
        const overview = await fetchGameOverview(token);
        if (isCurrent) {
          setGameOverview(overview);
          setGameOverviewError("");
        }
      } catch (requestError) {
        if (requestError.status === 401) {
          window.localStorage.removeItem("token");
          window.localStorage.removeItem("user");
          navigate("/login", { replace: true });
          return;
        }
        if (isCurrent) {
          setGameOverviewError(
            requestError.message ||
              "Unable to load your game statistics."
          );
        }
      } finally {
        if (isCurrent) setIsLoadingGameOverview(false);
      }
    };

    loadProfile();
    loadCookieConsent();
    loadGameOverview();

    return () => {
      isCurrent = false;
    };
  }, [navigate, refreshKey]);

  



  const persistCookieConsent = async (nextConsent) => {
    const token = window.localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const response = await fetch(COOKIE_CONSENT_API_URL, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analytics: Boolean(nextConsent.analytics),
          preferences: Boolean(nextConsent.preferences),
        }),
      });
      const result = await readResponse(response);
      if (result.cookieConsent) {
        setCookieConsentState({
          essential: true,
          analytics: Boolean(result.cookieConsent.analytics),
          preferences: Boolean(
            result.cookieConsent.preferences
          ),
        });
      }
    } catch (requestError) {
      if (requestError.status === 401) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      setError(
        requestError.message ||
          "Unable to save cookie preferences."
      );
    }
  };

  



  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setError("");
    setNotice("");
  };

  

  const processAvatarFile = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be smaller than 2MB.");
      return;
    }

    const token = window.localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const formPayload = new FormData();
    formPayload.append("avatar", file);
    setIsUploadingAvatar(true);
    setError("");

    try {
      const response = await fetch(UPLOAD_AVATAR_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formPayload,
      });
      const result = await readResponse(response);
      const nextUser = normalizeUserProfile({
        ...profile,
        ...result.user,
      });
      setProfile(nextUser);
      setAvatarPreview(nextUser.profilePicture || "");
      window.localStorage.setItem(
        "user",
        JSON.stringify(nextUser)
      );
      setNotice(result.message || "Profile picture updated.");
    } catch (requestError) {
      if (requestError.status === 401) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      setError(
        requestError.message || "Unable to upload avatar."
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    processAvatarFile(file);
    event.target.value = "";
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploadingAvatar) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    processAvatarFile(file);
  };

  

  const handleAvatarUrlChange = (event) => {
    const value = event.target.value;
    setAvatarUrl(value);
    setError("");
    setNotice("");

    if (!value.trim()) {
      setAvatarUrlPreview(null);
      return;
    }

    setIsValidatingUrl(true);
    const img = new Image();
    img.onload = () => {
      setAvatarUrlPreview(value.trim());
      setIsValidatingUrl(false);
    };
    img.onerror = () => {
      setAvatarUrlPreview(null);
      setIsValidatingUrl(false);
      setError(
        "Unable to load image from this URL. Please check the link."
      );
    };
    img.src = value.trim();
  };

  const handleSaveAvatarUrl = async () => {
    const nextUrl = avatarUrl.trim();
    if (!nextUrl || !avatarUrlPreview) {
      setError("Please enter a valid image URL.");
      return;
    }

    const token = window.localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setError("");
    setNotice("");
    setIsSaving(true);

    try {
      const response = await fetch(UPDATE_PROFILE_API_URL, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ profilePicture: nextUrl }),
      });
      const result = await readResponse(response);
      const updatedProfile = normalizeUserProfile({
        ...profile,
        ...result.user,
        profilePicture: nextUrl,
      });

      setProfile(updatedProfile);
      setAvatarPreview(updatedProfile.profilePicture || "");
      setAvatarUrl("");
      setAvatarUrlPreview(null);
      window.localStorage.setItem(
        "user",
        JSON.stringify(updatedProfile)
      );
      setNotice(
        result.message || "Profile picture updated from URL."
      );
    } catch (requestError) {
      if (requestError.status === 401) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      setError(
        requestError.message ||
          "Unable to update profile picture from URL."
      );
    } finally {
      setIsSaving(false);
    }
  };

  



  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const fullName = formData.fullName.trim();
    const editedUsername = formData.username.trim();
    if (!fullName || editedUsername.length < 3) {
      setError(
        "Enter your full name and a username with at least 3 characters."
      );
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
        body: JSON.stringify({
          fullName,
          username: editedUsername,
        }),
      });
      const result = await readResponse(response);
      const updatedProfile = normalizeUserProfile({
        ...profile,
        ...result.user,
      });

      setProfile(updatedProfile);
      setFormData({
        fullName: updatedProfile.fullName || "",
        username: updatedProfile.username || "",
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify(updatedProfile)
      );
      setNotice(result.message || "Profile updated successfully.");
    } catch (requestError) {
      if (requestError.status === 401) {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }
      setError(
        requestError.message || "Unable to update your profile."
      );
    } finally {
      setIsSaving(false);
    }
  };

  



  const handleCookieConsentChange = (key, value) => {
    const nextConsent = { ...cookieConsent, [key]: value };
    setCookieConsentState(nextConsent);
    persistCookieConsent(nextConsent);
  };

  const handleLogout = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [navigate]);

  const handleRetry = () => {
    setIsLoading(true);
    setRefreshKey((key) => key + 1);
  };

  



  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section
        className="profile-page"
        aria-labelledby="profile-title"
      >
        {}
        <header className="profile-page__hero">
          <div>
            <p className="profile-page__eyebrow">
              YOUR BANANA QUEST
            </p>
            <h1 id="profile-title">Your profile</h1>
            <p>
              Manage your account details and see how you&apos;re
              doing.
            </p>
          </div>
          <span
            className="profile-page__hero-icon"
            aria-hidden="true"
          >
            <i className="fas fa-user" aria-hidden="true"></i>
          </span>
          <span
            className="profile-page__hero-banana"
            aria-hidden="true"
          >
            🍌
          </span>
        </header>

        {}
        {error && (
          <div
            className="profile-page__message profile-page__message--error"
            role="alert"
          >
            <span
              className="profile-page__message-icon"
              aria-hidden="true"
            >
              ⚠️
            </span>
            <span className="profile-page__message-text">
              {error}
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="profile-page__message-retry"
            >
              <i
                className="fas fa-rotate-right"
                aria-hidden="true"
              ></i>{" "}
              Try again
            </button>
          </div>
        )}

        {notice && (
          <div
            className="profile-page__message profile-page__message--success"
            role="status"
          >
            <span
              className="profile-page__message-icon"
              aria-hidden="true"
            >
              ✅
            </span>
            <span className="profile-page__message-text">
              {notice}
            </span>
            <button
              type="button"
              className="profile-page__message-close"
              onClick={() => setNotice("")}
              aria-label="Dismiss notice"
            >
              ×
            </button>
          </div>
        )}

        <div className="profile-page__content">
          {}
          <section
            className="profile-page__identity"
            aria-label="Account overview"
          >
            <div
              className={`profile-page__avatar-wrapper${
                isDragging ? " is-dragging" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {avatarPreview ? (
                <img
                  className="profile-page__avatar-image"
                  src={avatarPreview}
                  alt={`${displayName}'s avatar`}
                />
              ) : (
                <div
                  className="profile-page__avatar"
                  aria-hidden="true"
                >
                  {getInitials(displayName)}
                </div>
              )}

              {isUploadingAvatar && (
                <div className="profile-page__avatar-overlay">
                  <span className="profile-page__avatar-spinner" />
                  <span>Uploading…</span>
                </div>
              )}

              <label
                className="profile-page__avatar-upload"
                htmlFor="avatar-upload"
              >
                <i
                  className="fas fa-camera"
                  aria-hidden="true"
                ></i>
                <span>
                  {isUploadingAvatar ? "Uploading…" : "Change"}
                </span>
                <input
                  ref={fileInputRef}
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <h2>{displayName}</h2>
            <p>
              {username
                ? `@${username}`
                : "Banana Quest player"}
            </p>

            <div className="profile-page__stats">
              <div>
                <strong>
                  {isLoadingGameOverview
                    ? "…"
                    : formatNumber(animatedPoints)}
                </strong>
                <span>Total points</span>
              </div>
              <div>
                <strong>
                  {formatNumber(animatedStreak)}
                </strong>
                <span>Current streak</span>
              </div>
            </div>

            <p className="profile-page__joined">
              <i
                className="fas fa-calendar"
                aria-hidden="true"
              ></i>{" "}
              Playing since {formatJoinDate(profile.createdAt)}
            </p>
          </section>

          {}
          <section
            className="profile-page__details"
            aria-labelledby="profile-details-title"
          >
            <div className="profile-page__section-heading">
              <div>
                <p className="profile-page__eyebrow">
                  ACCOUNT DETAILS
                </p>
                <h2 id="profile-details-title">
                  Personal information
                </h2>
              </div>
              <span
                className="profile-page__section-icon"
                aria-hidden="true"
              >
                <i
                  className="fas fa-pen"
                  aria-hidden="true"
                ></i>
              </span>
            </div>

            {isLoading ? (
              <div
                className="profile-page__skeleton"
                aria-busy="true"
              >
                <div className="profile-page__skeleton-line" />
                <div className="profile-page__skeleton-line" />
                <div className="profile-page__skeleton-line is-short" />
                <div className="profile-page__skeleton-button" />
              </div>
            ) : (
              <form
                className="profile-page__form"
                onSubmit={handleSubmit}
              >
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
                    <i
                      className="fas fa-lock"
                      aria-hidden="true"
                    ></i>{" "}
                    Email address can&apos;t be changed here.
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="profile-page__save-btn"
                >
                  {isSaving && (
                    <span
                      className="profile-page__save-spinner"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    {isSaving
                      ? "Saving changes…"
                      : "Save changes"}
                  </span>
                </button>
              </form>
            )}

            {}
            <div className="profile-page__image-url">
              <div>
                <p className="profile-page__eyebrow">
                  PROFILE IMAGE
                </p>
                <h3>Paste an image URL</h3>
                <p>
                  Use a direct link to an image to update your
                  profile picture.
                </p>
              </div>
              <div className="profile-page__avatar-url profile-page__avatar-url--details">
                {avatarUrlPreview ? (
                  <img
                    className="profile-page__url-preview"
                    src={avatarUrlPreview}
                    alt="Preview of the new profile picture"
                  />
                ) : (
                  <span
                    className="profile-page__url-preview profile-page__url-preview--placeholder"
                    aria-hidden="true"
                  >
                    <i
                      className="fas fa-image"
                      aria-hidden="true"
                    ></i>
                  </span>
                )}
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={avatarUrl}
                  onChange={handleAvatarUrlChange}
                  disabled={
                    isUploadingAvatar ||
                    isValidatingUrl ||
                    isSaving
                  }
                  aria-label="Image URL for profile picture"
                />
                {isValidatingUrl ? (
                  <span
                    className="profile-page__url-loading"
                    role="status"
                    aria-label="Validating image URL"
                  />
                ) : (
                  <button
                    type="button"
                    className="profile-page__url-save"
                    onClick={handleSaveAvatarUrl}
                    disabled={
                      isSaving ||
                      isUploadingAvatar ||
                      !avatarUrlPreview
                    }
                  >
                    {isSaving ? "Saving…" : "Update image"}
                  </button>
                )}
              </div>
            </div>

            <Link
              className="profile-page__password-link"
              to="/change-password"
            >
              <i
                className="fas fa-key"
                aria-hidden="true"
              ></i>{" "}
              Change password <span aria-hidden="true">→</span>
            </Link>
          </section>

          {}
          <section
            className="profile-page__details profile-page__quest"
            aria-labelledby="profile-quest-title"
          >
            <div className="profile-page__section-heading">
              <div>
                <p className="profile-page__eyebrow">
                  YOUR PROGRESS
                </p>
                <h2 id="profile-quest-title">
                  Quest statistics
                </h2>
              </div>
              <Link
                className="profile-page__password-link"
                to="/score-statistics"
              >
                View full report{" "}
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {isLoadingGameOverview ? (
              <div
                className="profile-page__skeleton"
                aria-busy="true"
              >
                <div className="profile-page__skeleton-grid">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="profile-page__skeleton-stat"
                    />
                  ))}
                </div>
              </div>
            ) : gameOverviewError ? (
              <div
                className="profile-page__stats-error"
                role="alert"
              >
                <span
                  className="profile-page__message-icon"
                  aria-hidden="true"
                >
                  ⚠️
                </span>
                <span>{gameOverviewError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsLoadingGameOverview(true);
                    setGameOverviewError("");
                    setRefreshKey((key) => key + 1);
                  }}
                  className="profile-page__message-retry"
                >
                  Try again
                </button>
              </div>
            ) : (
              <div className="profile-page__quest-grid">
                <article className="profile-page__quest-card profile-page__quest-card--blue">
                  <span
                    className="profile-page__quest-icon"
                    aria-hidden="true"
                  >
                    🎮
                  </span>
                  <div>
                    <span>Games played</span>
                    <strong>
                      {formatNumber(
                        gameOverview?.scores.totalGames
                      )}
                    </strong>
                  </div>
                </article>

                <article className="profile-page__quest-card profile-page__quest-card--green">
                  <span
                    className="profile-page__quest-icon"
                    aria-hidden="true"
                  >
                    ✅
                  </span>
                  <div>
                    <span>Completed</span>
                    <strong>
                      {formatNumber(
                        gameOverview?.scores.completedGames
                      )}
                    </strong>
                  </div>
                </article>

                <article className="profile-page__quest-card profile-page__quest-card--gold">
                  <span
                    className="profile-page__quest-icon"
                    aria-hidden="true"
                  >
                    📊
                  </span>
                  <div>
                    <span>Average score</span>
                    <strong>
                      {formatNumber(
                        gameOverview?.scores.averageScore
                      )}
                    </strong>
                  </div>
                </article>

                <article className="profile-page__quest-card profile-page__quest-card--purple">
                  <span
                    className="profile-page__quest-icon"
                    aria-hidden="true"
                  >
                    🧩
                  </span>
                  <div>
                    <span>Questions answered</span>
                    <strong>
                      {formatNumber(
                        gameOverview?.statistics
                          .totalQuestionsAnswered
                      )}
                    </strong>
                  </div>
                </article>

                <article className="profile-page__quest-card profile-page__quest-card--teal">
                  <span
                    className="profile-page__quest-icon"
                    aria-hidden="true"
                  >
                    🎯
                  </span>
                  <div>
                    <span>Correct answers</span>
                    <strong>
                      {formatNumber(
                        gameOverview?.statistics
                          .totalCorrectAnswers
                      )}
                    </strong>
                  </div>
                </article>

                <article className="profile-page__quest-card profile-page__quest-card--orange">
                  <span
                    className="profile-page__quest-icon"
                    aria-hidden="true"
                  >
                    ⭐
                  </span>
                  <div>
                    <span>Answer accuracy</span>
                    <strong>
                      {formatNumber(
                        gameOverview?.statistics
                          .accuracyPercentage
                      )}
                      %
                    </strong>
                  </div>
                </article>
              </div>
            )}
          </section>

          {}
          <section
            className="profile-page__details profile-page__privacy"
            aria-labelledby="cookie-preferences-title"
          >
            <div className="profile-page__section-heading">
              <div>
                <p className="profile-page__eyebrow">
                  PRIVACY SETTINGS
                </p>
                <h2 id="cookie-preferences-title">
                  Cookie preferences
                </h2>
              </div>
              <span
                className="profile-page__section-icon"
                aria-hidden="true"
              >
                <i
                  className="fas fa-cookie-bite"
                  aria-hidden="true"
                ></i>
              </span>
            </div>

            <div className="profile-page__cookie-consent">
              <p className="profile-page__cookie-description">
                We use cookies to enhance your experience. Choose
                which categories you&apos;d like to allow.
              </p>

              <div className="profile-page__cookie-options">
                <label className="profile-page__cookie-option">
                  <div className="profile-page__cookie-option-info">
                    <strong>
                      <i
                        className="fas fa-shield-alt"
                        aria-hidden="true"
                      ></i>{" "}
                      Essential cookies
                    </strong>
                    <span>
                      Required for the site to function
                      properly. Cannot be disabled.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                  />
                </label>

                <label className="profile-page__cookie-option">
                  <div className="profile-page__cookie-option-info">
                    <strong>
                      <i
                        className="fas fa-chart-line"
                        aria-hidden="true"
                      ></i>{" "}
                      Analytics cookies
                    </strong>
                    <span>
                      Help us understand how visitors interact
                      with the site.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={cookieConsent.analytics || false}
                    onChange={(e) =>
                      handleCookieConsentChange(
                        "analytics",
                        e.target.checked
                      )
                    }
                  />
                </label>

                <label className="profile-page__cookie-option">
                  <div className="profile-page__cookie-option-info">
                    <strong>
                      <i
                        className="fas fa-sliders-h"
                        aria-hidden="true"
                      ></i>{" "}
                      Preference cookies
                    </strong>
                    <span>
                      Remember your settings like theme,
                      language, and game preferences.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={cookieConsent.preferences || false}
                    onChange={(e) =>
                      handleCookieConsentChange(
                        "preferences",
                        e.target.checked
                      )
                    }
                  />
                </label>
              </div>

              <button
                type="button"
                className="profile-page__cookie-save"
                onClick={async () => {
                  await persistCookieConsent(cookieConsent);
                  setNotice("Cookie preferences saved.");
                }}
              >
                <i
                  className="fas fa-check"
                  aria-hidden="true"
                ></i>{" "}
                Save preferences
              </button>
            </div>
          </section>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default Profile;