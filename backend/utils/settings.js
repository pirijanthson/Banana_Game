const DEFAULT_SETTINGS = Object.freeze({
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
});

const TIMER_WARNING_THRESHOLDS = [5, 10, 15];
const TEXT_SIZE_OPTIONS = ["small", "normal", "medium", "large", "extra-large"];
const HEX_COLOR_PATTERN = /^#[\da-f]{6}$/i;
const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS);

function validateSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return "Settings must be an object.";
  }

  const unknownKey = Object.keys(settings).find(
    (key) => !SETTING_KEYS.includes(key),
  );
  if (unknownKey) {
    return `Unknown setting: ${unknownKey}.`;
  }

  for (const [key, value] of Object.entries(settings)) {
    if (
      (key === "backgroundColor" &&
        (typeof value !== "string" || !HEX_COLOR_PATTERN.test(value))) ||
      (key === "showAnswerFeedback" && typeof value !== "boolean") ||
      (key === "theme" && !["light", "dark"].includes(value)) ||
      (key === "textSize" && !TEXT_SIZE_OPTIONS.includes(value)) ||
      ([
        "reduceMotion",
        "soundEffects",
        "backgroundMusic",
        "timerWarnings",
        "showProgress",
      ].includes(key) &&
        typeof value !== "boolean") ||
      (["soundVolume", "musicVolume"].includes(key) &&
        (!Number.isInteger(value) || value < 0 || value > 100)) ||
      (key === "timerWarningSeconds" &&
        !TIMER_WARNING_THRESHOLDS.includes(value))
    ) {
      return `Invalid value for setting: ${key}.`;
    }
  }

  return null;
}

function normalizeSettings(settings) {
  const source = settings || {};
  return {
    backgroundColor:
      typeof source.backgroundColor === "string" &&
      HEX_COLOR_PATTERN.test(source.backgroundColor)
        ? source.backgroundColor
        : DEFAULT_SETTINGS.backgroundColor,
    showAnswerFeedback:
      typeof source.showAnswerFeedback === "boolean"
        ? source.showAnswerFeedback
        : DEFAULT_SETTINGS.showAnswerFeedback,
    theme: source.theme === "dark" ? "dark" : DEFAULT_SETTINGS.theme,
    textSize: TEXT_SIZE_OPTIONS.includes(source.textSize)
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
    soundVolume:
      Number.isInteger(source.soundVolume) &&
      source.soundVolume >= 0 &&
      source.soundVolume <= 100
        ? source.soundVolume
        : DEFAULT_SETTINGS.soundVolume,
    backgroundMusic:
      typeof source.backgroundMusic === "boolean"
        ? source.backgroundMusic
        : DEFAULT_SETTINGS.backgroundMusic,
    musicVolume:
      Number.isInteger(source.musicVolume) &&
      source.musicVolume >= 0 &&
      source.musicVolume <= 100
        ? source.musicVolume
        : DEFAULT_SETTINGS.musicVolume,
    timerWarnings:
      typeof source.timerWarnings === "boolean"
        ? source.timerWarnings
        : DEFAULT_SETTINGS.timerWarnings,
    timerWarningSeconds: TIMER_WARNING_THRESHOLDS.includes(
      source.timerWarningSeconds,
    )
      ? source.timerWarningSeconds
      : DEFAULT_SETTINGS.timerWarningSeconds,
    showProgress:
      typeof source.showProgress === "boolean"
        ? source.showProgress
        : DEFAULT_SETTINGS.showProgress,
  };
}

module.exports = { DEFAULT_SETTINGS, normalizeSettings, validateSettings };
