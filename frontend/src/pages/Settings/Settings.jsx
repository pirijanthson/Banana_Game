import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import {
  DEFAULT_SETTINGS,
  getDashboardBackground,
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
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
    } catch (error) {
      setSaveError(error.message || "Unable to save your settings. Please try again.");
    } finally {
      setIsSaving(false);
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

  const handleReset = () => {
    updateSettings(DEFAULT_SETTINGS);
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
                <small>Increase text size across dashboard pages.</small>
              </span>
              <select
                id="settings-text-size"
                name="textSize"
                value={settings.textSize}
                onChange={handleChange}
              >
                <option value="normal">Normal</option>
                <option value="large">Large</option>
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
        </fieldset>

        <div className="settings-page__footer">
          <p>Your preferences are saved to your account.</p>
          <button type="button" onClick={handleReset} disabled={isLoading || isSaving}>
            Reset to defaults
          </button>
        </div>
      </section>
    </DashboardLayout>
  );
}

export default Settings;
