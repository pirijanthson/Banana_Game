import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/Dashboard/DashboardLayout/DashboardLayout";
import {
  DEFAULT_SETTINGS,
  getDashboardBackground,
  TEXT_SIZE_OPTIONS,
} from "../../utils/settings";
import { useAppSettings } from "../../context/useAppSettings";
import {
  playGameSound,
  startBackgroundMusic,
  stopBackgroundMusic,
  setMusicVolume,
} from "../../utils/gameSounds";
import "./Settings.css";



const TEST_SOUNDS = [
  { id: "CORRECT", label: "Correct", emoji: "🎵" },
  { id: "INCORRECT", label: "Wrong", emoji: "🔔" },
  { id: "TICK", label: "Tick", emoji: "🎶" },
  { id: "VICTORY", label: "Victory", emoji: "🎺" },
];



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

function countChangedSettings(settings) {
  if (!settings) return 0;
  let count = 0;
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (settings[key] !== DEFAULT_SETTINGS[key]) {
      count++;
    }
  }
  return count;
}



function Select({ id, name, value, onChange, disabled, children }) {
  return (
    <div className="settings-card__select-wrapper">
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
      >
        {children}
      </select>
      <span
        className="settings-card__select-arrow"
        aria-hidden="true"
      />
    </div>
  );
}



function MusicWaveform({ isPlaying }) {
  return (
    <div
      className={`music-waveform${isPlaying ? " is-playing" : ""}`}
      aria-hidden="true"
    >
      {[...Array(5)].map((_, i) => (
        <span
          key={i}
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}



function ConfirmResetDialog({ isOpen, onConfirm, onCancel }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="settings-dialog"
      aria-labelledby="settings-dialog-title"
      onClose={onCancel}
    >
      <div
        className="settings-dialog__icon"
        aria-hidden="true"
      >
        ⚠️
      </div>
      <h2 id="settings-dialog-title">Reset all settings?</h2>
      <p>
        This will restore all your preferences to their defaults.
        You can&apos;t undo this action.
      </p>
      <div className="settings-dialog__actions">
        <button
          type="button"
          onClick={onCancel}
          className="settings-dialog__cancel"
        >
          Keep my settings
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="settings-dialog__confirm"
        >
          Reset to defaults
        </button>
      </div>
    </dialog>
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

  const user = useMemo(readStoredUser, []);
  const username =
    typeof user.username === "string"
      ? user.username.trim()
      : "";
  const displayName = getDisplayName(user);

  const backgroundColor = getDashboardBackground(settings);
  const textSizeLabel =
    TEXT_SIZE_OPTIONS.find(
      (option) => option.value === settings.textSize
    )?.label || "Normal";

  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [volumeDrafts, setVolumeDrafts] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const savedVolumeDrafts = useRef({});
  const messageTimer = useRef(null);

  const changedCount = useMemo(
    () => countChangedSettings(settings),
    [settings]
  );

  
  useEffect(() => {
    if (!window.localStorage.getItem("token")) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  
  useEffect(() => {
    if (!saveMessage) return undefined;
    if (messageTimer.current) {
      window.clearTimeout(messageTimer.current);
    }
    messageTimer.current = window.setTimeout(
      () => setSaveMessage(""),
      3000
    );
    return () => {
      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current);
      }
    };
  }, [saveMessage]);

  
  useEffect(() => {
    if (isLoading) return undefined;
    if (
      settings.backgroundMusic &&
      Number(settings.musicVolume) > 0
    ) {
      setMusicVolume(Number(settings.musicVolume));
      if (typeof window !== "undefined") {
        const tryStart = () => {
          startBackgroundMusic();
          setIsMusicPlaying(true);
          window.removeEventListener("pointerdown", tryStart);
          window.removeEventListener("keydown", tryStart);
        };
        window.addEventListener("pointerdown", tryStart, {
          once: true,
        });
        window.addEventListener("keydown", tryStart, {
          once: true,
        });
      }
    } else {
      stopBackgroundMusic();
      setIsMusicPlaying(false);
    }
    return undefined;
  }, [
    settings.backgroundMusic,
    settings.musicVolume,
    isLoading,
  ]);

  
  const handleLogout = useCallback(() => {
    stopBackgroundMusic();
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    navigate("/login", { replace: true });
  }, [navigate]);

  const updateSettings = useCallback(
    async (updates) => {
      setSaveError("");
      setSaveMessage("");
      setIsSaving(true);
      try {
        await saveSettings({ ...settings, ...updates });
        setSaveMessage("Your settings have been saved.");
        return true;
      } catch (error) {
        setSaveError(
          error.message ||
            "Unable to save your settings. Please try again."
        );
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [saveSettings, settings]
  );

  const handleVolumeCommit = useCallback(
    async (name) => {
      const value = Number(
        volumeDrafts[name] ?? settings[name]
      );
      if (
        value === settings[name] ||
        savedVolumeDrafts.current[name] === value
      ) {
        return;
      }
      savedVolumeDrafts.current[name] = value;

      if (name === "soundVolume" && value > 0) {
        playGameSound("CLICK", value);
      }
      if (name === "musicVolume") {
        setMusicVolume(value);
      }

      const saved = await updateSettings({ [name]: value });
      if (!saved) delete savedVolumeDrafts.current[name];
    },
    [settings, volumeDrafts, updateSettings]
  );

  const handleChange = useCallback(
    (event) => {
      const { name, type, value, checked } = event.target;
      updateSettings({
        [name]:
          type === "checkbox"
            ? checked
            : name === "timerWarningSeconds"
              ? Number(value)
              : value,
      });
    },
    [updateSettings]
  );

  const handleTestSound = useCallback(
    (soundId) => {
      if (!settings.soundEffects) return;
      playGameSound(soundId, settings.soundVolume);
    },
    [settings.soundEffects, settings.soundVolume]
  );

  const handleResetClick = () => setShowResetDialog(true);

  const handleResetConfirm = async () => {
    setShowResetDialog(false);
    const saved = await updateSettings(DEFAULT_SETTINGS);
    if (saved) {
      setVolumeDrafts({});
      savedVolumeDrafts.current = {};
    }
  };

  const handleExportSettings = () => {
    try {
      const dataStr = JSON.stringify(settings, null, 2);
      const blob = new Blob([dataStr], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `banana-quest-settings-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setSaveMessage("Settings exported successfully.");
    } catch {
      setSaveError("Unable to export settings.");
    }
  };

  const handleImportSettings = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        await updateSettings(imported);
        setSaveMessage("Settings imported successfully.");
      } catch {
        setSaveError("Invalid settings file.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const dismissMessage = () => {
    setSaveMessage("");
    setSaveError("");
  };

  const matchesSearch = useCallback(
    (...texts) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return texts.some((t) =>
        String(t || "")
          .toLowerCase()
          .includes(q)
      );
    },
    [searchQuery]
  );

  const showMessage = saveMessage || saveError || loadError;
  const hasError = Boolean(saveError || loadError);

  
  const showAppearance = matchesSearch(
    "appearance",
    "theme",
    "color",
    "background",
    "text",
    "size",
    "motion"
  );
  const showGameplay = matchesSearch(
    "gameplay",
    "sound",
    "music",
    "volume",
    "timer",
    "progress"
  );
  const showNotifications = matchesSearch(
    "notifications",
    "feedback",
    "answer"
  );
  const showAccount = matchesSearch(
    "account",
    "privacy",
    "password",
    "profile"
  );
  const showPreview = matchesSearch("preview", "live");
  const showData = matchesSearch(
    "data",
    "export",
    "import",
    "backup"
  );

  

  return (
    <DashboardLayout
      displayName={displayName}
      onLogout={handleLogout}
      username={username}
    >
      <section
        className="settings-page"
        aria-labelledby="settings-title"
      >
        {}
        <header className="settings-page__hero">
          <div>
            <p className="settings-page__eyebrow">
              MAKE IT YOURS
            </p>
            <h1 id="settings-title">Settings</h1>
            <p>Personalize your Banana Quest experience.</p>
          </div>
          <span
            className="settings-page__hero-icon"
            aria-hidden="true"
          >
            <i className="fas fa-cog" aria-hidden="true"></i>
          </span>
          <span
            className="settings-page__hero-banana"
            aria-hidden="true"
          >
            🍌
          </span>
        </header>

        {}
        <div className="settings-page__search-bar">
          <div className="settings-page__search">
            <i className="fas fa-search" aria-hidden="true"></i>
            <input
              type="search"
              placeholder="Search settings…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search settings"
            />
            {searchQuery && (
              <button
                type="button"
                className="settings-page__search-clear"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {changedCount > 0 && (
            <span className="settings-page__changed-badge">
              <i className="fas fa-pencil" aria-hidden="true"></i>{" "}
              {changedCount} custom{" "}
              {changedCount === 1 ? "setting" : "settings"}
            </span>
          )}

          {isMusicPlaying && (
            <div className="settings-page__music-indicator">
              <MusicWaveform isPlaying={isMusicPlaying} />
              <span>Music playing</span>
            </div>
          )}
        </div>

        {}
        {showMessage && (
          <div
            className={`settings-page__message${
              hasError
                ? " settings-page__message--error"
                : " settings-page__message--success"
            }`}
            role={hasError ? "alert" : "status"}
          >
            <span
              className="settings-page__message-icon"
              aria-hidden="true"
            >
              {hasError ? "⚠️" : "✅"}
            </span>
            <span className="settings-page__message-text">
              {saveError || loadError || saveMessage}
            </span>
            <button
              type="button"
              className="settings-page__message-close"
              onClick={dismissMessage}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {}
        <fieldset
          className="settings-page__sections"
          disabled={isLoading || isSaving}
          aria-busy={isLoading || isSaving}
        >
          {}
          {showAppearance && (
            <section
              className="settings-card settings-card--appearance"
              aria-labelledby="settings-appearance-title"
              style={{ animationDelay: "0ms" }}
            >
              <div className="settings-card__heading">
                <span
                  className="settings-card__icon settings-card__icon--appearance"
                  aria-hidden="true"
                >
                  <i
                    className="fas fa-palette"
                    aria-hidden="true"
                  ></i>
                </span>
                <div>
                  <p className="settings-page__eyebrow">
                    A LITTLE COLOR
                  </p>
                  <h2 id="settings-appearance-title">
                    Appearance
                  </h2>
                </div>
              </div>

              <label
                className="settings-card__field"
                htmlFor="settings-theme"
              >
                <span>
                  <strong>Theme</strong>
                  <small>
                    Choose a light or dark dashboard theme.
                  </small>
                </span>
                <Select
                  id="settings-theme"
                  name="theme"
                  value={settings.theme}
                  onChange={handleChange}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </Select>
              </label>

              <label
                className="settings-card__field"
                htmlFor="settings-text-size"
              >
                <span>
                  <strong>Text size</strong>
                  <small>
                    Choose one of five text sizes across the
                    dashboard.
                  </small>
                </span>
                <Select
                  id="settings-text-size"
                  name="textSize"
                  value={settings.textSize}
                  onChange={handleChange}
                >
                  {TEXT_SIZE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </Select>
              </label>

              {}
              <div className="settings-card__text-preview">
                <span className="settings-card__text-preview-label">
                  Preview
                </span>
                <p
                  className={`settings-card__text-preview-sample settings-card__text-preview-sample--${settings.textSize}`}
                >
                  The quick brown banana jumps over the lazy
                  puzzle.
                </p>
              </div>

              <label
                className="settings-card__field settings-card__toggle-field"
                htmlFor="settings-reduce-motion"
              >
                <span>
                  <strong>Reduce animations</strong>
                  <small>
                    Limit decorative motion and transitions.
                  </small>
                </span>
                <input
                  id="settings-reduce-motion"
                  name="reduceMotion"
                  type="checkbox"
                  checked={settings.reduceMotion}
                  onChange={handleChange}
                />
              </label>

              <label
                className="settings-card__field settings-card__color-field"
                htmlFor="settings-background-color"
              >
                <span>
                  <strong>Page background color</strong>
                  <small>
                    Choose the background for dashboard pages.
                  </small>
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
          )}

          {}
          {showGameplay && (
            <section
              className="settings-card settings-card--gameplay"
              aria-labelledby="settings-gameplay-title"
              style={{ animationDelay: "80ms" }}
            >
              <div className="settings-card__heading">
                <span
                  className="settings-card__icon"
                  aria-hidden="true"
                >
                  <i
                    className="fas fa-gamepad"
                    aria-hidden="true"
                  ></i>
                </span>
                <div>
                  <p className="settings-page__eyebrow">
                    YOUR NEXT CHALLENGE
                  </p>
                  <h2 id="settings-gameplay-title">Gameplay</h2>
                </div>
              </div>

              <label
                className="settings-card__field settings-card__toggle-field"
                htmlFor="settings-sound-effects"
              >
                <span>
                  <strong>Sound effects</strong>
                  <small>
                    Play a short tone after each submitted
                    answer.
                  </small>
                </span>
                <input
                  id="settings-sound-effects"
                  name="soundEffects"
                  type="checkbox"
                  checked={settings.soundEffects}
                  onChange={handleChange}
                />
              </label>

              {settings.soundEffects && (
                <div className="settings-card__test-sounds">
                  <span className="settings-card__test-sounds-label">
                    Test sounds
                  </span>
                  <div className="settings-card__test-sounds-grid">
                    {TEST_SOUNDS.map((sound) => (
                      <button
                        key={sound.id}
                        type="button"
                        className="settings-test-sound"
                        onClick={() =>
                          handleTestSound(sound.id)
                        }
                        aria-label={`Test ${sound.label} sound`}
                      >
                        <span
                          className="settings-test-sound__icon"
                          aria-hidden="true"
                        >
                          {sound.emoji}
                        </span>
                        <span className="settings-test-sound__label">
                          {sound.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label
                className="settings-card__field settings-card__range-field"
                htmlFor="settings-sound-volume"
              >
                <span>
                  <strong>Sound effects volume</strong>
                  <small>
                    Adjust the answer and timer sound level.
                  </small>
                </span>
                <span className="settings-card__range-control">
                  <input
                    id="settings-sound-volume"
                    name="soundVolume"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={
                      volumeDrafts.soundVolume ??
                      settings.soundVolume
                    }
                    disabled={!settings.soundEffects}
                    onChange={(event) =>
                      setVolumeDrafts((drafts) => ({
                        ...drafts,
                        soundVolume: event.target.value,
                      }))
                    }
                    onPointerUp={() =>
                      handleVolumeCommit("soundVolume")
                    }
                    onKeyUp={() =>
                      handleVolumeCommit("soundVolume")
                    }
                    onBlur={() =>
                      handleVolumeCommit("soundVolume")
                    }
                    aria-valuetext={`${
                      volumeDrafts.soundVolume ??
                      settings.soundVolume
                    }%`}
                  />
                  <output htmlFor="settings-sound-volume">
                    {volumeDrafts.soundVolume ??
                      settings.soundVolume}
                    %
                  </output>
                </span>
              </label>

              <label
                className="settings-card__field settings-card__toggle-field"
                htmlFor="settings-background-music"
              >
                <span>
                  <strong>Background music</strong>
                  <small>
                    Play a gentle instrumental loop while you
                    use the app.
                  </small>
                </span>
                <input
                  id="settings-background-music"
                  name="backgroundMusic"
                  type="checkbox"
                  checked={settings.backgroundMusic}
                  onChange={handleChange}
                />
              </label>

              <label
                className="settings-card__field settings-card__range-field"
                htmlFor="settings-music-volume"
              >
                <span>
                  <strong>Music volume</strong>
                  <small>
                    Music starts after your next click or key
                    press.
                  </small>
                </span>
                <span className="settings-card__range-control">
                  <input
                    id="settings-music-volume"
                    name="musicVolume"
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={
                      volumeDrafts.musicVolume ??
                      settings.musicVolume
                    }
                    disabled={!settings.backgroundMusic}
                    onChange={(event) =>
                      setVolumeDrafts((drafts) => ({
                        ...drafts,
                        musicVolume: event.target.value,
                      }))
                    }
                    onPointerUp={() =>
                      handleVolumeCommit("musicVolume")
                    }
                    onKeyUp={() =>
                      handleVolumeCommit("musicVolume")
                    }
                    onBlur={() =>
                      handleVolumeCommit("musicVolume")
                    }
                    aria-valuetext={`${
                      volumeDrafts.musicVolume ??
                      settings.musicVolume
                    }%`}
                  />
                  <output htmlFor="settings-music-volume">
                    {volumeDrafts.musicVolume ??
                      settings.musicVolume}
                    %
                  </output>
                </span>
              </label>

              <label
                className="settings-card__field settings-card__toggle-field"
                htmlFor="settings-timer-warnings"
              >
                <span>
                  <strong>Timer warning</strong>
                  <small>
                    Highlight the timer when time is running
                    low.
                  </small>
                </span>
                <input
                  id="settings-timer-warnings"
                  name="timerWarnings"
                  type="checkbox"
                  checked={settings.timerWarnings}
                  onChange={handleChange}
                />
              </label>

              <label
                className="settings-card__field"
                htmlFor="settings-timer-warning-seconds"
              >
                <span>
                  <strong>Warning time</strong>
                  <small>
                    Show the warning with this many seconds
                    remaining.
                  </small>
                </span>
                <Select
                  id="settings-timer-warning-seconds"
                  name="timerWarningSeconds"
                  value={settings.timerWarningSeconds}
                  onChange={handleChange}
                  disabled={!settings.timerWarnings}
                >
                  <option value={5}>5 seconds</option>
                  <option value={10}>10 seconds</option>
                  <option value={15}>15 seconds</option>
                </Select>
              </label>

              <label
                className="settings-card__field settings-card__toggle-field"
                htmlFor="settings-show-progress"
              >
                <span>
                  <strong>Game progress</strong>
                  <small>
                    Show the question count and progress bar.
                  </small>
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
          )}

          {}
          {showNotifications && (
            <section
              className="settings-card settings-card--notifications"
              aria-labelledby="settings-notifications-title"
              style={{ animationDelay: "160ms" }}
            >
              <div className="settings-card__heading">
                <span
                  className="settings-card__icon settings-card__icon--notifications"
                  aria-hidden="true"
                >
                  <i
                    className="fas fa-bell"
                    aria-hidden="true"
                  ></i>
                </span>
                <div>
                  <p className="settings-page__eyebrow">
                    STAY IN THE LOOP
                  </p>
                  <h2 id="settings-notifications-title">
                    Notifications
                  </h2>
                </div>
              </div>
              <label
                className="settings-card__field settings-card__toggle-field"
                htmlFor="settings-answer-feedback"
              >
                <span>
                  <strong>In-game answer feedback</strong>
                  <small>
                    Show a message after each submitted
                    answer.
                  </small>
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
          )}

          {}
          {showAccount && (
            <section
              className="settings-card settings-card--account"
              aria-labelledby="settings-account-title"
              style={{ animationDelay: "240ms" }}
            >
              <div className="settings-card__heading">
                <span
                  className="settings-card__icon settings-card__icon--account"
                  aria-hidden="true"
                >
                  <i
                    className="fas fa-user-shield"
                    aria-hidden="true"
                  ></i>
                </span>
                <div>
                  <p className="settings-page__eyebrow">
                    YOUR ACCOUNT
                  </p>
                  <h2 id="settings-account-title">
                    Account &amp; privacy
                  </h2>
                </div>
              </div>
              <p className="settings-card__description">
                Keep your account details and privacy choices up
                to date.
              </p>
              <Link
                className="settings-card__link"
                to="/profile"
              >
                <span>
                  <strong>Profile &amp; cookies</strong>
                  <small>
                    Update your details and cookie preferences.
                  </small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
              <Link
                className="settings-card__link"
                to="/change-password"
              >
                <span>
                  <strong>Password &amp; security</strong>
                  <small>
                    Change the password for your account.
                  </small>
                </span>
                <span aria-hidden="true">→</span>
              </Link>
            </section>
          )}

          {}
          {!showAppearance &&
            !showGameplay &&
            !showNotifications &&
            !showAccount &&
            !showPreview &&
            !showData && (
              <div className="settings-page__empty">
                <span
                  className="settings-page__empty-icon"
                  aria-hidden="true"
                >
                  🔍
                </span>
                <strong>No settings found</strong>
                <p>
                  Try a different search term or{" "}
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="settings-page__empty-clear"
                  >
                    clear the search
                  </button>
                  .
                </p>
              </div>
            )}
        </fieldset>

        {}
        <div className="settings-page__footer">
          <p>
            {isSaving ? (
              <>
                <i
                  className="fas fa-circle-notch fa-spin"
                  aria-hidden="true"
                ></i>{" "}
                Saving your preferences…
              </>
            ) : (
              <>
                <i
                  className="fas fa-check-circle"
                  aria-hidden="true"
                ></i>{" "}
                Changes are saved automatically to your account.
              </>
            )}
          </p>
          <button
            type="button"
            onClick={handleResetClick}
            disabled={isLoading || isSaving}
            className="settings-page__reset"
          >
            <i
              className="fas fa-rotate-left"
              aria-hidden="true"
            ></i>{" "}
            Reset to defaults
          </button>
        </div>

        {}
        <ConfirmResetDialog
          isOpen={showResetDialog}
          onConfirm={handleResetConfirm}
          onCancel={() => setShowResetDialog(false)}
        />
      </section>
    </DashboardLayout>
  );
}

export default Settings;