const SETTINGS_KEY = "bananaQuestSettings";
export const TEXT_SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
];
const DEFAULT_SETTINGS = {
  backgroundColor: "#fbfaf6",
  showAnswerFeedback: true,
  theme: "light",
  textSize: "normal",
  reduceMotion: false,
  soundEffects: false,
  soundVolume: 70,
  backgroundMusic: false,
  musicVolume: 25,
  timerWarnings: true,
  timerWarningSeconds: 10,
  showProgress: true,
};

const HEX_COLOR_PATTERN = /^#[\da-f]{6}$/i;
const TIMER_WARNING_THRESHOLDS = [5, 10, 15];
const DARK_BACKGROUND_COLOR = "#202229";
const API_BASE_URL = (import.meta.env.BACKEND_URL || "")
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");
const SETTINGS_API_URL = `${API_BASE_URL}/api/users/settings`;

function normalizeVolume(value, fallback) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const volume = Number(value);
  return Number.isInteger(volume) && volume >= 0 && volume <= 100
    ? volume
    : fallback;
}

function normalizeSettings(settings) {
  const source = settings || {};
  return {
    backgroundColor: HEX_COLOR_PATTERN.test(source.backgroundColor)
      ? source.backgroundColor
      : DEFAULT_SETTINGS.backgroundColor,
    showAnswerFeedback:
      typeof source.showAnswerFeedback === "boolean"
        ? source.showAnswerFeedback
        : DEFAULT_SETTINGS.showAnswerFeedback,
    theme: source.theme === "dark" ? "dark" : DEFAULT_SETTINGS.theme,
    textSize: TEXT_SIZE_OPTIONS.some((option) => option.value === source.textSize)
      ? source.textSize
      : DEFAULT_SETTINGS.textSize,
    reduceMotion:
      typeof source.reduceMotion === "boolean"
        ? source.reduceMotion
        : DEFAULT_SETTINGS.reduceMotion,
    soundEffects:
      typeof source.soundEffects === "boolean"
        ? source.soundEffects
        : DEFAULT_SETTINGS.soundEffects,
    soundVolume: normalizeVolume(
      source.soundVolume,
      DEFAULT_SETTINGS.soundVolume,
    ),
    backgroundMusic:
      typeof source.backgroundMusic === "boolean"
        ? source.backgroundMusic
        : DEFAULT_SETTINGS.backgroundMusic,
    musicVolume: normalizeVolume(
      source.musicVolume,
      DEFAULT_SETTINGS.musicVolume,
    ),
    timerWarnings:
      typeof source.timerWarnings === "boolean"
        ? source.timerWarnings
        : DEFAULT_SETTINGS.timerWarnings,
    timerWarningSeconds: TIMER_WARNING_THRESHOLDS.includes(
      Number(source.timerWarningSeconds),
    )
      ? Number(source.timerWarningSeconds)
      : DEFAULT_SETTINGS.timerWarningSeconds,
    showProgress:
      typeof source.showProgress === "boolean"
        ? source.showProgress
        : DEFAULT_SETTINGS.showProgress,
  };
}

export function getAppSettings() {
  try {
    const storedSettings = JSON.parse(
      window.localStorage.getItem(SETTINGS_KEY) || "{}",
    );
    return normalizeSettings(storedSettings);
  } catch {
    return normalizeSettings(DEFAULT_SETTINGS);
  }
}

export function hasLocalAppSettings() {
  try {
    return window.localStorage.getItem(SETTINGS_KEY) !== null;
  } catch {
    return false;
  }
}

export function clearLocalAppSettings() {
  window.localStorage.removeItem(SETTINGS_KEY);
}

async function readSettingsResponse(response, fallbackMessage) {
  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      `The server returned an unexpected response (HTTP ${response.status}).`,
    );
  }

  if (
    !response.ok ||
    result?.success !== true ||
    !result.settings ||
    typeof result.settings !== "object" ||
    Array.isArray(result.settings)
  ) {
    const error = new Error(result?.message || fallbackMessage);
    error.status = response.status;
    throw error;
  }

  return result;
}

export async function fetchRemoteAppSettings(token) {
  const response = await fetch(SETTINGS_API_URL, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = await readSettingsResponse(
    response,
    "Unable to load your settings.",
  );
  return {
    settings: normalizeSettings(result.settings),
    hasSavedSettings: result.hasSavedSettings === true,
  };
}

export async function updateRemoteAppSettings(token, settings) {
  const response = await fetch(SETTINGS_API_URL, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ settings: normalizeSettings(settings) }),
  });
  const result = await readSettingsResponse(
    response,
    "Unable to save your settings.",
  );
  return normalizeSettings(result.settings);
}

export function getDashboardBackground(settings) {
  if (
    settings.theme === "dark" &&
    settings.backgroundColor === DEFAULT_SETTINGS.backgroundColor
  ) {
    return DARK_BACKGROUND_COLOR;
  }
  return settings.backgroundColor;
}

export { DEFAULT_SETTINGS };
