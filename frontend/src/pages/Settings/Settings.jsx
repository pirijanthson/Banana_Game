import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import {
  DEFAULT_SETTINGS,
  getDashboardBackground,
  TEXT_SIZE_OPTIONS,
} from "../../utils/settings";
import { useAppSettings } from "../../context/useAppSettings";
import "./Settings.css";

function readStoredUser() {
  try {
    const user = JSON.parse(window.localStorage.getItem("user") || "{}");
    return user && typeof user === "object" && !Array.isArray(user) ? user : {};
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

function Settings() {
  const navigate = useNavigate();
  const {
    settings,
    isLoading,
    loadError,
    saveSettings,
  } = useAppSettings();
  const user = readStoredUser();
  const username = typeof user.username === "string" ? user.username.trim() : "";
  const backgroundColor = getDashboardBackground(settings);
  const textSizeLabel =
    TEXT_SIZE_OPTIONS.find((option) => option.value === settings.textSize)?.label ||
    "Normal";
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [volumeDrafts, setVolumeDrafts] = useState({});
  const savedVolumeDrafts = useRef({});

  useEffect(() => {
    if (!window.localStorage.getItem("token")) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const updateSettings = async (updates) => {
    setSaveError("");
    setSaveMessage("");
    setIsSaving(true);

    try {
      await saveSettings({ ...settings, ...updates });
      setSaveMessage("Your settings have been saved to your account.");
      return true;
    } catch (error) {
      setSaveError(error.message || "Unable to save your settings. Please try again.");
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleVolumeCommit = async (name) => {
    const value = Number(volumeDrafts[name] ?? settings[name]);
    if (value === settings[name] || savedVolumeDrafts.current[name] === value) {
      return;
    }

    savedVolumeDrafts.current[name] = value;
    const saved = await updateSettings({ [name]: value });
    if (!saved) {
      delete savedVolumeDrafts.current[name];
    }
  };

  const handleChange = (event) => {
    const { name, type, value, checked } = event.target;
    updateSettings({
      [name]:
        type === "checkbox"
          ? checked
          : name === "timerWarningSeconds"
            ? Number(value)
            : value,
    });
  };

  const handleReset = async () => {
    const saved = await updateSettings(DEFAULT_SETTINGS);
    if (saved) {
      setVolumeDrafts({});
      savedVolumeDrafts.current = {};
    }
  };

  return (
    <DashboardLayout
      displayName={getDisplayName(user)}
      onLogout={handleLogout}
      username={username}
    >
      <section className="settings-page" aria-labelledby="settings-title">
        <header className="settings-page__hero">
          <div>
            <p className="settings-page__eyebrow">MAKE IT YOURS</p>
            <h1 id="settings-title">Settings</h1>
            <p>Personalize your Banana Quest experience.</p>
          </div>
          <span className="settings-page__hero-icon" aria-hidden="true"><i className="fas fa-cog" aria-hidden="true"></i></span>
          <span className="settings-page__hero-banana" aria-hidden="true">🍌</span>
        </header>

        {(saveMessage || saveError || loadError) && (
          <p
            className={`settings-page__message${saveError || loadError ? " settings-page__message--error" : ""}`}
            role={saveError || loadError ? "alert" : "status"}
          >
            {saveError || loadError || saveMessage}
          </p>
        )}

        <fieldset
          className="settings-page__sections"
          disabled={isLoading || isSaving}
          aria-busy={isLoading || isSaving}
        >
          <section className="settings-card" aria-labelledby="settings-appearance-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon settings-card__icon--appearance" aria-hidden="true"><i className="fas fa-palette" aria-hidden="true"></i></span>
              <div>
                <p className="settings-page__eyebrow">A LITTLE COLOR</p>
                <h2 id="settings-appearance-title">Appearance</h2>
              </div>
            </div>
            <label className="settings-card__field" htmlFor="settings-theme">
              <span>
                <strong>Theme</strong>
                <small>Choose a light or dark dashboard theme.</small>
              </span>
              <select
                id="settings-theme"
                name="theme"
                value={settings.theme}
                onChange={handleChange}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </label>
            <label className="settings-card__field" htmlFor="settings-text-size">
              <span>
                <strong>Text size</strong>
                <small>Choose one of five text sizes across the dashboard.</small>
              </span>
              <select
                id="settings-text-size"
                name="textSize"
                value={settings.textSize}
                onChange={handleChange}
              >
                {TEXT_SIZE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-card__field settings-card__toggle-field" htmlFor="settings-reduce-motion">
              <span>
                <strong>Reduce animations</strong>
                <small>Limit decorative motion and transitions.</small>
              </span>
              <input
                id="settings-reduce-motion"
                name="reduceMotion"
                type="checkbox"
                checked={settings.reduceMotion}
                onChange={handleChange}
              />
            </label>
            <label className="settings-card__field settings-card__color-field" htmlFor="settings-background-color">
              <span>
                <strong>Page background color</strong>
                <small>Choose the background for dashboard pages.</small>
              </span>
              <span className="settings-card__color-control">
                <input
                  id="settings-background-color"
                  name="backgroundColor"
                  type="color"
                  value={backgroundColor}
                  onChange={handleChange}
                  aria-label="Page background color"
                />
                <code>{backgroundColor.toUpperCase()}</code>
              </span>
            </label>
          </section>

          <section className="settings-card" aria-labelledby="settings-gameplay-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon" aria-hidden="true"><i className="fas fa-gamepad" aria-hidden="true"></i></span>
              <div>
                <p className="settings-page__eyebrow">YOUR NEXT CHALLENGE</p>
                <h2 id="settings-gameplay-title">Gameplay</h2>
              </div>
            </div>
            <label className="settings-card__field settings-card__toggle-field" htmlFor="settings-sound-effects">
              <span>
                <strong>Sound effects</strong>
                <small>Play a short tone after each submitted answer.</small>
              </span>
              <input
                id="settings-sound-effects"
                name="soundEffects"
                type="checkbox"
                checked={settings.soundEffects}
                onChange={handleChange}
              />
            </label>
            <label className="settings-card__field settings-card__range-field" htmlFor="settings-sound-volume">
              <span>
                <strong>Sound effects volume</strong>
                <small>Adjust the answer and timer sound level.</small>
              </span>
              <span className="settings-card__range-control">
                <input
                  id="settings-sound-volume"
                  name="soundVolume"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={volumeDrafts.soundVolume ?? settings.soundVolume}
                  disabled={!settings.soundEffects}
                  onChange={(event) =>
                    setVolumeDrafts((drafts) => ({
                      ...drafts,
                      soundVolume: event.target.value,
                    }))
                  }
                  onPointerUp={() => handleVolumeCommit("soundVolume")}
                  onKeyUp={() => handleVolumeCommit("soundVolume")}
                  onBlur={() => handleVolumeCommit("soundVolume")}
                  aria-valuetext={`${volumeDrafts.soundVolume ?? settings.soundVolume}%`}
                />
                <output htmlFor="settings-sound-volume">
                  {volumeDrafts.soundVolume ?? settings.soundVolume}%
                </output>
              </span>
            </label>
            <label className="settings-card__field settings-card__toggle-field" htmlFor="settings-background-music">
              <span>
                <strong>Background music</strong>
                <small>Play a gentle instrumental loop while you use the app.</small>
              </span>
              <input
                id="settings-background-music"
                name="backgroundMusic"
                type="checkbox"
                checked={settings.backgroundMusic}
                onChange={handleChange}
              />
            </label>
            <label className="settings-card__field settings-card__range-field" htmlFor="settings-music-volume">
              <span>
                <strong>Music volume</strong>
                <small>Music starts after your next click or key press.</small>
              </span>
              <span className="settings-card__range-control">
                <input
                  id="settings-music-volume"
                  name="musicVolume"
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={volumeDrafts.musicVolume ?? settings.musicVolume}
                  disabled={!settings.backgroundMusic}
                  onChange={(event) =>
                    setVolumeDrafts((drafts) => ({
                      ...drafts,
                      musicVolume: event.target.value,
                    }))
                  }
                  onPointerUp={() => handleVolumeCommit("musicVolume")}
                  onKeyUp={() => handleVolumeCommit("musicVolume")}
                  onBlur={() => handleVolumeCommit("musicVolume")}
                  aria-valuetext={`${volumeDrafts.musicVolume ?? settings.musicVolume}%`}
                />
                <output htmlFor="settings-music-volume">
                  {volumeDrafts.musicVolume ?? settings.musicVolume}%
                </output>
              </span>
            </label>
            <label className="settings-card__field settings-card__toggle-field" htmlFor="settings-timer-warnings">
              <span>
                <strong>Timer warning</strong>
                <small>Highlight the timer when time is running low.</small>
              </span>
              <input
                id="settings-timer-warnings"
                name="timerWarnings"
                type="checkbox"
                checked={settings.timerWarnings}
                onChange={handleChange}
              />
            </label>
            <label className="settings-card__field" htmlFor="settings-timer-warning-seconds">
              <span>
                <strong>Warning time</strong>
                <small>Show the warning with this many seconds remaining.</small>
              </span>
              <select
                id="settings-timer-warning-seconds"
                name="timerWarningSeconds"
                value={settings.timerWarningSeconds}
                onChange={handleChange}
                disabled={!settings.timerWarnings}
              >
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={15}>15 seconds</option>
              </select>
            </label>
            <label className="settings-card__field settings-card__toggle-field" htmlFor="settings-show-progress">
              <span>
                <strong>Game progress</strong>
                <small>Show the question count and progress bar.</small>
              </span>
              <input
                id="settings-show-progress"
                name="showProgress"
                type="checkbox"
                checked={settings.showProgress}
                onChange={handleChange}
              />
            </label>
          </section>

          <section className="settings-card" aria-labelledby="settings-notifications-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon settings-card__icon--notifications" aria-hidden="true"><i className="fas fa-bell" aria-hidden="true"></i></span>
              <div>
                <p className="settings-page__eyebrow">STAY IN THE LOOP</p>
                <h2 id="settings-notifications-title">Notifications</h2>
              </div>
            </div>
            <label className="settings-card__field settings-card__toggle-field" htmlFor="settings-answer-feedback">
              <span>
                <strong>In-game answer feedback</strong>
                <small>Show a message after each submitted answer.</small>
              </span>
              <input
                id="settings-answer-feedback"
                name="showAnswerFeedback"
                type="checkbox"
                checked={settings.showAnswerFeedback}
                onChange={handleChange}
              />
            </label>
          </section>

          <section className="settings-card settings-card--account" aria-labelledby="settings-account-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon settings-card__icon--account" aria-hidden="true">
                <i className="fas fa-user-shield" aria-hidden="true"></i>
              </span>
              <div>
                <p className="settings-page__eyebrow">YOUR ACCOUNT</p>
                <h2 id="settings-account-title">Account &amp; privacy</h2>
              </div>
            </div>
            <p className="settings-card__description">
              Keep your account details and privacy choices up to date.
            </p>
            <Link className="settings-card__link" to="/profile">
              <span>
                <strong>Profile &amp; cookies</strong>
                <small>Update your details and cookie preferences.</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
            <Link className="settings-card__link" to="/change-password">
              <span>
                <strong>Password &amp; security</strong>
                <small>Change the password for your account.</small>
              </span>
              <span aria-hidden="true">→</span>
            </Link>
          </section>

          <section className="settings-card settings-preview" aria-labelledby="settings-preview-title">
            <div className="settings-card__heading">
              <span className="settings-card__icon settings-card__icon--preview" aria-hidden="true">
                <i className="fas fa-eye" aria-hidden="true"></i>
              </span>
              <div>
                <p className="settings-page__eyebrow">YOUR EXPERIENCE</p>
                <h2 id="settings-preview-title">Live preview</h2>
              </div>
            </div>
            <div
              className={`settings-preview__window settings-preview__window--${settings.theme}`}
              style={{ "--settings-preview-background": backgroundColor }}
            >
              <div className="settings-preview__topbar">
                <span aria-hidden="true">🍌</span>
                <span>bananaquest</span>
                <span className="settings-preview__dot" aria-hidden="true"></span>
              </div>
              <div className="settings-preview__content">
                <span className="settings-preview__tag">TODAY'S QUEST</span>
                <strong>Ready for a challenge?</strong>
                <span className="settings-preview__button">Play a game <span aria-hidden="true">→</span></span>
              </div>
            </div>
            <div className="settings-preview__summary">
              <span>
                <small>Theme</small>
                <strong>{settings.theme === "dark" ? "Dark" : "Light"}</strong>
              </span>
              <span>
                <small>Text size</small>
                <strong>{textSizeLabel}</strong>
              </span>
              <span>
                <small>Background</small>
                <strong>{backgroundColor.toUpperCase()}</strong>
              </span>
            </div>
          </section>
        </fieldset>

        <div className="settings-page__footer">
          <p>
            {isSaving
              ? "Saving your preferences…"
              : "Changes are saved automatically to your account."}
          </p>
          <button type="button" onClick={handleReset} disabled={isLoading || isSaving}>
            Reset to defaults
          </button>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default Settings;
